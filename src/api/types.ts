/**
 * API-specific types for GitHub Copilot usage data integration
 */

/**
 * Raw response from GitHub Copilot API
 * Endpoint: https://api.github.com/copilot_internal/user
 * 
 * WARNING: This is an internal API with no stability guarantees
 */
export interface GitHubCopilotApiResponse {
  copilot_plan?: string;
  chat_enabled?: boolean;
  access_type_sku?: string;
  assigned_date?: string;
  organization_list?: Array<{
    login: string;
    name: string;
  }>;
  quota_snapshots?: {
    premium_interactions?: QuotaSnapshot;
    chat?: QuotaSnapshot;
    completions?: QuotaSnapshot;
  };
  quota_reset_date_utc?: string;
}

export interface QuotaSnapshot {
  quota_id: string;
  timestamp_utc?: string;
  entitlement?: number;
  quota_remaining?: number;
  remaining?: number;
  percent_remaining?: number;
  unlimited?: boolean;
  overage_permitted?: boolean;
  overage_count?: number;
  overage_limit?: number; // Budget limit for overage requests
}

/**
 * Options for API requests
 */
export interface ApiRequestOptions {
  timeout?: number;
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

export const DEFAULT_API_REQUEST_OPTIONS: Required<ApiRequestOptions> = {
  timeout: 30000,      // 30 seconds
  maxRetries: 3,
  baseDelay: 1000,     // 1 second
  maxDelay: 30000      // 30 seconds
};

/**
 * API error types
 */
export enum ApiErrorType {
  NETWORK = 'network',
  AUTH = 'auth',
  FORBIDDEN = 'forbidden',
  NOT_FOUND = 'not_found',
  RATE_LIMIT = 'rate_limit',
  SERVER = 'server',
  TIMEOUT = 'timeout',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}

/**
 * Structured API error
 */
export class ApiError extends Error {
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

  static fromStatusCode(statusCode: number, responseBody: string): ApiError {
    if (statusCode === 401) {
      return new ApiError(
        'Unauthorized - GitHub token expired or invalid',
        ApiErrorType.AUTH,
        statusCode,
        false
      );
    }
    
    if (statusCode === 403) {
      return new ApiError(
        'Forbidden - User does not have GitHub Copilot access',
        ApiErrorType.FORBIDDEN,
        statusCode,
        false
      );
    }
    
    if (statusCode === 404) {
      return new ApiError(
        'Not Found - GitHub Copilot API endpoint may have changed',
        ApiErrorType.NOT_FOUND,
        statusCode,
        false
      );
    }
    
    if (statusCode === 429) {
      return new ApiError(
        'Rate Limited - Too many requests to GitHub API',
        ApiErrorType.RATE_LIMIT,
        statusCode,
        true
      );
    }
    
    if (statusCode >= 500) {
      return new ApiError(
        `Server Error - GitHub API returned ${statusCode}`,
        ApiErrorType.SERVER,
        statusCode,
        true
      );
    }
    
    return new ApiError(
      `HTTP ${statusCode}: ${responseBody}`,
      ApiErrorType.UNKNOWN,
      statusCode,
      false
    );
  }

  static fromNodeError(error: NodeJS.ErrnoException): ApiError {
    const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];
    const isRetryable = retryableCodes.includes(error.code || '');
    
    if (error.code === 'ETIMEDOUT') {
      return new ApiError(
        'Request timeout',
        ApiErrorType.TIMEOUT,
        undefined,
        true,
        error
      );
    }
    
    return new ApiError(
      error.message || 'Network error',
      ApiErrorType.NETWORK,
      undefined,
      isRetryable,
      error
    );
  }
}
