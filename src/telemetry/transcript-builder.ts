/**
 * Transcript builder for assembling complete session transcripts.
 */

import type { MessageCollector } from './message-collector.ts';
import type { SessionTracker } from './session-tracker.ts';
import type { ToolCollector } from './tool-collector.ts';
import type { SessionTranscript } from './types.ts';

/**
 * Builds complete session transcripts from collected data.
 */
export class TranscriptBuilder {
  private sessionTracker: SessionTracker;
  private messageCollector: MessageCollector;
  private toolCollector: ToolCollector;

  constructor(
    sessionTracker: SessionTracker,
    messageCollector: MessageCollector,
    toolCollector: ToolCollector
  ) {
    this.sessionTracker = sessionTracker;
    this.messageCollector = messageCollector;
    this.toolCollector = toolCollector;
  }

  /**
   * Build a complete transcript for the current session.
   */
  build(): SessionTranscript | null {
    const session = this.sessionTracker.getSession();
    if (!session) {
      return null;
    }

    const messages = this.messageCollector.getMessages().filter((m) => m.sessionId === session.id);

    const toolCalls = this.toolCollector.getToolCallsForSession(session.id);

    return {
      session,
      messages,
      toolCalls,
      assembledAt: Date.now(),
    };
  }

  /**
   * Build and clear the transcript data for the current session.
   */
  buildAndClear(): SessionTranscript | null {
    const transcript = this.build();
    if (transcript) {
      this.messageCollector.clearSession(transcript.session.id);
      this.toolCollector.clearSession(transcript.session.id);
    }
    return transcript;
  }

  /**
   * Check if there's data to export.
   */
  hasData(): boolean {
    return this.sessionTracker.hasSession() && this.messageCollector.count() > 0;
  }
}

/**
 * Create a transcript builder.
 */
export function createTranscriptBuilder(
  sessionTracker: SessionTracker,
  messageCollector: MessageCollector,
  toolCollector: ToolCollector
): TranscriptBuilder {
  return new TranscriptBuilder(sessionTracker, messageCollector, toolCollector);
}
