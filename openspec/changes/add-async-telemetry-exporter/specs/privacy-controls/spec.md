# Privacy Controls

## ADDED Requirements

### Requirement: Regex-Based Redaction

The plugin SHALL support regex-based redaction of sensitive content.

#### Scenario: Redaction pattern matching

- **WHEN** content matches a configured redaction regex
- **THEN** the plugin SHALL replace the matched content with `[REDACTED]`

#### Scenario: Multiple redaction patterns

- **WHEN** multiple redaction patterns are configured
- **THEN** the plugin SHALL apply all patterns to the content

#### Scenario: Default redaction patterns

- **WHEN** no custom patterns are configured
- **THEN** the plugin SHALL NOT redact any content by default

### Requirement: Metadata-Only Mode

The plugin SHALL support exporting only metadata without message content.

#### Scenario: Metadata-only export

- **WHEN** `OPENCODE_HELICONE_EXPORT_MODE` is set to `metadata_only`
- **THEN** the plugin SHALL export session ID, timestamps, model, and token counts
- **AND** the plugin SHALL NOT export message content or tool arguments

#### Scenario: Full export mode

- **WHEN** `OPENCODE_HELICONE_EXPORT_MODE` is set to `full` or not set
- **THEN** the plugin SHALL export complete message content and tool data

### Requirement: Export Disable

The plugin SHALL support completely disabling exports.

#### Scenario: Export disabled

- **WHEN** `OPENCODE_HELICONE_EXPORT_MODE` is set to `off`
- **THEN** the plugin SHALL NOT capture or export any telemetry data

### Requirement: Header Sanitization

The plugin SHALL sanitize values used in HTTP headers.

#### Scenario: Newline removal

- **WHEN** a session title contains newline characters
- **THEN** the plugin SHALL remove them before using in headers

#### Scenario: Control character removal

- **WHEN** a value contains control characters
- **THEN** the plugin SHALL remove characters matching `[\r\n\x00-\x1f\x7f]`
