/**
 * Default configuration values for the Helicone exporter.
 */

import type { HeliconeExporterConfig } from './types.ts';

/**
 * Default Helicone API endpoint base URL.
 *
 * NOTE: Do NOT include the path `/custom/v1/log` - the @helicone/helpers SDK
 * automatically appends the appropriate path based on the provider.
 *
 * For self-hosted Helicone, use just the base URL, e.g.:
 *   HELICONE_ENDPOINT=http://localhost:8585
 */
export const DEFAULT_ENDPOINT = 'https://api.worker.helicone.ai';

/** Default flush interval: 30 seconds */
export const DEFAULT_FLUSH_INTERVAL = 30_000;

/** Default spool directory relative to project root */
export const DEFAULT_SPOOL_DIRECTORY = '.opencode/helicone-spool';

/** Default max spool size: 50MB */
export const DEFAULT_MAX_SPOOL_SIZE = 50 * 1024 * 1024;

/** Default max spool age: 7 days */
export const DEFAULT_MAX_SPOOL_AGE = 7 * 24 * 60 * 60 * 1000;

/** Default max retry attempts */
export const DEFAULT_MAX_RETRIES = 5;

/** Default base delay for exponential backoff: 1 second */
export const DEFAULT_RETRY_BASE_DELAY = 1_000;

/** Default session path prefix */
export const DEFAULT_SESSION_PATH_PREFIX = '/opencode';

/**
 * Get default configuration with a placeholder API key.
 * The API key must be provided via environment or config.
 */
export function getDefaultConfig(): Omit<HeliconeExporterConfig, 'apiKey'> & { apiKey: string } {
  return {
    apiKey: '',
    endpoint: DEFAULT_ENDPOINT,
    exportMode: 'full',
    enabled: true,
    flushInterval: DEFAULT_FLUSH_INTERVAL,
    spoolDirectory: DEFAULT_SPOOL_DIRECTORY,
    maxSpoolSize: DEFAULT_MAX_SPOOL_SIZE,
    maxSpoolAge: DEFAULT_MAX_SPOOL_AGE,
    maxRetries: DEFAULT_MAX_RETRIES,
    retryBaseDelay: DEFAULT_RETRY_BASE_DELAY,
    sessionPathPrefix: DEFAULT_SESSION_PATH_PREFIX,
    redactPatterns: [],
  };
}
