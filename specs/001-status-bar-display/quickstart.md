# Quickstart Guide: Status Bar Display

**Feature**: 001-status-bar-display  
**For**: Developers implementing this feature  
**Last Updated**: 2026-01-12

## Overview

This guide helps developers quickly get started implementing the status bar display feature for GitHub Copilot premium request usage.

---

## Prerequisites

Before starting implementation:

✅ **Read these documents first:**
1. [Feature Specification](./spec.md) - Understand requirements
2. [Research](./research.md) - Technology decisions
3. [Data Model](./data-model.md) - Entity definitions
4. [Contracts](./contracts/) - Interface definitions

✅ **Environment setup:**
- Node.js 18+ installed
- VS Code 1.85.0+ installed
- Git configured
- TypeScript 5.x knowledge

✅ **Dependencies ready** (will be installed in Phase 2):
- `@types/vscode` - VS Code extension API types
- `@types/node` - Node.js types
- `mocha` - Test framework
- `@vscode/test-electron` - VS Code testing utilities
- `sinon` - Mocking library for tests

---

## Project Structure

After implementation, the feature code will be organized as follows:

```
src/
  statusBar/
    StatusBarController.ts      # Main controller (implements IStatusBarController)
    StatusBarFormatter.ts        # Formatter service (implements IStatusBarFormatter)
    StatusBarUpdater.ts          # State updater (implements IStatusBarUpdater)
    types.ts                     # Type definitions
    index.ts                     # Public exports

tests/
  unit/
    statusBar/
      StatusBarController.test.ts
      StatusBarFormatter.test.ts
      StatusBarUpdater.test.ts
    mocks/
      vscode.mock.ts             # VS Code API mocks
      usageData.mock.ts          # Mock usage data

  integration/
    statusBar/
      statusBar.integration.test.ts

.vscode/
  launch.json                    # Debug configurations
  tasks.json                     # Build tasks
```

---

## Implementation Phases

### Phase 0: Research ✅ COMPLETE

- ✅ Reviewed VS Code StatusBarItem API documentation
- ✅ Identified best practices for formatting and state management
- ✅ Defined testing strategy
- ✅ Documented all decisions in [research.md](./research.md)

### Phase 1: Design & Contracts ✅ COMPLETE

- ✅ Defined data model entities
- ✅ Created TypeScript interface contracts
- ✅ Documented state machine and transitions
- ✅ Created this quickstart guide

### Phase 2: TDD Implementation (NEXT)

Follow Test-Driven Development workflow per Constitution Principle III:

#### Step 1: Setup Test Infrastructure

```bash
# Create test directory structure
mkdir -p tests/unit/statusBar tests/unit/mocks tests/integration/statusBar

# Create mock files
touch tests/unit/mocks/vscode.mock.ts
touch tests/unit/mocks/usageData.mock.ts
```

#### Step 2: Write Failing Tests for Formatter

**Test file**: `tests/unit/statusBar/StatusBarFormatter.test.ts`

```typescript
import { expect } from 'chai';
import { StatusBarFormatter } from '../../../src/statusBar/StatusBarFormatter';
import { createMockUsageData } from '../../mocks/usageData.mock';
import { DisplayState } from '../../../src/statusBar/types';

describe('StatusBarFormatter', () => {
  let formatter: StatusBarFormatter;

  beforeEach(() => {
    formatter = new StatusBarFormatter();
  });

  describe('formatCompact', () => {
    it('should format basic usage without budget', () => {
      const data = createMockUsageData({ 
        includedUsed: 250, 
        includedTotal: 300 
      });
      
      const result = formatter.formatCompact(data, false);
      
      expect(result).to.equal('Copilot: 250/300 (83%)');
    });

    it('should format usage with budget', () => {
      const data = createMockUsageData({ 
        includedUsed: 250, 
        includedTotal: 300,
        budgetUsed: 5
      });
      
      const result = formatter.formatCompact(data, false);
      
      expect(result).to.equal('Copilot: 250/300 + 5 budget (83%)');
    });

    it('should include icon when requested', () => {
      const data = createMockUsageData({ 
        includedUsed: 250, 
        includedTotal: 300 
      });
      
      const result = formatter.formatCompact(data, true);
      
      expect(result).to.match(/^\$\(.*\) Copilot:/);
    });
  });

  // Add more test cases...
});
```

