/**
 * Formatter for converting session transcripts to Helicone format.
 */

import type { ContentFilter, MessageMetadata } from '../privacy/filter.ts';
import type { Redactor } from '../privacy/redactor.ts';
import type { SessionTranscript, TrackedMessage } from '../telemetry/types.ts';
import type { HeliconeMessage, HeliconeRequestBody, HeliconeResponseBody } from './types.ts';

/**
 * Format a tracked message as a Helicone message.
 */
function formatMessage(message: TrackedMessage): HeliconeMessage {
  // Combine all text parts into content
  const textParts = message.parts
    .filter((p) => p.type === 'text' || p.type === 'tool_result')
    .map((p) => p.content);

  return {
    role: message.role,
    content: textParts.join('\n'),
  };
}

/**
 * Extract metadata from a message.
 */
function extractMetadata(message: TrackedMessage): MessageMetadata {
  return {
    role: message.role,
    timestamp: message.updatedAt,
    model: message.model,
    partCount: message.parts.length,
    partTypes: [...new Set(message.parts.map((p) => p.type))],
  };
}

/**
 * Formats session transcripts for Helicone export.
 */
export class TranscriptFormatter {
  private redactor: Redactor;
  private filter: ContentFilter;

  constructor(redactor: Redactor, filter: ContentFilter) {
    this.redactor = redactor;
    this.filter = filter;
  }

  /**
   * Format a transcript as a Helicone request/response pair.
   */
  format(transcript: SessionTranscript): { request: HeliconeRequestBody; response: string } {
    const messages: HeliconeMessage[] = [];
    let model = 'unknown';

    for (const message of transcript.messages) {
      // Get model from first assistant message
      if (message.role === 'assistant' && message.model) {
        model = message.model;
      }

      if (this.filter.includeContent()) {
        const formatted = formatMessage(message);
        // Apply redaction
        formatted.content = this.redactor.redact(formatted.content);
        messages.push(formatted);
      } else {
        // Metadata-only mode
        const metadata = extractMetadata(message);
        messages.push({
          role: metadata.role,
          content: `[${metadata.partCount} parts, types: ${metadata.partTypes.join(', ')}]`,
        });
      }
    }

    const request: HeliconeRequestBody = {
      model,
      messages,
    };

    // Build response from last assistant message
    const lastAssistant = transcript.messages.filter((m) => m.role === 'assistant').pop();

    const response: HeliconeResponseBody = {
      model,
      choices: lastAssistant
        ? [
            {
              message: {
                role: 'assistant',
                content: this.filter.includeContent()
                  ? this.redactor.redact(formatMessage(lastAssistant).content)
                  : '[content omitted]',
              },
              finish_reason: 'stop',
            },
          ]
        : [],
    };

    return {
      request,
      response: JSON.stringify(response),
    };
  }

  /**
   * Format multiple messages as individual exports (for per-message granularity).
   */
  formatMessages(
    transcript: SessionTranscript
  ): Array<{ messageId: string; request: HeliconeRequestBody; response: string }> {
    const results: Array<{
      messageId: string;
      request: HeliconeRequestBody;
      response: string;
    }> = [];

    // Build context from all messages up to each assistant response
    const contextMessages: HeliconeMessage[] = [];
    let currentModel = 'unknown';

    for (const message of transcript.messages) {
      if (message.model) {
        currentModel = message.model;
      }

      const formatted = this.filter.includeContent()
        ? formatMessage(message)
        : {
            role: message.role,
            content: `[${message.parts.length} parts]`,
          };

      if (this.filter.includeContent()) {
        formatted.content = this.redactor.redact(formatted.content);
      }

      contextMessages.push(formatted);

      // Export on each assistant message
      if (message.role === 'assistant') {
        const request: HeliconeRequestBody = {
          model: currentModel,
          messages: [...contextMessages.slice(0, -1)], // All messages except this one
        };

        const response: HeliconeResponseBody = {
          model: currentModel,
          choices: [
            {
              message: formatted,
              finish_reason: 'stop',
            },
          ],
        };

        results.push({
          messageId: message.id,
          request,
          response: JSON.stringify(response),
        });
      }
    }

    return results;
  }
}

/**
 * Create a transcript formatter.
 */
export function createTranscriptFormatter(
  redactor: Redactor,
  filter: ContentFilter
): TranscriptFormatter {
  return new TranscriptFormatter(redactor, filter);
}
