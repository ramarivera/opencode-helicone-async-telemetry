# Telemetry Capture

## ADDED Requirements

### Requirement: Session Tracking

The plugin SHALL track the current OpenCode session by subscribing to `session.created` and `session.updated` events.

#### Scenario: Session created

- **WHEN** OpenCode emits a `session.created` event
- **THEN** the plugin SHALL store the session ID and title for use in exports

#### Scenario: Session title updated

- **WHEN** OpenCode emits a `session.updated` event with a new title
- **THEN** the plugin SHALL update the stored session title

### Requirement: Message Collection

The plugin SHALL collect message data by subscribing to `message.updated` and `message.part.updated` events.

#### Scenario: User message received

- **WHEN** OpenCode emits a `message.updated` event with role "user"
- **THEN** the plugin SHALL record the message content and timestamp

#### Scenario: Assistant message received

- **WHEN** OpenCode emits a `message.updated` event with role "assistant"
- **THEN** the plugin SHALL record the message content, parts, and timestamp

#### Scenario: Message part updated

- **WHEN** OpenCode emits a `message.part.updated` event
- **THEN** the plugin SHALL update the corresponding message part data

### Requirement: Tool Call Collection

The plugin SHALL collect tool execution data by subscribing to `tool.execute.before` and `tool.execute.after` events.

#### Scenario: Tool execution starts

- **WHEN** OpenCode emits a `tool.execute.before` event
- **THEN** the plugin SHALL record the tool name, arguments, and start timestamp

#### Scenario: Tool execution completes

- **WHEN** OpenCode emits a `tool.execute.after` event
- **THEN** the plugin SHALL record the tool result and end timestamp

### Requirement: Transcript Assembly

The plugin SHALL assemble complete session transcripts from collected data.

#### Scenario: Session idle triggers assembly

- **WHEN** OpenCode emits a `session.idle` event
- **THEN** the plugin SHALL assemble all collected messages and tool calls into a transcript
- **AND** enqueue the transcript for export

#### Scenario: Transcript includes all message types

- **WHEN** a transcript is assembled
- **THEN** it SHALL include user messages, assistant messages, and tool call results in chronological order
