/**
 * JSONL-based spool for durable queue persistence.
 */

import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import type { QueueItem, QueueStats } from './types.ts';

/**
 * JSONL spool file manager for persisting queue items to disk.
 */
export class SpoolManager {
  private directory: string;
  private maxSize: number;
  private maxAge: number;

  constructor(directory: string, maxSize: number, maxAge: number) {
    this.directory = directory;
    this.maxSize = maxSize;
    this.maxAge = maxAge;
    this.ensureDirectory();
  }

  /**
   * Ensure the spool directory exists.
   */
  private ensureDirectory(): void {
    if (!existsSync(this.directory)) {
      mkdirSync(this.directory, { recursive: true });
    }
  }

  /**
   * Get the path for a queue item's spool file.
   */
  private getItemPath(id: string): string {
    return join(this.directory, `${id}.json`);
  }

  /**
   * Write a queue item to the spool.
   */
  async write(item: QueueItem): Promise<void> {
    const path = this.getItemPath(item.id);
    await Bun.write(path, JSON.stringify(item));
  }

  /**
   * Read a queue item from the spool.
   */
  async read(id: string): Promise<QueueItem | null> {
    const path = this.getItemPath(id);
    if (!existsSync(path)) {
      return null;
    }
    try {
      const content = await Bun.file(path).text();
      return JSON.parse(content) as QueueItem;
    } catch {
      return null;
    }
  }

  /**
   * Delete a queue item from the spool.
   */
  delete(id: string): void {
    const path = this.getItemPath(id);
    if (existsSync(path)) {
      unlinkSync(path);
    }
  }

  /**
   * List all queue items in the spool.
   */
  async listAll(): Promise<QueueItem[]> {
    this.ensureDirectory();
    const files = readdirSync(this.directory).filter((f) => f.endsWith('.json'));
    const items: QueueItem[] = [];

    for (const file of files) {
      const id = file.replace('.json', '');
      const item = await this.read(id);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * Get items by status.
   */
  async getByStatus(status: QueueItem['status']): Promise<QueueItem[]> {
    const all = await this.listAll();
    return all.filter((item) => item.status === status);
  }

  /**
   * Get queue statistics.
   */
  async getStats(): Promise<QueueStats> {
    const all = await this.listAll();
    let spoolSizeBytes = 0;
    let oldestItemAt: number | undefined;

    for (const item of all) {
      const path = this.getItemPath(item.id);
      if (existsSync(path)) {
        const stat = statSync(path);
        spoolSizeBytes += stat.size;
      }
      if (oldestItemAt === undefined || item.createdAt < oldestItemAt) {
        oldestItemAt = item.createdAt;
      }
    }

    return {
      pending: all.filter((i) => i.status === 'pending').length,
      processing: all.filter((i) => i.status === 'processing').length,
      failed: all.filter((i) => i.status === 'failed').length,
      dead: all.filter((i) => i.status === 'dead').length,
      spoolSizeBytes,
      oldestItemAt,
    };
  }

  /**
   * Clean up old and oversized items.
   */
  async cleanup(): Promise<number> {
    const now = Date.now();
    const all = await this.listAll();
    let cleaned = 0;

    // Remove expired items
    for (const item of all) {
      if (now - item.createdAt > this.maxAge) {
        this.delete(item.id);
        cleaned++;
      }
    }

    // Check size and remove oldest if over limit
    const stats = await this.getStats();
    if (stats.spoolSizeBytes > this.maxSize) {
      const remaining = await this.listAll();
      // Sort by creation time, oldest first
      remaining.sort((a, b) => a.createdAt - b.createdAt);

      let currentSize = stats.spoolSizeBytes;
      for (const item of remaining) {
        if (currentSize <= this.maxSize) {
          break;
        }
        const path = this.getItemPath(item.id);
        if (existsSync(path)) {
          const stat = statSync(path);
          currentSize -= stat.size;
          this.delete(item.id);
          cleaned++;
        }
      }
    }

    return cleaned;
  }
}

/**
 * Create a spool manager with the given configuration.
 */
export function createSpoolManager(
  directory: string,
  maxSize: number,
  maxAge: number
): SpoolManager {
  return new SpoolManager(directory, maxSize, maxAge);
}
