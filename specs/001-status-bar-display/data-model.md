# Data Model: Status Bar Display

**Feature**: 001-status-bar-display  
**Phase**: 1 - Design & Contracts  
**Date**: 2026-01-12

## Overview

This document defines all data structures, entities, and state models used by the status bar display feature. It includes entities specific to the UI layer as well as references to entities from dependent specs.

---

## Core Entities

### 1. DisplayState

**Purpose**: Represents the current state of the status bar item.

**Definition**:
```typescript
enum DisplayState {
  /** Initial state, fetching data from API */
  LOADING = "loading",
  
  /** Normal state, usage below warning threshold */
  NORMAL = "normal",
  
  /** Warning state, usage exceeds threshold */
  WARNING = "warning",
  
  /** Error state, API failure or network error */
  ERROR = "error",
  
  /** User not authenticated with GitHub */
  NO_AUTH = "no_auth",
  
  /** User has no Copilot subscription */
  NO_SUBSCRIPTION = "no_subscription"
}
```

**State Transitions**:
```
                  ┌──────────┐
                  │  START   │
                  └────┬─────┘
                       │
                       v
┌─────────────► LOADING ◄─────────────┐
│                  │                   │
│     ┌────────────┴──────────┐        │
│     │                       │        │
│     v                       v        │
│  NORMAL ◄────────────► WARNING      │
│     │                       │        │
│     │         ┌────────┐    │        │
│     └────────►│ ERROR  │◄───┘        │
│               └───┬────┘             │
│                   │                  │
│     ┌─────────────┴──────────┐       │
│     │                        │       │
│     v                        v       │
│ NO_AUTH              NO_SUBSCRIPTION │
│     │                        │       │
│     └────────────┬───────────┘       │
│                  │                   │
│                  v                   │
└────────────► LOADING ◄───────────────┘
```

**Validation Rules**:
- State must be one of the enum values
- State transitions follow the diagram above
- ERROR state must include error message

**Used In**:
- `StatusBarController` for state machine logic
- `StatusBarFormatter` for state-specific formatting
- Unit tests for state transition verification

---

### 2. StatusBarConfig

**Purpose**: Configuration specific to status bar display behavior.

**Definition**:
```typescript
interface StatusBarConfig {
  /** Whether the status bar item is visible */
  enabled: boolean;
  
  /** Display format for usage text */
  displayFormat: "compact" | "detailed" | "percentage";
  
  /** Threshold percentage for warning state (0-100) */
  warningThreshold: number;
  
  /** Priority value for status bar positioning (higher = more left) */
  priority: number;
  
  /** Whether to show icons in status bar text */
  showIcons: boolean;
}
```

**Default Values**:
```typescript
const DEFAULT_CONFIG: StatusBarConfig = {
  enabled: true,
  displayFormat: "compact",
  warningThreshold: 90,
  priority: 100,
  showIcons: true
};
```

**Validation Rules**:
- `enabled`: boolean
- `displayFormat`: must be one of "compact", "detailed", "percentage"
- `warningThreshold`: number between 0 and 100
- `priority`: positive integer
- `showIcons`: boolean

**Source**: Derived from VS Code workspace configuration (see spec 003).

**Used In**:
- `StatusBarController` for initialization
- `StatusBarFormatter` for format selection
- `StatusBarUpdater` for threshold comparison

---

### 3. FormattedDisplay

**Purpose**: Structured representation of the formatted status bar content.

**Definition**:
```typescript
interface FormattedDisplay {
  /** The text to display in the status bar */
  text: string;
  
  /** The tooltip (can be plain string or MarkdownString) */
  tooltip: string | vscode.MarkdownString;
  
  /** Optional background color for warning/error states */
  backgroundColor?: vscode.ThemeColor;
  
  /** Icon to prefix the text (Codicon identifier) */
  icon: string;
  
  /** The current display state */
  state: DisplayState;
}
```

