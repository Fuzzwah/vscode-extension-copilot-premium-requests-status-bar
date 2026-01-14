# Tasks: Webview Sidebar Panel

**Feature**: Replace Output Channel with rich WebviewViewProvider sidebar panel  
**Branch**: `004-webview-sidebar-panel`  
**Input**: [spec.md](./spec.md), [plan.md](./plan.md)

**Tests**: All tasks follow TDD approach - write failing tests before implementation

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and directory structure for webview components

- [X] T001 Create src/webview/ directory for webview-related code
- [X] T002 Create tests/unit/webview/ directory for webview unit tests
- [X] T003 [P] Create src/webview/types.ts with WebviewMessage, PacingData, QuotaCardData interfaces
- [X] T004 [P] Create tests/unit/mocks/webview.mock.ts with mock factories for WebviewView and Webview

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core HTML generation and utility functions needed by ALL user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### HTML Generation Functions

- [X] T005 [P] Write failing tests for getProgressBarColor() in tests/unit/webview/WebviewHtmlGenerator.test.ts (green 0-49%, yellow 50-79%, red 80-100%)
- [X] T006 [P] Implement getProgressBarColor() in src/webview/WebviewHtmlGenerator.ts
- [X] T007 [P] Write failing tests for generateProgressBar() in tests/unit/webview/WebviewHtmlGenerator.test.ts (HTML with percentage width, CSS variables)
- [X] T008 [P] Implement generateProgressBar() in src/webview/WebviewHtmlGenerator.ts
- [X] T009 [P] Write failing tests for formatNumber() utility in tests/unit/webview/WebviewHtmlGenerator.test.ts (adds commas to large numbers)
- [X] T010 [P] Implement formatNumber() in src/webview/WebviewHtmlGenerator.ts

### Pacing Calculations

- [X] T011 [P] Write failing tests for calculatePacing() in tests/unit/webview/WebviewHtmlGenerator.test.ts (daily/weekly averages, countdown, unlimited handling)
- [X] T012 [P] Implement calculatePacing() in src/webview/WebviewHtmlGenerator.ts
- [X] T013 [P] Write failing tests for generatePacingGuidance() in tests/unit/webview/WebviewHtmlGenerator.test.ts (HTML for pacing section)
- [X] T014 [P] Implement generatePacingGuidance() in src/webview/WebviewHtmlGenerator.ts

**Checkpoint**: Foundation ready - HTML generation utilities complete, user story implementation can now begin

---

## Phase 3: User Story 1 - Rich Sidebar Panel Display (Priority: P1) 🎯 MVP

**Goal**: Display usage data in rich HTML sidebar with quota cards, progress bars, and color-coded status

**Independent Test**: Open Copilot Usage sidebar, verify styled quota cards with progress bars appear, colors match usage percentage

### Implementation for User Story 1

- [X] T015 [P] [US1] Write failing tests for generateQuotaCard() in tests/unit/webview/WebviewHtmlGenerator.test.ts (quota name, remaining/used/total, progress bar, unlimited badge, budget display)
- [X] T016 [P] [US1] Implement generateQuotaCard() in src/webview/WebviewHtmlGenerator.ts
- [X] T017 [P] [US1] Write failing tests for generatePlanDetails() in tests/unit/webview/WebviewHtmlGenerator.test.ts (plan type, orgs count, chat enabled)
- [X] T018 [P] [US1] Implement generatePlanDetails() in src/webview/WebviewHtmlGenerator.ts
- [X] T019 [US1] Write failing tests for generateHtml() in tests/unit/webview/WebviewHtmlGenerator.test.ts (complete HTML doc, CSP meta tag, nonce, all quota cards, plan details, timestamp, stale warning, empty data handling)
- [X] T020 [US1] Implement generateHtml() in src/webview/WebviewHtmlGenerator.ts with embedded CSS using VS Code theme variables
- [X] T021 [US1] Write failing tests for UsageViewProvider constructor and basic structure in tests/unit/webview/UsageViewProvider.test.ts (implements interface, stores dependencies)
- [X] T022 [US1] Create UsageViewProvider class skeleton in src/webview/UsageViewProvider.ts with constructor
- [X] T023 [US1] Write failing tests for resolveWebviewView() in tests/unit/webview/UsageViewProvider.test.ts (stores view reference, sets webview options, registers listeners)
- [X] T024 [US1] Implement resolveWebviewView() in src/webview/UsageViewProvider.ts
- [X] T025 [US1] Write failing tests for _updateView() in tests/unit/webview/UsageViewProvider.test.ts (generates HTML, sets webview.html)
- [X] T026 [US1] Implement _updateView() in src/webview/UsageViewProvider.ts
- [X] T027 [US1] Write failing tests for _showLoading() in tests/unit/webview/UsageViewProvider.test.ts (displays loading skeleton)
- [X] T028 [US1] Implement _showLoading() and _getLoadingHtml() in src/webview/UsageViewProvider.ts
- [X] T029 [US1] Write failing tests for _showError() in tests/unit/webview/UsageViewProvider.test.ts (displays error message with retry button)
- [X] T030 [US1] Implement _showError() and _getErrorHtml() in src/webview/UsageViewProvider.ts
- [X] T031 [US1] Register UsageViewProvider in src/extension.ts with context.subscriptions
- [X] T032 [US1] Update StatusBarController click handler in src/extension.ts to focus webview instead of Output Channel
- [X] T033 [US1] Register command copilotPremiumRequests.usageView.focus in src/extension.ts
- [X] T034 [US1] Verify manual test: Open sidebar, see styled quota cards with progress bars and correct colors

