/**
 * Content redaction utilities for privacy controls.
 */

/** Placeholder text for redacted content */
const REDACTED_PLACEHOLDER = '[REDACTED]';

/**
 * Redactor that applies regex patterns to sanitize sensitive content.
 */
export class Redactor {
  private patterns: RegExp[];

  /**
   * Create a new Redactor with the given regex patterns.
   *
   * @param patterns - Array of regex pattern strings
   */
  constructor(patterns: string[]) {
    this.patterns = patterns
      .filter((p) => p.length > 0)
      .map((p) => {
        try {
          return new RegExp(p, 'gi');
        } catch {
          // Skip invalid patterns
          return null;
        }
      })
      .filter((p): p is RegExp => p !== null);
  }

  /**
   * Check if the redactor has any active patterns.
   */
  hasPatterns(): boolean {
    return this.patterns.length > 0;
  }

  /**
   * Redact sensitive content from a string.
   *
   * @param content - The content to redact
   * @returns The redacted content
   */
  redact(content: string): string {
    if (!this.hasPatterns()) {
      return content;
    }

    let result = content;
    for (const pattern of this.patterns) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0;
      result = result.replace(pattern, REDACTED_PLACEHOLDER);
    }
    return result;
  }

  /**
   * Redact sensitive content from an object recursively.
   * Only processes string values.
   *
   * @param obj - The object to redact
   * @returns A new object with redacted string values
   */
  redactObject<T>(obj: T): T {
    if (!this.hasPatterns()) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.redact(obj) as T;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactObject(item)) as T;
    }

    if (obj !== null && typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.redactObject(value);
      }
      return result as T;
    }

    return obj;
  }
}

/**
 * Create a redactor from configuration.
 *
 * @param patterns - Array of regex pattern strings
 * @returns A configured Redactor instance
 */
export function createRedactor(patterns: string[]): Redactor {
  return new Redactor(patterns);
}
