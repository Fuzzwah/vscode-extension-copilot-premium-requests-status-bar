# Research: Periodic Refresh Best Practices for VS Code Extensions

**Date**: 2026-01-12  
**Context**: Feature 002 - Usage API Integration

---

## Timer Management

### Decision: Use `setInterval` with `Disposable` Pattern

**Rationale**: 
- Native JavaScript `setInterval` provides the simplest and most reliable timer mechanism
- VS Code's `Disposable` pattern ensures proper cleanup during extension lifecycle
- No need for complex VS Code-specific scheduler APIs
- Proven pattern used extensively in VS Code extension samples

**Code Pattern**:
```typescript
class RefreshScheduler implements vscode.Disposable {
    private intervalId: NodeJS.Timeout | undefined;
    
    start(intervalSeconds: number, callback: () => void | Promise<void>): void {
        // Clear any existing interval
        this.stop();
        
        // Start new interval
        this.intervalId = setInterval(async () => {
            try {
                await callback();
            } catch (error) {
                console.error('Refresh failed:', error);
            }
        }, intervalSeconds * 1000);
    }
    
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
    }
    
    updateInterval(intervalSeconds: number, callback: () => void | Promise<void>): void {
        // Simply restart with new interval
        this.start(intervalSeconds, callback);
    }
    
    dispose(): void {
        this.stop();
    }
}
```

**Cleanup Strategy**:
1. Register the scheduler in `context.subscriptions` array during activation
2. VS Code automatically calls `dispose()` on deactivation
3. `dispose()` method clears the interval and releases resources
4. Pattern: `context.subscriptions.push(scheduler);`

**Example from VS Code Extension Samples**:
```typescript
// tabs-api-sample/src/extension.ts
const interval = setInterval(() => {
    // Periodic work here
}, 1000);

context.subscriptions.push({
    dispose: () => {
        clearInterval(interval);
    }
});
```

**Alternative Considered**: `setTimeout` with recursive calls
- Not chosen because `setInterval` is clearer for fixed-interval operations
- `setTimeout` better for exponential backoff or variable delays

---

## Request Concurrency Control

### Decision: Simple Boolean Flag (Mutex Pattern)

**Rationale**:
- Prevents overlapping requests without complex queue management
- Simple to implement and understand
- Sufficient for periodic refresh use case
- Low overhead - no need for request queue

**Implementation**:
```typescript
class UsageAPIClient {
    private isRefreshing: boolean = false;
    
    async fetchUsage(): Promise<UsageData> {
        // Prevent concurrent requests
        if (this.isRefreshing) {
            console.log('Refresh already in progress, skipping...');
            return; // Or return cached data
        }
        
        try {
            this.isRefreshing = true;
            
            // Make API request
            const response = await fetch(API_URL, {
                headers: { 'Authorization': `Bearer ${token}` },
                signal: AbortSignal.timeout(30000) // 30 second timeout
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return this.parseUsageData(data);
            
        } finally {
            this.isRefreshing = false;
        }
    }
}
```

**Manual Refresh Handling**:
```typescript
async function manualRefresh(): Promise<void> {
    if (client.isRefreshing) {
        // Wait for current refresh to complete
        await new Promise<void>(resolve => {
            const checkInterval = setInterval(() => {
                if (!client.isRefreshing) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });
    }
    
    // Now trigger refresh
    await client.fetchUsage();
}
```

**Alternative Considered**: Queue-based approach
- Overkill for this use case
- Would add complexity without significant benefit
- Simple flag is sufficient since we only need "latest" data

**Cancellation on Deactivation**:
```typescript
class UsageAPIClient implements vscode.Disposable {
    private abortController?: AbortController;
    
    async fetchUsage(): Promise<UsageData> {
        // Create new abort controller for this request
        this.abortController = new AbortController();
        
        try {
            const response = await fetch(API_URL, {
                signal: this.abortController.signal,
                // ... other options
            });
            // ... process response
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Request cancelled');
                return;
            }
            throw error;
        } finally {
            this.abortController = undefined;
        }
    }
    
    dispose(): void {
        // Cancel any in-flight requests
        if (this.abortController) {
            this.abortController.abort();
        }
    }
}
```

