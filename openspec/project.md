# Project Context

## Purpose

**opencode-helicone-async-telemetry** is an OpenCode plugin that exports session transcripts and LLM interaction data to Helicone for observability, without proxying or modifying provider requests.

### Key Goals

1. **Non-invasive telemetry**: Export data asynchronously without affecting OpenCode's normal operation
2. **Session grouping**: Group all logs under Helicone Sessions using stable session IDs
3. **Resilience**: Helicone downtime must NOT break OpenCode; logs buffer and retry
4. **Privacy controls**: Configurable redaction and metadata-only modes

### What This Plugin Does NOT Do

- Does NOT route LLM requests through Helicone proxy
- Does NOT modify provider base URLs
- Does NOT intercept or transform LLM responses
- Does NOT block OpenCode UX waiting for Helicone

## Tech Stack

- **Runtime**: Bun (OpenCode plugin runtime)
- **Language**: TypeScript (strict mode)
- **Build**: Bun bundler targeting Bun runtime
- **Testing**: Vitest
- **Linting**: ESLint + Prettier
- **Package Manager**: Bun
- **Task Runner**: Mise

### Key Dependencies

- `@opencode-ai/plugin` - OpenCode plugin SDK
- `@helicone/helpers` - Helicone Manual Logger SDK (HeliconeManualLogger)

## Project Conventions

### Code Style

- **Single quotes** for strings
- **2-space indentation**
- **100 character line width**
- **Trailing commas** in ES5 style
- **Semicolons** required
- **Explicit type annotations** preferred over inference
- **Early returns** to avoid deep nesting (NeverNesters)

### Naming Conventions

- **Classes**: PascalCase (e.g., `TelemetryExporter`, `SpoolQueue`)
- **Functions/methods**: camelCase (e.g., `exportSession`, `flushQueue`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `MAX_RETRY_ATTEMPTS`)
- **Files**: kebab-case (e.g., `spool-queue.ts`, `helicone-exporter.ts`)
- **Status unions**: Use string literals (e.g., `'pending' | 'exporting' | 'failed'`)

### Architecture Patterns

- **Event-driven**: React to OpenCode plugin events (`session.*`, `message.*`, `tool.*`)
- **Non-blocking**: All Helicone exports are fire-and-forget with background queue
- **Durable queue**: JSONL file-based spool for at-least-once delivery
- **Idempotent exports**: Hash-based deduplication to prevent duplicate logs

### Error Handling

- Check error types before accessing properties: `error instanceof Error ? error.message : String(error)`
- Log errors with `[ERROR]` prefix
- Never throw from event handlers (fail silently, queue for retry)
- Exponential backoff for retries

### Testing Strategy

- **Unit tests**: Core logic (UUID derivation, queue operations, idempotency)
- **Integration tests**: End-to-end export flow with mocked Helicone API
- **Fixture-based**: Use fixture files for transcript parsing tests
- **Framework**: Vitest with `describe`/`it` blocks

### Git Workflow

- **Branch strategy**: Feature branches from `main`
- **Commit format**: Conventional commits (`feat:`, `fix:`, `chore:`, etc.)
- **Release**: Automated via release-please

## Domain Context

### OpenCode Plugin Events

The plugin hooks into these OpenCode events:

| Event | When Fired | Data Available |
|-------|-----------|----------------|
| `session.created` | New session starts | Session ID, title |
| `session.updated` | Session metadata changes | Session ID, title |
| `session.idle` | LLM finishes responding | Session state |
| `message.updated` | Message content changes | Message parts, role |
| `message.part.updated` | Individual part changes | Tool calls, text chunks |
| `tool.execute.before` | Before tool runs | Tool name, args |
| `tool.execute.after` | After tool completes | Tool result |

### Helicone Manual Logger

The plugin uses `HeliconeManualLogger` for async logging:

```typescript
import { HeliconeManualLogger } from '@helicone/helpers';

const logger = new HeliconeManualLogger({
  apiKey: process.env.HELICONE_API_KEY,
});

await logger.logSingleRequest(requestBody, JSON.stringify(response), {
  additionalHeaders: {
    'Helicone-Session-Id': sessionUUID,
    'Helicone-Session-Name': sessionTitle,
    'Helicone-Session-Path': '/opencode/session',
  },
});
```

### Helicone Session Headers

| Header | Purpose | Example |
|--------|---------|---------|
| `Helicone-Session-Id` | Groups requests (UUID) | `550e8400-e29b-41d4-a716-446655440000` |
| `Helicone-Session-Name` | Human-readable name | `"Code Review Session"` |
| `Helicone-Session-Path` | Hierarchical trace path | `/opencode/session/message-1` |

### Session ID Derivation

Following the pattern from `opencode-helicone-session`:

```typescript
function sessionToUUID(sessionId: string): string {
  const hash = Bun.hash(sessionId);
  const hashHex = hash.toString(16).padStart(16, '0');
  const fullHex = (hashHex + hashHex).slice(0, 32);
  return [
    fullHex.slice(0, 8),
    fullHex.slice(8, 12),
    fullHex.slice(12, 16),
    fullHex.slice(16, 20),
    fullHex.slice(20, 32),
  ].join('-');
}
```

## Important Constraints

### Non-Functional Requirements

1. **Zero impact on OpenCode UX**: All exports are non-blocking
2. **Graceful degradation**: Helicone unavailability must not affect OpenCode
3. **At-least-once delivery**: Logs must eventually reach Helicone
4. **Bounded storage**: Spool queue has size/age limits
5. **Privacy-first**: Support for redaction and metadata-only modes

### Configuration Requirements

Environment variables (preferred):
- `HELICONE_API_KEY` - Required for authentication
- `HELICONE_ENDPOINT` - Optional, defaults to Helicone API
- `OPENCODE_HELICONE_EXPORT_MODE` - `full` | `metadata_only` | `off`
- `OPENCODE_HELICONE_REDACT_REGEX` - Comma-separated regex patterns

Plugin config in `opencode.json`:
- `enable` - Boolean to enable/disable
- `flushInterval` - Milliseconds between queue flushes
- `spoolDirectory` - Override spool location
- `sessionPathPrefix` - Prefix for Helicone session paths

## External Dependencies

### Helicone API

- **Endpoint**: `https://api.hconeai.com/custom/v1/log` (default)
- **Auth**: Bearer token via `Helicone-Auth` header
- **SDK**: `@helicone/helpers` (HeliconeManualLogger)

### OpenCode Plugin SDK

- **Package**: `@opencode-ai/plugin`
- **Version**: `^1.0.85`
- **Provides**: Plugin type, event types, tool helper

### File System

- **Spool location**: `.opencode/helicone-spool/` (default)
- **Format**: JSONL for pending exports
- **Cleanup**: Automatic based on age/size limits
