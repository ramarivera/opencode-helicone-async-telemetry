/**
 * Helicone logger wrapper for async exports.
 */

import { HeliconeManualLogger } from '@helicone/helpers';

import type { HeliconeExporterConfig } from '../config/types.ts';
import { createLogger } from '../logger.ts';
import type { QueueItem } from '../queue/types.ts';
import type { ExportResult, HeliconeHeaders } from './types.ts';

const log = createLogger('exporter');

/**
 * Wrapper around HeliconeManualLogger for async exports.
 */
export class HeliconeLogger {
  private logger: HeliconeManualLogger;
  private sessionPathPrefix: string;

  constructor(config: HeliconeExporterConfig) {
    log.debug(
      { endpoint: config.endpoint, sessionPathPrefix: config.sessionPathPrefix },
      'Creating Helicone logger'
    );
    this.logger = new HeliconeManualLogger({
      apiKey: config.apiKey,
      loggingEndpoint: config.endpoint,
    });
    this.sessionPathPrefix = config.sessionPathPrefix;
    log.info({ endpoint: config.endpoint }, 'Helicone logger created');
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
   *
   * Note: We suppress console.error during the Helicone SDK call because
   * the SDK uses console.error internally for error logging, which breaks
   * the OpenCode TUI. All errors are captured and logged via pino instead.
   */
  async export(item: QueueItem): Promise<ExportResult> {
    log.debug(
      {
        itemId: item.id,
        sessionId: item.sessionId,
        heliconeSessionId: item.heliconeSessionId,
      },
      'Starting export to Helicone'
    );

    try {
      const headers = this.buildHeaders(item);

      // Filter out undefined values and cast to Record<string, string>
      const additionalHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(headers)) {
        if (value !== undefined) {
          additionalHeaders[key] = value;
        }
      }

      log.debug({ headers: additionalHeaders }, 'Sending request to Helicone');

      // Capture console.error calls from the Helicone SDK and redirect to pino.
      // The SDK uses console.error internally which interferes with OpenCode's terminal UI.
      // We capture the arguments and log them properly, then check if any errors occurred.
      const originalConsoleError = console.error;
      const capturedErrors: string[] = [];

      // eslint-disable-next-line no-console
      console.error = (...args: unknown[]) => {
        const errorMessage = args
          .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
          .join(' ');
        capturedErrors.push(errorMessage);
        log.warn({ sdkError: errorMessage }, 'Helicone SDK error (captured from console.error)');
      };

      try {
        await this.logger.logSingleRequest(item.request, item.response, {
          additionalHeaders,
        });
      } finally {
        // eslint-disable-next-line no-console
        console.error = originalConsoleError;
      }

      // Check if the SDK logged any errors - if so, treat this as a failure
      if (capturedErrors.length > 0) {
        const errorMessage = capturedErrors.join('; ');
        log.error(
          { itemId: item.id, capturedErrors },
          'Export to Helicone failed (SDK reported errors)'
        );
        return {
          success: false,
          error: errorMessage,
        };
      }

      log.info({ itemId: item.id, heliconeRequestId: item.id }, 'Export to Helicone successful');

      return {
        success: true,
        heliconeRequestId: item.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(
        {
          itemId: item.id,
          error: errorMessage,
          errorStack: error instanceof Error ? error.stack : undefined,
        },
        'Export to Helicone failed'
      );

      return {
        success: false,
        error: errorMessage,
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