**Run test** (should fail):
```bash
npm test
# ❌ FAIL - StatusBarFormatter is not defined
```

#### Step 3: Implement Formatter (Minimum to Pass Tests)

**Implementation file**: `src/statusBar/StatusBarFormatter.ts`

```typescript
import * as vscode from 'vscode';
import { IStatusBarFormatter } from '../contracts/IStatusBarFormatter';
import { DisplayState, FormattedDisplay, UsageData, StatusBarConfig } from './types';

export class StatusBarFormatter implements IStatusBarFormatter {
  
  formatCompact(data: UsageData, showIcon: boolean): string {
    const percent = this.calculatePercentage(data);
    let text = `Copilot: ${data.includedUsed}/${data.includedTotal} (${percent}%)`;
    
    if (data.budgetUsed > 0) {
      text = `Copilot: ${data.includedUsed}/${data.includedTotal} + ${data.budgetUsed} budget (${percent}%)`;
    }
    
    if (showIcon) {
      const icon = this.getIconForState(DisplayState.NORMAL);
      text = `${icon} ${text}`;
    }
    
    return text;
  }

  calculatePercentage(data: UsageData): number {
    if (data.includedTotal === 0) return 0;
    return Math.round((data.includedUsed / data.includedTotal) * 100);
  }

  // Implement remaining methods...
}
```

**Run test** (should pass):
```bash
npm test
# ✅ PASS - StatusBarFormatter tests passing
```

#### Step 4: Repeat for Updater and Controller

Follow the same TDD cycle:
1. Write failing tests for `StatusBarUpdater`
2. Implement minimum code to pass
3. Write failing tests for `StatusBarController`
4. Implement minimum code to pass
5. Refactor and add edge cases

---

## Key Implementation Notes

### 1. StatusBarFormatter

**Purpose**: Pure formatting logic (no state, no side effects)

**Key methods**:
- `formatCompact()` - Compact display
- `formatDetailed()` - Detailed display
- `formatPercentage()` - Percentage-only display
- `formatTooltip()` - Rich tooltip with MarkdownString

**Testing focus**:
- Various usage percentages (0%, 50%, 90%, 95%, 100%)
- Budget display logic
- Icon prefix handling
- Text length constraints
- Edge cases (0 total, negative values)

### 2. StatusBarUpdater

**Purpose**: State determination logic

**Key methods**:
- `determineState()` - Priority-based state algorithm
- `isWarningThresholdExceeded()` - Threshold check
- `validateUsageData()` - Data validation

**Testing focus**:
- State priority (NO_AUTH > NO_SUBSCRIPTION > ERROR > LOADING > WARNING > NORMAL)
- Threshold boundary conditions (89%, 90%, 91%)
- Invalid data handling
- State transition validation

### 3. StatusBarController

**Purpose**: Orchestration and VS Code API integration

**Key methods**:
- `activate()` - Initialize status bar item
- `updateDisplay()` - Update from new data
- `updateConfig()` - Apply config changes
- `showError()` - Error state handling
- `dispose()` - Cleanup

**Testing focus**:
- VS Code API interactions (mock StatusBarItem)
- Event subscription/disposal
- State management
- Error handling
- Resource cleanup

---

## Testing Workflow

### Unit Tests (Fast, Isolated)

```bash
# Run all unit tests
npm run test:unit

# Run with coverage
npm run test:coverage

# Watch mode for TDD
npm run test:watch
```

**Requirements**:
- ✅ 80%+ code coverage
- ✅ All edge cases covered
- ✅ Fast execution (<1s)
- ✅ No VS Code dependencies (use mocks)

### Integration Tests (Slower, VS Code API)

```bash
# Run integration tests (launches VS Code)
npm run test:integration
```

**Requirements**:
- ✅ Actual VS Code extension host
- ✅ Real StatusBarItem creation
- ✅ End-to-end workflows

### Manual Testing

After code passes automated tests:

1. **Install extension** in VS Code:
   ```bash
   npm run compile
   code --install-extension dist/extension.vsix
   ```

