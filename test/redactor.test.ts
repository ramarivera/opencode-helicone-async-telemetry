/**
 * Unit tests for redaction utilities.
 */

import { describe, expect, it } from 'vitest';

import { createRedactor, Redactor } from '../src/privacy/redactor.ts';

describe('Redactor', () => {
  describe('constructor', () => {
    it('should create a redactor with valid patterns', () => {
      const redactor = new Redactor(['password', 'secret']);

      expect(redactor.hasPatterns()).toBe(true);
    });

    it('should skip invalid regex patterns', () => {
      // '[' is an invalid regex (unclosed bracket)
      const redactor = new Redactor(['valid', '[invalid', 'also-valid']);

      expect(redactor.hasPatterns()).toBe(true);
    });

    it('should handle empty patterns array', () => {
      const redactor = new Redactor([]);

      expect(redactor.hasPatterns()).toBe(false);
    });

    it('should filter out empty strings', () => {
      const redactor = new Redactor(['', 'valid', '']);

      expect(redactor.hasPatterns()).toBe(true);
    });
  });

  describe('redact', () => {
    it('should redact matching content', () => {
      const redactor = new Redactor(['secret']);
      const result = redactor.redact('This is a secret message');

      expect(result).toBe('This is a [REDACTED] message');
    });

    it('should be case-insensitive', () => {
      const redactor = new Redactor(['secret']);
      const result = redactor.redact('SECRET and Secret and secret');

      expect(result).toBe('[REDACTED] and [REDACTED] and [REDACTED]');
    });

    it('should handle multiple patterns', () => {
      const redactor = new Redactor(['password', 'apikey', 'token']);
      const result = redactor.redact('password=123, apikey=abc, token=xyz');

      expect(result).toBe('[REDACTED]=123, [REDACTED]=abc, [REDACTED]=xyz');
    });

    it('should handle regex patterns', () => {
      const redactor = new Redactor(['sk-[a-zA-Z0-9]+']);
      const result = redactor.redact('API key: sk-abc123XYZ');

      expect(result).toBe('API key: [REDACTED]');
    });

    it('should return unchanged content when no patterns', () => {
      const redactor = new Redactor([]);
      const result = redactor.redact('This should not change');

      expect(result).toBe('This should not change');
    });

    it('should handle multiple occurrences', () => {
      const redactor = new Redactor(['pass\\w+']);
      const result = redactor.redact('password1 and password2 are passwords');

      expect(result).toBe('[REDACTED] and [REDACTED] are [REDACTED]');
    });

    it('should handle email-like patterns', () => {
      const redactor = new Redactor(['[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}']);
      const result = redactor.redact('Contact me at user@example.com or admin@test.org');

      expect(result).toBe('Contact me at [REDACTED] or [REDACTED]');
    });
  });

  describe('redactObject', () => {
    it('should redact strings in simple objects', () => {
      const redactor = new Redactor(['secret']);
      const obj = { key: 'This is secret data' };
      const result = redactor.redactObject(obj);

      expect(result).toEqual({ key: 'This is [REDACTED] data' });
    });

    it('should redact strings in nested objects', () => {
      const redactor = new Redactor(['password']);
      const obj = {
        level1: {
          level2: {
            data: 'password=123',
          },
        },
      };
      const result = redactor.redactObject(obj);

      expect(result).toEqual({
        level1: {
          level2: {
            data: '[REDACTED]=123',
          },
        },
      });
    });

    it('should redact strings in arrays', () => {
      const redactor = new Redactor(['secret']);
      const arr = ['no secret here', 'this has secret', 'clean'];
      const result = redactor.redactObject(arr);

      expect(result).toEqual(['no [REDACTED] here', 'this has [REDACTED]', 'clean']);
    });

    it('should handle mixed arrays and objects', () => {
      const redactor = new Redactor(['token']);
      const obj = {
        items: [{ value: 'token-123' }, { value: 'safe' }],
      };
      const result = redactor.redactObject(obj);

      expect(result).toEqual({
        items: [{ value: '[REDACTED]-123' }, { value: 'safe' }],
      });
    });

    it('should preserve non-string values', () => {
      const redactor = new Redactor(['secret']);
      const obj = {
        number: 42,
        boolean: true,
        nullValue: null,
        string: 'secret data',
      };
      const result = redactor.redactObject(obj);

      expect(result).toEqual({
        number: 42,
        boolean: true,
        nullValue: null,
        string: '[REDACTED] data',
      });
    });

    it('should return unchanged object when no patterns', () => {
      const redactor = new Redactor([]);
      const obj = { secret: 'value' };
      const result = redactor.redactObject(obj);

      expect(result).toBe(obj); // Should be same reference
    });

    it('should handle direct string input', () => {
      const redactor = new Redactor(['secret']);
      const result = redactor.redactObject('This is secret');

      expect(result).toBe('This is [REDACTED]');
    });
  });
});

describe('createRedactor', () => {
  it('should create a functional redactor', () => {
    const redactor = createRedactor(['test']);

    expect(redactor).toBeInstanceOf(Redactor);
    expect(redactor.redact('test data')).toBe('[REDACTED] data');
  });
});