**Checkpoint**: User Story 1 complete - sidebar displays rich HTML with quota cards and visual indicators

---

## Phase 4: User Story 2 - Manual Refresh from Sidebar (Priority: P1) 🎯 MVP

**Goal**: Add refresh icon to sidebar title bar that fetches latest data and updates display

**Independent Test**: Click refresh icon in sidebar view title bar, verify loading state appears then data updates with new timestamp

### Implementation for User Story 2

- [X] T035 [P] [US2] Write failing tests for refresh() in tests/unit/webview/UsageViewProvider.test.ts (fetches data, shows loading, updates view on success, shows error on failure, prevents concurrent refreshes)
- [X] T036 [P] [US2] Implement refresh() method in src/webview/UsageViewProvider.ts with debouncing
- [X] T037 [US2] Add refreshUsageView command to package.json contributes.commands with refresh icon
- [X] T038 [US2] Add view/title menu contribution for refreshUsageView command in package.json (when: view == copilotPremiumRequests.usageView)
- [X] T039 [US2] Register refreshUsageView command in src/extension.ts that calls usageViewProvider.refresh()
- [X] T040 [US2] Add last fetch timestamp tracking to UsageViewProvider in src/webview/UsageViewProvider.ts
- [X] T041 [US2] Update generateHtml() in src/webview/WebviewHtmlGenerator.ts to include "last fetched" timestamp display
- [X] T042 [US2] Verify manual test: Click refresh icon, see loading spinner then updated data and new timestamp

**Checkpoint**: User Story 2 complete - manual refresh functional from sidebar title bar

---

## Phase 5: User Story 3 - Auto-refresh on Visibility (Priority: P2)

**Goal**: Automatically refresh data when sidebar becomes visible if data is stale (>5 minutes old)

**Independent Test**: Close sidebar, wait 5+ minutes, reopen sidebar, verify auto-refresh triggers and data updates

### Implementation for User Story 3

- [ ] T043 [P] [US3] Write failing tests for _shouldAutoRefresh() in tests/unit/webview/UsageViewProvider.test.ts (checks refresh state, checks last fetch time, returns true if >5 min old)
- [ ] T044 [P] [US3] Implement _shouldAutoRefresh() method in src/webview/UsageViewProvider.ts
- [ ] T045 [US3] Write failing tests for onDidChangeVisibility handler in tests/unit/webview/UsageViewProvider.test.ts (triggers refresh when visible, skips if not stale, skips if already refreshing)
- [ ] T046 [US3] Implement onDidChangeVisibility listener in resolveWebviewView() in src/webview/UsageViewProvider.ts
- [ ] T047 [US3] Verify manual test: Close sidebar, wait 5+ minutes, reopen, confirm auto-refresh occurs

**Checkpoint**: User Story 3 complete - auto-refresh works when sidebar becomes visible

---

## Phase 6: User Story 4 - Pacing Guidance Display (Priority: P2)

**Goal**: Show daily/weekly average guidance and reset countdown in each quota card

**Independent Test**: View quota card, verify pacing section shows "≤ X/day" and "Reset in: Xd Xh"

### Implementation for User Story 4

- [ ] T048 [P] [US4] Update generateQuotaCard() tests in tests/unit/webview/WebviewHtmlGenerator.test.ts to include pacing guidance section
- [ ] T049 [P] [US4] Update generateQuotaCard() implementation in src/webview/WebviewHtmlGenerator.ts to call calculatePacing() and include pacing HTML
- [ ] T050 [US4] Add CSS styles for pacing guidance section in generateHtml() in src/webview/WebviewHtmlGenerator.ts
- [ ] T051 [US4] Verify manual test: Open sidebar, confirm each quota card shows pacing guidance with daily/weekly averages and reset countdown

