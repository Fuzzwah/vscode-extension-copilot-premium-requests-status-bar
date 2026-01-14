# Feature Specification: Status Bar Display

**Feature Branch**: `001-status-bar-display`  
**Created**: 2026-01-12  
**Status**: Draft  
**Input**: Display GitHub Copilot premium request usage in VS Code status bar

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Basic Status Bar Item (Priority: P1) 🎯 MVP

As a developer using GitHub Copilot, I want to see my current premium request usage in the status bar so that I can monitor my usage without interrupting my workflow.

**Why this priority**: This is the core value proposition of the extension - providing at-a-glance visibility of request usage. Without this, the extension has no purpose.

**Independent Test**: Can be fully tested by activating the extension and verifying a status bar item appears with placeholder text, even without real API data.

**Acceptance Scenarios**:

1. **Given** VS Code is open with the extension installed, **When** the extension activates, **Then** a status bar item appears on the right side with text indicating Copilot usage
2. **Given** the status bar item is visible, **When** no data has been fetched yet, **Then** the item displays a loading indicator (e.g., "Copilot: Loading...")
3. **Given** the status bar item is visible, **When** I hover over it, **Then** a tooltip appears with more detailed information

---

### User Story 2 - Display Included Requests (Priority: P1) 🎯 MVP

As a developer, I want to see how many of my included premium requests I've used so that I know if I'm staying within my plan's quota.

**Why this priority**: This is essential for users to understand their primary quota consumption. Most users only need to track included requests.

**Independent Test**: Can be tested by providing mock usage data with only included requests and verifying the display format is correct.

**Acceptance Scenarios**:

1. **Given** usage data is available with included requests, **When** the status bar updates, **Then** it displays "Copilot: X/Y included" where X is used and Y is total
2. **Given** I have used 50 of 100 included requests, **When** viewing the status bar, **Then** it shows "Copilot: 50/100 included"
3. **Given** I have used 100 of 100 included requests, **When** viewing the status bar, **Then** it shows "Copilot: 100/100 included" with a warning color (configurable)

---

### User Story 3 - Display Budget Requests (Priority: P2)

As a developer who uses budget requests, I want to see my budget request usage separately from included requests so that I can track additional costs.

**Why this priority**: Important for users who exceed their included quota, but the extension is still valuable without this for users who stay within included requests.

**Independent Test**: Can be tested by providing mock data with both included and budget requests and verifying both are displayed correctly.

**Acceptance Scenarios**:

1. **Given** usage data includes budget requests, **When** the status bar updates, **Then** it displays both included and budget counts (e.g., "Copilot: 50/100 incl, 10 budget")
2. **Given** I have used 0 budget requests, **When** viewing the status bar, **Then** budget count is not shown (only included requests)
3. **Given** I have used budget requests, **When** hovering over the status bar item, **Then** the tooltip shows detailed breakdown of both request types

---

### User Story 4 - Click to Show Details (Priority: P3)

As a developer, I want to click the status bar item to see more detailed usage information so that I can understand my usage patterns better.

**Why this priority**: Nice-to-have for detailed information, but basic display is sufficient for MVP.

**Independent Test**: Can be tested by clicking the status bar item and verifying an information message or quick pick menu appears.

**Acceptance Scenarios**:

1. **Given** the status bar item is visible, **When** I click on it, **Then** a quick pick menu or information message shows detailed usage statistics
2. **Given** detailed view is shown, **When** I view the information, **Then** I see: included requests (used/total), budget requests (count), current billing period, and last refresh time

---

### Edge Cases

- What happens when the extension cannot determine the usage data (API failure)?
- How does the system handle when usage data is stale (not refreshed for extended period)?
- What displays when a user doesn't have a GitHub Copilot subscription?
- How does the status bar behave when the VS Code window is very narrow (limited space)?
- What happens when GitHub Copilot changes their API response format?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Extension MUST create a status bar item on the right side of the status bar
- **FR-002**: Status bar item MUST be visible by default when extension is activated
- **FR-003**: Status bar item MUST display included request usage in format "X/Y included" where X is used and Y is total
- **FR-004**: Status bar item MUST display budget request count when budget requests exist, in format "+ Z budget"
- **FR-005**: Status bar item MUST show a loading state while data is being fetched
- **FR-006**: Status bar item MUST show an error state when usage data cannot be retrieved
- **FR-007**: Status bar item MUST have a tooltip that shows additional details when hovered
- **FR-008**: Status bar item click MUST trigger an action (show details, open settings, or refresh)
- **FR-009**: Status bar item MUST update automatically when usage data changes
- **FR-010**: Status bar item MUST be properly disposed of when extension is deactivated
- **FR-011**: Status bar item MUST respect VS Code themes (support light, dark, high contrast)
- **FR-012**: Status bar item MUST be accessible via keyboard navigation
- **FR-013**: Status bar item text MUST be concise to avoid cluttering the status bar
- **FR-014**: When nearing quota limits (e.g., >90% of included), status bar item SHOULD change color to warn user
- **FR-015**: Status bar item MUST use VS Code ThemeColor for warning states (e.g., `statusBarItem.warningBackground`)

### Non-Functional Requirements

- **NFR-001**: Status bar updates MUST be asynchronous and non-blocking
- **NFR-002**: Extension memory usage MUST remain under 50MB during normal operation
- **NFR-003**: Extension activation MUST complete within 2 seconds
- **NFR-004**: All test scenarios MUST have failing tests written before implementation begins (TDD)

### Key Entities *(include if feature involves data)*

- **UsageData**: Defined in spec 002-usage-api-integration
  - Reference: Core data model for Copilot usage statistics

- **StatusBarItem**: VS Code API status bar item
  - `text`: string - displayed text
  - `tooltip`: string - hover tooltip content
  - `command`: string - command ID to execute on click
  - `backgroundColor`: ThemeColor - background color for warnings
  - `priority`: number - position in status bar

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Status bar item appears within 2 seconds of VS Code window opening
- **SC-002**: Status bar item displays usage data within 5 seconds of extension activation (assuming API responds normally)
- **SC-003**: Users can understand their usage at a glance without clicking or hovering (included request percentage visible)
- **SC-004**: Status bar item uses less than 100 characters of space to avoid truncation on standard screen sizes
- **SC-005**: 95% of users can see the status bar item without scrolling or resizing their window
- **SC-006**: Extension properly cleans up status bar item with 0 memory leaks on deactivation (verified via testing)
- **SC-007**: Status bar item is visually consistent with other VS Code status bar items (follows design guidelines)
- **SC-008**: Users can distinguish between different states (loading, normal, warning, error) at a glance
