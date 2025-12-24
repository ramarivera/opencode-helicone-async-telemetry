/**
 * Tool call collector for tracking tool executions.
 */

import type { TrackedToolCall } from './types.ts';

/**
 * Collects and tracks tool executions within a session.
 */
export class ToolCollector {
  private toolCalls: Map<string, TrackedToolCall> = new Map();

  /**
   * Get all tool calls.
   */
  getToolCalls(): TrackedToolCall[] {
    return Array.from(this.toolCalls.values());
  }

  /**
   * Get tool calls for a specific session.
   */
  getToolCallsForSession(sessionId: string): TrackedToolCall[] {
    return this.getToolCalls().filter((tc) => tc.sessionId === sessionId);
  }

  /**
   * Handle tool execute before event.
   */
  onToolExecuteBefore(
    id: string,
    sessionId: string,
    messageId: string,
    name: string,
    args: Record<string, unknown>
  ): void {
    const toolCall: TrackedToolCall = {
      id,
      sessionId,
      messageId,
      name,
      args,
      startTime: Date.now(),
    };
    this.toolCalls.set(id, toolCall);
  }

  /**
   * Handle tool execute after event.
   */
  onToolExecuteAfter(id: string, result: string, error?: string): void {
    const toolCall = this.toolCalls.get(id);
    if (!toolCall) {
      return;
    }

    toolCall.endTime = Date.now();
    if (error) {
      toolCall.error = error;
    } else {
      toolCall.result = result;
    }
  }

  /**
   * Clear tool calls for a session.
   */
  clearSession(sessionId: string): void {
    for (const [id, toolCall] of this.toolCalls) {
      if (toolCall.sessionId === sessionId) {
        this.toolCalls.delete(id);
      }
    }
  }

  /**
   * Clear all tool calls.
   */
  clear(): void {
    this.toolCalls.clear();
  }

  /**
   * Get count of tool calls.
   */
  count(): number {
    return this.toolCalls.size;
  }
}

/**
 * Create a tool collector.
 */
export function createToolCollector(): ToolCollector {
  return new ToolCollector();
}
