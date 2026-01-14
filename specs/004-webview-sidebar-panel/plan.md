# Implementation Plan: Webview Sidebar Panel

**Feature**: Replace Output Channel with rich WebviewViewProvider sidebar panel  
**Spec**: [spec.md](./spec.md)  
**Estimated Effort**: 3-4 days  
**Approach**: Test-Driven Development (TDD)

## Overview

Replace the current plain text Output Channel implementation with a rich HTML-based sidebar panel using VS Code's WebviewViewProvider API. This provides better UX through visual progress bars, color-coded status indicators, and structured layout inspired by the vscode-copilot-insights extension.

### Goals

1. **Replace Output Channel**: Remove dependency on plain text output, implement rich webview UI
2. **Visual Enhancement**: Add progress bars, color coding, quota cards, status badges
3. **User Control**: Manual refresh via title bar icon, auto-refresh on visibility
4. **Data Presentation**: Pacing guidance, budget display, reset countdown
5. **Maintainability**: Clean separation between view logic and data fetching

### Non-Goals (Deferred)

- Advanced features like charts/graphs (future enhancement)
- Settings panel within webview (use native VS Code settings)
- Historical usage tracking (future spec)
- Multi-workspace support (single workspace for now)

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      extension.ts                            │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ StatusBar      │  │ UsageView       │  │ UsageApi     │ │
│  │ Controller     │  │ Provider        │  │ Client       │ │
│  └───────┬────────┘  └────────┬────────┘  └──────┬───────┘ │
│          │                    │                   │         │
│          │  subscribe to      │                   │         │
│          │  data updates      │   fetch data      │         │
│          └────────────────────┼───────────────────┘         │
│                               │                             │
└───────────────────────────────┼─────────────────────────────┘
                                │
                    ┌───────────▼────────────┐
                    │   WebviewView          │
                    │  ┌──────────────────┐  │
                    │  │  HTML + CSS      │  │
                    │  │  Progress Bars   │  │
                    │  │  Quota Cards     │  │
                    │  │  Pacing Data     │  │
                    │  └──────────────────┘  │
                    │         ▲              │
                    │         │ postMessage  │
                    │         ▼              │
                    │  ┌──────────────────┐  │
                    │  │ Message Handler  │  │
                    │  │ (copy, refresh)  │  │
                    │  └──────────────────┘  │
                    └────────────────────────┘
```

### New Components

#### 1. UsageViewProvider (src/webview/UsageViewProvider.ts)

**Responsibilities**:
- Implements `vscode.WebviewViewProvider`
- Manages webview lifecycle (create, update, dispose)
- Generates HTML content from usage data
- Handles messages from webview (refresh, copy)
- Coordinates with UsageApiClient for data fetching

**Key Methods**:
```typescript
class UsageViewProvider implements vscode.WebviewViewProvider {
  resolveWebviewView(webviewView: WebviewView): void | Thenable<void>
  refresh(): Promise<void>
  private _updateView(data: UsageData): void
  private _getHtmlForWebview(data: UsageData): string
  private _handleMessage(message: WebviewMessage): void
  private _showLoading(): void
  private _showError(error: Error): void
  private _calculatePacing(quota: QuotaSnapshot): PacingData
}
```

**Dependencies**:
- UsageApiClient (fetch data)
- GitHubAuthService (check auth state)
- Output channel (logging only)

#### 2. WebviewHtmlGenerator (src/webview/WebviewHtmlGenerator.ts)

**Responsibilities**:
- Pure function: generate HTML from data
- Apply VS Code theme CSS variables
- Create quota cards with progress bars
- Generate pacing guidance sections
- Apply Content Security Policy

**Key Functions**:
```typescript
export function generateHtml(data: UsageData, webview: Webview): string
export function generateQuotaCard(quota: QuotaSnapshot, budgetTotal: number): string
export function generateProgressBar(percentage: number): string
export function generatePacingGuidance(pacing: PacingData): string
export function getProgressBarColor(percentage: number): string
```

#### 3. WebviewMessageHandler (src/webview/WebviewMessageHandler.ts)

**Responsibilities**:
- Handle postMessage commands from webview
- Execute copy-to-clipboard operations
- Trigger refresh operations
- Format Markdown export

**Key Functions**:
```typescript
export async function handleMessage(
  message: WebviewMessage,
  provider: UsageViewProvider
): Promise<void>
export function formatMarkdownSummary(data: UsageData): string
```

#### 4. Types (src/webview/types.ts)

**New Types**:
```typescript
export interface WebviewMessage {
  command: 'refresh' | 'copy';
  data?: any;
}

