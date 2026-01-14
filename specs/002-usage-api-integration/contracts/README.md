# API Contracts

This directory contains TypeScript interface definitions (contracts) for all services in the usage API integration feature.

## Purpose

These contracts serve as:

1. **Design documentation**: Precise specifications for behavior before implementation
2. **Test targets**: Interfaces to mock for unit tests
3. **Dependency injection**: Abstractions for loose coupling
4. **Implementation guide**: Clear requirements for what each service must do

## Contract Files

### Core Services

- **IGitHubAuthService.ts**: GitHub authentication using VS Code API
- **IUsageApiClient.ts**: HTTP client for GitHub Copilot API
- **IUsageCache.ts**: Local persistence of usage data
- **IRefreshScheduler.ts**: Automatic refresh timer management
- **IUsageDataService.ts**: High-level facade orchestrating all components

### Supporting Types

Each contract defines:
- Interface methods with detailed JSDoc
- Parameter types and return types
- Error handling contracts
- Usage examples
- Links to functional requirements (FR-xxx)

## Test-Driven Development Workflow

1. **Contract First**: These interfaces are written before implementation
2. **Test Second**: Write tests against interfaces using mocks
3. **Implement Third**: Create concrete classes implementing interfaces
4. **Validate**: Run tests to verify implementation matches contract

## Implementation Locations

Actual implementations will be in:

```
src/
├── api/
│   ├── GitHubAuthService.ts      (implements IGitHubAuthService)
│   ├── UsageApiClient.ts         (implements IUsageApiClient)
│   └── UsageDataService.ts       (implements IUsageDataService)
├── cache/
│   └── UsageCache.ts             (implements IUsageCache)
└── scheduler/
    └── RefreshScheduler.ts       (implements IRefreshScheduler)
```

## Dependency Graph

```
IUsageDataService (facade)
├── IGitHubAuthService
├── IUsageApiClient
├── IUsageCache
└── IRefreshScheduler
```

## Contract Principles

All contracts follow these principles (from constitution):

1. **Extension-First**: All interfaces use VS Code types where appropriate
2. **Test-First**: Contracts enable TDD by defining behavior upfront
3. **Error Handling**: All methods document error conditions
4. **Simplicity**: Minimal surface area, YAGNI applied
5. **Documentation**: Every method has JSDoc with examples and remarks

## Usage in Tests

```typescript
// Mock implementation for testing
class MockGitHubAuthService implements IGitHubAuthService {
  async getToken(): Promise<string | undefined> {
    return 'mock-token';
  }
  
  async isAuthenticated(): Promise<boolean> {
    return true;
  }
  
  onDidChangeSession(callback: () => void): vscode.Disposable {
    return { dispose: () => {} };
  }
  
  dispose(): void {}
}

// Use in test
const authService: IGitHubAuthService = new MockGitHubAuthService();
const client = new UsageApiClient(authService);
```

## Modification Guidelines

When modifying contracts:

1. **Breaking changes**: Requires MAJOR version bump (constitution principle V)
2. **New methods**: Requires MINOR version bump
3. **Documentation**: Requires PATCH version bump
4. **Update all implementations**: When changing interface
5. **Update tests**: When adding/removing methods
6. **Update this README**: When adding new contracts

## Related Documentation

- [data-model.md](../data-model.md): Complete data model including DTOs
- [research.md](../research.md): Technology decisions informing contracts
- [spec.md](../spec.md): User stories and functional requirements
