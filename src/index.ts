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
 * OpenCode event types we handle.
 */
interface OpenCodeEvent {
  type: string;
  properties: {
    info?: {
      id: string;
      title?: string;
    };
    sessionId?: string;
    messageId?: string;
    role?: string;
    content?: string;
    model?: string;
    tool?: string;
    args?: Record<string, unknown>;
    result?: string;
    error?: string;
    [key: string]: unknown;
  };
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
 * Handle session events.
 */
function handleSessionEvent(state: PluginState, event: OpenCodeEvent): void {
  const info = event.properties.info;
  if (!info) return;

  if (event.type === 'session.created') {
    state.sessionTracker.onSessionCreated(info.id, info.title || '');
  } else if (event.type === 'session.updated') {
    state.sessionTracker.onSessionUpdated(info.id, info.title);
  }
}

/**
 * Handle message events.
 */
function handleMessageEvent(state: PluginState, event: OpenCodeEvent): void {
  const { sessionId, messageId, role, content, model } = event.properties;

  if (!sessionId || !messageId || !role) return;

  state.messageCollector.onMessageUpdated(
    messageId,
    sessionId,
    role as 'user' | 'assistant' | 'system' | 'tool',
    content,
    model
  );
}

/**
 * Handle tool events.
 */
function handleToolEvent(state: PluginState, event: OpenCodeEvent): void {
  const { sessionId, messageId, tool, args, result, error } = event.properties;

  if (event.type === 'tool.execute.before') {
    if (!sessionId || !messageId || !tool) return;

    const toolCallId = `${messageId}-${tool}-${Date.now()}`;
    state.toolCollector.onToolExecuteBefore(toolCallId, sessionId, messageId, tool, args || {});
  } else if (event.type === 'tool.execute.after') {
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
        case 'message.part.updated':
          handleMessageEvent(state, openCodeEvent);
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
