# Implementation Tasks

## 1. Project Setup

- [x] 1.1 Add `@helicone/helpers` dependency to package.json
- [x] 1.2 Create directory structure (`src/telemetry/`, `src/queue/`, `src/exporter/`, `src/privacy/`, `src/config/`)
- [x] 1.3 Set up test fixtures directory (`test/fixtures/`)
- [x] 1.4 Update tsconfig.json for strict mode and path aliases

## 2. Configuration System

- [x] 2.1 Create `src/config/types.ts` with configuration interfaces
- [x] 2.2 Create `src/config/loader.ts` to read env vars and plugin config
- [x] 2.3 Create `src/config/defaults.ts` with default values
- [ ] 2.4 Write unit tests for configuration loading

## 3. Session ID Utilities

- [x] 3.1 Create `src/utils/session-id.ts` with `sessionToUUID()` function
- [x] 3.2 Create `src/utils/sanitize.ts` for header sanitization
- [x] 3.3 Write unit tests for UUID derivation (deterministic, collision-resistant)

## 4. Privacy Controls

- [x] 4.1 Create `src/privacy/redactor.ts` with regex-based redaction
- [x] 4.2 Create `src/privacy/filter.ts` for metadata-only mode
- [x] 4.3 Write unit tests for redaction patterns

## 5. Export Queue (Spool)

- [x] 5.1 Create `src/queue/types.ts` with queue item interfaces
- [x] 5.2 Create `src/queue/spool.ts` for JSONL file persistence
- [x] 5.3 Create `src/queue/idempotency.ts` for hash-based deduplication
- [x] 5.4 Create `src/queue/manager.ts` for queue lifecycle management
- [x] 5.5 Implement exponential backoff retry logic
- [x] 5.6 Implement size/age-based cleanup
- [x] 5.7 Write unit tests for queue operations

## 6. Telemetry Capture

- [x] 6.1 Create `src/telemetry/types.ts` with captured data interfaces
- [x] 6.2 Create `src/telemetry/session-tracker.ts` to track current session
- [x] 6.3 Create `src/telemetry/message-collector.ts` to collect message parts
- [x] 6.4 Create `src/telemetry/tool-collector.ts` to collect tool executions
- [x] 6.5 Create `src/telemetry/transcript-builder.ts` to assemble full transcripts
- [ ] 6.6 Write unit tests with fixture files

## 7. Helicone Exporter

- [x] 7.1 Create `src/exporter/types.ts` with Helicone request interfaces
- [x] 7.2 Create `src/exporter/logger.ts` wrapping HeliconeManualLogger
- [x] 7.3 Create `src/exporter/formatter.ts` to format logs for Helicone
- [x] 7.4 Implement session header injection (Session-Id, Session-Name, Session-Path)
- [ ] 7.5 Write integration tests with mocked Helicone API

## 8. Plugin Integration

- [x] 8.1 Refactor `src/index.ts` to wire all components
- [x] 8.2 Subscribe to OpenCode events (`session.*`, `message.*`, `tool.*`)
- [x] 8.3 Implement graceful shutdown (flush queue on exit)
- [x] 8.4 Add status logging (queued, success, failed)
- [ ] 8.5 Write end-to-end integration tests

## 9. Documentation

- [x] 9.1 Update README.md with installation and configuration
- [x] 9.2 Add example opencode.json configuration
- [x] 9.3 Add example .env file
- [x] 9.4 Document troubleshooting steps
- [x] 9.5 Document how to verify in Helicone Sessions UI

## 10. Quality Assurance

- [x] 10.1 Run full test suite (`mise run test`)
- [x] 10.2 Run linter (`mise run lint`)
- [x] 10.3 Build plugin (`mise run build`)
- [ ] 10.4 Manual testing with real OpenCode session
- [ ] 10.5 Verify logs appear in Helicone dashboard
