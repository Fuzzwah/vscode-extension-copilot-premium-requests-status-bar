# Research: Usage API Integration

**Date**: 2026-01-12  
**Feature**: 002-usage-api-integration

## Overview

This document consolidates research findings for implementing GitHub Copilot usage API integration in VS Code. All decisions are informed by VS Code extension best practices, existing extension samples, and analysis of the vscode-copilot-insights reference implementation.

---

## GitHub Authentication in VS Code

### Decision

Use `vscode.authentication.getSession()` with the "github" provider ID and `['user:email']` scope.

### Rationale

- **Built into VS Code**: Zero additional dependencies, users already sign in with GitHub for Copilot
- **Automatic lifecycle management**: VS Code handles token creation, refresh, secure storage, and expiration
- **Native session events**: `onDidChangeSessions` event fires when user signs in/out or tokens refresh
- **Best practice**: Recommended approach in VS Code extension documentation
- **Security**: Tokens never exposed to extension code beyond the access token string
- **User experience**: Single sign-in for all GitHub features in VS Code

### Implementation Pattern

```typescript
import * as vscode from 'vscode';

export class GitHubAuthService {
  private sessionChangeListener: vscode.Disposable | undefined;

  /**
   * Get authenticated GitHub session
   * @param createIfNone If true, prompts user to sign in if not authenticated
   */
  async getSession(createIfNone: boolean = true): Promise<vscode.AuthenticationSession | undefined> {
    return await vscode.authentication.getSession(
      'github',
      ['user:email'],
      { createIfNone }
    );
  }

  /**
   * Get GitHub access token
   * @returns Access token or undefined if not authenticated
   */
  async getToken(): Promise<string | undefined> {
    const session = await this.getSession(true);
    return session?.accessToken;
  }

  /**
   * Subscribe to authentication state changes
   */
  onDidChangeSession(callback: () => void): vscode.Disposable {
    return vscode.authentication.onDidChangeSessions(async (e) => {
      if (e.provider.id === 'github') {
        callback();
      }
    });
  }

  /**
   * Check if user is currently authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession(false); // Don't prompt
    return session !== undefined;
  }

  dispose() {
    this.sessionChangeListener?.dispose();
  }
}
```

### Alternatives Considered

1. **Manual OAuth Flow**: Rejected - too complex, reinvents wheel, poor security practices
2. **Personal Access Tokens**: Rejected - insecure to store, poor UX, manual token management
3. **GitHub App Authentication**: Rejected - overkill for user-scoped data, requires app registration

### GitHub API Scopes

**Minimum Required**: `user:email`

This is the minimum scope needed to access user data. The GitHub Copilot API endpoint (`/copilot_internal/user`) is accessible with basic user scopes.

**Note**: The `copilot_internal` endpoint may change scope requirements in the future. Monitor for 403 responses and adjust scopes if needed.

---

## GitHub Copilot API Endpoint

### Decision

Use internal endpoint: `https://api.github.com/copilot_internal/user`

### Rationale

- **Only known endpoint**: No official public API exists for user-level Copilot quota data
- **Proven in production**: Used by vscode-copilot-insights extension successfully
- **Rich data**: Provides detailed breakdown of premium interactions, chat, completions, and quota resets
- **Accessible**: Works with standard GitHub authentication (user:email scope)

### ⚠️ Critical Warnings

**This is an INTERNAL GitHub API with NO stability guarantees:**

- May change structure without notice
- May be deprecated or removed
- May change required scopes
- May introduce rate limits
- Should implement robust error handling and validation
- Should version-check responses if possible
- Consider fallback behavior if endpoint disappears

### Response Structure

```json
{
  "copilot_plan": "enterprise",
  "chat_enabled": true,
  "access_type_sku": "business",
  "assigned_date": "2025-01-01T00:00:00Z",
  "organization_list": [
    {
      "login": "my-company",
      "name": "My Company Inc"
    }
  ],
  "quota_snapshots": {
    "premium_interactions": {
      "quota_id": "premium_interactions",
      "timestamp_utc": "2026-01-12T10:30:00Z",
      "entitlement": 300,
      "quota_remaining": 250,
      "remaining": 250,
      "percent_remaining": 83,
      "unlimited": false,
      "overage_permitted": true,
      "overage_count": 5
    },
    "chat": {
      "quota_id": "chat",
      "unlimited": true
    },
    "completions": {
      "quota_id": "completions",
      "unlimited": true
    }
  },
  "quota_reset_date_utc": "2026-02-01T00:00:00Z"
}
```

