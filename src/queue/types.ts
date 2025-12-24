/**
 * Types for the export queue system.
 */

/**
 * Status of a queue item.
 */
export type QueueItemStatus = 'pending' | 'processing' | 'failed' | 'dead';

/**
 * A single item in the export queue.
 */
export interface QueueItem {
  /** Unique idempotency key for this item */
  id: string;

  /** OpenCode session ID */
  sessionId: string;

  /** Derived Helicone session UUID */
  heliconeSessionId: string;

  /** Session name for Helicone */
  heliconeSessionName: string;

  /** Session path for Helicone hierarchy */
  heliconeSessionPath: string;

  /** The request body to log */
  request: HeliconeRequest;

  /** The response body to log */
  response: string;

  /** Current status */
  status: QueueItemStatus;

  /** Timestamp when the item was created */
  createdAt: number;

  /** Timestamp of last processing attempt */
  lastAttemptAt?: number;

  /** Number of retry attempts */
  retryCount: number;

  /** Error message if failed */
  error?: string;
}

/**
 * Request format for Helicone logging.
 */
export interface HeliconeRequest {
  /** Model name */
  model: string;

  /** Messages in the conversation */
  messages?: Array<{
    role: string;
    content: string;
  }>;

  /** Additional properties */
  [key: string]: unknown;
}

/**
 * Queue statistics.
 */
export interface QueueStats {
  /** Number of pending items */
  pending: number;

  /** Number of items currently processing */
  processing: number;

  /** Number of failed items awaiting retry */
  failed: number;

  /** Number of dead-lettered items */
  dead: number;

  /** Total size of spool files in bytes */
  spoolSizeBytes: number;

  /** Oldest item timestamp */
  oldestItemAt?: number;
}

/**
 * Options for queue operations.
 */
export interface QueueOptions {
  /** Maximum items to process in a batch */
  batchSize?: number;

  /** Whether to include dead-lettered items */
  includeDead?: boolean;
}
