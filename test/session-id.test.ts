/**
 * Unit tests for session ID utilities.
 */

import { describe, expect, it } from 'vitest';

import { generateIdempotencyKey, isValidUUID, sessionToUUID } from '../src/utils/session-id.ts';

describe('sessionToUUID', () => {
  it('should return a valid UUID format', () => {
    const sessionId = 'test-session-123';
    const uuid = sessionToUUID(sessionId);

    expect(isValidUUID(uuid)).toBe(true);
  });

  it('should be deterministic - same input always produces same output', () => {
    const sessionId = 'my-session-abc';
    const uuid1 = sessionToUUID(sessionId);
    const uuid2 = sessionToUUID(sessionId);
    const uuid3 = sessionToUUID(sessionId);

    expect(uuid1).toBe(uuid2);
    expect(uuid2).toBe(uuid3);
  });

  it('should produce different UUIDs for different session IDs', () => {
    const uuid1 = sessionToUUID('session-a');
    const uuid2 = sessionToUUID('session-b');
    const uuid3 = sessionToUUID('session-c');

    expect(uuid1).not.toBe(uuid2);
    expect(uuid2).not.toBe(uuid3);
    expect(uuid1).not.toBe(uuid3);
  });

  it('should handle empty string', () => {
    const uuid = sessionToUUID('');

    expect(isValidUUID(uuid)).toBe(true);
  });

  it('should handle special characters', () => {
    const uuid = sessionToUUID('session-with-special!@#$%^&*()_+-=[]{}|;:,.<>?');

    expect(isValidUUID(uuid)).toBe(true);
  });

  it('should handle very long session IDs', () => {
    const longSessionId = 'a'.repeat(1000);
    const uuid = sessionToUUID(longSessionId);

    expect(isValidUUID(uuid)).toBe(true);
  });

  it('should handle unicode characters', () => {
    const uuid = sessionToUUID('session-日本語-emoji-🚀');

    expect(isValidUUID(uuid)).toBe(true);
  });
});

describe('generateIdempotencyKey', () => {
  it('should generate a hex string', () => {
    const key = generateIdempotencyKey('session-1', 'msg-1', Date.now());

    expect(/^[0-9a-f]+$/.test(key)).toBe(true);
  });

  it('should be deterministic for same inputs', () => {
    const timestamp = 1703500000000;
    const key1 = generateIdempotencyKey('session-1', 'msg-1', timestamp);
    const key2 = generateIdempotencyKey('session-1', 'msg-1', timestamp);

    expect(key1).toBe(key2);
  });

  it('should produce different keys for different session IDs', () => {
    const timestamp = Date.now();
    const key1 = generateIdempotencyKey('session-a', 'msg-1', timestamp);
    const key2 = generateIdempotencyKey('session-b', 'msg-1', timestamp);

    expect(key1).not.toBe(key2);
  });

  it('should produce different keys for different message IDs', () => {
    const timestamp = Date.now();
    const key1 = generateIdempotencyKey('session-1', 'msg-a', timestamp);
    const key2 = generateIdempotencyKey('session-1', 'msg-b', timestamp);

    expect(key1).not.toBe(key2);
  });

  it('should produce different keys for different timestamps', () => {
    const key1 = generateIdempotencyKey('session-1', 'msg-1', 1000);
    const key2 = generateIdempotencyKey('session-1', 'msg-1', 2000);

    expect(key1).not.toBe(key2);
  });
});

describe('isValidUUID', () => {
  it('should return true for valid UUIDs', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUUID('00000000-0000-0000-0000-000000000000')).toBe(true);
    expect(isValidUUID('ffffffff-ffff-ffff-ffff-ffffffffffff')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
    expect(isValidUUID('550e8400-E29B-41d4-A716-446655440000')).toBe(true);
  });

  it('should return false for invalid formats', () => {
    expect(isValidUUID('')).toBe(false);
    expect(isValidUUID('not-a-uuid')).toBe(false);
    expect(isValidUUID('550e8400e29b41d4a716446655440000')).toBe(false); // no dashes
    expect(isValidUUID('550e8400-e29b-41d4-a716-44665544000')).toBe(false); // too short
    expect(isValidUUID('550e8400-e29b-41d4-a716-4466554400000')).toBe(false); // too long
    expect(isValidUUID('gggggggg-gggg-gggg-gggg-gggggggggggg')).toBe(false); // invalid hex
  });
});