---

## Retry Strategy

### Decision: Exponential Backoff with Maximum Retries

**Rationale**:
- Prevents overwhelming the server during outages
- Gives transient failures time to resolve
- Industry standard approach for API retry logic
- Balances user experience with server load

**Configuration**:
```typescript
interface RetryConfig {
    maxRetries: number;        // 3 attempts total (1 initial + 2 retries)
    initialDelayMs: number;    // 1000ms (1 second)
    maxDelayMs: number;        // 30000ms (30 seconds)
    backoffMultiplier: number; // 2 (doubles each retry)
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2
};
```

**Backoff Formula**:
```
delay = min(initialDelay * (multiplier ^ attemptNumber), maxDelay)

Examples:
- Attempt 1: min(1000 * 2^0, 30000) = 1000ms (1 second)
- Attempt 2: min(1000 * 2^1, 30000) = 2000ms (2 seconds)
- Attempt 3: min(1000 * 2^2, 30000) = 4000ms (4 seconds)
```

**Code Pattern**:
```typescript
class UsageAPIClient {
    private retryConfig = DEFAULT_RETRY_CONFIG;
    
    async fetchUsageWithRetry(): Promise<UsageData> {
        let lastError: Error | undefined;
        
        for (let attempt = 0; attempt < this.retryConfig.maxRetries; attempt++) {
            try {
                return await this.fetchUsage();
            } catch (error) {
                lastError = error as Error;
                
                // Check if we should retry
                if (!this.isRetryableError(error)) {
                    throw error; // Don't retry permanent failures
                }
                
                // Calculate backoff delay
                const delay = Math.min(
                    this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt),
                    this.retryConfig.maxDelayMs
                );
                
                console.log(`Retry attempt ${attempt + 1}/${this.retryConfig.maxRetries} after ${delay}ms`);
                
                // Wait before retrying
                if (attempt < this.retryConfig.maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        // All retries exhausted
        throw new Error(`Failed after ${this.retryConfig.maxRetries} attempts: ${lastError?.message}`);
    }
    
    private isRetryableError(error: any): boolean {
        // Network errors - retry
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return true;
        }
        
        // Timeout errors - retry
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
            return true;
        }
        
        // HTTP status codes
        if (error.statusCode) {
            // 5xx server errors - retry
            if (error.statusCode >= 500 && error.statusCode < 600) {
                return true;
            }
            
            // 429 rate limit - retry
            if (error.statusCode === 429) {
                return true;
            }
            
            // 408 request timeout - retry
            if (error.statusCode === 408) {
                return true;
            }
            
            // 4xx client errors (except 429) - don't retry
            if (error.statusCode >= 400 && error.statusCode < 500) {
                return false;
            }
        }
        
        // Unknown errors - don't retry
        return false;
    }
}
```

**Error Classification**:

| Error Type | Status Code | Action | Rationale |
|------------|-------------|--------|-----------|
| Network failure | - | **Retry** | Transient network issues |
| Timeout | - | **Retry** | May succeed with more time |
| 500-599 Server Error | 500-599 | **Retry** | Server-side transient issues |
| 429 Rate Limited | 429 | **Retry** | Temporary throttling |
| 408 Timeout | 408 | **Retry** | Request timeout |
| 401 Unauthorized | 401 | **Don't retry** | Invalid/expired token - needs re-auth |
| 403 Forbidden | 403 | **Don't retry** | Insufficient permissions |
| 404 Not Found | 404 | **Don't retry** | Resource doesn't exist |
| 400 Bad Request | 400 | **Don't retry** | Invalid request format |

