/**
 * Queue manager for coordinating export operations.
 */

import type { HeliconeExporterConfig } from '../config/types.ts';
import { createIdempotencyTracker, type IdempotencyTracker } from './idempotency.ts';
import { createSpoolManager, type SpoolManager } from './spool.ts';
import type { QueueItem, QueueStats } from './types.ts';

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
      return;
    }

    this.flushTimer = setInterval(() => {
      this.flush().catch(() => {
        // Errors are handled in flush()
      });
    }, this.config.flushInterval);

    // Initial cleanup
    this.spool.cleanup().catch(() => {
      // Ignore cleanup errors on startup
    });
  }

  /**
   * Stop the queue manager.
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Enqueue an item for export.
   */
  async enqueue(item: QueueItem): Promise<boolean> {
    // Check idempotency
    if (this.idempotency.has(item.id)) {
      return false;
    }

    // Check if already in spool
    const existing = await this.spool.read(item.id);
    if (existing) {
      this.idempotency.add(item.id);
      return false;
    }

    // Write to spool
    await this.spool.write(item);
    this.idempotency.add(item.id);
    return true;
  }

  /**
   * Process all pending items.
   */
  async flush(): Promise<number> {
    if (this.isProcessing || !this.processor) {
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

      for (const item of toProcess) {
        try {
          // Mark as processing
          item.status = 'processing';
          item.lastAttemptAt = Date.now();
          await this.spool.write(item);

          // Process the item
          await this.processor(item);

          // Success - remove from spool
          this.spool.delete(item.id);
          processed++;
        } catch (error) {
          // Handle failure
          item.retryCount++;
          item.error = error instanceof Error ? error.message : String(error);

          if (item.retryCount >= this.config.maxRetries) {
            // Move to dead letter
            item.status = 'dead';
          } else {
            // Mark for retry with backoff
            item.status = 'failed';
          }

          await this.spool.write(item);
        }
      }

      // Periodic cleanup
      await this.spool.cleanup();
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
    this.stop();

    // Final flush attempt
    if (this.processor) {
      await this.flush();
    }
  }
}

/**
 * Create a queue manager with the given configuration.
 */
export function createQueueManager(config: HeliconeExporterConfig): QueueManager {
  return new QueueManager(config);
}
