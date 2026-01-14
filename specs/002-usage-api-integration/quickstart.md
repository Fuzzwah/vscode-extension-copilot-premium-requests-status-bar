# Quickstart Guide: Usage API Integration

**Feature**: 002-usage-api-integration  
**Audience**: Developers implementing or maintaining this feature  
**Prerequisites**: Feature 001 (status bar display) completed

## Overview

This feature adds GitHub Copilot usage data fetching via GitHub's internal API, replacing the mock data in spec 001. It includes authentication, automatic refresh, caching, and error handling.

## Architecture

```
┌───────────────────────────────────────────────────────────┐
│                  extension.ts (entry point)                │
│                                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │        UsageDataService (facade)                  │    │
│  │                                                    │    │
│  │  ┌────────────────┐  ┌────────────────────────┐ │    │
│  │  │GitHubAuth      │  │UsageApiClient          │ │    │
│  │  │Service         │──→│                        │ │    │
│  │  │                │  │• HTTP requests         │ │    │
│  │  │• Get token     │  │• Retry logic           │ │    │
│  │  │• Auth events   │  │• Response parsing      │ │    │
│  │  └────────────────┘  └────────────────────────┘ │    │
│  │                                                    │    │
│  │  ┌────────────────┐  ┌────────────────────────┐ │    │
│  │  │UsageCache      │  │RefreshScheduler        │ │    │
│  │  │                │  │                        │ │    │
│  │  │• globalState   │  │• setInterval           │ │    │
│  │  │• Freshness     │  │• Mutex                 │ │    │
│  │  └────────────────┘  └────────────────────────┘ │    │
│  │                                                    │    │
│  │  Events: onDataChange ──→ StatusBarController    │    │
│  └──────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────┘
```

## Implementation Order (TDD)

### Phase 1: Foundation (Types & Contracts)

**Files**: `src/api/types.ts`, `src/cache/types.ts`, `src/scheduler/types.ts`

```bash
# 1. Create type definitions
mkdir -p src/api src/cache src/scheduler

# 2. Add to types.ts:
- GitHubCopilotApiResponse
- ApiRequestOptions
- ApiError class
- CachedUsageData
- RefreshConfig
```

**Test**: TypeScript compilation, no runtime tests needed.

---

### Phase 2: GitHub Authentication

**Files**: 
- `src/api/IGitHubAuthService.ts` (interface)
- `src/api/GitHubAuthService.ts` (implementation)
- `tests/unit/api/GitHubAuthService.test.ts`

**Test First**:

```typescript
// tests/unit/api/GitHubAuthService.test.ts
describe('GitHubAuthService', () => {
  it('should return token when user is authenticated', async () => {
    // Mock vscode.authentication.getSession to return session
    const service = new GitHubAuthService();
    const token = await service.getToken(false);
    expect(token).to.equal('mock-token-123');
  });

  it('should return undefined when user not authenticated and createIfNone=false', async () => {
    // Mock getSession to return undefined
    const service = new GitHubAuthService();
    const token = await service.getToken(false);
    expect(token).to.be.undefined;
  });

  it('should emit event when authentication state changes', (done) => {
    const service = new GitHubAuthService();
    service.onDidChangeSession(() => {
      done();
    });
    // Trigger vscode.authentication.onDidChangeSessions event
  });
});
```

**Implementation**:

```typescript
// src/api/GitHubAuthService.ts
export class GitHubAuthService implements IGitHubAuthService {
  async getToken(createIfNone = true): Promise<string | undefined> {
    const session = await vscode.authentication.getSession(
      'github',
      ['user:email'],
      { createIfNone }
    );
    return session?.accessToken;
  }

  async isAuthenticated(): Promise<boolean> {
    const session = await this.getToken(false);
    return session !== undefined;
  }

  onDidChangeSession(callback: () => void | Promise<void>): vscode.Disposable {
    return vscode.authentication.onDidChangeSessions(async (e) => {
      if (e.provider.id === 'github') {
        await callback();
      }
    });
  }

  dispose(): void {
    // No cleanup needed - VS Code manages sessions
  }
}
```

**Run**: `npm run test:unit -- --grep "GitHubAuthService"`

---

### Phase 3: API Client (HTTP Requests)

**Files**:
- `src/api/IUsageApiClient.ts`
- `src/api/UsageApiClient.ts`
- `tests/unit/api/UsageApiClient.test.ts`
- `tests/unit/mocks/https.mock.ts` (mock Node.js https module)

**Test First**:

