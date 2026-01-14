# Research: Status Bar Display

**Feature**: 001-status-bar-display  
**Phase**: 0 - Research & Technology Decisions  
**Date**: 2026-01-12

## Purpose

This document resolves all "NEEDS CLARIFICATION" items from the technical context and identifies best practices for implementing a VS Code status bar component that displays GitHub Copilot usage information.

---

## Research Tasks

### 1. VS Code StatusBarItem API

**Question**: What are the best practices for creating and managing VS Code status bar items?

**Decision**: Use `vscode.window.createStatusBarItem()` with right alignment and medium priority.

**Rationale**:
- VS Code StatusBarItem API is stable and well-documented
- Right-aligned items are conventional for monitoring/status information
- Priority value ~100 places it near other monitoring extensions
- StatusBarItem supports text, tooltip (including MarkdownString), command binding, and ThemeColor

**Key APIs**:
```typescript
// Creation
const statusBarItem = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Right,
  100 // priority
);

// Properties
statusBarItem.text = "$(sync~spin) Copilot: Loading...";
statusBarItem.tooltip = new vscode.MarkdownString("**GitHub Copilot Usage**\n\nLoading...");
statusBarItem.command = "copilotPremiumRequests.showDetails";
statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");

// Lifecycle
statusBarItem.show();
statusBarItem.hide();
statusBarItem.dispose();
```

**Alternatives Considered**:
- Custom webview: Rejected - unnecessary complexity, doesn't follow VS Code conventions
- Tree view in sidebar: Rejected - status bar is more unobtrusive for at-a-glance info