### Key Data Fields (Mapping to UsageData)

| API Field | UsageData Field | Type | Notes |
|-----------|----------------|------|-------|
| `quota_snapshots.premium_interactions.entitlement` | `includedTotal` | number | Total quota (e.g., 300) |
| `quota_snapshots.premium_interactions.remaining` | Calculate: `entitlement - remaining` | number | Used = Total - Remaining |
| `quota_snapshots.premium_interactions.overage_count` | `budgetUsed` | number | Budget/overage requests |
| `quota_reset_date_utc` | `billingPeriodEnd` | string | ISO 8601 date |
| Current timestamp | `lastRefreshTime` | number | `Date.now()` |

**Important**: `quota_snapshots` is an **object** (not array). Use `Object.values()` or access `quota_snapshots.premium_interactions` directly.

### Required HTTP Headers

```typescript
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'Accept': 'application/json',
  'User-Agent': 'vscode-copilot-premium-status/0.1.0'
};
```

- **Authorization**: Bearer token from `vscode.authentication`
- **Accept**: Request JSON response format
- **User-Agent**: Identify extension (required by GitHub API)

### Error Responses

| Status Code | Meaning | Action |
|-------------|---------|--------|
| 200 | Success | Parse and use data |
| 401 | Unauthorized | Token expired/invalid - request new session |
| 403 | Forbidden | User lacks Copilot access - show NO_SUBSCRIPTION state |
| 404 | Not Found | Endpoint removed/changed - show error, log warning |
| 429 | Rate Limited | Back off, implement exponential backoff |
| 500-599 | Server Error | Transient - retry with backoff |

### Rate Limiting

- **Standard GitHub API limits**: 5000 requests/hour for authenticated users
- **Recommendation**: Poll conservatively (60+ second intervals)
- **Monitor for 429**: Implement exponential backoff
- **No specific Copilot API limits documented**: Assume standard limits apply

---

## HTTP Client Choice

### Decision

Use Node.js built-in `https` module for API requests.

### Rationale

- **Zero dependencies**: No additional packages, smaller bundle size
- **Sufficient for needs**: Simple REST GET requests with JSON parsing
- **Native to Node.js**: Always available, no version conflicts
- **TypeScript support**: Types included in `@types/node` (already in project)
- **Security**: Reduce supply chain risks from third-party HTTP clients
- **Maintenance**: One less dependency to update and monitor

### Implementation

```typescript
import * as https from 'https';

export interface FetchOptions {
  timeout?: number;
  maxRetries?: number;
  baseDelay?: number;
}

/**
 * Fetch GitHub Copilot usage data
 */
export async function fetchCopilotUsage(
  token: string,
  options: FetchOptions = {}
): Promise<any> {
  const {
    timeout = 30000, // 30 seconds (FR-009)
    maxRetries = 3,
    baseDelay = 1000
  } = options;

  return fetchWithRetry(token, timeout, maxRetries, baseDelay);
}

function fetchWithRetry(
  token: string,
  timeout: number,
  maxRetries: number,
  baseDelay: number,
  attempt: number = 0
): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: '/copilot_internal/user',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'User-Agent': 'vscode-copilot-premium-status/0.1.0' // FR-020
      },
      timeout
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${error}`));
          }
        } else if (shouldRetry(res.statusCode) && attempt < maxRetries - 1) {
          // Retry on transient errors
          const delay = calculateBackoff(attempt, baseDelay);
          setTimeout(() => {
            fetchWithRetry(token, timeout, maxRetries, baseDelay, attempt + 1)
              .then(resolve)
              .catch(reject);
          }, delay);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      if (shouldRetryError(error) && attempt < maxRetries - 1) {
        const delay = calculateBackoff(attempt, baseDelay);
        setTimeout(() => {
          fetchWithRetry(token, timeout, maxRetries, baseDelay, attempt + 1)
            .then(resolve)
            .catch(reject);
        }, delay);
      } else {
        reject(error);
      }
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout after ' + timeout + 'ms'));
    });

    req.end();
  });
}

function shouldRetry(statusCode: number): boolean {
  // Retry on server errors and rate limits, not on client errors
  return statusCode >= 500 || statusCode === 429 || statusCode === 408;
}

function shouldRetryError(error: any): boolean {
  // Retry on network errors, not on other errors
  const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];
  return retryableCodes.includes(error.code);
}

