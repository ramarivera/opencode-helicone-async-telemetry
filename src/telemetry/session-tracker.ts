/**
 * Session tracker for managing the current OpenCode session.
 */

import type { TrackedSession } from './types.ts';

/**
 * Tracks the current session and its metadata.
 */
export class SessionTracker {
  private currentSession: TrackedSession | null = null;

  /**
   * Get the current session.
   */
  getSession(): TrackedSession | null {
    return this.currentSession;
  }

  /**
   * Check if there is an active session.
   */
  hasSession(): boolean {
    return this.currentSession !== null;
  }

  /**
   * Handle session created event.
   */
  onSessionCreated(id: string, title: string): void {
    const now = Date.now();
    this.currentSession = {
      id,
      title: title || `Session ${id.slice(0, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Handle session updated event.
   */
  onSessionUpdated(id: string, title?: string): void {
    if (!this.currentSession || this.currentSession.id !== id) {
      // Session doesn't match, create new
      this.onSessionCreated(id, title || '');
      return;
    }

    this.currentSession.updatedAt = Date.now();
    if (title !== undefined) {
      this.currentSession.title = title;
    }
  }

  /**
   * Clear the current session.
   */
  clear(): void {
    this.currentSession = null;
  }

  /**
   * Get session ID for export.
   */
  getSessionId(): string | null {
    return this.currentSession?.id ?? null;
  }

  /**
   * Get session title for export.
   */
  getSessionTitle(): string {
    return this.currentSession?.title ?? 'Unknown Session';
  }
}

/**
 * Create a session tracker.
 */
export function createSessionTracker(): SessionTracker {
  return new SessionTracker();
}