**References**:
- [VS Code API - StatusBarItem](https://code.visualstudio.com/api/references/vscode-api#StatusBarItem)
- [Extension Guidelines - Status Bar](https://code.visualstudio.com/api/ux-guidelines/status-bar)

---

### 2. Display Format Implementation

**Question**: How should we format the status bar text for different display modes?

**Decision**: Implement a `StatusBarFormatter` service with three strategies.

**Format Specifications**:

1. **Compact** (default): `"Copilot: 250/300 (83%)"`
   - Shows used/total with percentage
   - Fits in ~25 characters
   - Clear at a glance

2. **Detailed**: `"Copilot: 250/300 included, 5 budget (83%)"`
   - Adds "included" qualifier
   - Shows budget count when >0
   - ~45 characters (under 100 limit)

3. **Percentage**: `"Copilot: 83%"`
   - Minimal display
   - ~15 characters
   - For space-constrained scenarios

**Budget Display Rules**:
- Only show when `overage_count > 0`
- Format: `"+ N budget"` or `", N budget"` depending on format
- Tooltip always shows full details regardless of format

**Implementation Pattern**:
```typescript
interface DisplayFormatter {
  format(data: UsageData, config: DisplayConfig): string;
  formatTooltip(data: UsageData): vscode.MarkdownString;
}
```

**Alternatives Considered**:
- Single format: Rejected - different users have different preferences
- Template strings: Rejected - formatter service is more testable and flexible

---

### 3. Theme-Aware Color Handling

**Question**: How should we handle warning colors across different VS Code themes?

**Decision**: Use VS Code's built-in ThemeColor constants for semantic coloring.

**Color Strategy**:
```typescript
// Normal state: no background color
statusBarItem.backgroundColor = undefined;

// Warning state (>90% used by default)
statusBarItem.backgroundColor = new vscode.ThemeColor(
  "statusBarItem.warningBackground"
);

// Error state (API failure, no subscription)
statusBarItem.backgroundColor = new vscode.ThemeColor(
  "statusBarItem.errorBackground"
);
```

**Icon Strategy**:
```typescript
// Normal: checkmark or no icon
"$(check) Copilot: 250/300 (83%)"

// Warning: warning icon
"$(warning) Copilot: 280/300 (93%)"

// Error: error icon
"$(error) Copilot: Error"

// Loading: spinning sync icon
"$(sync~spin) Copilot: Loading..."
```

**Rationale**:
- ThemeColor automatically adapts to user's theme (light/dark/high-contrast)
- VS Code's semantic colors are accessibility-tested
- Codicons are built into VS Code, no external dependencies
- Meets FR-011 (theme support) and FR-015 (ThemeColor requirement)

**Alternatives Considered**:
- Custom colors: Rejected - doesn't adapt to themes, accessibility issues
- Only text changes: Rejected - color provides stronger visual signal

**References**:
- [VS Code Theme Colors](https://code.visualstudio.com/api/references/theme-color)
- [Codicons](https://microsoft.github.io/vscode-codicons/dist/codicon.html)

---

### 4. State Management & Updates

**Question**: How should the status bar react to data changes from the API service?

**Decision**: Implement observer pattern with event emitter from UsageDataService.

**Architecture**:
```typescript
// In StatusBarController
constructor(
  private usageService: UsageDataService,
  private configService: ConfigurationService
) {
  this.usageService.onDataChange((data) => this.updateDisplay(data));
  this.configService.onConfigChange((config) => this.applyConfig(config));
}

private updateDisplay(data: UsageData): void {
  // Non-blocking update
  setImmediate(() => {
    const format = this.configService.getDisplayFormat();
    const text = this.formatter.format(data, format);
    const tooltip = this.formatter.formatTooltip(data);
    
    this.statusBarItem.text = text;
    this.statusBarItem.tooltip = tooltip;
    
    // Apply warning color if threshold exceeded
    this.applyWarningState(data);
  });
}
```

**Rationale**:
- Event-driven updates are more efficient than polling
- `setImmediate` ensures UI updates don't block
- Separation of concerns: controller orchestrates, formatter handles display logic
- Easy to test with mock event emitters

**Alternatives Considered**:
- Polling: Rejected - inefficient, doesn't meet async requirement
- Direct coupling: Rejected - harder to test, violates separation of concerns

---

### 5. Error and Loading States

**Question**: How should we handle different states (loading, error, no data)?

**Decision**: Implement explicit state machine with clear visual indicators.

**State Definitions**:

```typescript
enum DisplayState {
  LOADING = "loading",
  NORMAL = "normal",
  WARNING = "warning",
  ERROR = "error",
  NO_AUTH = "no_auth",
  NO_SUBSCRIPTION = "no_subscription"
}

interface StateDisplay {
  icon: string;
  text: string;
  tooltip: string;
  backgroundColor?: vscode.ThemeColor;
}
```

**State Displays**:

| State | Icon | Text | Tooltip | Background |
|-------|------|------|---------|------------|
| LOADING | `$(sync~spin)` | "Copilot: Loading..." | "Fetching usage data..." | none |
| NORMAL | `$(check)` | "Copilot: 250/300 (83%)" | Full details | none |
| WARNING | `$(warning)` | "Copilot: 285/300 (95%)" | Warning + details | warning |
| ERROR | `$(error)` | "Copilot: Error" | Error message | error |
| NO_AUTH | `$(person)` | "Copilot: Sign In" | "Click to authenticate" | none |
| NO_SUBSCRIPTION | `$(x)` | "Copilot: No Access" | "Subscription required" | none |

**Rationale**:
- Explicit states are easier to reason about and test
- Clear visual feedback for each state
- Meets FR-005 (loading state) and FR-006 (error state)

**Alternatives Considered**:
- Generic error message: Rejected - users need specific guidance
- No loading state: Rejected - confusing during initial fetch

---

### 6. Click Handler Implementation

**Question**: What should happen when users click the status bar item?

**Decision**: Implement command that shows quick pick with detailed info (P3 story).

**For MVP (P1/P2)**:
```typescript
// Simple information message
statusBarItem.command = "copilotPremiumRequests.showDetails";

// Command handler
vscode.commands.registerCommand("copilotPremiumRequests.showDetails", () => {
  const message = this.formatter.formatDetailedMessage(this.currentData);
  vscode.window.showInformationMessage(message);
});
```

**For P3 (Click to Show Details)**:
```typescript
// Quick pick with multiple options
const items = [
  {
    label: "$(info) Usage Details",
    detail: this.formatter.formatDetailedInfo(data)
  },
  {
    label: "$(refresh) Refresh Now",
    command: "copilotPremiumRequests.refresh"
  },
  {
    label: "$(gear) Settings",
    command: "workbench.action.openSettings",
    args: ["@ext:copilotPremiumRequests"]
  }
];
```

**Rationale**:
- Information message is simplest for MVP
- Quick pick provides better UX for P3
- Follows VS Code patterns (similar to language status items)
- Meets FR-008 requirement

**Alternatives Considered**:
- Open sidebar panel: Rejected - out of scope, we're status bar focused
- Show notification: Rejected - intrusive, status bar should be subtle

---

### 7. Accessibility Considerations

**Question**: How do we ensure keyboard accessibility?

**Decision**: Status bar items are automatically keyboard accessible via VS Code.

**Implementation**:
```typescript
// Status bar items are in keyboard navigation order
// Tab through status bar items
// Enter key triggers the command

// Ensure tooltip provides context
statusBarItem.tooltip = new vscode.MarkdownString(
  "**GitHub Copilot Premium Requests**\n\n" +
  `• Used: ${used} of ${total}\n` +
  `• Remaining: ${remaining} (${percent}%)\n` +
  `• Budget: ${budget}\n\n` +
  `_Click for details_`
);
```

**Screen Reader Support**:
- Text is read by screen readers
- Tooltip provides additional context
- Icon alt text is automatic via Codicons

**Rationale**:
- VS Code handles keyboard navigation automatically
- Tooltip provides context for screen reader users
- Meets FR-012 requirement

**References**:
- [VS Code Accessibility](https://code.visualstudio.com/docs/editor/accessibility)

---

### 8. Testing Strategy

**Question**: How do we test UI components that depend on VS Code APIs?

**Decision**: Three-tier testing strategy with mocks for VS Code APIs.

**Test Tiers**:

1. **Unit Tests** (fast, isolated):
```typescript
// Test formatter logic
describe("StatusBarFormatter", () => {
  it("should format compact display correctly", () => {
    const data = createMockUsageData({ used: 250, total: 300 });
    const result = formatter.format(data, "compact");
    expect(result).toBe("Copilot: 250/300 (83%)");
  });
});

// Test state transitions
describe("StatusBarController", () => {
  it("should transition to warning state when threshold exceeded", () => {
    const controller = new StatusBarController(mockStatusBarItem);
    controller.updateDisplay(highUsageData);
    expect(mockStatusBarItem.backgroundColor).toEqual(
      new vscode.ThemeColor("statusBarItem.warningBackground")
    );
  });
});
```

2. **Integration Tests** (slower, with VS Code APIs):
```typescript
// Using @vscode/test-electron
describe("StatusBar Integration", () => {
  it("should create and show status bar item on activation", async () => {
    await vscode.commands.executeCommand("workbench.action.reloadWindow");
    // Verify status bar item exists
    const statusBar = vscode.window.statusBarItems;
    expect(statusBar).toContainItemWithText(/Copilot:/);
  });
});
```

3. **Manual Smoke Tests**:
- Install .vsix in VS Code
- Verify status bar appears
- Test all display formats
- Test theme changes (light/dark/high-contrast)
- Test click handler

**Mocking Strategy**:
```typescript
// tests/unit/mocks/vscode.mock.ts
export const mockStatusBarItem = {
  text: "",
  tooltip: "",
  command: undefined,
  backgroundColor: undefined,
  show: jest.fn(),
  hide: jest.fn(),
  dispose: jest.fn()
};

export const vscode = {
  window: {
    createStatusBarItem: jest.fn(() => mockStatusBarItem)
  },
  StatusBarAlignment: {
    Right: 2
  },
  ThemeColor: jest.fn((id) => ({ id }))
};
```

**Rationale**:
- Unit tests verify business logic without VS Code dependency
- Integration tests verify actual VS Code behavior
- Mocks allow fast, deterministic unit tests
- Meets NFR-004 (TDD) and constitution Principle III

**Alternatives Considered**:
- Only integration tests: Rejected - too slow for TDD workflow
- No mocking: Rejected - requires VS Code running, not suitable for CI

---

## Technology Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Status Bar API** | `vscode.window.createStatusBarItem()` | Native, stable, well-documented |
| **Display Formatting** | Formatter service with 3 strategies | Testable, flexible, user choice |
| **Theme Support** | VS Code ThemeColor constants | Automatic adaptation, accessibility |
| **State Management** | Observer pattern with events | Async, decoupled, efficient |
| **Error Handling** | Explicit state machine | Clear, testable, user-friendly |
| **Click Handler** | Information message (MVP), Quick pick (P3) | Simple → enhanced, VS Code patterns |
| **Accessibility** | VS Code built-in + rich tooltips | Meets standards, screen reader support |
| **Testing** | Unit + Integration + Manual | Fast TDD loop, confidence in VS Code integration |

---

## Dependencies Confirmed

From spec 002 (Usage API Integration):
- **UsageData** interface for data structure
- **UsageDataService** for data updates via events
- Event emitter for `onDataChange(callback)`

From spec 003 (User Configuration):
- **ConfigurationService** for settings access
- Display format setting (`compact`/`detailed`/`percentage`)
- Warning threshold setting (default 90%)
- Status bar visibility toggle
- Event emitter for `onConfigChange(callback)`

---

## Next Steps

Phase 1 will:
1. Define **data-model.md** with UsageData, DisplayState, and configuration interfaces
2. Create **contracts/** with TypeScript interface definitions for:
   - `IStatusBarController`
   - `IStatusBarFormatter`
   - `IStatusBarUpdater`
3. Generate **quickstart.md** with setup instructions for developers

All research questions resolved. ✅ Proceed to Phase 1.
