# Design: Async Helicone Telemetry Exporter

## Context

OpenCode is an AI coding agent that makes LLM calls through various providers. Users want observability into their sessions via Helicone, but:

1. **Proxy routing is invasive**: Changing base URLs affects all providers
2. **Existing plugin is limited**: `opencode-helicone-session` only injects headers for proxy mode
3. **Reliability concerns**: LLM calls should never fail due to telemetry issues

This design describes an async/manual logging approach that captures session data and exports it to Helicone in the background.

## Goals / Non-Goals

### Goals

- Capture OpenCode session transcripts (messages, tool calls, results)
- Export to Helicone asynchronously using Manual Logger SDK
- Group all exports under Helicone Sessions with stable IDs
- Buffer and retry on Helicone failures
- Provide privacy controls (redaction, metadata-only)

### Non-Goals

- Proxy or modify LLM provider requests
- Capture streaming token-by-token (capture final results only)
- Provide real-time dashboards (Helicone handles this)
- Support non-Helicone observability platforms

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      OpenCode Runtime                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                 Plugin: Telemetry Exporter            │   │
│  │                                                       │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌──────────┐  │   │
│  │  │  Event      │───▶│  Telemetry  │───▶│  Privacy │  │   │
│  │  │  Handlers   │    │  Collector  │    │  Filter  │  │   │
│  │  └─────────────┘    └─────────────┘    └────┬─────┘  │   │
│  │                                              │        │   │
│  │                                              ▼        │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌──────────┐  │   │
│  │  │  Helicone   │◀───│   Queue     │◀───│  Spool   │  │   │
│  │  │  Exporter   │    │   Manager   │    │  (JSONL) │  │   │
│  │  └──────┬──────┘    └─────────────┘    └──────────┘  │   │
│  │         │                                             │   │
│  └─────────┼─────────────────────────────────────────────┘   │
│            │                                                  │
└────────────┼──────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────┐
│     Helicone API        │
│  (Manual Logger SDK)    │
└─────────────────────────┘
```

## Decisions

### Decision 1: Event-Driven Capture (Not Fetch Interception)

**What**: Subscribe to OpenCode plugin events rather than wrapping fetch.

**Why**: 
- OpenCode events provide structured data (messages, parts, tool calls)
- Fetch interception is complex and can break with provider changes
- Events are fired at the right granularity for logging

**Alternatives considered**:
- Wrap global fetch: Too invasive, hard to distinguish LLM vs other requests
- Read session files: Requires file watching, misses real-time events

### Decision 2: JSONL Spool Queue

**What**: Persist pending exports to JSONL files in `.opencode/helicone-spool/`.

**Why**:
- Survives process restarts
- Human-readable for debugging
- Append-only is simple and fast
- Easy to implement size/age limits

**Alternatives considered**:
- SQLite: Overkill for simple queue
- In-memory only: Loses data on crash
- LevelDB: Extra dependency

### Decision 3: Hash-Based Idempotency

**What**: Generate idempotency key from `hash(sessionId + messageId + timestamp)`.

**Why**:
- Prevents duplicate logs if same event is processed twice
- Helicone can dedupe on their side using `Helicone-Request-Id`
- Deterministic across restarts

**Format**: 
```typescript
const idempotencyKey = Bun.hash(`${sessionId}:${messageId}:${updatedAt}`).toString(16);
```

### Decision 4: Export on Session Idle

**What**: Trigger export when `session.idle` event fires (LLM done responding).

**Why**:
- Natural boundary for "complete" interactions
- Avoids exporting partial streaming data
- Reduces API call frequency

**Also export on**:
- Queue flush interval (configurable, default 30s)
- Plugin shutdown (graceful flush)

### Decision 5: Session Path Structure

**What**: Use hierarchical paths like `/opencode/<sessionId>/<messageIndex>`.

**Why**:
- Helicone Sessions UI shows hierarchy visually
- Easy to trace from session → message → tool call
- Consistent with Helicone recommendations

**Example paths**:
```
/opencode/abc123                    # Session root
/opencode/abc123/msg-1              # First message
/opencode/abc123/msg-1/tool-read    # Tool call within message
```

## Data Flow

### 1. Event Capture

```typescript
// On message.updated
telemetryCollector.recordMessage({
  sessionId: event.properties.sessionId,
  messageId: event.properties.messageId,
  role: event.properties.role,
  parts: event.properties.parts,
  timestamp: Date.now(),
});
```

### 2. Queue Enqueue

```typescript
// On session.idle or flush interval
const exportItem = {
  id: generateIdempotencyKey(session, message),
  sessionId: session.id,
  heliconeSessionId: sessionToUUID(session.id),
  heliconeSessionName: session.title,
  heliconeSessionPath: `/opencode/${session.id}`,
  request: formatRequest(message),
  response: formatResponse(message),
  createdAt: Date.now(),
  retryCount: 0,
};
spoolQueue.enqueue(exportItem);
```

### 3. Export to Helicone

```typescript
// Queue manager processes items
const logger = new HeliconeManualLogger({ apiKey });
await logger.logSingleRequest(item.request, item.response, {
  additionalHeaders: {
    'Helicone-Session-Id': item.heliconeSessionId,
    'Helicone-Session-Name': item.heliconeSessionName,
    'Helicone-Session-Path': item.heliconeSessionPath,
    'Helicone-Request-Id': item.id, // Idempotency
  },
});
```

## Risks / Trade-offs

### Risk: Message Part Updates Fire Multiple Times

**Mitigation**: Use idempotency keys to dedupe. Only export on `session.idle` for complete data.

### Risk: Large Sessions Exceed Helicone Limits

**Mitigation**: Chunk large transcripts. Document size limits. Consider compression.

### Risk: Spool Directory Grows Unbounded

**Mitigation**: 
- Max spool size (default 50MB)
- Max item age (default 7 days)
- Cleanup on successful export

### Trade-off: Delay vs Completeness

**Choice**: Prefer completeness. Wait for `session.idle` rather than streaming partial data.

**Consequence**: Logs appear in Helicone after interaction completes, not in real-time.

## Migration Plan

N/A - This is a new plugin with no existing users.

## Open Questions

1. **Should we support streaming chunk logging?** Current design waits for complete messages. Could add optional streaming mode later.

2. **What's the right flush interval?** Default 30s is a guess. May need tuning based on user feedback.

3. **Should we integrate with OpenCode's existing telemetry?** If OpenCode adds native telemetry, we should align with it.