```typescript
describe('UsageApiClient', () => {
  it('should fetch and parse valid usage data', async () => {
    // Mock https.request to return valid response
    const client = new UsageApiClient();
    const data = await client.fetchUsage('token-123');
    
    expect(data.includedTotal).to.equal(300);
    expect(data.includedUsed).to.equal(250);
    expect(data.budgetUsed).to.equal(5);
  });

  it('should throw ApiError(AUTH) on 401 response', async () => {
    // Mock https to return 401
    const client = new UsageApiClient();
    
    try {
      await client.fetchUsage('invalid-token');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).to.be.instanceOf(ApiError);
      expect(error.type).to.equal(ApiErrorType.AUTH);
      expect(error.retryable).to.be.false;
    }
  });

  it('should retry on 500 error with exponential backoff', async () => {
    // Mock https: fail twice with 500, succeed on 3rd attempt
    // Track delay between attempts
    const client = new UsageApiClient();
    const data = await client.fetchUsage('token-123', { maxRetries: 3 });
    
    expect(data).to.exist;
    // Verify delays were: 1s, 2s
  });

  it('should timeout after 30 seconds', async () => {
    const client = new UsageApiClient();
    
    try {
      await client.fetchUsage('token-123', { timeout: 100 });
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error.type).to.equal(ApiErrorType.TIMEOUT);
    }
  });

  it('should prevent concurrent requests', async () => {
    const client = new UsageApiClient();
    
    const promise1 = client.fetchUsage('token-123');
    expect(client.isRequestPending()).to.be.true;
    
    try {
      await client.fetchUsage('token-456'); // Should throw
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error.message).to.include('already in progress');
    }
    
    await promise1;
    expect(client.isRequestPending()).to.be.false;
  });
});
```

**Implementation**: See `research.md` for full HTTP client code.

---

### Phase 4: Cache

**Files**:
- `src/cache/IUsageCache.ts`
- `src/cache/UsageCache.ts`
- `tests/unit/cache/UsageCache.test.ts`

**Test First**:

```typescript
describe('UsageCache', () => {
  let context: vscode.ExtensionContext;

  beforeEach(() => {
    context = {
      globalState: {
        get: sinon.stub(),
        update: sinon.stub().resolves()
      }
    } as any;
  });

  it('should store and retrieve usage data', async () => {
    const cache = new UsageCache(context);
    const data: UsageData = { includedUsed: 100, includedTotal: 300, budgetUsed: 0, lastRefreshTime: Date.now(), billingPeriodEnd: '2026-02-01' };
    
    await cache.store(data);
    
    expect(context.globalState.update).to.have.been.calledOnce;
    
    // Mock retrieve
    (context.globalState.get as sinon.SinonStub).returns({ data, cachedAt: Date.now() });
    const retrieved = await cache.retrieve();
    
    expect(retrieved).to.deep.equal(data);
  });

  it('should calculate cache age correctly', async () => {
    const cache = new UsageCache(context);
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    
    (context.globalState.get as sinon.SinonStub).returns({ data: {}, cachedAt: fiveMinutesAgo });
    
    const age = await cache.getCacheAge();
    expect(age).to.be.approximately(5 * 60 * 1000, 100);
  });

  it('should return FRESH freshness for < 5 minute old cache', async () => {
    const cache = new UsageCache(context);
    (context.globalState.get as sinon.SinonStub).returns({ data: {}, cachedAt: Date.now() - 60000 });
    
    const freshness = await cache.getFreshness();
    expect(freshness).to.equal(CacheFreshness.FRESH);
  });

  it('should clear cache', async () => {
    const cache = new UsageCache(context);
    await cache.clear();
    
    expect(context.globalState.update).to.have.been.calledWith('copilot.usage.cache', undefined);
  });
});
```

**Implementation**: See `data-model.md` for cache implementation.

---

### Phase 5: Refresh Scheduler

**Files**:
- `src/scheduler/IRefreshScheduler.ts`
- `src/scheduler/RefreshScheduler.ts`
- `tests/unit/scheduler/RefreshScheduler.test.ts`

**Test First**:

