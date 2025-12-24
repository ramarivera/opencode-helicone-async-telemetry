/**
 * Unit tests for idempotency tracking.
 */

import { describe, expect, it } from 'vitest';

import { createIdempotencyTracker, IdempotencyTracker } from '../src/queue/idempotency.ts';

describe('IdempotencyTracker', () => {
  describe('has', () => {
    it('should return false for unseen keys', () => {
      const tracker = new IdempotencyTracker();

      expect(tracker.has('new-key')).toBe(false);
    });

    it('should return true for previously added keys', () => {
      const tracker = new IdempotencyTracker();
      tracker.add('my-key');

      expect(tracker.has('my-key')).toBe(true);
    });
  });

  describe('add', () => {
    it('should add a key to the tracker', () => {
      const tracker = new IdempotencyTracker();
      tracker.add('key-1');

      expect(tracker.has('key-1')).toBe(true);
      expect(tracker.size()).toBe(1);
    });

    it('should not duplicate existing keys', () => {
      const tracker = new IdempotencyTracker();
      tracker.add('key-1');
      tracker.add('key-1');
      tracker.add('key-1');

      expect(tracker.size()).toBe(1);
    });

    it('should evict oldest keys when at capacity', () => {
      const tracker = new IdempotencyTracker(3);
      tracker.add('key-1');
      tracker.add('key-2');
      tracker.add('key-3');

      expect(tracker.size()).toBe(3);
      expect(tracker.has('key-1')).toBe(true);

      // Adding a 4th key should evict key-1
      tracker.add('key-4');

      expect(tracker.size()).toBe(3);
      expect(tracker.has('key-1')).toBe(false);
      expect(tracker.has('key-2')).toBe(true);
      expect(tracker.has('key-3')).toBe(true);
      expect(tracker.has('key-4')).toBe(true);
    });
  });

  describe('remove', () => {
    it('should remove an existing key', () => {
      const tracker = new IdempotencyTracker();
      tracker.add('key-1');
      tracker.add('key-2');

      expect(tracker.has('key-1')).toBe(true);

      tracker.remove('key-1');

      expect(tracker.has('key-1')).toBe(false);
      expect(tracker.has('key-2')).toBe(true);
      expect(tracker.size()).toBe(1);
    });

    it('should handle removing non-existent keys', () => {
      const tracker = new IdempotencyTracker();
      tracker.add('key-1');

      // Should not throw
      tracker.remove('non-existent');

      expect(tracker.size()).toBe(1);
    });
  });

  describe('clear', () => {
    it('should remove all keys', () => {
      const tracker = new IdempotencyTracker();
      tracker.add('key-1');
      tracker.add('key-2');
      tracker.add('key-3');

      expect(tracker.size()).toBe(3);

      tracker.clear();

      expect(tracker.size()).toBe(0);
      expect(tracker.has('key-1')).toBe(false);
      expect(tracker.has('key-2')).toBe(false);
      expect(tracker.has('key-3')).toBe(false);
    });
  });

  describe('size', () => {
    it('should return 0 for empty tracker', () => {
      const tracker = new IdempotencyTracker();

      expect(tracker.size()).toBe(0);
    });

    it('should return correct count', () => {
      const tracker = new IdempotencyTracker();
      tracker.add('key-1');
      tracker.add('key-2');

      expect(tracker.size()).toBe(2);
    });
  });

  describe('FIFO eviction', () => {
    it('should evict in first-in-first-out order', () => {
      const tracker = new IdempotencyTracker(5);

      // Add 5 keys
      tracker.add('a');
      tracker.add('b');
      tracker.add('c');
      tracker.add('d');
      tracker.add('e');

      // Add 3 more, evicting a, b, c
      tracker.add('f');
      tracker.add('g');
      tracker.add('h');

      expect(tracker.has('a')).toBe(false);
      expect(tracker.has('b')).toBe(false);
      expect(tracker.has('c')).toBe(false);
      expect(tracker.has('d')).toBe(true);
      expect(tracker.has('e')).toBe(true);
      expect(tracker.has('f')).toBe(true);
      expect(tracker.has('g')).toBe(true);
      expect(tracker.has('h')).toBe(true);
    });
  });
});

describe('createIdempotencyTracker', () => {
  it('should create a tracker with default max size', () => {
    const tracker = createIdempotencyTracker();

    expect(tracker).toBeInstanceOf(IdempotencyTracker);
    expect(tracker.size()).toBe(0);
  });

  it('should create a tracker with custom max size', () => {
    const tracker = createIdempotencyTracker(100);

    // Add 101 items
    for (let i = 0; i < 101; i++) {
      tracker.add(`key-${i}`);
    }

    expect(tracker.size()).toBe(100);
    expect(tracker.has('key-0')).toBe(false); // First one evicted
    expect(tracker.has('key-100')).toBe(true); // Last one present
  });
});