export interface PacingData {
  dailyAverage: number;
  weeklyAverage: number;
  daysUntilReset: number;
  hoursUntilReset: number;
  resetDate: string;
  projectedTotal: number;
}

export interface QuotaCardData {
  name: string;
  remaining: number;
  used: number;
  total: number;
  percentage: number;
  isUnlimited: boolean;
  color: 'green' | 'yellow' | 'red';
}
```

### Modified Components

#### extension.ts

**Changes**:
- Register UsageViewProvider with `context.subscriptions`
- Replace Output Channel click handler with webview reveal
- Keep StatusBarController (works in parallel with webview)

**New Code**:
```typescript
// Register webview provider
const usageViewProvider = new UsageViewProvider(
  context.extensionUri,
  apiClient,
  authService,
  outputChannel
);
context.subscriptions.push(
  vscode.window.registerWebviewViewProvider(
    'copilotPremiumRequests.usageView',
    usageViewProvider
  )
);

// Update status bar click to reveal sidebar
statusBarController.onClick(() => {
  vscode.commands.executeCommand('copilotPremiumRequests.usageView.focus');
});
```

#### StatusBarController

**Changes**:
- Change click handler from showing Output Channel to revealing webview
- Keep all existing update/format/display logic
- No breaking changes to existing functionality

### Integration Points

1. **UsageApiClient**: UsageViewProvider calls same `fetchUsageData()` method
2. **StatusBarController**: Both update independently, share same data source
3. **GitHubAuthService**: Check auth before fetching data in webview
4. **Configuration**: Future integration for refresh intervals (spec 003)

## Implementation Phases

### Phase 0: Setup & Types (Day 1, 2 hours)

**Goal**: Create directory structure, type definitions, test infrastructure

**Tasks**:
1. Create `src/webview/` directory
2. Create `src/webview/types.ts` with WebviewMessage, PacingData, QuotaCardData
3. Create `tests/unit/webview/` directory for test files
4. Set up mock factories for webview testing
5. Create `tests/unit/mocks/webview.mock.ts` with mock WebviewView, Webview

**Deliverables**:
- `src/webview/types.ts` (exported interfaces)
- `tests/unit/mocks/webview.mock.ts` (mock factories)
- `tests/unit/webview/*.test.ts` (empty test files, ready for TDD)

**Tests**: Type compilation, mock factory creation

---

### Phase 1: WebviewHtmlGenerator (Day 1-2, 6 hours)

**Goal**: Pure HTML generation functions with full test coverage

**Approach**: TDD - write failing tests first, implement to pass

**Components**:

#### 1a. Progress Bar Generator (2 hours)

**Tests** (write first):
- ✅ Returns green color for 0-49% usage
- ✅ Returns yellow color for 50-79% usage
- ✅ Returns red color for 80-100% usage
- ✅ Generates HTML with correct percentage width
- ✅ Uses VS Code CSS variables for theming
- ✅ Handles edge cases (0%, 100%, negative)

**Implementation**:
```typescript
export function getProgressBarColor(percentage: number): string;
export function generateProgressBar(percentage: number, color: string): string;
```

#### 1b. Quota Card Generator (2 hours)

**Tests** (write first):
- ✅ Generates card with quota name, remaining, used, total
- ✅ Includes progress bar with correct percentage
- ✅ Shows unlimited badge when total is -1
- ✅ Handles missing overage data gracefully
- ✅ Formats large numbers with commas (e.g., 2,000)
- ✅ Shows budget information when budgetTotal > 0

**Implementation**:
```typescript
export function generateQuotaCard(
  quota: QuotaSnapshot,
  budgetTotal: number
): string;
```

#### 1c. Pacing Guidance Calculator & Generator (2 hours)

**Tests** (write first):
- ✅ Calculates daily average from remaining and days until reset
- ✅ Calculates weekly average correctly
- ✅ Parses reset_at timestamp and calculates countdown
- ✅ Handles unlimited quotas (returns null pacing)
- ✅ Generates HTML with daily/weekly averages
- ✅ Shows reset countdown in "Xd Xh" format

**Implementation**:
```typescript
export function calculatePacing(quota: QuotaSnapshot): PacingData | null;
export function generatePacingGuidance(pacing: PacingData): string;
```

#### 1d. Main HTML Generator (2 hours)

**Tests** (write first):
- ✅ Generates complete HTML document with DOCTYPE
- ✅ Includes Content Security Policy meta tag
- ✅ Uses nonce for inline scripts
- ✅ Includes all quota cards from usage data
- ✅ Shows plan details section (plan type, orgs count)
- ✅ Shows "last fetched" timestamp at bottom
- ✅ Shows stale data warning if >1 hour old
- ✅ Handles empty quota_snapshots gracefully
- ✅ Includes refresh and copy buttons
- ✅ Includes postMessage script for interactivity

**Implementation**:
```typescript
export function generateHtml(
  data: UsageData,
  webview: vscode.Webview
): string;
```

**Deliverables**:
- `src/webview/WebviewHtmlGenerator.ts` (all functions)
- `tests/unit/webview/WebviewHtmlGenerator.test.ts` (full coverage)
- All tests passing

---

### Phase 2: WebviewMessageHandler (Day 2, 3 hours)

**Goal**: Message handling and clipboard operations

#### 2a. Markdown Formatter (1.5 hours)

**Tests** (write first):
- ✅ Formats usage data as Markdown with headers
- ✅ Includes all quota information with bullet points
- ✅ Shows plan details section
- ✅ Formats numbers with commas
- ✅ Handles unlimited quotas in output
- ✅ Includes timestamp in footer
- ✅ Shows budget information when present

**Implementation**:
```typescript
export function formatMarkdownSummary(data: UsageData): string;
```

**Example Output**:
```markdown
# Copilot Usage Summary

## Premium Interactions
- **Remaining**: 1,500 / 2,000
- **Used**: 500 (25%)
- **Pacing**: ≤ 50/day to last until reset

## Plan Details
- **Plan**: Business
- **Organizations**: 2
- **Chat Enabled**: Yes

---
*Last updated: Jan 13, 2026 at 2:30 PM*
```

#### 2b. Message Handler (1.5 hours)

**Tests** (write first):
- ✅ Handles 'refresh' command by calling provider.refresh()
- ✅ Handles 'copy' command by formatting and copying to clipboard
- ✅ Shows notification after successful copy
- ✅ Handles unknown commands gracefully
- ✅ Logs errors to output channel
- ✅ Awaits async operations properly

**Implementation**:
```typescript
export async function handleMessage(
  message: WebviewMessage,
  provider: UsageViewProvider
): Promise<void>;
```

**Deliverables**:
- `src/webview/WebviewMessageHandler.ts`
- `tests/unit/webview/WebviewMessageHandler.test.ts`
- All tests passing

---

### Phase 3: UsageViewProvider (Day 2-3, 8 hours)

**Goal**: Core WebviewViewProvider implementation with lifecycle management

#### 3a. Basic Provider Structure (2 hours)

**Tests** (write first):
- ✅ Implements vscode.WebviewViewProvider interface
- ✅ Constructor accepts extensionUri, apiClient, authService, outputChannel
- ✅ Stores webviewView reference in resolveWebviewView
- ✅ Sets webview options (enableScripts: true, localResourceRoots)
- ✅ Registers onDidChangeVisibility listener
- ✅ Registers onDidReceiveMessage listener
- ✅ Disposes properly on deactivation

**Implementation**:
```typescript
export class UsageViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _data?: UsageData;
  
  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _apiClient: UsageApiClient,
    private readonly _authService: GitHubAuthService,
    private readonly _outputChannel: vscode.OutputChannel
  ) {}
  
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void | Thenable<void> {
    // Implementation
  }
}
```

#### 3b. Data Fetching & Update Logic (2 hours)

**Tests** (write first):
- ✅ refresh() fetches data via UsageApiClient
- ✅ refresh() shows loading state before fetch
- ✅ refresh() updates view with new data on success
- ✅ refresh() shows error state on failure
- ✅ refresh() logs errors to output channel
- ✅ Prevents concurrent refreshes (debounce)
- ✅ Stores last fetch timestamp
- ✅ Uses cached data if <5 minutes old

**Implementation**:
```typescript
public async refresh(): Promise<void> {
  if (this._isRefreshing) return;
  
  this._isRefreshing = true;
  this._showLoading();
  
  try {
    const data = await this._apiClient.fetchUsageData();
    this._data = data;
    this._lastFetchTime = Date.now();
    this._updateView(data);
  } catch (error) {
    this._showError(error as Error);
    this._outputChannel.appendLine(`Error fetching data: ${error}`);
  } finally {
    this._isRefreshing = false;
  }
}
```

#### 3c. View State Management (2 hours)

**Tests** (write first):
- ✅ _updateView() generates HTML via WebviewHtmlGenerator
- ✅ _updateView() sets webview.html
- ✅ _showLoading() displays spinner/skeleton UI
- ✅ _showError() displays error message with retry button
- ✅ Handles undefined webview gracefully
- ✅ Auto-refresh triggers when view becomes visible
- ✅ Auto-refresh skipped if manual refresh in progress

**Implementation**:
```typescript
private _updateView(data: UsageData): void {
  if (!this._view) return;
  
  this._view.webview.html = generateHtml(data, this._view.webview);
}

private _showLoading(): void {
  if (!this._view) return;
  
  this._view.webview.html = this._getLoadingHtml();
}

private _showError(error: Error): void {
  if (!this._view) return;
  
  this._view.webview.html = this._getErrorHtml(error);
}
```

#### 3d. Message Handling Integration (2 hours)

**Tests** (write first):
- ✅ onDidReceiveMessage routes to WebviewMessageHandler
- ✅ 'refresh' message triggers provider.refresh()
- ✅ 'copy' message calls formatMarkdownSummary and copies
- ✅ Message handling errors caught and logged
- ✅ Provider reference passed correctly to handler

**Implementation**:
```typescript
webviewView.webview.onDidReceiveMessage(
  async (message: WebviewMessage) => {
    try {
      await handleMessage(message, this);
    } catch (error) {
      this._outputChannel.appendLine(`Message handling error: ${error}`);
    }
  }
);
```

**Deliverables**:
- `src/webview/UsageViewProvider.ts`
- `tests/unit/webview/UsageViewProvider.test.ts`
- All tests passing (50+ test cases)

---

### Phase 4: Extension Integration (Day 3, 3 hours)

**Goal**: Wire up provider to extension.ts, replace Output Channel

#### 4a. Provider Registration (1 hour)

**Tests** (integration test):
- ✅ UsageViewProvider registered on activation
- ✅ Registration added to context.subscriptions
- ✅ View type matches package.json contribution
- ✅ Provider disposes on deactivation

**Implementation in extension.ts**:
```typescript
// After apiClient and authService creation
const usageViewProvider = new UsageViewProvider(
  context.extensionUri,
  apiClient,
  authService,
  outputChannel
);

context.subscriptions.push(
  vscode.window.registerWebviewViewProvider(
    UsageViewProvider.viewType,
    usageViewProvider,
    { webviewOptions: { retainContextWhenHidden: true } }
  )
);
```

#### 4b. Status Bar Integration (1 hour)

**Tests**:
- ✅ Status bar click reveals sidebar panel
- ✅ Status bar click focuses webview if already open
- ✅ Status bar updates independently of webview
- ✅ Both status bar and webview can trigger refresh

**Implementation**:
```typescript
// Update StatusBarController click handler
statusBarItem.command = 'copilotPremiumRequests.usageView.focus';

// Register command to focus view
context.subscriptions.push(
  vscode.commands.registerCommand(
    'copilotPremiumRequests.usageView.focus',
    () => {
      vscode.commands.executeCommand('copilotPremiumRequests.usageView.focus');
    }
  )
);
```

#### 4c. Remove Output Channel Usage (1 hour)

**Tasks**:
- Remove `vscode.commands.registerCommand('copilotPremiumRequests.showOutput')`
- Remove Output Channel display logic from StatusBarController
- Keep Output Channel for logging only (errors, debug info)
- Update all references to show webview instead

**Tests**:
- ✅ Output Channel no longer shown on status bar click
- ✅ Output Channel still receives log messages
- ✅ No regressions in status bar functionality

**Deliverables**:
- Updated `src/extension.ts`
- Updated `src/statusBar/StatusBarController.ts`
- Integration tests passing

---

### Phase 5: Manual & Auto-refresh (Day 3-4, 4 hours)

**Goal**: Implement refresh command and auto-refresh on visibility

#### 5a. Refresh Command (2 hours)

**Tests**:
- ✅ Command registered in package.json contributes.commands
- ✅ Command visible in view title (icon: $(refresh))
- ✅ Command triggers usageViewProvider.refresh()
- ✅ Multiple rapid clicks debounced
- ✅ Command disabled during refresh (loading state)

**package.json changes**:
```json
"contributes": {
  "commands": [
    {
      "command": "copilotPremiumRequests.refreshUsageView",
      "title": "Refresh Usage Data",
      "icon": "$(refresh)"
    }
  ],
  "menus": {
    "view/title": [
      {
        "command": "copilotPremiumRequests.refreshUsageView",
        "when": "view == copilotPremiumRequests.usageView",
        "group": "navigation"
      }
    ]
  }
}
```

**Implementation**:
```typescript
context.subscriptions.push(
  vscode.commands.registerCommand(
    'copilotPremiumRequests.refreshUsageView',
    () => usageViewProvider.refresh()
  )
);
```

#### 5b. Auto-refresh on Visibility (2 hours)

**Tests**:
- ✅ Auto-refresh triggered when view becomes visible
- ✅ Auto-refresh skipped if manual refresh in progress
- ✅ Auto-refresh skipped if data <5 minutes old
- ✅ No auto-refresh when view becomes hidden
- ✅ onDidChangeVisibility listener registered properly

**Implementation in UsageViewProvider**:
```typescript
webviewView.onDidChangeVisibility(() => {
  if (webviewView.visible && this._shouldAutoRefresh()) {
    this.refresh();
  }
});

private _shouldAutoRefresh(): boolean {
  if (this._isRefreshing) return false;
  if (!this._lastFetchTime) return true;
  
  const fiveMinutes = 5 * 60 * 1000;
  return Date.now() - this._lastFetchTime > fiveMinutes;
}
```

**Deliverables**:
- Updated package.json with commands and menus
- Auto-refresh logic in UsageViewProvider
- All refresh tests passing

---

### Phase 6: Styling & Theming (Day 4, 3 hours)

**Goal**: Polish UI, ensure theme compatibility, responsive layout

#### 6a. CSS Variables & Theme Support (1.5 hours)

**Tests**:
- ✅ HTML uses only VS Code CSS variables (no hardcoded colors)
- ✅ Theme changes reflected immediately in webview
- ✅ Light theme renders correctly
- ✅ Dark theme renders correctly
- ✅ High contrast theme accessible

**CSS Variables to Use**:
```css
--vscode-foreground
--vscode-background
--vscode-button-background
--vscode-button-foreground
--vscode-button-hoverBackground
--vscode-progressBar-background
--vscode-editorError-foreground
--vscode-editorWarning-foreground
--vscode-charts-green
--vscode-charts-yellow
--vscode-charts-red
```

#### 6b. Responsive Layout (1.5 hours)

**Tests**:
- ✅ Layout works at 200px sidebar width (minimum)
- ✅ Layout works at 400px sidebar width (default)
- ✅ Layout works at 800px sidebar width (wide)
- ✅ Progress bars scale properly
- ✅ Text doesn't overflow containers
- ✅ Long organization names truncate with ellipsis

**CSS Implementation**:
```css
.quota-card {
  min-width: 180px;
  max-width: 100%;
  padding: 12px;
}

.progress-bar-container {
  width: 100%;
  min-width: 100px;
}

.organization-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

**Deliverables**:
- CSS embedded in HTML template
- Theme compatibility verified
- Responsive tests passing

---

### Phase 7: Final Testing & Documentation (Day 4, 2 hours)

**Goal**: End-to-end testing, edge cases, documentation

#### 7a. Edge Case Testing (1 hour)

**Test Cases**:
- ✅ Empty quota_snapshots object
- ✅ All unlimited quotas
- ✅ Missing overage_limit field
- ✅ Null or undefined usage data
- ✅ API returns 401 (not authenticated)
- ✅ API returns 500 (server error)
- ✅ Network timeout
- ✅ Very long plan names/org names
- ✅ Reset date in the past
- ✅ Reset date far in future (365+ days)

#### 7b. Integration Testing (1 hour)

**Test Scenarios**:
- ✅ Fresh install: activate extension, open sidebar, see loading then data
- ✅ Refresh: click refresh icon, see loading then updated data
- ✅ Copy: click copy button, verify Markdown in clipboard
- ✅ Theme change: switch VS Code theme, verify colors update
- ✅ Reopen sidebar: close sidebar, wait, reopen, verify auto-refresh
- ✅ Status bar interaction: click status bar, verify sidebar opens

**Deliverables**:
- All edge case tests passing
- Integration test suite complete
- README updated with webview feature notes

---

## Testing Strategy

### Unit Tests

**Coverage Target**: 90%+ for all new code

**Test Files**:
- `tests/unit/webview/WebviewHtmlGenerator.test.ts` (~30 tests)
- `tests/unit/webview/WebviewMessageHandler.test.ts` (~15 tests)
- `tests/unit/webview/UsageViewProvider.test.ts` (~50 tests)
- `tests/unit/webview/types.test.ts` (~5 tests)

**Mocking**:
- Mock `vscode.WebviewView` and `vscode.Webview` objects
- Mock UsageApiClient with fake data
- Mock GitHubAuthService with auth states
- Spy on clipboard and notification APIs

### Integration Tests

**Scenarios**:
1. Provider lifecycle (activate → resolve → update → dispose)
2. Data flow (API → Provider → HTML → Webview)
3. Message passing (Webview → Provider → Action)
4. Error handling (API errors, auth errors, view errors)

**Test File**: `tests/integration/webview.integration.test.ts`

### Manual Testing Checklist

- [ ] Install extension in VS Code
- [ ] Open Copilot Usage sidebar
- [ ] Verify data displays correctly
- [ ] Click refresh icon, verify update
- [ ] Click copy button, verify clipboard
- [ ] Switch themes (light/dark), verify styling
- [ ] Resize sidebar (narrow/wide), verify layout
- [ ] Close and reopen sidebar, verify auto-refresh
- [ ] Test with no authentication
- [ ] Test with API errors

## Risk Assessment

### High Risk

1. **CSP Violations**: Content Security Policy may block scripts/styles
   - **Mitigation**: Use nonces, test thoroughly, follow VS Code CSP guidelines

2. **Performance**: Large HTML generation could be slow
   - **Mitigation**: Profile generateHtml(), optimize DOM size, cache where possible

### Medium Risk

3. **Theme Compatibility**: CSS may not work in all themes
   - **Mitigation**: Use only documented CSS variables, test in multiple themes

4. **Webview Retention**: State lost when sidebar hidden
   - **Mitigation**: Use `retainContextWhenHidden: true` option, cache data

### Low Risk

5. **Message Handling Race Conditions**: Multiple messages in flight
   - **Mitigation**: Debounce refresh, queue messages if needed

## Dependencies

### External
- VS Code API 1.85.0+ (WebviewViewProvider support)
- No new npm packages required

### Internal
- UsageApiClient (existing)
- GitHubAuthService (existing)
- UsageData types (existing)

## Success Metrics

- ✅ All unit tests passing (100+ tests)
- ✅ Integration tests passing
- ✅ Coverage >90% for new code
- ✅ Manual testing checklist complete
- ✅ Output Channel fully replaced
- ✅ No regressions in status bar functionality
- ✅ Sidebar renders in <100ms
- ✅ Refresh completes in <3s

## Rollout Plan

1. **Phase 1-3 Complete**: Preview to early testers for feedback
2. **Phase 4-5 Complete**: Beta release with both Output Channel and Webview
3. **Phase 6-7 Complete**: Full release, remove Output Channel
4. **Post-release**: Monitor for bugs, gather user feedback

## Future Enhancements (Out of Scope)

- Historical usage charts (line graphs, trends)
- Configurable refresh intervals (from spec 003)
- Export to CSV/JSON formats
- Notifications for quota warnings
- Multi-workspace support (show all workspaces)
- In-webview settings panel
