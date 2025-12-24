# Helicone Integration

## ADDED Requirements

### Requirement: Manual Logger SDK Usage

The plugin SHALL use the Helicone Manual Logger SDK for async logging.

#### Scenario: Logger initialization

- **WHEN** the plugin initializes
- **THEN** it SHALL create a `HeliconeManualLogger` instance with the configured API key

#### Scenario: Log request export

- **WHEN** an export item is processed
- **THEN** the plugin SHALL call `logSingleRequest()` with the request body and response

### Requirement: Session Header Injection

The plugin SHALL inject Helicone session headers on all exports.

#### Scenario: Session ID header

- **WHEN** an export is sent to Helicone
- **THEN** the plugin SHALL include `Helicone-Session-Id` header with a UUID derived from the OpenCode session ID

#### Scenario: Session name header

- **WHEN** an export is sent to Helicone
- **THEN** the plugin SHALL include `Helicone-Session-Name` header with the session title

#### Scenario: Session path header

- **WHEN** an export is sent to Helicone
- **THEN** the plugin SHALL include `Helicone-Session-Path` header with a hierarchical path

### Requirement: Session ID Derivation

The plugin SHALL derive a stable UUID from OpenCode session IDs.

#### Scenario: Deterministic UUID generation

- **WHEN** a session ID is converted to UUID
- **THEN** the same session ID SHALL always produce the same UUID

#### Scenario: UUID format

- **WHEN** a UUID is generated
- **THEN** it SHALL be in standard UUID format (8-4-4-4-12 hex digits)

### Requirement: Session Path Structure

The plugin SHALL use hierarchical paths for session tracing.

#### Scenario: Session root path

- **WHEN** a session-level log is exported
- **THEN** the path SHALL be `/opencode/<sessionId>`

#### Scenario: Message path

- **WHEN** a message-level log is exported
- **THEN** the path SHALL be `/opencode/<sessionId>/msg-<index>`

#### Scenario: Tool call path

- **WHEN** a tool call log is exported
- **THEN** the path SHALL be `/opencode/<sessionId>/msg-<index>/tool-<name>`

### Requirement: Request ID for Idempotency

The plugin SHALL include idempotency keys in exports.

#### Scenario: Request ID header

- **WHEN** an export is sent to Helicone
- **THEN** the plugin SHALL include `Helicone-Request-Id` header with the idempotency key