**Examples**:
```typescript
// Normal state
{
  text: "Copilot: 250/300 (83%)",
  tooltip: new vscode.MarkdownString("**GitHub Copilot Usage**\n\n• Used: 250 of 300\n..."),
  backgroundColor: undefined,
  icon: "$(check)",
  state: DisplayState.NORMAL
}

// Warning state
{
  text: "Copilot: 285/300 (95%)",
  tooltip: new vscode.MarkdownString("**GitHub Copilot Usage**\n\n⚠️ You are nearing your quota limit..."),
  backgroundColor: new vscode.ThemeColor("statusBarItem.warningBackground"),
  icon: "$(warning)",
  state: DisplayState.WARNING
}

// Error state
{
  text: "Copilot: Error",
  tooltip: "Failed to fetch usage data. Click to retry.",
  backgroundColor: new vscode.ThemeColor("statusBarItem.errorBackground"),
  icon: "$(error)",
  state: DisplayState.ERROR
}

// Loading state
{
  text: "Copilot: Loading...",
  tooltip: "Fetching GitHub Copilot usage data...",
  backgroundColor: undefined,
  icon: "$(sync~spin)",
  state: DisplayState.LOADING
}
```

**Validation Rules**:
- `text`: non-empty string, max 100 characters
- `tooltip`: non-empty string or MarkdownString
- `backgroundColor`: undefined or valid ThemeColor
- `icon`: valid Codicon identifier (format: `$(icon-name)`)
- `state`: valid DisplayState enum value

**Used In**:
- `StatusBarFormatter.format()` returns this type
- `StatusBarController` applies this to StatusBarItem

---

## Referenced Entities

These entities are defined in other specs but are used by the status bar display feature.

### 4. UsageData

**Defined In**: spec 002 (Usage API Integration)

**Definition**:
```typescript
interface UsageData {
  /** Number of included requests used in current billing period */
  includedUsed: number;
  
  /** Total included requests in subscription */
  includedTotal: number;
  
  /** Number of budget (overage) requests used */
  budgetUsed: number;
  
  /** Timestamp of last data refresh */
  lastRefreshTime: number;
  
  /** End date of current billing period */
  billingPeriodEnd: string; // ISO 8601 format
}
```

**Usage in Status Bar**:
- `includedUsed` / `includedTotal` → percentage calculation
- `budgetUsed` → displayed when > 0
- `lastRefreshTime` → shown in tooltip
- `billingPeriodEnd` → shown in tooltip

**Example**:
```typescript
{
  includedUsed: 250,
  includedTotal: 300,
  budgetUsed: 5,
  lastRefreshTime: 1705075200000,
  billingPeriodEnd: "2026-02-01T00:00:00Z"
}
```

**Calculations**:
```typescript
// Percentage used
const percentUsed = Math.round((includedUsed / includedTotal) * 100);

// Remaining requests
const remaining = includedTotal - includedUsed;

// Total used (including budget)
const totalUsed = includedUsed + budgetUsed;
```

---

### 5. ConfigurationService

**Defined In**: spec 003 (User Configuration)

**Interface**:
```typescript
interface IConfigurationService {
  /** Get current display format setting */
  getDisplayFormat(): "compact" | "detailed" | "percentage";
  
  /** Get warning threshold percentage */
  getWarningThreshold(): number;
  
  /** Check if status bar is enabled */
  isStatusBarEnabled(): boolean;
  
  /** Check if icons should be shown */
  shouldShowIcons(): boolean;
  
  /** Get status bar priority value */
  getStatusBarPriority(): number;
  
  /** Event emitted when any config changes */
  onConfigChange(callback: (config: StatusBarConfig) => void): vscode.Disposable;
}
```

**Usage in Status Bar**:
- `getDisplayFormat()` → passed to formatter
- `getWarningThreshold()` → compared against usage percentage
- `isStatusBarEnabled()` → show/hide status bar item
- `onConfigChange()` → update display when settings change

---

## Composite Types

### 6. StatusBarState

**Purpose**: Complete internal state of the status bar controller.

