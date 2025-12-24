/**
 * Idempotency tracking to prevent duplicate exports.
 */

/**
 * In-memory set of recently processed idempotency keys.
 * Used as a fast check before hitting the spool.
 */
export class IdempotencyTracker {
  private processed: Set<string>;
  private maxSize: number;
  private keys: string[]; // For FIFO eviction

  constructor(maxSize: number = 10000) {
    this.processed = new Set();
    this.maxSize = maxSize;
    this.keys = [];
  }

  /**
   * Check if a key has been processed.
   */
  has(key: string): boolean {
    return this.processed.has(key);
  }

  /**
   * Mark a key as processed.
   */
  add(key: string): void {
    if (this.processed.has(key)) {
      return;
    }

    // Evict oldest if at capacity
    if (this.keys.length >= this.maxSize) {
      const oldest = this.keys.shift();
      if (oldest) {
        this.processed.delete(oldest);
      }
    }

    this.processed.add(key);
    this.keys.push(key);
  }

  /**
   * Remove a key from the tracker.
   */
  remove(key: string): void {
    this.processed.delete(key);
    const index = this.keys.indexOf(key);
    if (index !== -1) {
      this.keys.splice(index, 1);
    }
  }

  /**
   * Clear all tracked keys.
   */
  clear(): void {
    this.processed.clear();
    this.keys = [];
  }

  /**
   * Get the number of tracked keys.
   */
  size(): number {
    return this.processed.size;
  }
}

/**
 * Create an idempotency tracker.
 */
export function createIdempotencyTracker(maxSize?: number): IdempotencyTracker {
  return new IdempotencyTracker(maxSize);
}
