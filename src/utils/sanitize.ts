/**
 * Sanitization utilities for HTTP headers and content.
 */

/**
 * Sanitizes a value to prevent HTTP header injection.
 * Removes control characters that could cause header injection attacks.
 *
 * @param value - The string to sanitize
 * @returns The sanitized string safe for use in HTTP headers
 */
export function sanitizeForHeader(value: string): string {
  // Remove carriage returns, newlines, and other control characters (ASCII 0-31 and 127)
  let result = '';
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code >= 32 && code !== 127) {
      result += char;
    }
  }
  return result.trim();
}

/**
 * Truncates a string to a maximum length, adding ellipsis if truncated.
 *
 * @param value - The string to truncate
 * @param maxLength - Maximum length (default 255 for HTTP header safety)
 * @returns The truncated string
 */
export function truncateForHeader(value: string, maxLength: number = 255): string {
  const sanitized = sanitizeForHeader(value);
  if (sanitized.length <= maxLength) {
    return sanitized;
  }
  return `${sanitized.slice(0, maxLength - 3)}...`;
}

/**
 * Ensures a session name is safe and has a fallback.
 *
 * @param title - The session title (may be undefined or empty)
 * @param fallbackId - A fallback identifier if title is missing
 * @returns A safe session name for headers
 */
export function safeSessionName(title: string | undefined, fallbackId: string): string {
  if (title && title.trim().length > 0) {
    return truncateForHeader(title);
  }
  return truncateForHeader(`Session ${fallbackId}`);
}
