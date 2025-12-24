/**
 * Helicone logger wrapper for async exports.
 */

import { HeliconeManualLogger } from '@helicone/helpers';
import type { HeliconeExporterConfig } from '../config/types.ts';
import type { QueueItem } from '../queue/types.ts';
import type { ExportResult, HeliconeHeaders } from './types.ts';

/**
 * Wrapper around HeliconeManualLogger for async exports.
 */
export class HeliconeLogger {
  private logger: HeliconeManualLogger;
  private sessionPathPrefix: string;

  constructor(config: HeliconeExporterConfig) {
    this.logger = new HeliconeManualLogger({
      apiKey: config.apiKey,
      loggingEndpoint: config.endpoint,
    });
    this.sessionPathPrefix = config.sessionPathPrefix;
  }

  /**
   * Build headers for a queue item.
   */
  private buildHeaders(item: QueueItem): HeliconeHeaders {
    return {
      'Helicone-Session-Id': item.heliconeSessionId,
      'Helicone-Session-Name': item.heliconeSessionName,
      'Helicone-Session-Path': item.heliconeSessionPath,
      'Helicone-Request-Id': item.id,
    };
  }

  /**
   * Export a queue item to Helicone.
   */
  async export(item: QueueItem): Promise<ExportResult> {
    try {
      const headers = this.buildHeaders(item);

      // Filter out undefined values and cast to Record<string, string>
      const additionalHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(headers)) {
        if (value !== undefined) {
          additionalHeaders[key] = value;
        }
      }

      await this.logger.logSingleRequest(item.request, item.response, {
        additionalHeaders,
      });

      return {
        success: true,
        heliconeRequestId: item.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Build a session path for a message.
   */
  buildSessionPath(sessionId: string, messageIndex?: number): string {
    let path = `${this.sessionPathPrefix}/${sessionId}`;
    if (messageIndex !== undefined) {
      path += `/msg-${messageIndex}`;
    }
    return path;
  }

  /**
   * Build a session path for a tool call.
   */
  buildToolPath(sessionId: string, messageIndex: number, toolName: string): string {
    return `${this.sessionPathPrefix}/${sessionId}/msg-${messageIndex}/tool-${toolName}`;
  }
}

/**
 * Create a Helicone logger.
 */
export function createHeliconeLogger(config: HeliconeExporterConfig): HeliconeLogger {
  return new HeliconeLogger(config);
}
