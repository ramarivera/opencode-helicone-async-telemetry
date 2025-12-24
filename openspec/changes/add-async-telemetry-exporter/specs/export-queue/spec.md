# Export Queue

## ADDED Requirements

### Requirement: Durable Spool Storage

The plugin SHALL persist pending exports to disk using JSONL format.

#### Scenario: Export item enqueued

- **WHEN** a transcript is ready for export
- **THEN** the plugin SHALL append it to a JSONL file in the spool directory
- **AND** the file SHALL survive process restarts

#### Scenario: Spool directory location

- **WHEN** the plugin initializes
- **THEN** it SHALL create the spool directory at `.opencode/helicone-spool/` by default
- **OR** use the directory specified in configuration

### Requirement: Idempotency Keys

The plugin SHALL generate idempotent keys to prevent duplicate exports.

#### Scenario: Idempotency key generation

- **WHEN** an export item is created
- **THEN** the plugin SHALL generate an idempotency key from `hash(sessionId + messageId + timestamp)`
- **AND** the key SHALL be deterministic for the same input

#### Scenario: Duplicate detection

- **WHEN** an export item with an existing idempotency key is enqueued
- **THEN** the plugin SHALL skip the duplicate item

### Requirement: Retry with Exponential Backoff

The plugin SHALL retry failed exports with exponential backoff.

#### Scenario: Export failure triggers retry

- **WHEN** an export to Helicone fails
- **THEN** the plugin SHALL increment the retry count
- **AND** schedule a retry after `baseDelay * 2^retryCount` milliseconds

#### Scenario: Maximum retries exceeded

- **WHEN** an export exceeds the maximum retry count (default 5)
- **THEN** the plugin SHALL move the item to a dead-letter queue
- **AND** log an error message

### Requirement: Queue Size Limits

The plugin SHALL enforce size limits on the spool queue.

#### Scenario: Maximum spool size

- **WHEN** the spool directory exceeds the maximum size (default 50MB)
- **THEN** the plugin SHALL delete the oldest items to make room

#### Scenario: Maximum item age

- **WHEN** a spool item exceeds the maximum age (default 7 days)
- **THEN** the plugin SHALL delete the expired item

### Requirement: Flush Interval

The plugin SHALL periodically flush the queue to Helicone.

#### Scenario: Interval-based flush

- **WHEN** the flush interval elapses (default 30 seconds)
- **THEN** the plugin SHALL process all pending items in the queue

#### Scenario: Graceful shutdown flush

- **WHEN** the plugin is shutting down
- **THEN** the plugin SHALL flush all pending items before exiting
