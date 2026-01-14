# Data Model: Usage API Integration

**Feature**: 002-usage-api-integration  
**Date**: 2026-01-12

## Overview

This document defines the core entities and data structures for the GitHub Copilot usage API integration feature. All types are designed for TypeScript strict mode with comprehensive validation.

---

## Core Entities

### 1. UsageData (Already Defined in types.ts)

**Purpose**: Represents current GitHub Copilot usage statistics.

**Location**: `src/statusBar/types.ts` (already exists from spec 001)

```typescript
export interface UsageData {
  /** Number of included requests used in current billing period */
  includedUsed: number;
  
  /** Total included requests in subscription */
  includedTotal: number;
  
  /** Number of budget (overage) requests used */
  budgetUsed: number;
  
  /** Timestamp of last data refresh (milliseconds since epoch) */
  lastRefreshTime: number;
  
  /** End date of current billing period (ISO 8601 format) */
  billingPeriodEnd: string;
}
```

**Validation Rules**:
- `includedUsed >= 0` and `includedUsed <= includedTotal`
- `includedTotal > 0`
- `budgetUsed >= 0`
- `lastRefreshTime` must be valid timestamp
- `billingPeriodEnd` must be valid ISO 8601 date string

**Immutability**: All updates create new objects (functional approach).

---

### 2. GitHubCopilotApiResponse

**Purpose**: Raw response structure from GitHub Copilot API endpoint.

**Location**: `src/api/types.ts` (new file)

```typescript
/**
 * Raw response from GitHub Copilot API
 * Endpoint: https://api.github.com/copilot_internal/user
 */
export interface GitHubCopilotApiResponse {
  /** User's Copilot plan type (e.g., "enterprise", "individual", "business") */
  copilot_plan?: string;
  
  /** Whether Copilot chat is enabled for this user */
  chat_enabled?: boolean;
  
  /** Access type SKU (e.g., "business", "individual") */
  access_type_sku?: string;
  
  /** Date when Copilot was assigned to user (ISO 8601) */
  assigned_date?: string;
  
  /** Organizations user belongs to */
  organization_list?: Array<{
    login: string;
    name: string;
  }>;
  
  /** 
   * Quota snapshots for different usage types
   * Note: This is an OBJECT, not an array
   */
  quota_snapshots?: {
    premium_interactions?: QuotaSnapshot;
    chat?: QuotaSnapshot;
    completions?: QuotaSnapshot;
  };
  
  /** When current quota period resets (ISO 8601) */
  quota_reset_date_utc?: string;
}

/**
 * Individual quota snapshot for a usage type
 */
export interface QuotaSnapshot {
  /** Quota identifier (e.g., "premium_interactions") */
  quota_id: string;
  
  /** Timestamp of this snapshot (ISO 8601) */
  timestamp_utc?: string;
  
  /** Total entitlement (quota limit) */
  entitlement?: number;
  
  /** Remaining quota (not used) */
  quota_remaining?: number;
  remaining?: number; // Alias for quota_remaining
  
  /** Percentage of quota remaining */
  percent_remaining?: number;
  
  /** Whether quota is unlimited */
  unlimited?: boolean;
  
  /** Whether overage/budget usage is permitted */
  overage_permitted?: boolean;
  
  /** Number of overage requests used */
  overage_count?: number;
}
```

**Design Notes**:
- All fields optional (defensive against API changes)
- Preserves API structure exactly (no transformation)
- Used only for parsing, not exposed to rest of extension
- Validated before transforming to `UsageData`

---

### 3. ApiRequestOptions

**Purpose**: Configuration for API requests.

**Location**: `src/api/types.ts`

```typescript
/**
 * Options for API request behavior
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
```

**Default Values**:
```typescript
export const DEFAULT_API_REQUEST_OPTIONS: Required<Omit<ApiRequestOptions, 'signal'>> = {
  timeout: 30000,      // 30 seconds (FR-009)
  maxRetries: 3,       // Max 3 retry attempts
  baseDelay: 1000,     // 1 second base
  maxDelay: 30000      // 30 second max
};
```

---

### 4. ApiError

**Purpose**: Standardized error structure for API failures.

**Location**: `src/api/types.ts`