**Checkpoint**: User Story 4 complete - pacing guidance visible in quota cards

---

## Phase 7: User Story 5 - Export to Clipboard (Priority: P3)

**Goal**: Add "Copy Summary" button that exports usage data as formatted Markdown to clipboard

**Independent Test**: Click "Copy Summary" button, paste into text editor, verify formatted Markdown with quota data

### Implementation for User Story 5

- [ ] T052 [P] [US5] Write failing tests for formatMarkdownSummary() in tests/unit/webview/WebviewMessageHandler.test.ts (Markdown with headers, bullet points, quota data, plan details, timestamp, budget info, unlimited handling)
- [ ] T053 [P] [US5] Create src/webview/WebviewMessageHandler.ts and implement formatMarkdownSummary()
- [ ] T054 [P] [US5] Write failing tests for handleMessage() in tests/unit/webview/WebviewMessageHandler.test.ts (handles 'copy' command, copies to clipboard, shows notification, handles 'refresh', handles unknown commands, logs errors)
- [ ] T055 [US5] Implement handleMessage() in src/webview/WebviewMessageHandler.ts
- [ ] T056 [US5] Write failing tests for _handleMessage() wrapper in tests/unit/webview/UsageViewProvider.test.ts (routes to WebviewMessageHandler, catches errors)
- [ ] T057 [US5] Implement _handleMessage() in src/webview/UsageViewProvider.ts that calls handleMessage from WebviewMessageHandler
- [ ] T058 [US5] Register onDidReceiveMessage listener in resolveWebviewView() in src/webview/UsageViewProvider.ts
- [ ] T059 [US5] Add "Copy Summary" button to HTML template in generateHtml() in src/webview/WebviewHtmlGenerator.ts with postMessage script
- [ ] T060 [US5] Add postMessage script for copy button click in generateHtml() in src/webview/WebviewHtmlGenerator.ts
- [ ] T061 [US5] Verify manual test: Click "Copy Summary", paste into editor, confirm formatted Markdown appears

**Checkpoint**: User Story 5 complete - clipboard export functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories - theming, responsive layout, edge cases

### Theming & Responsive Design

- [ ] T062 [P] Write tests for CSS variable usage in tests/unit/webview/WebviewHtmlGenerator.test.ts (no hardcoded colors, only vscode CSS vars)
- [ ] T063 [P] Write tests for responsive layout in tests/unit/webview/WebviewHtmlGenerator.test.ts (min-width 180px for cards, ellipsis for long names)
- [ ] T064 Update CSS in generateHtml() in src/webview/WebviewHtmlGenerator.ts to use only VS Code CSS variables (--vscode-foreground, --vscode-background, --vscode-charts-green/yellow/red, etc.)
- [ ] T065 Add responsive CSS rules in generateHtml() in src/webview/WebviewHtmlGenerator.ts (min-width, text-overflow: ellipsis)

### Edge Case Handling

- [ ] T066 [P] Write edge case tests in tests/unit/webview/WebviewHtmlGenerator.test.ts (empty quota_snapshots, all unlimited quotas, missing fields, null data)
- [ ] T067 [P] Write edge case tests in tests/unit/webview/UsageViewProvider.test.ts (API 401/500 errors, network timeout, undefined webview)
- [ ] T068 Update error handling in src/webview/UsageViewProvider.ts to cover all edge cases
- [ ] T069 Update generateHtml() in src/webview/WebviewHtmlGenerator.ts to handle empty/null data gracefully

### Content Security Policy

- [ ] T070 [P] Write tests for CSP compliance in tests/unit/webview/WebviewHtmlGenerator.test.ts (includes CSP meta tag, uses nonce for scripts, no inline event handlers)
- [ ] T071 Implement nonce generation in generateHtml() in src/webview/WebviewHtmlGenerator.ts
- [ ] T072 Add CSP meta tag to HTML template in generateHtml() in src/webview/WebviewHtmlGenerator.ts

### Output Channel Cleanup

- [ ] T073 Remove showOutput command registration from src/extension.ts
- [ ] T074 Remove Output Channel display logic from src/statusBar/StatusBarController.ts (keep for logging only)
- [ ] T075 Update all Output Channel references in codebase to use webview instead

### Integration Testing

- [ ] T076 [P] Create tests/integration/webview.integration.test.ts with provider lifecycle tests
- [ ] T077 [P] Add data flow integration test in tests/integration/webview.integration.test.ts (API → Provider → HTML → Webview)
- [ ] T078 [P] Add message passing integration test in tests/integration/webview.integration.test.ts (Webview → Provider → Action)
- [ ] T079 Run full integration test suite and verify all scenarios pass