**Definition**:
```typescript
interface StatusBarState {
  /** The VS Code status bar item instance */
  statusBarItem: vscode.StatusBarItem;
  
  /** Current display state */
  displayState: DisplayState;
  
  /** Last formatted display (for comparison) */
  lastDisplay?: FormattedDisplay;
  
  /** Latest usage data received */
  currentData?: UsageData;
  
  /** Current configuration */
  config: StatusBarConfig;
  
  /** Error message if in ERROR state */
  errorMessage?: string;
  
  /** Disposables for cleanup */
  subscriptions: vscode.Disposable[];
}
```

**Lifecycle**:
1. **Initialization**: Create StatusBarItem, set default state to LOADING
2. **Data Update**: Receive UsageData, calculate state, format display, update UI
3. **Config Update**: Receive config change, reformat with new settings
4. **Error Handling**: Set ERROR state with message, show error display
5. **Disposal**: Dispose all subscriptions and status bar item

**Used In**:
- `StatusBarController` maintains this as private state
- Unit tests mock and verify state transitions

---

## Validation Utilities

### 7. Display Validation

**Purpose**: Helper functions to validate display data.

```typescript
namespace DisplayValidation {
  /** Validate status bar text length */
  export function isValidText(text: string): boolean {
    return text.length > 0 && text.length <= 100;
  }
  
  /** Validate Codicon identifier format */
  export function isValidIcon(icon: string): boolean {
    return /^\$\([a-z0-9-~]+\)$/.test(icon);
  }
  
  /** Validate warning threshold value */
  export function isValidThreshold(threshold: number): boolean {
    return threshold >= 0 && threshold <= 100;
  }
  
  /** Validate usage percentage calculation */
  export function calculateUsagePercent(used: number, total: number): number {
    if (total <= 0) return 0;
    return Math.round((used / total) * 100);
  }
}
```

**Used In**:
- Input validation in formatter
- Unit tests for edge cases

---

## State Calculations

### 8. State Determination Logic

**Purpose**: Algorithm to determine DisplayState from UsageData and config.

```typescript
function determineDisplayState(
  data: UsageData | undefined,
  error: Error | undefined,
  isAuthenticated: boolean,
  hasSubscription: boolean,
  config: StatusBarConfig
): DisplayState {
  // Priority order (highest to lowest):
  
  // 1. Not authenticated
  if (!isAuthenticated) {
    return DisplayState.NO_AUTH;
  }
  
  // 2. No subscription
  if (!hasSubscription) {
    return DisplayState.NO_SUBSCRIPTION;
  }
  
  // 3. Error state
  if (error !== undefined) {
    return DisplayState.ERROR;
  }
  
  // 4. Loading state (no data yet)
  if (data === undefined) {
    return DisplayState.LOADING;
  }
  
  // 5. Warning or normal based on threshold
  const percentUsed = (data.includedUsed / data.includedTotal) * 100;
  if (percentUsed >= config.warningThreshold) {
    return DisplayState.WARNING;
  }
  
  return DisplayState.NORMAL;
}
```

**Edge Cases**:
- `includedTotal === 0`: Return ERROR state (invalid data)
- `includedUsed > includedTotal`: Return WARNING state (overuse scenario)
- `budgetUsed > 0`: Include in tooltip but doesn't affect state
- Rapid state changes: Debounce updates to prevent flicker

---

## Format Specifications

### 9. Display Format Rules

**Compact Format**:
```typescript
// Pattern: "Copilot: {used}/{total} ({percent}%)"
// Example: "Copilot: 250/300 (83%)"
// With budget: "Copilot: 250/300 + 5 budget (83%)"

function formatCompact(data: UsageData): string {
  const percent = Math.round((data.includedUsed / data.includedTotal) * 100);
  let text = `Copilot: ${data.includedUsed}/${data.includedTotal} (${percent}%)`;
  
  if (data.budgetUsed > 0) {
    text = `Copilot: ${data.includedUsed}/${data.includedTotal} + ${data.budgetUsed} budget (${percent}%)`;
  }
  
  return text;
}
```