```typescript
/**
 * Categorization of API errors
 */
export enum ApiErrorType {
  /** Network-level errors (ECONNREFUSED, ETIMEDOUT, etc.) */
  NETWORK = 'network',
  
  /** Authentication errors (401) */
  AUTH = 'auth',
  
  /** Authorization errors (403 - no Copilot access) */
  FORBIDDEN = 'forbidden',
  
  /** Resource not found (404 - endpoint changed) */
  NOT_FOUND = 'not_found',
  
  /** Rate limiting (429) */
  RATE_LIMIT = 'rate_limit',
  
  /** Server errors (5xx) */
  SERVER = 'server',
  
  /** Request timeout */
  TIMEOUT = 'timeout',
  
  /** Invalid response structure */
  VALIDATION = 'validation',
  
  /** Unknown/unexpected error */
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
    
    // Maintain proper stack trace (ES2015+)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
  
  /**
   * Create ApiError from HTTP status code
   */
  static fromStatusCode(statusCode: number, responseBody: string): ApiError {
    if (statusCode === 401) {
      return new ApiError(
        'Unauthorized - GitHub token expired or invalid',
        ApiErrorType.AUTH,
        statusCode,
        false // Don't retry auth errors, request new token
      );
    }
    
    if (statusCode === 403) {
      return new ApiError(
        'Forbidden - User does not have GitHub Copilot access',
        ApiErrorType.FORBIDDEN,
        statusCode,
        false // Don't retry, user needs subscription
      );
    }
    
    if (statusCode === 404) {
      return new ApiError(
        'Not Found - GitHub Copilot API endpoint may have changed',
        ApiErrorType.NOT_FOUND,
        statusCode,
        false // Don't retry, endpoint is gone
      );
    }
    
    if (statusCode === 429) {
      return new ApiError(
        'Rate Limited - Too many requests to GitHub API',
        ApiErrorType.RATE_LIMIT,
        statusCode,
        true // Retry with backoff
      );
    }
    
    if (statusCode >= 500) {
      return new ApiError(
        `Server Error - GitHub API returned ${statusCode}`,
        ApiErrorType.SERVER,
        statusCode,
        true // Retry, transient server error
      );
    }
    
    return new ApiError(
      `HTTP ${statusCode}: ${responseBody}`,
      ApiErrorType.UNKNOWN,
      statusCode,
      false
    );
  }
  
  /**
   * Create ApiError from Node.js error
   */
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
```

---

### 5. CachedUsageData

**Purpose**: Wrapper for cached usage data with metadata.

**Location**: `src/cache/types.ts` (new file)

```typescript
/**
 * Cached usage data with metadata
 */
export interface CachedUsageData {
  /** The actual usage data */
  data: UsageData;
  
  /** Timestamp when data was cached (milliseconds since epoch) */
  cachedAt: number;
}

/**
 * Cache freshness levels
 */
export enum CacheFreshness {
  /** < 5 minutes old */
  FRESH = 'fresh',
  
  /** 5-60 minutes old */
  VALID = 'valid',
  
  /** 1-24 hours old */
  STALE = 'stale',
  
  /** > 24 hours old */
  VERY_STALE = 'very_stale'
}

/**
 * Calculate cache freshness level
 */
export function getCacheFreshness(cachedAt: number): CacheFreshness {
  const ageMs = Date.now() - cachedAt;
  const ageMinutes = ageMs / (60 * 1000);
  
  if (ageMinutes < 5) {
    return CacheFreshness.FRESH;
  } else if (ageMinutes < 60) {
    return CacheFreshness.VALID;
  } else if (ageMinutes < 1440) { // 24 hours
    return CacheFreshness.STALE;
  } else {
    return CacheFreshness.VERY_STALE;
  }
}
```

---

### 6. RefreshConfig

**Purpose**: Configuration for automatic refresh behavior.

**Location**: `src/scheduler/types.ts` (new file)

```typescript
/**
 * Configuration for automatic refresh scheduler
 */
export interface RefreshConfig {
  /** Refresh interval in seconds (default: 60) */
  intervalSeconds: number;
  
  /** Minimum allowed interval in seconds (default: 30) */
  minIntervalSeconds: number;
  
  /** Whether auto-refresh is enabled (default: true) */
  enabled: boolean;
}

export const DEFAULT_REFRESH_CONFIG: RefreshConfig = {
  intervalSeconds: 60,
  minIntervalSeconds: 30,
  enabled: true
};
```

---

## Service Interfaces

### 1. IGitHubAuthService

**Purpose**: Contract for GitHub authentication.

**Location**: `src/api/IGitHubAuthService.ts` (new file)