**User Communication**:
```typescript
interface ErrorState {
    isTransient: boolean;    // Can retry
    isPermanent: boolean;    // Cannot retry
    message: string;         // User-friendly message
    canRetry: boolean;       // Manual retry available
}

function communicateError(error: any): ErrorState {
    const isRetryable = this.isRetryableError(error);
    
    if (error.statusCode === 401) {
        return {
            isTransient: false,
            isPermanent: true,
            message: 'Authentication required. Please sign in to GitHub.',
            canRetry: false
        };
    }
    
    if (error.statusCode === 403) {
        return {
            isTransient: false,
            isPermanent: true,
            message: 'Access denied. Check your GitHub Copilot subscription.',
            canRetry: false
        };
    }
    
    if (error.statusCode === 429) {
        return {
            isTransient: true,
            isPermanent: false,
            message: 'Rate limited. Retrying automatically...',
            canRetry: true
        };
    }
    
    if (error.statusCode >= 500) {
        return {
            isTransient: true,
            isPermanent: false,
            message: 'GitHub service temporarily unavailable. Retrying...',
            canRetry: true
        };
    }
    
    if (error.name === 'TypeError' || error.name === 'TimeoutError') {
        return {
            isTransient: true,
            isPermanent: false,
            message: 'Network error. Retrying...',
            canRetry: true
        };
    }
    
    // Unknown error
    return {
        isTransient: false,
        isPermanent: false,
        message: 'Failed to fetch usage data. Try refreshing manually.',
        canRetry: true
    };
}
```

---

## Integration Example

**Complete lifecycle management**:

```typescript
export class UsageDataManager implements vscode.Disposable {
    private scheduler: RefreshScheduler;
    private client: UsageAPIClient;
    private cache: UsageCache;
    
    constructor(context: vscode.ExtensionContext) {
        this.scheduler = new RefreshScheduler();
        this.client = new UsageAPIClient();
        this.cache = new UsageCache();
        
        // Register for cleanup
        context.subscriptions.push(this);
        context.subscriptions.push(this.scheduler);
        context.subscriptions.push(this.client);
        
        // Start periodic refresh
        const intervalSeconds = vscode.workspace.getConfiguration('copilotUsage')
            .get<number>('refreshInterval', 60);
        
        this.scheduler.start(intervalSeconds, () => this.refresh());
        
        // Listen for config changes
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('copilotUsage.refreshInterval')) {
                    const newInterval = vscode.workspace.getConfiguration('copilotUsage')
                        .get<number>('refreshInterval', 60);
                    this.scheduler.updateInterval(newInterval, () => this.refresh());
                }
            })
        );
    }
    
    private async refresh(): Promise<void> {
        try {
            const data = await this.client.fetchUsageWithRetry();
            this.cache.store(data);
            // Update UI...
        } catch (error) {
            console.error('Refresh failed:', error);
            // Show error state in UI...
        }
    }
    
    async manualRefresh(): Promise<void> {
        await this.refresh();
    }
    
    dispose(): void {
        // Cleanup handled by context.subscriptions
    }
}
```

---

## References

- [VS Code API - Disposable](https://code.visualstudio.com/api/references/vscode-api#Disposable)
- [VS Code Extension Samples - tabs-api-sample](https://github.com/microsoft/vscode-extension-samples/tree/main/tabs-api-sample)
- [VS Code Extension Samples - lsp-embedded-language-service](https://github.com/microsoft/vscode-extension-samples/tree/main/lsp-embedded-language-service)
- [MDN - AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [MDN - Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

---

## Summary

The research confirms these best practices:

1. **Timer Management**: Use native `setInterval` with VS Code's `Disposable` pattern for automatic cleanup
2. **Concurrency Control**: Simple boolean flag prevents overlapping requests without queue complexity
3. **Retry Strategy**: Exponential backoff with smart error classification balances reliability and server load
4. **Lifecycle Management**: Register all disposable resources in `context.subscriptions` for automatic cleanup

All patterns are proven in production VS Code extensions and align with VS Code API guidelines.
