import * as vscode from 'vscode';
import { UsageData } from '../../src/statusBar/types';

/**
 * Options for configuring API request behavior
 */
export interface ApiRequestOptions {
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  
  /** Base delay for exponential backoff in ms (default: 1000) */
  baseDelay?: number;
  
  /** Maximum backoff delay in ms (default: 30000) */
  maxDelay?: number;
  
  /** Abort signal for request cancellation */
  signal?: AbortSignal;
}

/**
 * Client for fetching GitHub Copilot usage data from GitHub API
 * 
 * Contract Requirements:
 * - MUST make authenticated HTTPS requests (FR-002)
 * - MUST use endpoint https://api.github.com/copilot_internal/user (FR-016)
 * - MUST timeout requests after 30 seconds (FR-009)
 * - MUST handle API errors gracefully (FR-006)
 * - MUST handle network errors gracefully (FR-007)
 * - MUST respect rate limits (FR-008)
 * - MUST implement exponential backoff (FR-019)
 * - MUST set User-Agent header (FR-020)
 * - MUST validate API response structure (FR-010)
 * - MUST prevent concurrent requests (FR-013)
 * - MUST cancel in-flight requests on deactivation (FR-012)
 * 
 * @example
 * ```typescript
 * const client: IUsageApiClient = new UsageApiClient();
 * 
 * try {
 *   const data = await client.fetchUsage(token, { timeout: 10000 });
 *   console.log(`Used: ${data.includedUsed}/${data.includedTotal}`);
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     if (error.retryable) {
 *       // Transient error, retry later
 *     } else {
 *       // Permanent error, show error state
 *     }
 *   }
 * }
 * ```
 */
export interface IUsageApiClient extends vscode.Disposable {
  /**
   * Fetch current usage data from GitHub Copilot API
   * 
   * @param token GitHub access token from authentication service
   * @param options Request configuration (timeout, retries, etc.)
   * @returns Parsed and validated usage data
   * 
   * @throws ApiError on any failure (network, HTTP error, validation, timeout)
   * 
   * @remarks
   * - Automatically retries on transient errors (5xx, 429, network timeouts)
   * - Does NOT retry on permanent errors (401, 403, 404, 400)
   * - Implements exponential backoff with max 3 retries
   * - Throws if concurrent request already in progress
   * - Request can be cancelled via AbortSignal in options
   * 
   * Error Handling:
   * - 401: Token expired/invalid - throw ApiError(type=AUTH, retryable=false)
   * - 403: No Copilot access - throw ApiError(type=FORBIDDEN, retryable=false)
   * - 404: Endpoint changed - throw ApiError(type=NOT_FOUND, retryable=false)
   * - 429: Rate limited - throw ApiError(type=RATE_LIMIT, retryable=true)
   * - 5xx: Server error - throw ApiError(type=SERVER, retryable=true)
   * - Network errors - throw ApiError(type=NETWORK, retryable=true)
   * - Timeout - throw ApiError(type=TIMEOUT, retryable=true)
   * - Invalid response - throw ApiError(type=VALIDATION, retryable=false)
   */
  fetchUsage(token: string, options?: ApiRequestOptions): Promise<UsageData>;
  
  /**
   * Check if a request is currently in flight
   * 
   * @returns True if fetchUsage() is currently executing
   * 
   * @remarks
   * - Used to prevent concurrent requests (FR-013)
   * - Manual refresh should wait if automatic refresh is in progress
   */
  isRequestPending(): boolean;
  
  /**
   * Cancel any pending request
   * 
   * @remarks
   * - Aborts in-flight HTTP request if one is active
   * - Safe to call even if no request is pending
   * - Must be called in dispose() to satisfy FR-012
   */
  cancelPendingRequest(): void;
}

/**
 * Categorization of API errors for different handling strategies
 */
export enum ApiErrorType {
  /** Network-level errors (ECONNREFUSED, ETIMEDOUT, DNS failures) */
  NETWORK = 'network',
  
  /** Authentication errors (401) - token expired or invalid */
  AUTH = 'auth',
  
  /** Authorization errors (403) - user lacks Copilot subscription */
  FORBIDDEN = 'forbidden',
  
  /** Resource not found (404) - API endpoint changed or removed */
  NOT_FOUND = 'not_found',
  
  /** Rate limiting (429) - too many requests */
  RATE_LIMIT = 'rate_limit',
  
  /** Server errors (5xx) - GitHub API is down or experiencing issues */
  SERVER = 'server',
  
  /** Request timeout - no response within configured timeout */
  TIMEOUT = 'timeout',
  
  /** Invalid response structure - API response doesn't match expected schema */
  VALIDATION = 'validation',
  
  /** Unknown/unexpected error */
  UNKNOWN = 'unknown'
}

/**
 * Structured API error with retry guidance
 */
export class ApiError extends Error {
  /**
   * @param message Human-readable error description
   * @param type Error category for handling strategy
   * @param statusCode HTTP status code if applicable
   * @param retryable Whether this error should be retried
   * @param cause Underlying error that caused this failure
   */
  constructor(
    message: string,
    public readonly type: ApiErrorType,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ApiError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}
