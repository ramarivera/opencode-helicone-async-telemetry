/**
 * Centralized pino logger for the Helicone async telemetry plugin.
 *
 * Logs are written to `.opencode/helicone-spool/logs/plugin.log`.
 * This directory should be gitignored.
 *
 * Control log level via HELICONE_LOG_LEVEL environment variable.
 * Default level is 'debug' for maximum visibility during development.
 */

import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import pino, { type Logger } from 'pino';

/**
 * Base directory for all spool data including logs.
 */
const SPOOL_BASE_DIR = '.opencode/helicone-spool';

/**
 * Directory for log files.
 */
const LOG_DIR = join(SPOOL_BASE_DIR, 'logs');

/**
 * Path to the main plugin log file.
 */
const LOG_FILE = join(LOG_DIR, 'plugin.log');

/**
 * Ensure the log directory exists.
 */
function ensureLogDir(): void {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
}

/**
 * Get the log level from environment or default to 'debug'.
 */
function getLogLevel(): string {
  return process.env.HELICONE_LOG_LEVEL || 'debug';
}

/**
 * Create a child logger with a specific component name.
 *
 * @param name - Component name for log context (e.g., 'index', 'queue', 'exporter')
 * @returns A pino logger instance
 *
 * @example
 * ```typescript
 * import { createLogger } from './logger.ts';
 *
 * const logger = createLogger('queue');
 * logger.info({ itemId: 'abc123' }, 'Item enqueued');
 * logger.error({ error: err.message }, 'Export failed');
 * ```
 */
export function createLogger(name: string): Logger {
  ensureLogDir();

  return pino(
    {
      name: `helicone-telemetry:${name}`,
      level: getLogLevel(),
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => ({ level: label }),
      },
    },
    pino.destination({
      dest: LOG_FILE,
      sync: false, // Async writes for better performance
    })
  );
}

/**
 * Shared logger instance for quick imports.
 * Prefer createLogger(name) for component-specific logging.
 */
export const logger = createLogger('main');

/**
 * Log directory path for external reference.
 */
export const LOG_DIRECTORY = LOG_DIR;

/**
 * Log file path for external reference.
 */
export const LOG_FILE_PATH = LOG_FILE;