```typescript
import * as vscode from 'vscode';

/**
 * Service for managing GitHub authentication
 */
export interface IGitHubAuthService extends vscode.Disposable {
  /**
   * Get current GitHub access token
   * @param createIfNone If true, prompts user to sign in if not authenticated
   * @returns Access token or undefined if not authenticated
   */
  getToken(createIfNone?: boolean): Promise<string | undefined>;
  
  /**
   * Check if user is currently authenticated with GitHub
   */
  isAuthenticated(): Promise<boolean>;
  
  /**
   * Subscribe to authentication state changes
   * @param callback Function called when auth state changes
   */
  onDidChangeSession(callback: () => void | Promise<void>): vscode.Disposable;
}
```

---

### 2. IUsageApiClient

**Purpose**: Contract for fetching usage data from GitHub API.

**Location**: `src/api/IUsageApiClient.ts` (new file)

```typescript
import { UsageData } from '../statusBar/types';
import { ApiRequestOptions } from './types';

/**
 * Client for fetching GitHub Copilot usage data
 */
export interface IUsageApiClient extends vscode.Disposable {
  /**
   * Fetch current usage data from GitHub API
   * @param token GitHub access token
   * @param options Request options (timeout, retries, etc.)
   * @returns Usage data
   * @throws ApiError on failure
   */
  fetchUsage(token: string, options?: ApiRequestOptions): Promise<UsageData>;
  
  /**
   * Check if a request is currently in flight
   */
  isRequestPending(): boolean;
  
  /**
   * Cancel any pending request
   */
  cancelPendingRequest(): void;
}
```

---

### 3. IUsageCache

**Purpose**: Contract for caching usage data.

**Location**: `src/cache/IUsageCache.ts` (new file)

```typescript
import { UsageData } from '../statusBar/types';
import { CacheFreshness } from './types';

/**
 * Service for caching usage data locally
 */
export interface IUsageCache {
  /**
   * Store usage data in cache
   */
  store(data: UsageData): Promise<void>;
  
  /**
   * Retrieve cached usage data
   * @returns Cached data or undefined if no cache exists
   */
  retrieve(): Promise<UsageData | undefined>;
  
  /**
   * Get age of cached data in milliseconds
   * @returns Age in ms or undefined if no cache
   */
  getCacheAge(): Promise<number | undefined>;
  
  /**
   * Get freshness level of cached data
   */
  getFreshness(): Promise<CacheFreshness | undefined>;
  
  /**
   * Clear all cached data
   */
  clear(): Promise<void>;
}
```

---

### 4. IRefreshScheduler

**Purpose**: Contract for automatic refresh timing.

**Location**: `src/scheduler/IRefreshScheduler.ts` (new file)

```typescript
import * as vscode from 'vscode';
import { RefreshConfig } from './types';

/**
 * Scheduler for automatic usage data refresh
 */
export interface IRefreshScheduler extends vscode.Disposable {
  /**
   * Start automatic refresh with configured interval
   */
  start(): void;
  
  /**
   * Stop automatic refresh
   */
  stop(): void;
  
  /**
   * Manually trigger refresh immediately
   * Respects concurrency control (waits if refresh in progress)
   */
  trigger(): Promise<void>;
  
  /**
   * Update refresh configuration
   * Restarts scheduler if running
   */
  updateConfig(config: RefreshConfig): void;
  
  /**
   * Check if refresh is currently in progress
   */
  isRefreshing(): boolean;
}
```

---

### 5. IUsageDataService (Facade)

**Purpose**: High-level service orchestrating all API integration components.

**Location**: `src/api/IUsageDataService.ts` (new file)

```typescript
import * as vscode from 'vscode';
import { UsageData } from '../statusBar/types';

/**
 * Event emitted when usage data changes
 */
export interface UsageDataChangeEvent {
  /** New usage data (or undefined if data unavailable) */
  data: UsageData | undefined;
  
  /** Whether data is from cache */
  fromCache: boolean;
  
  /** Error if fetch failed */
  error?: Error;
}

/**
 * High-level service for managing usage data lifecycle
 * Orchestrates auth, API client, cache, and refresh scheduler
 */
export interface IUsageDataService extends vscode.Disposable {
  /**
   * Activate the service (start automatic refresh)
   */
  activate(): Promise<void>;
  
  /**
   * Get current usage data (from memory, cache, or fresh fetch)
   */
  getCurrentData(): Promise<UsageData | undefined>;
  
  /**
   * Manually refresh usage data
   */
  refresh(): Promise<void>;
  
  /**
   * Subscribe to usage data changes
   */
  onDataChange(callback: (event: UsageDataChangeEvent) => void): vscode.Disposable;
}
```

---

## Data Transformations

### GitHub API Response → UsageData

