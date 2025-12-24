/**
 * OpenCode Helicone Async Telemetry Plugin
 *
 * Exports OpenCode session data to Helicone asynchronously using the Manual Logger SDK.
 * This plugin does NOT proxy LLM requests - it captures events and exports them in the background.
 *
 * @example
 * ```json
 * {
 *   "plugin": ["opencode-helicone-async-telemetry"]
 * }
 * ```
 */

import type { Plugin, PluginInput } from '@opencode-ai/plugin';

import { loadConfig, validateConfig } from './config/loader.ts';
import type { PluginConfigInput } from './config/types.ts';
import { createTranscriptFormatter, type TranscriptFormatter } from './exporter/formatter.ts';
import { createHeliconeLogger, type HeliconeLogger } from './exporter/logger.ts';
import { createContentFilter } from './privacy/filter.ts';
import { createRedactor } from './privacy/redactor.ts';
import { createQueueManager, type QueueManager } from './queue/manager.ts';
import type { QueueItem } from './queue/types.ts';
import { createMessageCollector, type MessageCollector } from './telemetry/message-collector.ts';
import { createSessionTracker, type SessionTracker } from './telemetry/session-tracker.ts';
import { createToolCollector, type ToolCollector } from './telemetry/tool-collector.ts';
import { createTranscriptBuilder, type TranscriptBuilder } from './telemetry/transcript-builder.ts';
import { safeSessionName } from './utils/sanitize.ts';
import { generateIdempotencyKey, sessionToUUID } from './utils/session-id.ts';

/**
 * Toast notification helper type.
 */
type ToastFn = (
  message: string,
  variant: 'info' | 'success' | 'warning' | 'error',
  title?: string
) => Promise<void>;

/**
 * OpenCode event - using loose typing to handle various event shapes.
 */
interface OpenCodeEvent {
  type: string;
  properties: Record<string, unknown>;
}

/**
 * Plugin state management.
 */
interface PluginState {
  sessionTracker: SessionTracker;
  messageCollector: MessageCollector;
  toolCollector: ToolCollector;
  transcriptBuilder: TranscriptBuilder;
  queueManager: QueueManager;
  heliconeLogger: HeliconeLogger;
  formatter: TranscriptFormatter;
  enabled: boolean;
  showToast: ToastFn;
}

/**
 * Create a toast helper from the client.
 */
function createToastHelper(client: PluginInput['client']): ToastFn {
  return async (
    message: string,
    variant: 'info' | 'success' | 'warning' | 'error',
    title?: string
  ) => {
    try {
      await client.tui.showToast({
        body: {
          message,
          variant,
          title,
          duration: variant === 'error' ? 8000 : 5000,
        },
      });
    } catch {
      // Silently ignore toast errors - don't break plugin flow
    }
  };
}

/**
 * Initialize the plugin state.
 */
async function initializeState(
  client: PluginInput['client'],
  pluginConfig?: PluginConfigInput
): Promise<PluginState | null> {
  const config = loadConfig(pluginConfig);
  const showToast = createToastHelper(client);

  // Validate configuration
  const errors = validateConfig(config);
  if (errors.length > 0) {
    // Show first error as toast
    await showToast(errors[0], 'error', 'Helicone Config Error');
    return null;
  }

  if (!config.enabled) {
    return null;
  }

  if (!config.apiKey) {
    await showToast(
      'HELICONE_API_KEY is required. Set it in your environment.',
      'warning',
      'Helicone Disabled'
    );
    return null;
  }

  // Create components
  const sessionTracker = createSessionTracker();
  const messageCollector = createMessageCollector();
  const toolCollector = createToolCollector();
  const transcriptBuilder = createTranscriptBuilder(
    sessionTracker,
    messageCollector,
    toolCollector
  );

  const redactor = createRedactor(config.redactPatterns);
  const filter = createContentFilter(config.exportMode);
  const formatter = createTranscriptFormatter(redactor, filter);

  const queueManager = createQueueManager(config);
  const heliconeLogger = createHeliconeLogger(config);

  // Set up queue processor
  queueManager.setProcessor(async (item: QueueItem) => {
    const result = await heliconeLogger.export(item);
    if (!result.success) {
      throw new Error(result.error || 'Export failed');
    }
  });

  // Start queue manager
  queueManager.start();

  // Show success toast
  await showToast(`Exporting to ${config.endpoint}`, 'success', 'Helicone Enabled');

  return {
    sessionTracker,
    messageCollector,
    toolCollector,
    transcriptBuilder,
    queueManager,
    heliconeLogger,
    formatter,
    enabled: true,
    showToast,
  };
}

/**
 * Safely extract a string property from an object.
 */
