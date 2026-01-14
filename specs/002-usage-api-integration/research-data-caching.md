# Research: Data Caching and Persistence in VS Code Extensions

**Date**: 2026-01-12  
**Context**: Feature 002 - Usage API Integration  
**Purpose**: Determine optimal caching strategy for GitHub Copilot usage data

---

## Storage Choice

### Decision: `context.globalState` (Memento API)

**Rationale**:
- User's Copilot usage data is **user-specific**, not workspace-specific
- Data should persist across different workspaces on the same machine
- Usage data is not sensitive (doesn't need encryption)
- Lightweight data (~1KB) - well within Memento limits
- Built-in JSON serialization/deserialization
- Automatic persistence across VS Code restarts
- No manual file system operations required

**API**: `vscode.Memento` via `ExtensionContext.globalState`

**Alternatives Considered**:

| Option | Why Not Chosen |
|--------|----------------|
| **workspaceState** | Usage data is user-specific, not workspace-specific. User should see same data across all workspaces |
| **globalStorageUri + FileSystem** | Overkill for small JSON data. Memento provides automatic serialization. Adds complexity without benefit |
| **secretStorage** | Usage statistics are not sensitive credentials. SecretStorage is for tokens/passwords |
| **File system (custom location)** | Requires manual JSON serialization, error handling, path management. Memento handles all this automatically |

---

## Memento API Details

### Storage Mechanism

```typescript
interface Memento {
    /**
     * Return a value. The value must be JSON-stringifyable.
     */
    get<T>(key: string): T | undefined;
    get<T>(key: string, defaultValue: T): T;
    
    /**
     * Store a value. The value must be JSON-stringifyable.
     * Using `undefined` as value removes the key.
     */
    update(key: string, value: any): Thenable<void>;
    
    /**
     * Returns all stored keys.
     */
    keys(): readonly string[];
}

// globalState includes additional sync capability
interface GlobalState extends Memento {
    /**
     * Set keys whose values should sync across devices
     * when Settings Sync is enabled.
     */
    setKeysForSync(keys: readonly string[]): void;
}
```

### Usage Example

```typescript
export class UsageCache {
    private readonly CACHE_KEY = 'copilot.usageData';
    private readonly CACHE_TIMESTAMP_KEY = 'copilot.usageData.timestamp';
    
    constructor(private context: vscode.ExtensionContext) {
        // Optional: Enable Settings Sync for usage data
        // This syncs data across user's devices when they enable Settings Sync
        context.globalState.setKeysForSync([
            this.CACHE_KEY,
            this.CACHE_TIMESTAMP_KEY
        ]);
    }
    
    async store(data: UsageData): Promise<void> {
        await this.context.globalState.update(this.CACHE_KEY, data);
        await this.context.globalState.update(this.CACHE_TIMESTAMP_KEY, Date.now());
    }
    
    retrieve(): UsageData | null {
        return this.context.globalState.get<UsageData>(this.CACHE_KEY, null);
    }
    
    getLastUpdateTimestamp(): number | null {
        return this.context.globalState.get<number>(this.CACHE_TIMESTAMP_KEY, null);
    }
    
    async clear(): Promise<void> {
        await this.context.globalState.update(this.CACHE_KEY, undefined);
        await this.context.globalState.update(this.CACHE_TIMESTAMP_KEY, undefined);
    }
    
    isStale(maxAgeMs: number = 3600000): boolean {
        const timestamp = this.getLastUpdateTimestamp();
        if (!timestamp) return true;
        
        return (Date.now() - timestamp) > maxAgeMs;
    }
}
```

### Storage Limits and Best Practices

**Memento Storage Characteristics**:
- **No documented hard size limits** in VS Code API
- Data is JSON-stringified - must be JSON-serializable
- Stored in SQLite database managed by VS Code
- Persists across VS Code restarts automatically
- Shared across all extensions (each has own namespace via key prefixes)

**Best Practices**:
1. **Keep data small**: Memento is for configuration/state, not large datasets
   - Usage data is ~1KB (perfect fit)
2. **Use meaningful key prefixes**: Namespace keys to avoid collisions
   - Example: `copilot.usageData`, `copilot.cache.timestamp`
3. **Store primitives and simple objects**: Avoid complex object graphs
4. **Don't store circular references**: JSON serialization will fail
5. **Consider Settings Sync**: Use `setKeysForSync()` if data should sync across devices
6. **Clear old data**: Use `undefined` to remove stale keys

**When to Use File System Instead**:
- Large binary data (images, videos)
- Data > 100KB
- Non-JSON data formats
- Files that need to be accessed outside VS Code

---

## Cache Strategy

### Decision: Hybrid Approach - Cache with TTL + Graceful Degradation

**Cache Usage Rules**:

```typescript
enum CachePolicy {
    // Always fetch fresh - on extension activation
    FETCH_FRESH = 'fetch_fresh',
    
    // Use cache if fresh (< 5 minutes old)
    USE_IF_FRESH = 'use_if_fresh',
    
    // Use cache if valid (< 1 hour old)
    USE_IF_VALID = 'use_if_valid',
    
    // Always use cache (offline/error fallback)
    ALWAYS_USE_CACHE = 'always_use_cache'
}

interface CacheConfig {
    freshThresholdMs: number;    // 5 minutes - "fresh" data
    validThresholdMs: number;    // 1 hour - "valid but stale" data
    maxAgeMs: number;            // 24 hours - "too old, don't show"
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
    freshThresholdMs: 5 * 60 * 1000,      // 5 minutes
    validThresholdMs: 60 * 60 * 1000,     // 1 hour
    maxAgeMs: 24 * 60 * 60 * 1000         // 24 hours
};
```

**Rationale**:

| Scenario | Strategy | Reason |
|----------|----------|--------|
| **Extension activation** | Fetch fresh, fall back to cache | Get latest data, but don't block on errors |
| **Periodic refresh (online)** | Fetch fresh, update cache | Keep data current |
| **Periodic refresh (offline)** | Use cached data | Degrade gracefully when API unavailable |
| **Manual refresh** | Force fetch fresh | User explicitly requested update |
| **Data < 5 min old** | Use cache | Recent enough to be accurate |
| **Data 5-60 min old** | Fetch fresh, show cache during fetch | Balance freshness with API load |
| **Data > 24 hours old** | Fetch required, show warning if fails | Prevent showing very stale data |

### Invalidation Rules

**Cache is invalidated (cleared) when**:
1. User signs out of GitHub (auth session ends)
2. Extension detects account/subscription change
3. User manually clears cache (future feature)

**Cache is considered stale when**:
1. Age > 5 minutes (for automatic refresh)
2. Age > 1 hour (requires user notification of staleness)
3. Age > 24 hours (too old - fetch required)

**Implementation**:

```typescript
class CacheManager {
    private config: CacheConfig;
    private cache: UsageCache;
    
    async getData(policy: CachePolicy = CachePolicy.USE_IF_FRESH): Promise<UsageData> {
        const cached = this.cache.retrieve();
        const timestamp = this.cache.getLastUpdateTimestamp();
        const age = timestamp ? Date.now() - timestamp : Infinity;
        
        switch (policy) {
            case CachePolicy.FETCH_FRESH:
                return await this.fetchAndCache();
                
            case CachePolicy.USE_IF_FRESH:
                if (cached && age < this.config.freshThresholdMs) {
                    return cached;  // Cache is fresh
                }
                return await this.fetchAndCache();
                
            case CachePolicy.USE_IF_VALID:
                if (cached && age < this.config.validThresholdMs) {
                    return cached;  // Cache is valid
                }
                return await this.fetchAndCache();
                
            case CachePolicy.ALWAYS_USE_CACHE:
                if (cached) {
                    return cached;
                }
                throw new Error('No cached data available');
        }
    }
    
    private async fetchAndCache(): Promise<UsageData> {
        try {
            const data = await this.api.fetchUsage();
            await this.cache.store(data);
            return data;
        } catch (error) {
            // On fetch failure, try cached data as fallback
            const cached = this.cache.retrieve();
            if (cached) {
                console.warn('API fetch failed, using cached data:', error);
                return cached;
            }
            throw error;  // No cache available
        }
    }
    
    async clearOnSignOut(): Promise<void> {
        await this.cache.clear();
    }
}
```

---

## Offline Behavior

### Decision: Show Cached Data with Staleness Indicator

**Offline Detection Strategy**:

VS Code doesn't provide a direct "isOnline" API. Detect offline status through:

1. **Network errors during fetch**:
   - `TypeError: fetch failed`
   - `AbortError` (timeout)
   - HTTP error codes (but 5xx might be server issue, not offline)

2. **Pattern**:
```typescript
function isNetworkError(error: any): boolean {
    // Network failure - likely offline
    if (error.name === 'TypeError' && 
        error.message.includes('fetch')) {
        return true;
    }
    
    // Timeout - likely offline or slow connection
    if (error.name === 'TimeoutError' || 
        error.name === 'AbortError') {
        return true;
    }
    
    return false;
}
```

**User Experience When Offline**:

| Cache Age | Display Behavior | Visual Indicator |
|-----------|------------------|------------------|
| **< 5 minutes** | Show cached data normally | No indicator (data is fresh) |
| **5-60 minutes** | Show cached data | `⚠️` icon + tooltip "Last updated X min ago" |
| **1-24 hours** | Show cached data | `⚠️` icon + tooltip "Data may be outdated (Last updated X hours ago)" |
| **> 24 hours** | Show cached data | `❌` icon + tooltip "Data is stale (Last updated X days ago)" |
| **No cache** | Show error state | Show "Unable to fetch data" message |

**Status Bar Display Examples**:

```typescript
interface StatusBarPresentation {
    text: string;
    tooltip: string;
    color?: string;
    backgroundColor?: ThemeColor;
}

function getOfflinePresentation(
    data: UsageData, 
    cacheAge: number
): StatusBarPresentation {
    const ageMinutes = Math.floor(cacheAge / 60000);
    const ageHours = Math.floor(cacheAge / 3600000);
    const ageDays = Math.floor(cacheAge / 86400000);
    
    // Format basic usage text
    const usageText = formatUsageData(data);
    
    // Add staleness indicator based on age
    if (ageMinutes < 5) {
        // Fresh data - no indicator
        return {
            text: usageText,
            tooltip: `Copilot Usage\n${usageText}\nLast updated: ${ageMinutes} min ago`
        };
    } else if (ageHours < 1) {
        // Recent but not fresh
        return {
            text: `⚠️ ${usageText}`,
            tooltip: `Copilot Usage (Offline)\n${usageText}\nLast updated: ${ageMinutes} min ago\n\nShowing cached data`
        };
    } else if (ageDays < 1) {
        // Older data
        return {
            text: `⚠️ ${usageText}`,
            tooltip: `Copilot Usage (Offline)\n${usageText}\nLast updated: ${ageHours} hours ago\n\nData may be outdated`,
            color: 'orange'
        };
    } else {
        // Very stale data
        return {
            text: `❌ ${usageText}`,
            tooltip: `Copilot Usage (Offline)\n${usageText}\nLast updated: ${ageDays} days ago\n\nData is likely outdated`,
            color: 'red'
        };
    }
}
```

**Implementation Pattern**:

```typescript
class UsageDataManager {
    async refresh(): Promise<void> {
        try {
            // Attempt to fetch fresh data
            const data = await this.api.fetchUsage();
            await this.cache.store(data);
            this.updateStatusBar(data, false); // isOffline = false
            
        } catch (error) {
            if (isNetworkError(error)) {
                // Network error - use cache
                const cached = this.cache.retrieve();
                if (cached) {
                    const age = Date.now() - this.cache.getLastUpdateTimestamp()!;
                    this.updateStatusBar(cached, true); // isOffline = true
                } else {
                    this.showErrorState('Unable to fetch usage data (offline)');
                }
            } else {
                // Other error (auth, API error, etc.)
                throw error;
            }
        }
    }
    
    private updateStatusBar(data: UsageData, isOffline: boolean): void {
        if (isOffline) {
            const age = Date.now() - this.cache.getLastUpdateTimestamp()!;
            const presentation = getOfflinePresentation(data, age);
            this.statusBarItem.text = presentation.text;
            this.statusBarItem.tooltip = presentation.tooltip;
            this.statusBarItem.color = presentation.color;
        } else {
            // Normal online display
            this.statusBarItem.text = formatUsageData(data);
            this.statusBarItem.tooltip = `Copilot Usage\n${formatUsageData(data)}`;
            this.statusBarItem.color = undefined;
        }
    }
}
```

---

## Integration with Feature Requirements

### Mapping to FR-017 (Caching)

**Requirement**: Extension SHOULD cache last successful response for display during transient failures

**Implementation**:
```typescript
// From FR-017
async fetchUsageWithFallback(): Promise<UsageData> {
    try {
        const data = await this.api.fetchUsage();
        await this.cache.store(data);  // ✅ Cache on success
        return data;
    } catch (error) {
        // Transient failure - try cache
        const cached = this.cache.retrieve();
        if (cached) {
            console.warn('Using cached data due to API failure:', error);
            return cached;  // ✅ Fallback to cache
        }
        throw error;  // No cache available
    }
}
```

### Mapping to FR-015 (Clear on Sign-Out)

**Requirement**: Extension MUST clear cached authentication state when user signs out

**Implementation**:
```typescript
// From FR-015
vscode.authentication.onDidChangeSessions(async (e) => {
    if (e.provider.id === 'github') {
        // Check if sessions were removed (sign out)
        const sessions = await vscode.authentication.getSession('github', ['user:email'], { silent: true });
        
        if (!sessions) {
            // User signed out - clear cache
            await this.cache.clear();  // ✅ Clear on sign-out
            this.statusBarItem.text = '$(github) Sign in to see Copilot usage';
        }
    }
});
```

### Mapping to User Story 5 (Offline Caching)

**User Story**: As a developer, I want the extension to remember my last known usage data when offline

**Implementation**:
```typescript
// Activation - load cache immediately for instant display
export async function activate(context: vscode.ExtensionContext) {
    const cache = new UsageCache(context);
    const manager = new UsageDataManager(cache);
    
    // Show cached data immediately (instant feedback)
    const cached = cache.retrieve();
    if (cached) {
        const age = Date.now() - cache.getLastUpdateTimestamp()!;
        manager.updateStatusBar(cached, true);  // ✅ Show cache while fetching
    }
    
    // Then fetch fresh in background
    await manager.refresh();  // ✅ Update with fresh data if online
}
```

---

## Summary

### Final Decisions

1. **Storage**: Use `context.globalState` (Memento API)
   - User-specific data
   - Automatic persistence
   - Simple JSON serialization
   - No file system operations needed

2. **Cache Strategy**: Hybrid with TTL-based freshness
   - Fresh data: < 5 minutes (use immediately)
   - Valid data: < 1 hour (use with indicator)
   - Stale data: > 24 hours (warn user)
   - Clear on sign-out

3. **Offline Behavior**: Graceful degradation with indicators
   - Detect via network errors
   - Show cached data with staleness warnings
   - Visual indicators (⚠️/❌) based on age
   - Never block user from seeing data

4. **Implementation Pattern**:
   ```typescript
   // Simple, clear pattern
   try {
       const fresh = await api.fetch();
       await cache.store(fresh);
       show(fresh);
   } catch (error) {
       const cached = cache.retrieve();
       if (cached) {
           show(cached, { stale: true });
       } else {
           showError();
       }
   }
   ```

### Benefits of This Approach

- ✅ **Simple**: Memento API handles all persistence
- ✅ **Reliable**: Works offline without degradation
- ✅ **Fast**: Cached data shows instantly
- ✅ **Accurate**: Clear staleness indicators
- ✅ **Robust**: Multiple fallback levels
- ✅ **Maintainable**: Clear decision tree for cache usage

### Trade-offs Accepted

- ❌ **No cross-machine sync** (unless user enables Settings Sync)
  - Acceptable: Usage data is fetched fresh on each machine anyway
- ❌ **No sophisticated cache invalidation**
  - Acceptable: Time-based expiry is sufficient for usage data
- ❌ **No granular network status**
  - Acceptable: Error-based detection works well in practice

---

## References

- [VS Code API - ExtensionContext](https://code.visualstudio.com/api/references/vscode-api#ExtensionContext)
- [VS Code API - Memento](https://code.visualstudio.com/api/references/vscode-api#Memento)
- [VS Code Extension Samples - Memento Usage](https://github.com/microsoft/vscode-extension-samples)
- [Settings Sync Documentation](https://code.visualstudio.com/docs/editor/settings-sync)
