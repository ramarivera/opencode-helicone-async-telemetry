# Configuration

## ADDED Requirements

### Requirement: Environment Variable Configuration

The plugin SHALL support configuration via environment variables.

#### Scenario: API key from environment

- **WHEN** `HELICONE_API_KEY` environment variable is set
- **THEN** the plugin SHALL use it for Helicone authentication

#### Scenario: Missing API key

- **WHEN** `HELICONE_API_KEY` is not set and not in plugin config
- **THEN** the plugin SHALL log an error and disable exports

#### Scenario: Custom endpoint

- **WHEN** `HELICONE_ENDPOINT` environment variable is set
- **THEN** the plugin SHALL use it instead of the default Helicone API endpoint

#### Scenario: Export mode

- **WHEN** `OPENCODE_HELICONE_EXPORT_MODE` is set to `full`, `metadata_only`, or `off`
- **THEN** the plugin SHALL use the specified export mode

#### Scenario: Redaction patterns

- **WHEN** `OPENCODE_HELICONE_REDACT_REGEX` is set to a comma-separated list
- **THEN** the plugin SHALL parse and apply each regex pattern for redaction

### Requirement: Plugin Config in opencode.json

The plugin SHALL support configuration via opencode.json.

#### Scenario: Enable/disable toggle

- **WHEN** plugin config contains `"enable": false`
- **THEN** the plugin SHALL disable all telemetry capture and export

#### Scenario: Custom flush interval

- **WHEN** plugin config contains `"flushInterval": 60000`
- **THEN** the plugin SHALL flush the queue every 60 seconds

#### Scenario: Custom spool directory

- **WHEN** plugin config contains `"spoolDirectory": "/custom/path"`
- **THEN** the plugin SHALL use the specified directory for spool files

#### Scenario: Session path prefix

- **WHEN** plugin config contains `"sessionPathPrefix": "/myapp"`
- **THEN** the plugin SHALL prefix all session paths with `/myapp`

### Requirement: Configuration Priority

The plugin SHALL respect configuration priority order.

#### Scenario: Environment overrides config file

- **WHEN** both environment variable and plugin config specify the same setting
- **THEN** the environment variable SHALL take precedence

### Requirement: Default Values

The plugin SHALL use sensible defaults for all optional configuration.

#### Scenario: Default endpoint

- **WHEN** no endpoint is configured
- **THEN** the plugin SHALL use `https://api.hconeai.com/custom/v1/log`

#### Scenario: Default flush interval

- **WHEN** no flush interval is configured
- **THEN** the plugin SHALL use 30000 milliseconds (30 seconds)

#### Scenario: Default spool directory

- **WHEN** no spool directory is configured
- **THEN** the plugin SHALL use `.opencode/helicone-spool/`

#### Scenario: Default export mode

- **WHEN** no export mode is configured
- **THEN** the plugin SHALL use `full` mode