function calculateBackoff(attempt: number, baseDelay: number): number {
  // Exponential backoff with max 30 seconds (FR-019)
  return Math.min(baseDelay * Math.pow(2, attempt), 30000);
}
```

### Alternatives Considered

| Library | Pros | Cons | Verdict |
|---------|------|------|---------|
| **axios** | Clean API, auto JSON parsing, retries | 500KB+ dependency, overkill for one endpoint | Rejected |
| **node-fetch** | Familiar fetch API, promise-based | Extra dependency, native fetch in Node 18+ | Rejected |
| **Native fetch** | Modern, built-in (Node 18+) | VS Code 1.85.0 uses Node 16 | Future consideration |

**Future Migration**: If VS Code minimum engine is bumped to require Node 18+, consider migrating to native `fetch()` for cleaner API.

---

## Periodic Refresh Timer

### Decision

Use `setInterval` with mutex pattern to prevent overlapping requests.

### Rationale

- **Simple and proven**: Standard pattern in VS Code extensions
- **Lifecycle integration**: Easy to create on activate and dispose on deactivate
- **Dynamic interval updates**: Can clear and restart with new interval
- **No external dependencies**: Built into JavaScript runtime
- **Predictable behavior**: Fixed interval, no drift

### Implementation Pattern

```typescript
export class RefreshScheduler {
  private intervalId: NodeJS.Timeout | undefined;
  private isRefreshing: boolean = false; // Mutex flag
  private intervalSeconds: number;
  private refreshCallback: () => Promise<void>;

  constructor(intervalSeconds: number, refreshCallback: () => Promise<void>) {
    this.intervalSeconds = intervalSeconds;
    this.refreshCallback = refreshCallback;
  }

  /**
   * Start automatic refresh timer
   */
  start(): void {
    this.stop(); // Clear any existing timer
    
    this.intervalId = setInterval(async () => {
      if (!this.isRefreshing) {
        this.isRefreshing = true;
        try {
          await this.refreshCallback();
        } catch (error) {
          // Error logged by callback, continue scheduling
        } finally {
          this.isRefreshing = false;
        }
      }
      // If already refreshing, skip this interval
    }, this.intervalSeconds * 1000);
  }

  /**
   * Stop automatic refresh
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Manually trigger refresh (respects mutex)
   */
  async trigger(): Promise<void> {
    if (this.isRefreshing) {
      // Wait for in-flight request to complete (FR-013)
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.isRefreshing) {
            clearInterval(checkInterval);
            this.refreshCallback().then(resolve);
          }
        }, 100);
      });
    }
    
    this.isRefreshing = true;
    try {
      await this.refreshCallback();
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Update refresh interval (restarts timer)
   */
  updateInterval(intervalSeconds: number): void {
    this.intervalSeconds = intervalSeconds;
    if (this.intervalId) {
      this.start(); // Restart with new interval
    }
  }

  /**
   * Check if refresh is currently in progress
   */
  isRunning(): boolean {
    return this.isRefreshing;
  }

  /**
   * Dispose of scheduler
   */
  dispose(): void {
    this.stop();
  }
}
```

### Alternatives Considered

1. **setTimeout recursively**: More complex, but prevents drift
   - Pros: Accounts for request duration, no fixed drift
   - Cons: More complex logic, harder to update interval
   - Verdict: Not needed - fixed interval is acceptable

2. **VS Code's workspace watcher**: Not applicable for time-based refresh

3. **Third-party scheduler**: Overkill for simple interval

---

## Request Concurrency Control

### Decision

Boolean flag (mutex) pattern with `AbortController` for cancellation.

### Rationale

- **Prevents overlapping requests** (FR-013): Only one API request in flight at a time
- **Simple to implement**: Single boolean flag checked before each request
- **Handles manual refresh**: Waits for in-flight operation before manual refresh
- **Cancellable**: Can abort in-flight requests on deactivation
- **No external dependencies**: Pure JavaScript pattern

### Implementation

```typescript
export class UsageAPIClient {
  private isRequestInFlight: boolean = false;
  private abortController: AbortController | undefined;

  async fetchUsage(token: string): Promise<UsageData> {
    if (this.isRequestInFlight) {
      throw new Error('Request already in progress');
    }

    this.isRequestInFlight = true;
    this.abortController = new AbortController();

    try {
      const rawData = await fetchCopilotUsage(token, {
        signal: this.abortController.signal
      });
      
      // Validate and transform response
      return this.parseResponse(rawData);
    } finally {
      this.isRequestInFlight = false;
      this.abortController = undefined;
    }
  }

