/**
 * Types for telemetry data capture.
 */

/**
 * Tracked session information.
 */
export interface TrackedSession {
  /** OpenCode session ID */
  id: string;

  /** Session title */
  title: string;

  /** When the session was created */
  createdAt: number;

  /** When the session was last updated */
  updatedAt: number;
}

/**
 * A message part (text, tool call, etc).
 */
export interface MessagePart {
  /** Part type */
  type: 'text' | 'tool_call' | 'tool_result' | 'error' | 'unknown';

  /** Part content */
  content: string;

  /** Tool name if applicable */
  toolName?: string;

  /** Tool call ID if applicable */
  toolCallId?: string;

  /** Timestamp of this part */
  timestamp: number;
}

/**
 * A tracked message in the session.
 */
export interface TrackedMessage {
  /** Message ID */
  id: string;

  /** Session ID this message belongs to */
  sessionId: string;

  /** Message role */
  role: 'user' | 'assistant' | 'system' | 'tool';

  /** Message parts */
  parts: MessagePart[];

  /** Model used (if available) */
  model?: string;

  /** When the message was created */
  createdAt: number;

  /** When the message was last updated */
  updatedAt: number;

  /** Index in the session */
  index: number;
}

/**
 * A tracked tool execution.
 */
export interface TrackedToolCall {
  /** Tool call ID */
  id: string;

  /** Session ID */
  sessionId: string;

  /** Message ID that triggered this tool call */
  messageId: string;

  /** Tool name */
  name: string;

  /** Tool arguments */
  args: Record<string, unknown>;

  /** Tool result (if completed) */
  result?: string;

  /** Start timestamp */
  startTime: number;

  /** End timestamp (if completed) */
  endTime?: number;

  /** Error if failed */
  error?: string;
}

/**
 * A complete session transcript for export.
 */
export interface SessionTranscript {
  /** Session info */
  session: TrackedSession;

  /** All messages in order */
  messages: TrackedMessage[];

  /** All tool calls */
  toolCalls: TrackedToolCall[];

  /** When this transcript was assembled */
  assembledAt: number;
}

/**
 * Event data from OpenCode plugin events.
 */
export interface OpenCodeEvent {
  type: string;
  properties: Record<string, unknown>;
}
