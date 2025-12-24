/**
 * Types for Helicone export operations.
 */

/**
 * Message format for Helicone request body.
 */
export interface HeliconeMessage {
  role: string;
  content: string;
}

/**
 * Request body format for Helicone logging.
 */
export interface HeliconeRequestBody {
  model: string;
  messages: HeliconeMessage[];
  [key: string]: unknown;
}

/**
 * Response body format for Helicone logging.
 */
export interface HeliconeResponseBody {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: {
      role?: string;
      content?: string;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  [key: string]: unknown;
}

/**
 * Headers to send with Helicone requests.
 */
export interface HeliconeHeaders {
  'Helicone-Session-Id': string;
  'Helicone-Session-Name': string;
  'Helicone-Session-Path': string;
  'Helicone-Request-Id'?: string;
  [key: string]: string | undefined;
}

/**
 * Export result from the Helicone logger.
 */
export interface ExportResult {
  success: boolean;
  error?: string;
  heliconeRequestId?: string;
}