  /**
   * Cancel any in-flight request
   */
  cancelPendingRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Check if request is currently in progress
   */
  isRequestPending(): boolean {
    return this.isRequestInFlight;
  }
}
```

### Alternatives Considered

1. **Request queue**: More complex, not needed for single-endpoint polling
2. **Promise tracking**: Similar outcome, more complex than boolean flag
3. **Semaphore library**: Overkill for binary mutex

---

## Retry Strategy

### Decision

Exponential backoff with max 3 retries for transient errors only.

### Rationale

- **Smart error classification**: Retry network/server errors, fail fast on auth/client errors
- **Exponential backoff** (FR-019): Prevents thundering herd, respects rate limits
- **Max retry limit**: Prevents infinite loops, fails gracefully
- **Transient vs permanent**: 401/403/404/400 don't retry (permanent), 5xx/429/timeout do retry (transient)

### Backoff Formula

```
delay = min(1000ms * 2^attempt, 30000ms)
```

- Attempt 0: 1 second delay
- Attempt 1: 2 second delay
- Attempt 2: 4 second delay
- Max delay: 30 seconds

### Error Classification

**Retry (transient errors)**:
- Network errors: `ECONNRESET`, `ETIMEDOUT`, `ENOTFOUND`, `ECONNREFUSED`
- HTTP 5xx: Server errors (500, 502, 503, 504)
- HTTP 429: Rate limiting
- HTTP 408: Request timeout

**Don't Retry (permanent errors)**:
- HTTP 401: Unauthorized (request new token)
- HTTP 403: Forbidden (no Copilot access)
- HTTP 404: Not found (endpoint changed)
- HTTP 400: Bad request (our code is wrong)

### Configuration

```typescript
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  timeout: 30000   // 30 seconds (FR-009)
};
```

---

## Data Caching and Persistence

### Decision

Use `context.globalState` (VS Code Memento API) for caching usage data.

### Rationale

- **Perfect fit**: User-specific, lightweight JSON data with automatic persistence
- **Built-in**: No external dependencies, part of VS Code extension API
- **Automatic serialization**: Handles JSON serialization/deserialization
- **Survives restarts**: Data persists across VS Code sessions
- **Simple API**: `get()` and `update()` methods with TypeScript support
- **Appropriate scope**: Global state is user-level (correct for usage data)

### Storage Schema

```typescript
interface CachedUsageData {
  data: UsageData;
  cachedAt: number; // Timestamp when cached
}
```

### Implementation

```typescript
export class UsageCache {
  private static readonly CACHE_KEY = 'copilot.usage.cache';
  
  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Store usage data in cache
   */
  async store(data: UsageData): Promise<void> {
    const cached: CachedUsageData = {
      data,
      cachedAt: Date.now()
    };
    await this.context.globalState.update(UsageCache.CACHE_KEY, cached);
  }

  /**
   * Retrieve cached usage data
   */
  async retrieve(): Promise<UsageData | undefined> {
    const cached = this.context.globalState.get<CachedUsageData>(UsageCache.CACHE_KEY);
    return cached?.data;
  }

  /**
   * Get cache age in milliseconds
   */
  async getCacheAge(): Promise<number | undefined> {
    const cached = this.context.globalState.get<CachedUsageData>(UsageCache.CACHE_KEY);
    if (!cached) {
      return undefined;
    }
    return Date.now() - cached.cachedAt;
  }

  /**
   * Check if cached data is stale
   */
  async isStale(): Promise<boolean> {
    const age = await this.getCacheAge();
    if (age === undefined) {
      return true;
    }
    // Consider stale after 1 hour
    return age > 60 * 60 * 1000;
  }