2. **Test scenarios**:
   - ✅ Status bar appears on activation
   - ✅ Displays correct format (compact/detailed/percentage)
   - ✅ Changes color at warning threshold
   - ✅ Shows loading state on refresh
   - ✅ Handles errors gracefully
   - ✅ Tooltip shows detailed info
   - ✅ Click handler opens details

3. **Theme testing**:
   - ✅ Light theme
   - ✅ Dark theme
   - ✅ High contrast theme

---

## Development Commands

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode (compile + tests)
npm run watch

# Lint code
npm run lint

# Package extension
npm run package
```

---

## Integration Points

This feature depends on:

### From spec 002 (Usage API Integration):

```typescript
import { UsageDataService } from '../usageApi/UsageDataService';
import { UsageData } from '../usageApi/types';

// Subscribe to data changes
usageDataService.onDataChange((data: UsageData) => {
  statusBarController.updateDisplay(data);
});
```

### From spec 003 (User Configuration):

```typescript
import { ConfigurationService } from '../configuration/ConfigurationService';
import { StatusBarConfig } from './types';

// Subscribe to config changes
configService.onConfigChange((config: StatusBarConfig) => {
  statusBarController.updateConfig(config);
});

// Get current settings
const format = configService.getDisplayFormat();
const threshold = configService.getWarningThreshold();
```

---

## Acceptance Criteria

Before marking this feature complete, verify:

### User Stories Implemented:

- ✅ **US-001** (P1): Status bar displays usage at a glance
- ✅ **US-002** (P1): Color changes to indicate high usage
- ✅ **US-003** (P2): Tooltip shows detailed information
- ✅ **US-004** (P3): Click opens quick pick with details

### Functional Requirements Met:

- ✅ FR-001: Creates StatusBarItem on activation
- ✅ FR-002: Right-aligned with priority 100
- ✅ FR-003: Displays "Copilot: {used}/{total} ({percent}%)"
- ✅ FR-004-007: All display formats
- ✅ FR-008: Click command registered
- ✅ FR-009-010: Warning colors
- ✅ FR-011: Theme support
- ✅ FR-012: Keyboard accessible
- ✅ FR-013-015: State management

### Non-Functional Requirements Met:

- ✅ NFR-001: Async initialization (<2s)
- ✅ NFR-002: Low memory (<50MB)
- ✅ NFR-003: Uses ThemeColor
- ✅ NFR-004: TDD with 80%+ coverage

### Tests Passing:

```bash
npm test
# ✅ All tests passing
# ✅ Coverage >= 80%
# ✅ No lint errors
```

---

## Common Pitfalls to Avoid

❌ **Don't**: Hardcode colors
✅ **Do**: Use `vscode.ThemeColor("statusBarItem.warningBackground")`

❌ **Don't**: Block the UI thread
✅ **Do**: Use `setImmediate()` for updates

❌ **Don't**: Create multiple status bar items
✅ **Do**: Reuse single StatusBarItem instance

❌ **Don't**: Skip error handling
✅ **Do**: Show ERROR state with helpful message

❌ **Don't**: Forget to dispose subscriptions
✅ **Do**: Track all Disposables and clean up

❌ **Don't**: Write implementation before tests
✅ **Do**: Follow TDD - red, green, refactor

---

## Next Steps

Once this feature is complete:

1. **Merge to main**: PR review and merge
2. **Implement spec 002**: Usage API Integration
3. **Implement spec 003**: User Configuration
4. **Integration testing**: All three features together
5. **Release v1.0.0**: MVP complete

---

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [StatusBarItem Documentation](https://code.visualstudio.com/api/references/vscode-api#StatusBarItem)
- [Theme Colors](https://code.visualstudio.com/api/references/theme-color)
- [Codicons](https://microsoft.github.io/vscode-codicons/dist/codicon.html)
- [Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [Project Constitution](../../.specify/memory/constitution.md)

---

## Questions?

If you encounter issues or have questions:

1. Check the [research document](./research.md) for technology decisions
2. Review the [data model](./data-model.md) for entity definitions
3. Consult the [contracts](./contracts/) for interface details
4. Refer to the [specification](./spec.md) for requirements

Happy coding! 🚀
