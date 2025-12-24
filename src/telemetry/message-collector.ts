/**
 * Message collector for accumulating message data from events.
 */

import type { MessagePart, TrackedMessage } from './types.ts';

/**
 * Collects and tracks messages within a session.
 */
export class MessageCollector {
  private messages: Map<string, TrackedMessage> = new Map();
  private messageOrder: string[] = [];

  /**
   * Get all messages in order.
   */
  getMessages(): TrackedMessage[] {
    return this.messageOrder
      .map((id) => this.messages.get(id))
      .filter((m): m is TrackedMessage => m !== undefined);
  }

  /**
   * Get a specific message by ID.
   */
  getMessage(id: string): TrackedMessage | undefined {
    return this.messages.get(id);
  }

  /**
   * Handle message updated event.
   */
  onMessageUpdated(
    messageId: string,
    sessionId: string,
    role: TrackedMessage['role'],
    content?: string,
    model?: string
  ): void {
    const now = Date.now();
    const existing = this.messages.get(messageId);

    if (existing) {
      existing.updatedAt = now;
      if (model) {
        existing.model = model;
      }
      // Update content as a text part if provided
      if (content !== undefined) {
        const textPart = existing.parts.find((p) => p.type === 'text');
        if (textPart) {
          textPart.content = content;
          textPart.timestamp = now;
        } else {
          existing.parts.push({
            type: 'text',
            content,
            timestamp: now,
          });
        }
      }
    } else {
      const message: TrackedMessage = {
        id: messageId,
        sessionId,
        role,
        parts: content
          ? [
              {
                type: 'text',
                content,
                timestamp: now,
              },
            ]
          : [],
        model,
        createdAt: now,
        updatedAt: now,
        index: this.messageOrder.length,
      };
      this.messages.set(messageId, message);
      this.messageOrder.push(messageId);
    }
  }

  /**
   * Handle message part updated event.
   */
  onPartUpdated(messageId: string, part: MessagePart): void {
    const message = this.messages.get(messageId);
    if (!message) {
      return;
    }

    // Find existing part with same tool call ID or type
    const existingIndex = message.parts.findIndex(
      (p) =>
        (part.toolCallId && p.toolCallId === part.toolCallId) ||
        (part.type === 'text' && p.type === 'text')
    );

    if (existingIndex >= 0) {
      message.parts[existingIndex] = part;
    } else {
      message.parts.push(part);
    }

    message.updatedAt = Date.now();
  }

  /**
   * Add a tool call part to a message.
   */
  addToolCall(messageId: string, toolCallId: string, toolName: string, args: string): void {
    const part: MessagePart = {
      type: 'tool_call',
      content: args,
      toolName,
      toolCallId,
      timestamp: Date.now(),
    };
    this.onPartUpdated(messageId, part);
  }

  /**
   * Add a tool result part to a message.
   */
  addToolResult(messageId: string, toolCallId: string, result: string): void {
    const part: MessagePart = {
      type: 'tool_result',
      content: result,
      toolCallId,
      timestamp: Date.now(),
    };
    this.onPartUpdated(messageId, part);
  }

  /**
   * Clear all messages for a session.
   */
  clearSession(sessionId: string): void {
    for (const [id, message] of this.messages) {
      if (message.sessionId === sessionId) {
        this.messages.delete(id);
        const orderIndex = this.messageOrder.indexOf(id);
        if (orderIndex >= 0) {
          this.messageOrder.splice(orderIndex, 1);
        }
      }
    }
  }

  /**
   * Clear all messages.
   */
  clear(): void {
    this.messages.clear();
    this.messageOrder = [];
  }

  /**
   * Get count of messages.
   */
  count(): number {
    return this.messages.size;
  }
}

/**
 * Create a message collector.
 */
export function createMessageCollector(): MessageCollector {
  return new MessageCollector();
}