```typescript
/**
 * Transform GitHub API response to UsageData
 * @throws ApiError if response structure is invalid
 */
export function parseApiResponse(response: GitHubCopilotApiResponse): UsageData {
  // Extract premium_interactions quota
  const premiumQuota = response.quota_snapshots?.premium_interactions;
  
  if (!premiumQuota) {
    throw new ApiError(
      'Missing premium_interactions in API response',
      ApiErrorType.VALIDATION
    );
  }
  
  // Handle unlimited quota
  if (premiumQuota.unlimited) {
    return {
      includedUsed: 0,
      includedTotal: Number.MAX_SAFE_INTEGER, // Represent unlimited
      budgetUsed: 0,
      lastRefreshTime: Date.now(),
      billingPeriodEnd: response.quota_reset_date_utc || new Date().toISOString()
    };
  }
  
  // Validate required fields
  const entitlement = premiumQuota.entitlement;
  const remaining = premiumQuota.remaining ?? premiumQuota.quota_remaining;
  
  if (entitlement === undefined || remaining === undefined) {
    throw new ApiError(
      'Missing entitlement or remaining in API response',
      ApiErrorType.VALIDATION
    );
  }
  
  return {
    includedUsed: entitlement - remaining,
    includedTotal: entitlement,
    budgetUsed: premiumQuota.overage_count || 0,
    lastRefreshTime: Date.now(),
    billingPeriodEnd: response.quota_reset_date_utc || new Date().toISOString()
  };
}
```

---

## Validation Functions

### Validate UsageData

```typescript
/**
 * Validate UsageData structure and constraints
 * @throws Error if validation fails
 */
export function validateUsageData(data: UsageData): void {
  if (data.includedTotal <= 0) {
    throw new Error('includedTotal must be greater than 0');
  }
  
  if (data.includedUsed < 0) {
    throw new Error('includedUsed cannot be negative');
  }
  
  if (data.includedUsed > data.includedTotal) {
    throw new Error('includedUsed cannot exceed includedTotal');
  }
  
  if (data.budgetUsed < 0) {
    throw new Error('budgetUsed cannot be negative');
  }
  
  if (data.lastRefreshTime <= 0 || !Number.isFinite(data.lastRefreshTime)) {
    throw new Error('lastRefreshTime must be a valid timestamp');
  }
  
  // Validate ISO 8601 date format
  if (isNaN(Date.parse(data.billingPeriodEnd))) {
    throw new Error('billingPeriodEnd must be a valid ISO 8601 date');
  }
}
```

---

## File Organization

```
src/
├── api/
│   ├── types.ts                    # GitHubCopilotApiResponse, ApiError, etc.
│   ├── IGitHubAuthService.ts       # Auth service interface
│   ├── IUsageApiClient.ts          # API client interface
│   ├── IUsageDataService.ts        # Facade service interface
│   ├── GitHubAuthService.ts        # Implementation
│   ├── UsageApiClient.ts           # Implementation
│   ├── UsageDataService.ts         # Implementation
│   └── apiUtils.ts                 # parseApiResponse, validateUsageData
│
├── cache/
│   ├── types.ts                    # CachedUsageData, CacheFreshness
│   ├── IUsageCache.ts              # Cache interface
│   └── UsageCache.ts               # Implementation
│
├── scheduler/
│   ├── types.ts                    # RefreshConfig
│   ├── IRefreshScheduler.ts        # Scheduler interface
│   └── RefreshScheduler.ts         # Implementation
│
└── statusBar/
    └── types.ts                    # UsageData, DisplayState, etc. (existing)
```

---

## State Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    UsageDataService                          │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│  │GitHubAuth    │   │UsageApiClient│   │UsageCache    │   │
│  │Service       │──→│              │──→│              │   │
│  └──────────────┘   └──────────────┘   └──────────────┘   │
│         │                   │                   │           │
│         ↓                   ↓                   ↓           │
│  [Get Token] ────→ [Fetch API] ────→ [Cache Result]       │
│         │                   │                   │           │
│         ↓                   ↓                   ↓           │
│  [onDidChange] ─→ [Retry Logic] ─→ [Fallback Cache]       │
│                            │                                │
│                    ┌───────┴────────┐                      │
│                    │RefreshScheduler│                      │
│                    │  (setInterval) │                      │
│                    └────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary

This data model provides:

1. **Clear type definitions** for all API entities
2. **Service interfaces** for dependency injection and testing
3. **Validation** functions to ensure data integrity
4. **Transformation** functions to convert API responses
5. **Error handling** with structured error types
6. **Caching** with freshness tracking
7. **Extensibility** through interfaces

All types are designed for TypeScript strict mode and support comprehensive unit testing through interface-based mocking.
