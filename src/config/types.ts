/**
 * Configuration types for the Helicone async telemetry exporter.
 */

/**
 * Export mode determines what data is sent to Helicone.
 */
export type ExportMode = 'full' | 'metadata_only' | 'off';

/**
 * Plugin configuration from opencode.json or environment variables.
 */
export interface HeliconeExporterConfig {
  /** Helicone API key for authentication */
  apiKey: string;

  /** Helicone API endpoint (defaults to https://api.hconeai.com/custom/v1/log) */
  endpoint: string;

  /** Export mode: full, metadata_only, or off */
  exportMode: ExportMode;

  /** Enable/disable the exporter */
  enabled: boolean;

  /** Flush interval in milliseconds (default 30000) */
  flushInterval: number;

  /** Spool directory for pending exports */
  spoolDirectory: string;

  /** Maximum spool size in bytes (default 50MB) */
  maxSpoolSize: number;

  /** Maximum age of spool items in milliseconds (default 7 days) */
  maxSpoolAge: number;

  /** Maximum retry attempts before moving to dead letter (default 5) */
  maxRetries: number;

  /** Base delay for exponential backoff in milliseconds (default 1000) */
  retryBaseDelay: number;

  /** Session path prefix for Helicone session paths */
  sessionPathPrefix: string;

  /** Comma-separated regex patterns for redaction */
  redactPatterns: string[];
}

/**
 * Partial configuration for merging with defaults.
 */
export type PartialConfig = Partial<HeliconeExporterConfig>;

/**
 * Plugin configuration from opencode.json.
 */
export interface PluginConfigInput {
  enable?: boolean;
  flushInterval?: number;
  spoolDirectory?: string;
  sessionPathPrefix?: string;
  maxSpoolSize?: number;
  maxSpoolAge?: number;
  maxRetries?: number;
  retryBaseDelay?: number;
  redactPatterns?: string[];
}
