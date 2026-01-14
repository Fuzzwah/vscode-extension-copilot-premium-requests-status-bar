# Feature Specification: Webview Sidebar Panel

**Feature Branch**: `004-webview-sidebar-panel`  
**Created**: 2026-01-13  
**Status**: Draft  
**Input**: Replace plain text Output Channel with rich WebviewViewProvider sidebar panel for enhanced data visualization

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Rich Sidebar Panel Display (Priority: P1) 🎯 MVP

As a developer, I want to view my Copilot usage data in a rich sidebar panel with proper formatting and visual elements so that I can quickly understand my usage status at a glance.

**Why this priority**: Current Output Channel implementation shows plain text which is hard to scan and lacks visual hierarchy. A proper webview panel provides better UX with progress bars, colors, and structured layout.

**Independent Test**: Open the Copilot Usage sidebar, verify rich HTML display with styled quota cards, progress bars, and color-coded status indicators.

**Acceptance Scenarios**:

1. **Given** I click the Copilot icon in the Activity Bar, **When** the sidebar opens, **Then** I see a webview panel with styled usage information
2. **Given** the sidebar panel is open, **When** data loads, **Then** I see progress bars showing quota usage with color coding (green <50%, yellow 50-80%, red >80%)
3. **Given** I have budget available, **When** viewing the panel, **Then** I see both included quota and budget quota as separate cards
4. **Given** the panel displays data, **When** I hover over elements, **Then** I see tooltips explaining what each metric means
5. **Given** data is stale (>1 hour), **When** viewing the panel, **Then** I see a warning banner indicating data staleness

---

### User Story 2 - Manual Refresh from Sidebar (Priority: P1) 🎯 MVP

As a developer, I want to manually refresh usage data from the sidebar panel so that I can get the latest information without leaving the panel.

**Why this priority**: Essential for user control - users need to fetch fresh data when they want to check current status.

**Independent Test**: Click the refresh icon in the sidebar view title bar, verify data updates and "last fetched" timestamp changes.

**Acceptance Scenarios**:

1. **Given** the sidebar panel is open, **When** I click the refresh icon in the view title bar, **Then** the panel shows loading state and fetches new data
2. **Given** refresh is in progress, **When** data is loading, **Then** I see a loading spinner or skeleton UI
3. **Given** refresh completes successfully, **When** new data loads, **Then** the "last fetched" timestamp updates to current time
4. **Given** refresh fails, **When** an error occurs, **Then** I see an error message in the panel with retry option

---

### User Story 3 - Auto-refresh on Visibility (Priority: P2)

As a developer, I want the panel to automatically refresh when I open it so that I always see current data without manual intervention.

**Why this priority**: Improves UX by ensuring fresh data, but manual refresh (US2) is sufficient for MVP.

**Independent Test**: Close sidebar, wait 5 minutes, reopen sidebar, verify data refreshes automatically.

**Acceptance Scenarios**:

1. **Given** the sidebar was closed, **When** I open the Copilot Usage sidebar, **Then** data automatically refreshes
2. **Given** the sidebar is already visible, **When** it's been open for a while, **Then** data does NOT auto-refresh (only on visibility change)
3. **Given** auto-refresh is triggered, **When** a manual refresh is already in progress, **Then** auto-refresh is skipped to avoid duplicate requests

---

### User Story 4 - Pacing Guidance Display (Priority: P2)

As a developer, I want to see pacing guidance (daily/weekly averages, projected usage) so that I can plan my Copilot usage for the rest of the billing period.

**Why this priority**: Very valuable for users, but basic usage display (US1) is sufficient for MVP.

**Independent Test**: View quota card with <30 days until reset, verify pacing section shows daily/weekly averages and projected usage.

**Acceptance Scenarios**:

1. **Given** I have a limited quota, **When** viewing a quota card, **Then** I see "To last until reset: ≤ X/day" guidance
2. **Given** there are >7 days until reset, **When** viewing pacing, **Then** I see weekly average "≤ X/week"
3. **Given** viewing pacing guidance, **When** quota card is displayed, **Then** I see "Reset in: Xd Xh" and exact reset date
4. **Given** I have overage permitted, **When** viewing the quota card, **Then** I see overage status and count if any used

---

### User Story 5 - Export to Clipboard (Priority: P3)

As a developer, I want to copy usage summary to clipboard as formatted Markdown so that I can share it with my team or include in reports.

**Why this priority**: Nice-to-have feature for sharing, not critical for MVP.

**Independent Test**: Click "Copy Summary" button, paste into text editor, verify formatted Markdown output.

**Acceptance Scenarios**:

1. **Given** the sidebar panel is open, **When** I click "Copy Summary to Clipboard" button, **Then** formatted Markdown is copied to clipboard
2. **Given** summary is copied, **When** I paste into text editor, **Then** I see properly formatted Markdown with headers, bullet points, and quota data
3. **Given** copy succeeds, **When** the operation completes, **Then** I see a notification "Usage summary copied to clipboard"