  /**
   * Clear cached data (e.g., on sign-out)
   */
  async clear(): Promise<void> {
    await this.context.globalState.update(UsageCache.CACHE_KEY, undefined);
  }
}
```

### Cache Strategy (FR-017)

**When to use cache vs fetch**:

1. **On activation**: Try fetch, fallback to cache on error
2. **On periodic refresh**: Fetch, update cache on success, keep old cache on failure
3. **On manual refresh**: Always fetch, update cache on success
4. **On network error**: Use cache if available, show staleness indicator

**Freshness levels**:
- **Fresh**: < 5 minutes old - show as current
- **Valid**: < 1 hour old - acceptable fallback
- **Stale**: > 1 hour - show warning indicator
- **Very stale**: > 24 hours - show error indicator

### Cache Invalidation (FR-015)

**Clear cache when**:
1. User signs out of GitHub (`onDidChangeSessions`)
2. User explicitly clears extension data (command)
3. Fetch succeeds (replace with fresh data)

**Don't clear cache when**:
1. Fetch fails (transient error)
2. Extension deactivates (keep for next session)
3. Network is offline (need cache for display)

---

## Offline Support

### Decision

Always show cached data when offline, with visual staleness indicators.

### Rationale

- **Better UX**: Show approximate data rather than blank/error state
- **Graceful degradation**: Users can still see last known usage
- **Clear communication**: Visual indicators prevent confusion about freshness
- **Matches user expectations**: Similar to other apps showing cached content offline

### Offline Detection

Network errors indicate offline state:
- `ENOTFOUND`: DNS lookup failed
- `ECONNREFUSED`: Cannot reach server
- `ETIMEDOUT`: Network timeout
- `ECONNRESET`: Connection dropped

### User Experience

| Cache Age | Icon | Text Suffix | Color |
|-----------|------|-------------|-------|
| < 5 min | Default | None | Normal |
| 5-60 min | Default | "(cached)" | Normal |
| 1-24 hours | ⚠️ | "(stale)" | Warning |
| > 24 hours | ❌ | "(very old)" | Error |

### Implementation

```typescript
export function formatOfflineDisplay(data: UsageData, cacheAge: number): FormattedDisplay {
  const ageMinutes = cacheAge / (60 * 1000);
  
  let suffix = '';
  let state = DisplayState.NORMAL;
  
  if (ageMinutes > 1440) { // > 24 hours
    suffix = ' (very old)';
    state = DisplayState.ERROR;
  } else if (ageMinutes > 60) { // > 1 hour
    suffix = ' (stale)';
    state = DisplayState.WARNING;
  } else if (ageMinutes > 5) { // > 5 minutes
    suffix = ' (cached)';
  }
  
  return {
    text: `Copilot: ${data.includedUsed}/${data.includedTotal}${suffix}`,
    tooltip: `Last updated: ${formatTimestamp(data.lastRefreshTime)}\n\n⚠️ Offline - showing cached data`,
    state,
    icon: state === DisplayState.ERROR ? '$(error)' : (state === DisplayState.WARNING ? '$(warning)' : '$(sync)'),
    backgroundColor: state === DisplayState.ERROR ? new vscode.ThemeColor('statusBarItem.errorBackground') : undefined
  };
}
```

---

## Integration Points

### Mapping to Feature Requirements

| Research Finding | Feature Requirement | Implementation |
|------------------|---------------------|----------------|
| `vscode.authentication` | FR-001 | `GitHubAuthService` |
| HTTPS with retry | FR-002, FR-009 | `fetchCopilotUsage()` |
| Fetch on activation | FR-003 | `UsageDataService.activate()` |
| `setInterval` | FR-004 | `RefreshScheduler` |
| Response parsing | FR-005, FR-010 | `parseApiResponse()` |
| Status code handling | FR-006, FR-007 | Error classification in fetch |
| Exponential backoff | FR-008, FR-019 | `calculateBackoff()` |
| Mutex flag | FR-013 | `isRequestInFlight` |
| Manual refresh | FR-014 | `RefreshScheduler.trigger()` |
| Cache clearing | FR-015 | `UsageCache.clear()` on sign-out |
| Copilot endpoint | FR-016 | `api.github.com/copilot_internal/user` |
| Cache fallback | FR-017 | `UsageCache` with staleness checks |
| GitHub scope | FR-018 | `['user:email']` |
| User-Agent header | FR-020 | Headers in request options |

---

## Technology Decisions Summary

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Authentication** | `vscode.authentication` API | Built-in, automatic lifecycle, secure |
| **HTTP Client** | Node.js `https` module | Zero dependencies, sufficient for needs |
| **API Endpoint** | `api.github.com/copilot_internal/user` | Only known source for quota data |
| **Refresh Timer** | `setInterval` with mutex | Simple, proven, easy to manage |
| **Concurrency** | Boolean flag + AbortController | Prevents overlaps, cancellable |
| **Retry** | Exponential backoff, max 3 | Smart error classification, respects limits |
| **Caching** | `context.globalState` (Memento) | User-specific, automatic persistence |
| **Offline** | Show cached data with indicators | Better UX than blank state |

---

## Next Steps

With research complete, proceed to:

1. **Phase 1: Design**
   - Create `data-model.md` with entity definitions
   - Generate API contracts in `contracts/`
   - Write `quickstart.md` for usage guide
   - Update agent context

2. **Phase 2: Implementation Planning**
   - Generate `tasks.md` with test-first tasks
   - Follow TDD workflow from spec 001

All research findings will inform design decisions and implementation patterns.