```typescript
describe('RefreshScheduler', () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });

  it('should call refresh callback at configured interval', async () => {
    const callback = sinon.stub().resolves();
    const scheduler = new RefreshScheduler({ intervalSeconds: 60, enabled: true }, callback);
    
    scheduler.start();
    
    // Advance 60 seconds
    await clock.tickAsync(60000);
    expect(callback).to.have.been.calledOnce;
    
    // Advance another 60 seconds
    await clock.tickAsync(60000);
    expect(callback).to.have.been.calledTwice;
    
    scheduler.stop();
  });

  it('should prevent overlapping refreshes', async () => {
    let resolveCallback: () => void;
    const callback = sinon.stub().returns(new Promise(resolve => {
      resolveCallback = resolve;
    }));
    
    const scheduler = new RefreshScheduler({ intervalSeconds: 60, enabled: true }, callback);
    scheduler.start();
    
    // Trigger refresh
    await clock.tickAsync(60000);
    expect(callback).to.have.been.calledOnce;
    
    // Advance time while refresh still in progress
    await clock.tickAsync(60000);
    expect(callback).to.have.been.calledOnce; // NOT called again
    
    resolveCallback!();
    await clock.tickAsync(1);
    
    // Next interval should now trigger
    await clock.tickAsync(60000);
    expect(callback).to.have.been.calledTwice;
  });

  it('should update interval dynamically', async () => {
    const callback = sinon.stub().resolves();
    const scheduler = new RefreshScheduler({ intervalSeconds: 60, enabled: true }, callback);
    
    scheduler.start();
    await clock.tickAsync(60000);
    expect(callback).to.have.been.calledOnce;
    
    // Change to 30 second interval
    scheduler.updateConfig({ intervalSeconds: 30, enabled: true });
    
    await clock.tickAsync(30000);
    expect(callback).to.have.been.calledTwice;
  });

  it('should wait for in-flight refresh before manual trigger', async () => {
    let resolveCallback: () => void;
    const callback = sinon.stub().returns(new Promise(resolve => {
      resolveCallback = resolve;
    }));
    
    const scheduler = new RefreshScheduler({ intervalSeconds: 60, enabled: true }, callback);
    
    // Start auto-refresh
    scheduler.start();
    await clock.tickAsync(60000);
    expect(scheduler.isRefreshing()).to.be.true;
    
    // Trigger manual refresh (should wait)
    const manualPromise = scheduler.trigger();
    
    // Resolve in-flight refresh
    resolveCallback!();
    await manualPromise;
    
    expect(callback).to.have.been.calledTwice;
  });
});
```

**Implementation**: See `research.md` for RefreshScheduler code.

---

### Phase 6: UsageDataService (Facade)

**Files**:
- `src/api/IUsageDataService.ts`
- `src/api/UsageDataService.ts`
- `tests/unit/api/UsageDataService.test.ts`

**Test First**:

```typescript
describe('UsageDataService', () => {
  let authService: sinon.SinonStubbedInstance<IGitHubAuthService>;
  let apiClient: sinon.SinonStubbedInstance<IUsageApiClient>;
  let cache: sinon.SinonStubbedInstance<IUsageCache>;
  let scheduler: sinon.SinonStubbedInstance<IRefreshScheduler>;

  beforeEach(() => {
    authService = sinon.createStubInstance(GitHubAuthService);
    apiClient = sinon.createStubInstance(UsageApiClient);
    cache = sinon.createStubInstance(UsageCache);
    scheduler = sinon.createStubInstance(RefreshScheduler);
  });

  it('should fetch data on activate and emit event', async () => {
    authService.getToken.resolves('token-123');
    apiClient.fetchUsage.resolves({ includedUsed: 100, includedTotal: 300, budgetUsed: 0, lastRefreshTime: Date.now(), billingPeriodEnd: '2026-02-01' });
    
    const service = new UsageDataService(authService, apiClient, cache, scheduler);
    
    const eventSpy = sinon.spy();
    service.onDataChange(eventSpy);
    
    await service.activate();
    
    expect(apiClient.fetchUsage).to.have.been.calledWith('token-123');
    expect(cache.store).to.have.been.called;
    expect(eventSpy).to.have.been.calledOnce;
    expect(eventSpy.firstCall.args[0].data).to.exist;
    expect(eventSpy.firstCall.args[0].fromCache).to.be.false;
  });

  it('should fallback to cache on fetch failure', async () => {
    authService.getToken.resolves('token-123');
    apiClient.fetchUsage.rejects(new ApiError('Network error', ApiErrorType.NETWORK));
    cache.retrieve.resolves({ includedUsed: 80, includedTotal: 300, budgetUsed: 0, lastRefreshTime: Date.now() - 60000, billingPeriodEnd: '2026-02-01' });
    cache.getCacheAge.resolves(60000);
    
    const service = new UsageDataService(authService, apiClient, cache, scheduler);
    
    const eventSpy = sinon.spy();
    service.onDataChange(eventSpy);
    
    await service.activate();
    
    expect(eventSpy).to.have.been.calledOnce;
    expect(eventSpy.firstCall.args[0].data).to.exist;
    expect(eventSpy.firstCall.args[0].fromCache).to.be.true;
    expect(eventSpy.firstCall.args[0].error).to.exist;
  });

  it('should clear cache when user signs out', async () => {
    let authCallback: () => void;
    authService.onDidChangeSession.callsFake((cb) => {
      authCallback = cb;
      return { dispose: () => {} };
    });
    authService.isAuthenticated.resolves(false); // Signed out
    
    const service = new UsageDataService(authService, apiClient, cache, scheduler);
    await service.activate();
    
    // Trigger sign-out
    authCallback!();
    
    expect(cache.clear).to.have.been.called;
  });
});
```

**Implementation**: Orchestrates all components, see `data-model.md` for interface.