### Manual Testing & Documentation

- [ ] T080 Manual test checklist: Install extension, open sidebar, verify data displays
- [ ] T081 Manual test checklist: Click refresh, verify update works
- [ ] T082 Manual test checklist: Click copy, verify clipboard has Markdown
- [ ] T083 Manual test checklist: Switch VS Code theme (light/dark/high contrast), verify styling adapts
- [ ] T084 Manual test checklist: Resize sidebar (200px to 800px), verify responsive layout
- [ ] T085 Manual test checklist: Close and reopen sidebar, verify auto-refresh
- [ ] T086 Manual test checklist: Test with no authentication, verify error message
- [ ] T087 Manual test checklist: Trigger API error, verify error state with retry
- [ ] T088 Update README.md with webview sidebar panel feature description

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - MVP display
- **User Story 2 (Phase 4)**: Depends on US1 - adds refresh functionality
- **User Story 3 (Phase 5)**: Depends on US2 - adds auto-refresh
- **User Story 4 (Phase 6)**: Depends on US1 - enhances display
- **User Story 5 (Phase 7)**: Depends on US1 - adds export feature
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1**: Can start after Foundational phase - No dependencies on other stories
- **User Story 2**: Can start after US1 complete - Builds on basic display
- **User Story 3**: Can start after US2 complete - Extends refresh functionality
- **User Story 4**: Can start after US1 complete - Independent enhancement to display (can run parallel with US2/US3)
- **User Story 5**: Can start after US1 complete - Independent feature (can run parallel with US2/US3/US4)

### Parallel Opportunities

**Setup Phase (All parallel)**:
```bash
T001, T002  # Directory creation
T003, T004  # Type definitions and mocks
```

**Foundational Phase (Parallel groups)**:
```bash
# HTML generation tests (parallel):
T005, T007, T009

# HTML generation implementations (parallel):
T006, T008, T010

# Pacing tests (parallel):
T011, T013

# Pacing implementations (parallel):
T012, T014
```

**User Story 1 (Parallel groups)**:
```bash
# Quota card tests and implementation (parallel):
T015, T017

# Quota card implementations (parallel):
T016, T018

# Provider tests (after HTML complete, parallel):
T021, T023, T025, T027, T029
```

**User Story 4 & 5 (Can run in parallel after US1)**:
```bash
# US4 tasks:
T048, T049, T050, T051

# US5 tasks (parallel with US4):
T052, T053, T054, T055, T056, T057, T058, T059, T060, T061
```

**Polish Phase (Parallel groups)**:
```bash
# Tests (all parallel):
T062, T063, T066, T067, T070, T076, T077, T078

# Manual tests (sequential):
T080, T081, T082, T083, T084, T085, T086, T087
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1 (basic display)
4. Complete Phase 4: User Story 2 (manual refresh)
5. **STOP and VALIDATE**: Test sidebar display and refresh independently
6. Deploy/demo MVP

### Incremental Delivery

1. Setup + Foundational → Foundation ready (Checkpoint)
2. Add US1 → Rich sidebar display (Checkpoint - can demo)
3. Add US2 → Manual refresh (Checkpoint - MVP ready to deploy)
4. Add US3 → Auto-refresh (Checkpoint - improved UX)
5. Add US4 → Pacing guidance (Checkpoint - enhanced data)
6. Add US5 → Clipboard export (Checkpoint - sharing feature)
7. Polish → Production ready

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational done:
   - Developer A: User Story 1 → User Story 2
   - Developer B: User Story 4 (parallel with A)
   - Developer C: User Story 5 (parallel with A & B)
3. After US1/US2 complete: Developer A adds US3
4. All developers contribute to Polish phase

---

## Notes

- **TDD Required**: All tasks follow test-first approach - write failing tests before implementation
- **[P] Tasks**: Different files, can run in parallel
- **[Story] Labels**: Map tasks to user stories for traceability
- **Independent Testing**: Each user story should be testable on its own at its checkpoint
- **CSP Compliance**: Use nonces for scripts, no inline event handlers, follow VS Code security guidelines
- **Theme Compatibility**: Use only VS Code CSS variables, test in light/dark/high contrast themes
- **Responsive Design**: Test at 200px, 400px, 800px sidebar widths
- **Total Tasks**: 88 tasks across 8 phases
- **MVP Scope**: Phases 1-4 (Tasks T001-T042) = 42 tasks for minimum viable product
