/**
 * Session ID utilities for converting OpenCode session IDs to Helicone-compatible UUIDs.
 */

/**
 * Converts a session ID to a consistent UUID format.
 * Uses Bun's hash function to generate a deterministic UUID from the session ID.
 *
 * @param sessionId - The OpenCode session ID
 * @returns A UUID string in standard format (8-4-4-4-12)
 */
export function sessionToUUID(sessionId: string): string {
  const hash = Bun.hash(sessionId);
  const hashHex = hash.toString(16).padStart(16, '0');

  // Double the hash to get 32 hex characters for a full UUID
  const fullHex = (hashHex + hashHex).slice(0, 32);

  return [
    fullHex.slice(0, 8),
    fullHex.slice(8, 12),
    fullHex.slice(12, 16),
    fullHex.slice(16, 20),
    fullHex.slice(20, 32),
  ].join('-');
}

/**
 * Generates an idempotency key from session, message, and timestamp.
 * This ensures duplicate events don't result in duplicate exports.
 *
 * @param sessionId - The session ID
 * @param messageId - The message ID (or other unique identifier)
 * @param timestamp - The timestamp of the event
 * @returns A hex string suitable for use as an idempotency key
 */
export function generateIdempotencyKey(
  sessionId: string,
  messageId: string,
  timestamp: number
): string {
  const input = `${sessionId}:${messageId}:${timestamp}`;
  return Bun.hash(input).toString(16);
}

/**
 * Validates that a string looks like a valid UUID.
 *
 * @param uuid - The string to validate
 * @returns True if the string matches UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
