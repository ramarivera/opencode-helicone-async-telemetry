# opencode-helicone-async-telemetry

> **⚠️ EXPERIMENTAL - ARCHIVED**
>
> This project is **experimental and incomplete**. Testing could not be completed due to:
>
> - **Self-hosted Helicone**: The Docker images do not include the worker service required for the Manual Logger SDK (`/custom/v1/log` endpoint)
> - **Helicone Cloud**: Restrictive free tier plans prevented full end-to-end testing
>
> The code is provided as-is for reference. Use at your own risk.

An OpenCode plugin that exports session transcripts and LLM interaction data to [Helicone](https://helicone.ai) asynchronously using the Manual Logger SDK. No proxy or request interception required.

## Features

- **Async Export**: Exports transcripts after session completion, no request proxying
- **Durable Queue**: JSONL-based spool with at-least-once delivery guarantees
- **Idempotent**: Hash-based deduplication prevents duplicate exports
- **Privacy Controls**: Configurable redaction patterns and metadata-only mode
- **Session Tracking**: Full session hierarchy visible in Helicone Sessions UI
- **Graceful Degradation**: Helicone failures never block OpenCode UX

## Installation

```bash
bun add opencode-helicone-async-telemetry
# or
npm install opencode-helicone-async-telemetry
```

## Configuration

### Environment Variables

| Variable                        | Required | Description                                                                                                                   |
| ------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `HELICONE_API_KEY`              | Yes      | Your Helicone API key                                                                                                         |
| `HELICONE_ENDPOINT`             | No       | Base URL for Helicone API (default: `https://api.worker.helicone.ai`). **Do not include `/custom/v1/log`** - the SDK adds it. |
| `OPENCODE_HELICONE_EXPORT_MODE` | No       | Export mode: `full`, `metadata_only`, or `off` (default: `full`)                                                              |

### OpenCode Plugin Configuration

Add to your `opencode.json`:

```json
{
  "plugins": {
    "opencode-helicone-async-telemetry": {
      "enable": true,
      "flushInterval": 30000,
      "sessionPathPrefix": "/opencode",
      "redactPatterns": ["sk-[a-zA-Z0-9]+", "password\\s*[:=]\\s*\\S+"]
    }
  }
}
```

### Configuration Options

| Option              | Type     | Default                    | Description                               |
| ------------------- | -------- | -------------------------- | ----------------------------------------- |
| `enable`            | boolean  | `true`                     | Enable/disable the exporter               |
| `flushInterval`     | number   | `30000`                    | Queue flush interval in milliseconds      |
| `spoolDirectory`    | string   | `.opencode/helicone-spool` | Directory for pending exports             |
| `sessionPathPrefix` | string   | `/opencode`                | Prefix for Helicone session paths         |
| `maxSpoolSize`      | number   | `52428800`                 | Maximum spool size in bytes (50MB)        |
| `maxSpoolAge`       | number   | `604800000`                | Maximum item age in milliseconds (7 days) |
| `maxRetries`        | number   | `5`                        | Max retry attempts before dead letter     |
| `retryBaseDelay`    | number   | `1000`                     | Base delay for exponential backoff        |
| `redactPatterns`    | string[] | `[]`                       | Regex patterns for content redaction      |

## Export Modes

### `full` (default)

Exports complete message content with optional redaction patterns applied.

### `metadata_only`

Exports only metadata (roles, timestamps, token counts) without message content. Useful for privacy-sensitive environments.

### `off`

Disables all exports. Events are still captured but not sent to Helicone.

## How It Works

1. **Event Subscription**: The plugin subscribes to OpenCode events (`session.*`, `message.*`, `tool.*`)
2. **Data Collection**: Messages and tool calls are collected in memory
3. **Transcript Assembly**: On `session.idle`, a complete transcript is assembled
4. **Queue & Export**: Transcripts are written to a JSONL spool for durable persistence
5. **Async Delivery**: A background process flushes the queue to Helicone with retries

### Session Paths

Sessions appear in Helicone with hierarchical paths:

- `/opencode/<session-id>` - Session root
- `/opencode/<session-id>/msg-0` - First message
- `/opencode/<session-id>/msg-1/tool-bash` - Tool call within message

## Privacy & Security

### Redaction Patterns

Add regex patterns to automatically redact sensitive content:

```json
{
  "redactPatterns": [
    "sk-[a-zA-Z0-9]+",
    "AKIA[A-Z0-9]{16}",
    "password\\s*[:=]\\s*\\S+",
    "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}"
  ]
}
```

Matched content is replaced with `[REDACTED]`.

### Metadata-Only Mode

Set `OPENCODE_HELICONE_EXPORT_MODE=metadata_only` to export only:

- Message roles and timestamps
- Part counts and types
- Tool names and durations
- Model information

No actual message content or tool arguments are exported.

## Viewing in Helicone

1. Log into [Helicone Dashboard](https://helicone.ai)
2. Navigate to **Sessions** in the sidebar
3. Filter by session path prefix (e.g., `/opencode`)
4. Click on a session to view the full trace

## Troubleshooting

### Exports not appearing in Helicone

1. Verify `HELICONE_API_KEY` is set correctly
2. Check `.opencode/helicone-spool/logs/plugin.log` for errors
3. Check `.opencode/helicone-spool/` for pending items
4. Look for error files with `.dead` extension (exceeded retries)

### "Not Found" errors in logs

The Manual Logger SDK requires Helicone's **worker** service (`/custom/v1/log` endpoint). Self-hosted Helicone Docker setups may not include this service. Use Helicone Cloud or ensure your self-hosted setup includes the worker.

### High memory usage

Reduce `maxSpoolSize` or `flushInterval` to flush more frequently.

### Sensitive data appearing in Helicone

1. Add appropriate patterns to `redactPatterns`
2. Switch to `metadata_only` mode for maximum privacy

## Known Limitations

- **Self-hosted Helicone**: The default Docker Compose setup does not include the worker service required for the Manual Logger SDK. The jawn API (`/v1/log/request`) uses a different schema.
- **Helicone Cloud**: Requires a paid plan for full functionality. Free tier has significant limitations.
- **No end-to-end testing**: Due to the above limitations, this plugin has not been fully tested against a working Helicone instance.

## Development

```bash
# Install dependencies
bun install

# Build
mise run build

# Test
mise run test

# Lint
mise run lint
```

## License

MIT License. See [LICENSE](LICENSE) for details.

## Author

Ramiro Rivera <ramarivera@users.noreply.github.com>

## Repository

https://github.com/ramarivera/opencode-helicone-async-telemetry
