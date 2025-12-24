/**
 * Content filtering for metadata-only mode.
 */

import type { ExportMode } from '../config/types.ts';

/**
 * Metadata extracted from a message for metadata-only exports.
 */
export interface MessageMetadata {
  /** Role of the message sender */
  role: string;
  /** Timestamp of the message */
  timestamp: number;
  /** Model used (if available) */
  model?: string;
  /** Number of tokens in the message (if available) */
  tokenCount?: number;
  /** Number of parts in the message */
  partCount: number;
  /** Types of parts present */
  partTypes: string[];
}

/**
 * Filter that controls what data is included in exports.
 */
export class ContentFilter {
  private mode: ExportMode;

  constructor(mode: ExportMode) {
    this.mode = mode;
  }

  /**
   * Check if full content should be included.
   */
  includeContent(): boolean {
    return this.mode === 'full';
  }

  /**
   * Check if exports are enabled at all.
   */
  isEnabled(): boolean {
    return this.mode !== 'off';
  }

  /**
   * Filter message content based on mode.
   * In metadata-only mode, returns just the metadata.
   * In full mode, returns the original content.
   *
   * @param content - The full message content
   * @param metadata - The metadata for the message
   * @returns Filtered content or metadata
   */
  filterMessage<T extends object>(content: T, metadata: MessageMetadata): T | MessageMetadata {
    if (this.mode === 'metadata_only') {
      return metadata;
    }
    return content;
  }

  /**
   * Filter tool call data based on mode.
   * In metadata-only mode, returns tool name and timing only.
   *
   * @param toolData - The full tool call data
   * @returns Filtered tool data
   */
  filterToolCall<T extends { name: string; startTime?: number; endTime?: number }>(
    toolData: T
  ): T | { name: string; startTime?: number; endTime?: number; duration?: number } {
    if (this.mode === 'metadata_only') {
      const filtered: { name: string; startTime?: number; endTime?: number; duration?: number } = {
        name: toolData.name,
      };
      if (toolData.startTime !== undefined) {
        filtered.startTime = toolData.startTime;
      }
      if (toolData.endTime !== undefined) {
        filtered.endTime = toolData.endTime;
        if (toolData.startTime !== undefined) {
          filtered.duration = toolData.endTime - toolData.startTime;
        }
      }
      return filtered;
    }
    return toolData;
  }
}

/**
 * Create a content filter from configuration.
 *
 * @param mode - The export mode
 * @returns A configured ContentFilter instance
 */
export function createContentFilter(mode: ExportMode): ContentFilter {
  return new ContentFilter(mode);
}
