# Change: Implement Async Helicone Telemetry Exporter

## Why

OpenCode users need observability into their AI coding sessions without the complexity or latency of proxy-based solutions. The existing `opencode-helicone-session` plugin only injects headers for proxy routing—it doesn't support async/manual logging. This plugin fills that gap by exporting session data to Helicone asynchronously, with resilience features like buffering and retry.

## What Changes

### New Capabilities

- **Telemetry Capture**: Hook into OpenCode events to capture session transcripts, messages, and tool calls
- **Export Queue**: Durable JSONL-based spool with at-least-once delivery, exponential backoff retries
- **Helicone Integration**: Use `HeliconeManualLogger` to send logs with proper session grouping
- **Privacy Controls**: Configurable redaction patterns and metadata-only mode
- **Configuration**: Environment variables and plugin config for flexibility

### Key Design Decisions

1. **Event-driven capture**: Subscribe to OpenCode events rather than intercepting fetch
2. **Background queue**: Non-blocking exports with persistent spool
3. **Idempotency**: Hash-based deduplication prevents duplicate logs
4. **Graceful degradation**: Helicone failures never block OpenCode

### **BREAKING**: None

This is a new plugin with no breaking changes.

## Impact

- **Affected specs**: None (new capabilities)
- **Affected code**: 
  - `src/index.ts` - Plugin entry point
  - `src/telemetry/` - Event capture logic
  - `src/queue/` - Spool queue implementation
  - `src/exporter/` - Helicone integration
  - `src/privacy/` - Redaction utilities
  - `src/config/` - Configuration loader