---

### Phase 7: Integration with StatusBarController

**Files**:
- `src/extension.ts` (update)
- `src/statusBar/StatusBarController.ts` (update - add event subscription)

**Changes**:

```typescript
// src/extension.ts
export async function activate(context: vscode.ExtensionContext) {
  // Create services
  const authService = new GitHubAuthService();
  const apiClient = new UsageApiClient();
  const cache = new UsageCache(context);
  const scheduler = new RefreshScheduler(
    { intervalSeconds: 60, enabled: true },
    async () => await usageDataService.refresh()
  );
  const usageDataService = new UsageDataService(authService, apiClient, cache, scheduler);
  
  // Create status bar controller
  const controller = new StatusBarController(vscode.window.createStatusBarItem());
  
  // Subscribe to data changes
  usageDataService.onDataChange(event => {
    if (event.data) {
      controller.updateDisplay(event.data);
    } else if (event.error) {
      if (event.error instanceof ApiError && event.error.type === ApiErrorType.AUTH) {
        // Show NO_AUTH state
        controller.showError('Not signed in');
      } else if (event.error instanceof ApiError && event.error.type === ApiErrorType.FORBIDDEN) {
        // Show NO_SUBSCRIPTION state
        controller.showError('No Copilot subscription');
      } else {
        controller.showError(event.error.message);
      }
    }
  });
  
  // Activate service (fetch + start auto-refresh)
  await usageDataService.activate();
  
  // Register manual refresh command
  context.subscriptions.push(
    vscode.commands.registerCommand('copilotPremiumRequests.refresh', async () => {
      controller.showLoading();
      await usageDataService.refresh();
    })
  );
  
  context.subscriptions.push(controller, usageDataService);
}
```

---

## Configuration

Add to `package.json`:

```json
{
  "contributes": {
    "configuration": {
      "title": "Copilot Premium Requests",
      "properties": {
        "copilotPremiumRequests.refreshInterval": {
          "type": "number",
          "default": 60,
          "minimum": 30,
          "description": "Auto-refresh interval in seconds"
        },
        "copilotPremiumRequests.autoRefresh": {
          "type": "boolean",
          "default": true,
          "description": "Enable automatic usage data refresh"
        }
      }
    }
  }
}
```

## Testing Strategy

### Unit Tests (tests/unit/)

- **GitHubAuthService**: Mock `vscode.authentication`
- **UsageApiClient**: Mock Node.js `https` module
- **UsageCache**: Mock `ExtensionContext.globalState`
- **RefreshScheduler**: Use `sinon.useFakeTimers()` for time control
- **UsageDataService**: Mock all dependencies

### Integration Tests (tests/integration/)

- Test full flow: auth → fetch → cache → display
- Test error scenarios: network failure → cache fallback
- Test authentication changes: sign-out → clear cache

### Manual Testing

1. Sign out of GitHub in VS Code → verify NO_AUTH state
2. Sign in → verify data fetches and displays
3. Disconnect network → verify cache fallback with staleness indicator
4. Execute "Refresh Copilot Usage" command → verify manual refresh
5. Change refresh interval setting → verify timer updates

## Debugging

Enable debug logging:

```typescript
// src/api/UsageDataService.ts
private log(message: string, ...args: any[]): void {
  if (process.env.DEBUG === 'true') {
    console.log(`[UsageDataService] ${message}`, ...args);
  }
}
```

Run extension in debug mode:
1. Press F5 in VS Code
2. Open Output panel → select "Extension Host"
3. Set breakpoints in service classes

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Not signed in" immediately | VS Code GitHub auth not configured | Sign in to GitHub in VS Code |
| 403 Forbidden | User lacks Copilot subscription | Verify Copilot is enabled for account |
| 404 Not Found | API endpoint changed | Check GitHub API changelog, update endpoint |
| Stale data showing | Network offline | Expected - verify staleness indicator shows |
| High memory usage | Not disposing subscriptions | Check all `dispose()` methods called |

## Performance Considerations

- **Memory**: Service holds 1 UsageData object in memory (~200 bytes)
- **Network**: 1 HTTP request per refresh interval (default 60s)
- **CPU**: Minimal - timer and JSON parsing only
- **Storage**: <1KB in `globalState` for cache

## Next Steps After Implementation

1. **Add metrics**: Track fetch success rate, cache hit rate
2. **Add telemetry**: Anonymous usage statistics (opt-in)
3. **Add retry limits**: Prevent infinite retries on persistent failures
4. **Add offline detection**: Detect network state before fetching
5. **Add quota notifications**: Alert when approaching limit

## Related Documentation

- [spec.md](./spec.md): User stories and requirements
- [research.md](./research.md): Technology decisions and patterns
- [data-model.md](./data-model.md): Complete type system
- [contracts/](./contracts/): Service interfaces
