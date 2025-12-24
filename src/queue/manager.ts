/**
 * Queue manager for coordinating export operations.
 */

import type { HeliconeExporterConfig } from '../config/types.ts';
import { createLogger } from '../logger.ts';
import { createIdempotencyTracker, type IdempotencyTracker } from './idempotency.ts';
import { createSpoolManager, type SpoolManager } from './spool.ts';
import type { QueueItem, QueueStats } from './types.ts';

const log = createLogger('queue');

/**
 * Callback for processing queue items.
 */
export type ProcessCallback = (_item: QueueItem) => Promise<void>;

/**
 * Queue manager that coordinates spool persistence, retries, and processing.
 */
export class QueueManager {
  private spool: SpoolManager;
  private idempotency: IdempotencyTracker;
  private config: HeliconeExporterConfig;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private processor: ProcessCallback | null = null;
  private isProcessing = false;

  constructor(config: HeliconeExporterConfig) {
    this.config = config;
    this.spool = createSpoolManager(config.spoolDirectory, config.maxSpoolSize, config.maxSpoolAge);
    this.idempotency = createIdempotencyTracker();
    log.debug(
      {
        spoolDirectory: config.spoolDirectory,
        flushInterval: config.flushInterval,
        maxRetries: config.maxRetries,
      },
      'Queue manager created'
    );
  }

  /**
   * Set the processor callback for handling queue items.
   */
  setProcessor(processor: ProcessCallback): void {
    this.processor = processor;
  }

  /**
   * Start the queue manager with periodic flushing.
   */
  start(): void {
    if (this.flushTimer) {
      log.debug('Queue manager already started');
      return;
    }

    log.info({ flushInterval: this.config.flushInterval }, 'Starting queue manager');

    this.flushTimer = setInterval(() => {
      this.flush().catch((error) => {
        log.error({ error: error instanceof Error ? error.message : String(error) }, 'Flush error');
      });
    }, this.config.flushInterval);

    // Initial cleanup
    this.spool.cleanup().catch((error) => {
      log.warn(
        { error: error instanceof Error ? error.message : String(error) },
        'Initial cleanup error'
      );
    });
  }

  /**
   * Stop the queue manager.
   */
  stop(): void {
    if (this.flushTimer) {
      log.info('Stopping queue manager');
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Enqueue an item for export.
   */
  async enqueue(item: QueueItem): Promise<boolean> {
    log.debug({ itemId: item.id, sessionId: item.sessionId }, 'Attempting to enqueue item');

    // Check idempotency
    if (this.idempotency.has(item.id)) {
      log.debug({ itemId: item.id }, 'Item already in idempotency tracker');
      return false;
    }

    // Check if already in spool
    const existing = await this.spool.read(item.id);
    if (existing) {
      log.debug({ itemId: item.id }, 'Item already exists in spool');
      this.idempotency.add(item.id);
      return false;
    }

    // Write to spool
    await this.spool.write(item);
    this.idempotency.add(item.id);
    log.info({ itemId: item.id, sessionId: item.sessionId }, 'Item enqueued successfully');
    return true;
  }

  /**
   * Process all pending items.
   */
  async flush(): Promise<number> {
    if (this.isProcessing) {
      log.debug('Flush skipped - already processing');
      return 0;
    }

    if (!this.processor) {
      log.debug('Flush skipped - no processor set');
      return 0;
    }

    this.isProcessing = true;
    let processed = 0;

    try {
      // Get pending and failed items
      const pending = await this.spool.getByStatus('pending');
      const failed = await this.spool.getByStatus('failed');

      // Process pending first, then failed (for retry)
      const toProcess = [...pending, ...failed];

      if (toProcess.length > 0) {
        log.info({ pendingCount: pending.length, failedCount: failed.length }, 'Starting flush');
      }

      for (const item of toProcess) {
        try {
          log.debug({ itemId: item.id, retryCount: item.retryCount }, 'Processing item');

          // Mark as processing
          item.status = 'processing';
          item.lastAttemptAt = Date.now();
          await this.spool.write(item);

          // Process the item
          await this.processor(item);

          // Success - remove from spool
          this.spool.delete(item.id);
          processed++;
          log.info({ itemId: item.id }, 'Item processed successfully');
        } catch (error) {
          // Handle failure
          item.retryCount++;
          item.error = error instanceof Error ? error.message : String(error);

          log.error(
            { itemId: item.id, retryCount: item.retryCount, error: item.error },
            'Item processing failed'
          );

          if (item.retryCount >= this.config.maxRetries) {
            // Move to dead letter
            item.status = 'dead';
            log.warn(
              { itemId: item.id, maxRetries: this.config.maxRetries },
              'Item moved to dead letter'
            );
          } else {
            // Mark for retry with backoff
            item.status = 'failed';
            const nextRetryDelay = this.getRetryDelay(item.retryCount);
            log.debug({ itemId: item.id, nextRetryDelay }, 'Item scheduled for retry');
          }

          await this.spool.write(item);
        }
      }

      // Periodic cleanup
      await this.spool.cleanup();

      if (processed > 0) {
        log.info({ processed }, 'Flush completed');
      }
    } finally {
      this.isProcessing = false;
    }

    return processed;
  }

  /**
   * Calculate the delay for the next retry attempt.
   */
  getRetryDelay(retryCount: number): number {
    return this.config.retryBaseDelay * 2 ** retryCount;
  }

  /**
   * Get queue statistics.
   */
  async getStats(): Promise<QueueStats> {
    return this.spool.getStats();
  }

  /**
   * Gracefully shutdown, flushing remaining items.
   */
  async shutdown(): Promise<void> {
    log.info('Shutting down queue manager');
    this.stop();

    // Final flush attempt
    if (this.processor) {
      log.debug('Performing final flush');
      await this.flush();
    }

    log.info('Queue manager shutdown complete');
  }
}

/**
 * Create a queue manager with the given configuration.
 */
export function createQueueManager(config: HeliconeExporterConfig): QueueManager {
  return new QueueManager(config);
}
