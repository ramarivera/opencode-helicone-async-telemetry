/**
 * Configuration loader that merges environment variables with plugin config.
 * Environment variables take precedence over plugin config.
 */

import { getDefaultConfig } from './defaults.ts';
import type { ExportMode, HeliconeExporterConfig, PluginConfigInput } from './types.ts';

/**
 * Parse export mode from string, defaulting to 'full' if invalid.
 */
function parseExportMode(value: string | undefined): ExportMode {
  if (value === 'full' || value === 'metadata_only' || value === 'off') {
    return value;
  }
  return 'full';
}

/**
 * Parse comma-separated regex patterns.
 */
function parseRedactPatterns(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Parse a number from environment variable.
 */
function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Load configuration from environment variables and plugin config.
 * Environment variables take precedence.
 */
export function loadConfig(pluginConfig?: PluginConfigInput): HeliconeExporterConfig {
  const defaults = getDefaultConfig();
  const env = process.env;

  // Start with defaults
  const config: HeliconeExporterConfig = { ...defaults };

  // Apply plugin config (lower priority)
  if (pluginConfig) {
    if (pluginConfig.enable !== undefined) {
      config.enabled = pluginConfig.enable;
    }
    if (pluginConfig.flushInterval !== undefined) {
      config.flushInterval = pluginConfig.flushInterval;
    }
    if (pluginConfig.spoolDirectory !== undefined) {
      config.spoolDirectory = pluginConfig.spoolDirectory;
    }
    if (pluginConfig.sessionPathPrefix !== undefined) {
      config.sessionPathPrefix = pluginConfig.sessionPathPrefix;
    }
    if (pluginConfig.maxSpoolSize !== undefined) {
      config.maxSpoolSize = pluginConfig.maxSpoolSize;
    }
    if (pluginConfig.maxSpoolAge !== undefined) {
      config.maxSpoolAge = pluginConfig.maxSpoolAge;
    }
    if (pluginConfig.maxRetries !== undefined) {
      config.maxRetries = pluginConfig.maxRetries;
    }
    if (pluginConfig.retryBaseDelay !== undefined) {
      config.retryBaseDelay = pluginConfig.retryBaseDelay;
    }
    if (pluginConfig.redactPatterns !== undefined) {
      config.redactPatterns = pluginConfig.redactPatterns;
    }
  }

  // Apply environment variables (higher priority)
  if (env.HELICONE_API_KEY) {
    config.apiKey = env.HELICONE_API_KEY;
  }

  if (env.HELICONE_ENDPOINT) {
    config.endpoint = env.HELICONE_ENDPOINT;
  }

  if (env.OPENCODE_HELICONE_EXPORT_MODE) {
    config.exportMode = parseExportMode(env.OPENCODE_HELICONE_EXPORT_MODE);
  }

  if (env.OPENCODE_HELICONE_REDACT_REGEX) {
    config.redactPatterns = parseRedactPatterns(env.OPENCODE_HELICONE_REDACT_REGEX);
  }

  if (env.OPENCODE_HELICONE_FLUSH_INTERVAL) {
    config.flushInterval = parseNumber(env.OPENCODE_HELICONE_FLUSH_INTERVAL, config.flushInterval);
  }

  if (env.OPENCODE_HELICONE_SPOOL_DIRECTORY) {
    config.spoolDirectory = env.OPENCODE_HELICONE_SPOOL_DIRECTORY;
  }

  // Disable if export mode is 'off'
  if (config.exportMode === 'off') {
    config.enabled = false;
  }

  return config;
}

/**
 * Validate configuration and return errors if invalid.
 */
export function validateConfig(config: HeliconeExporterConfig): string[] {
  const errors: string[] = [];

  if (config.enabled && !config.apiKey) {
    errors.push('HELICONE_API_KEY is required when exporter is enabled');
  }

  if (config.flushInterval < 1000) {
    errors.push('flushInterval must be at least 1000ms');
  }

  if (config.maxRetries < 0) {
    errors.push('maxRetries must be non-negative');
  }

  if (config.retryBaseDelay < 100) {
    errors.push('retryBaseDelay must be at least 100ms');
  }

  // Validate regex patterns
  for (const pattern of config.redactPatterns) {
    try {
      new RegExp(pattern);
    } catch {
      errors.push(`Invalid redaction regex pattern: ${pattern}`);
    }
  }

  return errors;
}