---

### Edge Cases

- What happens when the webview panel loses focus and regains it?
- How does the panel handle very long organization names or plan names?
- What if quota_snapshots returns an empty object or null?
- How does the panel display when there are 10+ quotas (e.g., multiple models)?
- What happens if the panel is resized to very narrow width?
- How does the panel behave when VS Code theme changes (dark/light)?
- What if the user has unlimited quotas for all categories?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Extension MUST register a WebviewViewProvider with view type `copilotPremiumRequests.usageView`
- **FR-002**: Extension MUST contribute viewsContainers in activitybar with icon and title
- **FR-003**: Extension MUST contribute views for the registered view container
- **FR-004**: WebviewViewProvider MUST render HTML using VS Code theme CSS variables
- **FR-005**: Panel MUST show quota cards for each available quota (premium_interactions, chat, completions)
- **FR-006**: Each quota card MUST display: name, progress bar, remaining/used/total, percentage
- **FR-007**: Progress bars MUST use color coding: green (<50% used), yellow (50-80% used), red (>80% used)
- **FR-008**: Panel MUST display plan details section (plan type, chat enabled, organizations count)
- **FR-009**: Panel MUST show "last fetched" timestamp at bottom of view
- **FR-010**: Panel MUST show warning banner when data is stale (>1 hour old)
- **FR-011**: Panel MUST handle unlimited quotas correctly (show "Unlimited ∞" badge instead of progress bar)
- **FR-012**: Refresh command MUST be accessible via icon in view title bar
- **FR-013**: Refresh MUST show loading state in panel during data fetch
- **FR-014**: Panel MUST auto-refresh when view becomes visible (onDidChangeVisibility event)
- **FR-015**: Panel MUST display budget/overage information when available
- **FR-016**: Pacing guidance section MUST calculate and display daily average, weekly average, reset countdown
- **FR-017**: Panel MUST use Content Security Policy allowing only inline styles and codicon fonts
- **FR-018**: WebviewViewProvider MUST enable scripts in webview options
- **FR-019**: Panel MUST communicate with extension via postMessage for actions (copy, refresh)
- **FR-020**: Copy to clipboard MUST generate formatted Markdown summary of all data
- **FR-021**: Panel MUST be responsive and handle narrow sidebar widths gracefully
- **FR-022**: All interactive elements MUST have tooltips explaining their purpose
- **FR-023**: Panel MUST replace current Output Channel implementation for click action

### Non-Functional Requirements

- **NFR-001**: Panel rendering MUST complete within 100ms after data is available
- **NFR-002**: HTML generation MUST be safe against XSS (no unsanitized user input)
- **NFR-003**: Panel MUST adapt to VS Code theme changes automatically (use CSS variables only)
- **NFR-004**: Panel layout MUST not break at sidebar widths down to 200px
- **NFR-005**: All test scenarios MUST have failing tests written before implementation begins (TDD)

### Key Entities *(include if feature involves data)*

- **UsageViewProvider**: WebviewViewProvider implementation
  - `resolveWebviewView()`: Initializes webview when view becomes visible
  - `refresh()`: Manually triggers data refresh
  - `_getHtmlForWebview(data)`: Generates HTML content from usage data
  - `_handleMessage(message)`: Handles postMessage events from webview
  - `_updateView(data)`: Updates webview HTML with new data
  - `_showLoading()`: Displays loading state
  - `_showError(error)`: Displays error state

- **WebviewMessage**: Type for messages between webview and extension
  - `command`: string - Message command type (copy, refresh, etc.)
  - `data`: any - Optional data payload

- **PacingData**: Calculated pacing guidance
  - `dailyAverage`: number - Requests per day to stay within quota
  - `weeklyAverage`: number - Requests per week
  - `daysUntilReset`: number - Days remaining in billing period
  - `hoursUntilReset`: number - Hours component of time remaining
  - `resetDate`: string - Formatted reset date

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sidebar panel renders within 100ms of data becoming available
- **SC-002**: All quota cards display correctly for 100% of valid API responses
- **SC-003**: Progress bar colors match usage percentage 100% accurately
- **SC-004**: Panel handles all edge cases (empty data, unlimited quotas, missing fields) without errors
- **SC-005**: Refresh completes and updates panel within 3 seconds (assuming network latency <2s)
- **SC-006**: Auto-refresh triggers within 500ms of panel becoming visible
- **SC-007**: Copied Markdown is valid and properly formatted for 100% of data scenarios
- **SC-008**: Panel remains functional and readable at minimum sidebar width (200px)
- **SC-009**: All VS Code theme changes reflected immediately in panel styling
- **SC-010**: Panel replaces Output Channel implementation with zero regressions in functionality