function getString(obj: unknown, key: string): string | undefined {
  if (obj && typeof obj === 'object' && key in obj) {
    const value = (obj as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : undefined;
  }
  return undefined;
}

/**
 * Handle session events.
 * Event structure: { type: 'session.created', properties: { info: { id, title, ... } } }
 */
function handleSessionEvent(state: PluginState, event: OpenCodeEvent): void {
  const info = event.properties.info as Record<string, unknown> | undefined;
  if (!info) return;

  const id = getString(info, 'id');
  const title = getString(info, 'title');

  if (!id) return;

  if (event.type === 'session.created') {
    state.sessionTracker.onSessionCreated(id, title || '');
  } else if (event.type === 'session.updated') {
    state.sessionTracker.onSessionUpdated(id, title);
  }
}

/**
 * Handle message events.
 * Event structure: { type: 'message.updated', properties: { info: { id, sessionID, role, ... } } }
 */
function handleMessageEvent(state: PluginState, event: OpenCodeEvent): void {
  const info = event.properties.info as Record<string, unknown> | undefined;
  if (!info) return;

  const messageId = getString(info, 'id');
  const sessionId = getString(info, 'sessionID');
  const role = getString(info, 'role');

  // For model, check both modelID (assistant) and model.modelID (user)
  let model: string | undefined = getString(info, 'modelID');
  if (!model && info.model && typeof info.model === 'object') {
    model = getString(info.model, 'modelID');
  }

  if (!sessionId || !messageId || !role) return;

  state.messageCollector.onMessageUpdated(
    messageId,
    sessionId,
    role as 'user' | 'assistant' | 'system' | 'tool',
    undefined, // Content comes from message parts, not message itself
    model
  );
}

/**
 * Handle message part events.
 * Event structure: { type: 'message.part.updated', properties: { info: { id, sessionID, messageID, type, text } } }
 */
function handleMessagePartEvent(state: PluginState, event: OpenCodeEvent): void {
  const info = event.properties.info as Record<string, unknown> | undefined;
  if (!info) return;

  const messageId = getString(info, 'messageID');
  const partType = getString(info, 'type');
  const text = getString(info, 'text');

  if (!messageId) return;

  // Add text content to message
  if (partType === 'text' && text) {
    state.messageCollector.onPartUpdated(messageId, {
      type: 'text',
      content: text,
      timestamp: Date.now(),
    });
  }
}

/**
 * Handle tool events.
 * Event structure varies - need to check actual properties
 */
function handleToolEvent(state: PluginState, event: OpenCodeEvent): void {
  const props = event.properties;
  const sessionId = getString(props, 'sessionID');
  const messageId = getString(props, 'messageID');
  const tool = getString(props, 'tool');

  if (event.type === 'tool.execute.before') {
    if (!sessionId || !messageId || !tool) return;

    const args = (props.args as Record<string, unknown>) || {};
    const toolCallId = `${messageId}-${tool}-${Date.now()}`;
    state.toolCollector.onToolExecuteBefore(toolCallId, sessionId, messageId, tool, args);
  } else if (event.type === 'tool.execute.after') {
    const result = getString(props, 'result');
    const error = getString(props, 'error');

    // Find the most recent tool call for this tool
    const toolCalls = state.toolCollector.getToolCalls();
    const recentCall = toolCalls.filter((tc) => tc.name === tool && !tc.endTime).pop();

    if (recentCall) {
      state.toolCollector.onToolExecuteAfter(recentCall.id, result || '', error);
    }
  }
}

/**
 * Handle session idle - trigger export.
 */
async function handleSessionIdle(state: PluginState): Promise<void> {
  if (!state.transcriptBuilder.hasData()) return;

  const transcript = state.transcriptBuilder.build();
  if (!transcript) return;

  // Format and enqueue
  const { request, response } = state.formatter.format(transcript);

  const item: QueueItem = {
    id: generateIdempotencyKey(transcript.session.id, 'transcript', transcript.assembledAt),
    sessionId: transcript.session.id,
    heliconeSessionId: sessionToUUID(transcript.session.id),
    heliconeSessionName: safeSessionName(transcript.session.title, transcript.session.id),
    heliconeSessionPath: state.heliconeLogger.buildSessionPath(transcript.session.id),
    request,
    response,
    status: 'pending',
    createdAt: Date.now(),
    retryCount: 0,
  };

  const enqueued = await state.queueManager.enqueue(item);
  if (enqueued) {
    await state.showToast('Session transcript queued for Helicone export', 'info', 'Helicone');
  }
}

/**
 * The main plugin export.
 */
export const HeliconeAsyncTelemetryPlugin: Plugin = async ({ client }) => {
  let state: PluginState | null = null;
  let initialized = false;

  return {
    /**
     * Handle OpenCode events.
     */
    event: async ({ event }) => {
      // Lazy initialization on first event
      if (!initialized) {
        initialized = true;
        state = await initializeState(client);
      }

      if (!state) return;

      // Cast event to our expected type
      const openCodeEvent = event as unknown as OpenCodeEvent;

      // Route events to handlers
      switch (openCodeEvent.type) {
        case 'session.created':
        case 'session.updated':
          handleSessionEvent(state, openCodeEvent);
          break;

        case 'message.updated':
          handleMessageEvent(state, openCodeEvent);
          break;

        case 'message.part.updated':
          handleMessagePartEvent(state, openCodeEvent);
          break;

        case 'tool.execute.before':
        case 'tool.execute.after':
          handleToolEvent(state, openCodeEvent);
          break;

        case 'session.idle':
          await handleSessionIdle(state);
          break;
      }
    },
  };
};

export default HeliconeAsyncTelemetryPlugin;
