# Implementation Tasks

## 1. Project Setup

- [ ] 1.1 Add `@helicone/helpers` dependency to package.json
- [ ] 1.2 Create directory structure (`src/telemetry/`, `src/queue/`, `src/exporter/`, `src/privacy/`, `src/config/`)
- [ ] 1.3 Set up test fixtures directory (`test/fixtures/`)
- [ ] 1.4 Update tsconfig.json for strict mode and path aliases

## 2. Configuration System

- [ ] 2.1 Create `src/config/types.ts` with configuration interfaces
- [ ] 2.2 Create `src/config/loader.ts` to read env vars and plugin config
- [ ] 2.3 Create `src/config/defaults.ts` with default values
- [ ] 2.4 Write unit tests for configuration loading

## 3. Session ID Utilities

- [ ] 3.1 Create `src/utils/session-id.ts` with `sessionToUUID()` function
- [ ] 3.2 Create `src/utils/sanitize.ts` for header sanitization
- [ ] 3.3 Write unit tests for UUID derivation (deterministic, collision-resistant)

## 4. Privacy Controls

- [ ] 4.1 Create `src/privacy/redactor.ts` with regex-based redaction
- [ ] 4.2 Create `src/privacy/filter.ts` for metadata-only mode
- [ ] 4.3 Write unit tests for redaction patterns

## 5. Export Queue (Spool)

- [ ] 5.1 Create `src/queue/types.ts` with queue item interfaces
- [ ] 5.2 Create `src/queue/spool.ts` for JSONL file persistence
- [ ] 5.3 Create `src/queue/idempotency.ts` for hash-based deduplication
- [ ] 5.4 Create `src/queue/manager.ts` for queue lifecycle management
- [ ] 5.5 Implement exponential backoff retry logic
- [ ] 5.6 Implement size/age-based cleanup
- [ ] 5.7 Write unit tests for queue operations

## 6. Telemetry Capture

- [ ] 6.1 Create `src/telemetry/types.ts` with captured data interfaces
- [ ] 6.2 Create `src/telemetry/session-tracker.ts` to track current session
- [ ] 6.3 Create `src/telemetry/message-collector.ts` to collect message parts
- [ ] 6.4 Create `src/telemetry/tool-collector.ts` to collect tool executions
- [ ] 6.5 Create `src/telemetry/transcript-builder.ts` to assemble full transcripts
- [ ] 6.6 Write unit tests with fixture files

## 7. Helicone Exporter

- [ ] 7.1 Create `src/exporter/types.ts` with Helicone request interfaces
- [ ] 7.2 Create `src/exporter/logger.ts` wrapping HeliconeManualLogger
- [ ] 7.3 Create `src/exporter/formatter.ts` to format logs for Helicone
- [ ] 7.4 Implement session header injection (Session-Id, Session-Name, Session-Path)
- [ ] 7.5 Write integration tests with mocked Helicone API

## 8. Plugin Integration

- [ ] 8.1 Refactor `src/index.ts` to wire all components
- [ ] 8.2 Subscribe to OpenCode events (`session.*`, `message.*`, `tool.*`)
- [ ] 8.3 Implement graceful shutdown (flush queue on exit)
- [ ] 8.4 Add status logging (queued, success, failed)
- [ ] 8.5 Write end-to-end integration tests

## 9. Documentation

- [ ] 9.1 Update README.md with installation and configuration
- [ ] 9.2 Add example opencode.json configuration
- [ ] 9.3 Add example .env file
- [ ] 9.4 Document troubleshooting steps
- [ ] 9.5 Document how to verify in Helicone Sessions UI

## 10. Quality Assurance

- [ ] 10.1 Run full test suite (`mise run test`)
- [ ] 10.2 Run linter (`mise run lint`)
- [ ] 10.3 Build plugin (`mise run build`)
- [ ] 10.4 Manual testing with real OpenCode session
- [ ] 10.5 Verify logs appear in Helicone dashboard