**Detailed Format**:
```typescript
// Pattern: "Copilot: {used}/{total} included, {budget} budget ({percent}%)"
// Example: "Copilot: 250/300 included, 5 budget (83%)"
// Without budget: "Copilot: 250/300 included (83%)"

function formatDetailed(data: UsageData): string {
  const percent = Math.round((data.includedUsed / data.includedTotal) * 100);
  let text = `Copilot: ${data.includedUsed}/${data.includedTotal} included`;
  
  if (data.budgetUsed > 0) {
    text += `, ${data.budgetUsed} budget`;
  }
  
  text += ` (${percent}%)`;
  return text;
}
```

**Percentage Format**:
```typescript
// Pattern: "Copilot: {percent}%"
// Example: "Copilot: 83%"

function formatPercentage(data: UsageData): string {
  const percent = Math.round((data.includedUsed / data.includedTotal) * 100);
  return `Copilot: ${percent}%`;
}
```

**Tooltip Format** (all display formats use same tooltip):
```typescript
function formatTooltip(data: UsageData): vscode.MarkdownString {
  const percent = Math.round((data.includedUsed / data.includedTotal) * 100);
  const remaining = data.includedTotal - data.includedUsed;
  const lastUpdate = new Date(data.lastRefreshTime).toLocaleString();
  const periodEnd = new Date(data.billingPeriodEnd).toLocaleDateString();
  
  const markdown = new vscode.MarkdownString();
  markdown.isTrusted = true;
  
  markdown.appendMarkdown("**GitHub Copilot Premium Requests**\n\n");
  markdown.appendMarkdown(`• **Used**: ${data.includedUsed} of ${data.includedTotal}\n`);
  markdown.appendMarkdown(`• **Remaining**: ${remaining} (${100 - percent}%)\n`);
  
  if (data.budgetUsed > 0) {
    markdown.appendMarkdown(`• **Budget Used**: ${data.budgetUsed}\n`);
  }
  
  markdown.appendMarkdown(`\n---\n\n`);
  markdown.appendMarkdown(`Last updated: ${lastUpdate}\n`);
  markdown.appendMarkdown(`Period ends: ${periodEnd}\n\n`);
  markdown.appendMarkdown(`_Click for details_`);
  
  return markdown;
}
```

---

## Entity Relationships

```
┌──────────────────┐
│ UsageDataService │ (spec 002)
└────────┬─────────┘
         │ emits UsageData
         │
         v
┌────────────────────────┐        ┌────────────────────┐
│ StatusBarController    │◄───────┤ ConfigService      │ (spec 003)
│                        │        │                    │
│ • StatusBarState       │        │ emits config       │
│ • DisplayState         │        └────────────────────┘
└────────┬───────────────┘
         │
         │ delegates formatting
         │
         v
┌────────────────────────┐
│ StatusBarFormatter     │
│                        │
│ • FormattedDisplay     │
│ • format strategies    │
└────────┬───────────────┘
         │
         │ returns FormattedDisplay
         │
         v
┌────────────────────────┐
│ vscode.StatusBarItem   │ (VS Code API)
│                        │
│ • text                 │
│ • tooltip              │
│ • backgroundColor      │
└────────────────────────┘
```

---

## Summary

**Entities Defined**:
1. `DisplayState` - enum for status bar states
2. `StatusBarConfig` - configuration structure
3. `FormattedDisplay` - formatted output structure
4. `StatusBarState` - controller internal state
5. Display validation utilities
6. State determination logic
7. Format specifications

**Referenced Entities**:
1. `UsageData` from spec 002
2. `IConfigurationService` from spec 003

**Key Calculations**:
- Usage percentage: `(includedUsed / includedTotal) * 100`
- Remaining requests: `includedTotal - includedUsed`
- State determination: priority-based algorithm

**Validation Rules**:
- Text: 1-100 characters
- Threshold: 0-100%
- Icons: Codicon format `$(icon-name)`
- State transitions: follow state machine diagram

All entities ready for contract definition. ✅
