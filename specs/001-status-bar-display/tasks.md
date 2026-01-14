# Tasks: Status Bar Display

**Input**: Design documents from `/specs/001-status-bar-display/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Following TDD approach per constitution Principle III and NFR-004

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic VS Code extension structure

- [X] T001 Create project structure per implementation plan in src/statusBar/, tests/unit/statusBar/, tests/integration/statusBar/
- [X] T002 Initialize TypeScript project with VS Code extension dependencies (@types/vscode, @types/node)
- [X] T003 [P] Configure tsconfig.json with strict mode and ES2020 target
- [X] T004 [P] Configure ESLint and Prettier for code quality
- [X] T005 [P] Setup Mocha test framework with @vscode/test-electron in package.json
- [X] T006 [P] Configure .vscode/launch.json for extension debugging
- [X] T007 [P] Create package.json activation events for extension

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T008 Create type definitions file in src/statusBar/types.ts with DisplayState enum
- [X] T009 [P] Create VS Code API mocks in tests/unit/mocks/vscode.mock.ts
- [X] T010 [P] Create UsageData mock fixtures in tests/unit/mocks/usageData.mock.ts
- [X] T011 Create FormattedDisplay interface in src/statusBar/types.ts
- [X] T012 Create StatusBarConfig interface in src/statusBar/types.ts
- [X] T013 [P] Setup test utilities and helpers in tests/unit/helpers/testUtils.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Basic Status Bar Item (Priority: P1) 🎯 MVP

**Goal**: Display a status bar item that shows loading state and basic structure

**Independent Test**: Status bar item appears with placeholder text when extension activates

### Tests for User Story 1 ⚠️ WRITE FIRST, ENSURE THEY FAIL

- [ ] T014 [P] [US1] Unit test for StatusBarController initialization in tests/unit/statusBar/StatusBarController.test.ts
- [ ] T015 [P] [US1] Unit test for StatusBarController.activate() creates status bar item in tests/unit/statusBar/StatusBarController.test.ts
- [ ] T016 [P] [US1] Unit test for StatusBarController.showLoading() displays loading state in tests/unit/statusBar/StatusBarController.test.ts
- [ ] T017 [P] [US1] Integration test for status bar item visibility on activation in tests/integration/statusBar/statusBar.integration.test.ts

### Implementation for User Story 1

- [X] T018 [US1] Implement StatusBarController class with activate() method in src/statusBar/StatusBarController.ts
- [X] T019 [US1] Implement StatusBarController.showLoading() to display loading state in src/statusBar/StatusBarController.ts
- [X] T020 [US1] Implement StatusBarController.getState() to return current DisplayState in src/statusBar/StatusBarController.ts
- [X] T021 [US1] Implement StatusBarController.dispose() for cleanup in src/statusBar/StatusBarController.ts
- [X] T022 [US1] Wire up StatusBarController in extension.ts activation
- [X] T023 [US1] Add tooltip support to status bar item in src/statusBar/StatusBarController.ts

**Checkpoint**: Status bar item appears on activation with loading state and tooltip

---

## Phase 4: User Story 2 - Display Included Requests (Priority: P1) 🎯 MVP

**Goal**: Format and display included request usage (e.g., "Copilot: 50/100 (83%)")

**Independent Test**: Status bar shows correct format when provided with mock UsageData

### Tests for User Story 2 ⚠️ WRITE FIRST, ENSURE THEY FAIL

- [X] T024 [P] [US2] Unit test for StatusBarFormatter.formatCompact() basic usage in tests/unit/statusBar/StatusBarFormatter.test.ts
- [X] T025 [P] [US2] Unit test for StatusBarFormatter.calculatePercentage() in tests/unit/statusBar/StatusBarFormatter.test.ts
- [X] T026 [P] [US2] Unit test for StatusBarFormatter.formatTooltip() with included requests in tests/unit/statusBar/StatusBarFormatter.test.ts
- [X] T027 [P] [US2] Unit test for StatusBarUpdater.determineState() with normal usage in tests/unit/statusBar/StatusBarUpdater.test.ts
- [X] T028 [P] [US2] Unit test for StatusBarUpdater.isWarningThresholdExceeded() in tests/unit/statusBar/StatusBarUpdater.test.ts
- [X] T029 [P] [US2] Unit test for StatusBarUpdater.validateUsageData() in tests/unit/statusBar/StatusBarUpdater.test.ts

### Implementation for User Story 2

- [X] T030 [P] [US2] Implement StatusBarFormatter class with formatCompact() in src/statusBar/StatusBarFormatter.ts
- [X] T031 [P] [US2] Implement StatusBarFormatter.calculatePercentage() in src/statusBar/StatusBarFormatter.ts
- [X] T032 [US2] Implement StatusBarFormatter.formatTooltip() with MarkdownString in src/statusBar/StatusBarFormatter.ts
- [X] T033 [US2] Implement StatusBarFormatter.getIconForState() in src/statusBar/StatusBarFormatter.ts
- [X] T034 [P] [US2] Implement StatusBarUpdater class with determineState() in src/statusBar/StatusBarUpdater.ts
- [X] T035 [P] [US2] Implement StatusBarUpdater.isWarningThresholdExceeded() in src/statusBar/StatusBarUpdater.ts
- [X] T036 [P] [US2] Implement StatusBarUpdater.validateUsageData() in src/statusBar/StatusBarUpdater.ts
- [X] T037 [US2] Implement StatusBarController.updateDisplay() using formatter and updater in src/statusBar/StatusBarController.ts
- [X] T038 [US2] Wire formatter and updater into controller constructor in src/statusBar/StatusBarController.ts

**Checkpoint**: Status bar displays "Copilot: X/Y (Z%)" format with correct calculations

---

## Phase 5: User Story 2 (continued) - Warning Colors & States

**Goal**: Add visual warning when approaching quota limits (>90% by default)

**Independent Test**: Status bar changes color when usage exceeds threshold

### Tests for Warning Behavior ⚠️ WRITE FIRST, ENSURE THEY FAIL

- [X] T039 [P] [US2] Unit test for StatusBarFormatter.getBackgroundColorForState() warning state in tests/unit/statusBar/StatusBarFormatter.test.ts
- [X] T040 [P] [US2] Unit test for StatusBarUpdater.determineState() returns WARNING at threshold in tests/unit/statusBar/StatusBarUpdater.test.ts
- [ ] T041 [P] [US2] Integration test for status bar warning color at 90% usage in tests/integration/statusBar/statusBar.integration.test.ts

### Implementation for Warning Behavior

- [X] T042 [P] [US2] Implement StatusBarFormatter.getBackgroundColorForState() with ThemeColor in src/statusBar/StatusBarFormatter.ts
- [X] T043 [US2] Update StatusBarUpdater.determineState() to check warning threshold in src/statusBar/StatusBarUpdater.ts
- [X] T044 [US2] Update StatusBarController.updateDisplay() to apply backgroundColor in src/statusBar/StatusBarController.ts
- [X] T045 [US2] Add icon support ($(check), $(warning)) to formatter in src/statusBar/StatusBarFormatter.ts

**Checkpoint**: Status bar changes to warning color and icon when usage >90%

---

## Phase 6: User Story 2 (continued) - Additional Display Formats

**Goal**: Support detailed and percentage display formats

**Independent Test**: Each format displays correctly with same data

### Tests for Display Formats ⚠️ WRITE FIRST, ENSURE THEY FAIL

- [X] T046 [P] [US2] Unit test for StatusBarFormatter.formatDetailed() in tests/unit/statusBar/StatusBarFormatter.test.ts
- [X] T047 [P] [US2] Unit test for StatusBarFormatter.formatPercentage() in tests/unit/statusBar/StatusBarFormatter.test.ts
- [X] T048 [P] [US2] Unit test for StatusBarFormatter.format() method that switches between formats in tests/unit/statusBar/StatusBarFormatter.test.ts

### Implementation for Display Formats

- [X] T049 [P] [US2] Implement StatusBarFormatter.formatDetailed() in src/statusBar/StatusBarFormatter.ts
- [X] T050 [P] [US2] Implement StatusBarFormatter.formatPercentage() in src/statusBar/StatusBarFormatter.ts
- [X] T051 [US2] Implement StatusBarFormatter.format() that delegates to format methods in src/statusBar/StatusBarFormatter.ts
- [X] T052 [US2] Update StatusBarController to use StatusBarFormatter.format() in src/statusBar/StatusBarController.ts

**Checkpoint**: All three display formats (compact, detailed, percentage) work correctly

---

## Phase 7: User Story 2 (continued) - Error & Edge Case Handling

**Goal**: Handle error states, no auth, no subscription scenarios

**Independent Test**: Status bar shows appropriate message for each error state

### Tests for Error Handling ⚠️ WRITE FIRST, ENSURE THEY FAIL

- [X] T053 [P] [US2] Unit test for StatusBarController.showError() in tests/unit/statusBar/StatusBarController.test.ts
- [X] T054 [P] [US2] Unit test for StatusBarUpdater.determineState() with NO_AUTH in tests/unit/statusBar/StatusBarUpdater.test.ts
- [X] T055 [P] [US2] Unit test for StatusBarUpdater.determineState() with NO_SUBSCRIPTION in tests/unit/statusBar/StatusBarUpdater.test.ts
- [X] T056 [P] [US2] Unit test for StatusBarUpdater.determineState() with ERROR in tests/unit/statusBar/StatusBarUpdater.test.ts
- [X] T057 [P] [US2] Unit test for StatusBarFormatter error state formatting in tests/unit/statusBar/StatusBarFormatter.test.ts

### Implementation for Error Handling

- [X] T058 [US2] Implement StatusBarController.showError() with error icon and message in src/statusBar/StatusBarController.ts
- [X] T059 [US2] Update StatusBarUpdater.determineState() to handle auth/subscription checks in src/statusBar/StatusBarUpdater.ts
- [X] T060 [US2] Update StatusBarFormatter.formatTooltip() for error states in src/statusBar/StatusBarFormatter.ts
- [X] T061 [US2] Add error state formatting to StatusBarFormatter in src/statusBar/StatusBarFormatter.ts

**Checkpoint**: Status bar handles all error states gracefully (ERROR, NO_AUTH, NO_SUBSCRIPTION)

---

## Phase 8: User Story 3 - Display Budget Requests (Priority: P2)

**Goal**: Show budget request usage when user has used budget requests

**Independent Test**: Budget count appears when budgetUsed > 0

### Tests for User Story 3 ⚠️ WRITE FIRST, ENSURE THEY FAIL

- [X] T062 [P] [US3] Unit test for formatCompact() with budget requests in tests/unit/statusBar/StatusBarFormatter.test.ts
- [X] T063 [P] [US3] Unit test for formatDetailed() with budget requests in tests/unit/statusBar/StatusBarFormatter.test.ts
- [X] T064 [P] [US3] Unit test for formatTooltip() includes budget breakdown in tests/unit/statusBar/StatusBarFormatter.test.ts
- [X] T065 [P] [US3] Unit test that budget is hidden when budgetUsed === 0 in tests/unit/statusBar/StatusBarFormatter.test.ts

### Implementation for User Story 3

- [X] T066 [US3] Update StatusBarFormatter.formatCompact() to include budget when > 0 in src/statusBar/StatusBarFormatter.ts
- [X] T067 [US3] Update StatusBarFormatter.formatDetailed() to include budget when > 0 in src/statusBar/StatusBarFormatter.ts
- [X] T068 [US3] Update StatusBarFormatter.formatTooltip() to show budget breakdown in src/statusBar/StatusBarFormatter.ts
- [X] T069 [US3] Add budget display logic tests with various budget values in tests/unit/statusBar/StatusBarFormatter.test.ts

**Checkpoint**: Budget requests appear in display when budgetUsed > 0, hidden when 0

---

## Phase 9: User Story 4 - Click to Show Details (Priority: P3)

**Goal**: Show detailed usage information when user clicks status bar item

**Independent Test**: Clicking status bar item opens information message or quick pick

### Tests for User Story 4 ⚠️ WRITE FIRST, ENSURE THEY FAIL

- [X] T070 [P] [US4] Unit test for click command registration in tests/unit/statusBar/StatusBarController.test.ts
- [ ] T071 [P] [US4] Integration test for click handler execution in tests/integration/statusBar/statusBar.integration.test.ts

### Implementation for User Story 4

- [X] T072 [US4] Register command copilotPremiumRequests.showDetails in src/statusBar/StatusBarController.ts
- [X] T073 [US4] Implement click handler to show information message with details in src/statusBar/StatusBarController.ts
- [X] T074 [US4] Format detailed message with all usage statistics in src/statusBar/StatusBarController.ts
- [X] T075 [US4] Set command property on status bar item in src/statusBar/StatusBarController.ts
- [X] T076 [US4] Register command in extension.ts activation

**Checkpoint**: Clicking status bar item shows detailed usage information

---

## Phase 10: Integration & Configuration

**Purpose**: Wire up with specs 002 and 003, handle configuration updates

- [X] T077 [P] Create StatusBarConfig default values constant in src/statusBar/types.ts
- [X] T078 Implement StatusBarController.updateConfig() method in src/statusBar/StatusBarController.ts
- [ ] T079 Add event subscription for UsageDataService.onDataChange() in src/statusBar/StatusBarController.ts
- [ ] T080 Add event subscription for ConfigurationService.onConfigChange() in src/statusBar/StatusBarController.ts
- [X] T081 [P] Unit test for config updates (format change, threshold change) in tests/unit/statusBar/StatusBarController.test.ts
- [X] T082 [P] Unit test for StatusBarUpdater.isValidTransition() state transitions in tests/unit/statusBar/StatusBarUpdater.test.ts
- [ ] T083 Test that status bar hides when config.enabled = false in tests/unit/statusBar/StatusBarController.test.ts

**Checkpoint**: Status bar responds to data and config changes from other specs

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T084 [P] Add comprehensive JSDoc comments to all public methods in src/statusBar/
- [X] T085 [P] Ensure all validation functions have edge case tests in tests/unit/statusBar/
- [ ] T086 Add text length validation (max 100 chars) in StatusBarFormatter.validateText() in src/statusBar/StatusBarFormatter.ts
- [X] T087 [P] Test all 6 DisplayState transitions with StatusBarUpdater.isValidTransition() in tests/unit/statusBar/StatusBarUpdater.test.ts
- [ ] T088 [P] Test theme support (light/dark/high-contrast) manually per quickstart.md
- [ ] T089 [P] Verify keyboard accessibility via Tab navigation manually
- [ ] T090 Run test coverage report and ensure ≥80% coverage
- [X] T091 Run ESLint and fix any issues across src/statusBar/
- [X] T092 Create barrel export in src/statusBar/index.ts
- [ ] T093 Verify all 15 functional requirements from spec.md are met
- [ ] T094 Run quickstart.md validation checklist
- [ ] T095 Manual smoke test in VS Code with all display formats

**Checkpoint**: Feature complete, all tests passing, ready for integration with specs 002 and 003

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (Phases 4-7)**: Depends on Foundational (Phase 2) and US1 basics - Can start after T023
- **User Story 3 (Phase 8)**: Depends on US2 formatter implementation (T030-T032, T049-T051) - Can start after T052
- **User Story 4 (Phase 9)**: Depends on US1 controller (T018-T021) - Can start after T023
- **Integration (Phase 10)**: Depends on all user stories being testable
- **Polish (Phase 11)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Needs basic controller from US1 (T018-T023) - Then can proceed independently
- **User Story 3 (P2)**: Needs formatter from US2 (specifically format methods) - Otherwise independent
- **User Story 4 (P3)**: Needs basic controller from US1 - Otherwise independent

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD workflow)
- Controller before formatter integration
- Formatter before updater integration
- Core implementation before edge cases
- Story complete before moving to next priority

### Parallel Opportunities

**Within Phase 1 (Setup)**: All [P] tasks can run in parallel:
- T003 (tsconfig), T004 (linting), T005 (Mocha), T006 (launch.json), T007 (package.json)

**Within Phase 2 (Foundational)**: All [P] tasks can run in parallel:
- T009 (vscode mocks), T010 (UsageData mocks), T013 (test utils)

**Within User Story 1 Tests**: All [P] tasks can run in parallel:
- T014, T015, T016, T017 (all US1 tests)

**Within User Story 2 Tests**: All [P] tasks can run in parallel:
- T024-T029 (formatter and updater tests)
- T039-T041 (warning behavior tests)
- T046-T048 (display format tests)
- T053-T057 (error handling tests)

**Within User Story 2 Implementation**: Some [P] tasks can run in parallel:
- T030-T031 (formatter methods)
- T034-T036 (updater methods)
- T042 (background color), T049-T050 (format methods)

**Within User Story 3**: All [P] tests can run in parallel:
- T062-T065 (budget display tests)

**Within User Story 4**: Tests can run in parallel:
- T070, T071 (click handler tests)

**Within Phase 10 (Integration)**: Some [P] tasks can run in parallel:
- T077 (config defaults), T081-T083 (config/transition tests)

**Within Phase 11 (Polish)**: Many [P] tasks can run in parallel:
- T084 (JSDoc), T085 (edge cases), T087 (state transitions), T088 (theme testing), T089 (accessibility)

---

## Parallel Example: User Story 2 Tests

```bash
# Launch all basic formatter tests together:
Task T024: "Unit test for StatusBarFormatter.formatCompact() basic usage"
Task T025: "Unit test for StatusBarFormatter.calculatePercentage()"
Task T026: "Unit test for StatusBarFormatter.formatTooltip() with included requests"

# Launch all updater tests together:
Task T027: "Unit test for StatusBarUpdater.determineState() with normal usage"
Task T028: "Unit test for StatusBarUpdater.isWarningThresholdExceeded()"
Task T029: "Unit test for StatusBarUpdater.validateUsageData()"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup (T001-T007)
2. Complete Phase 2: Foundational (T008-T013) **CRITICAL - blocks all stories**
3. Complete Phase 3: User Story 1 (T014-T023)
4. Complete Phases 4-7: User Story 2 (T024-T061)
5. **STOP and VALIDATE**: Test US1 and US2 independently
6. Deploy/demo if ready - **THIS IS MVP**

### Incremental Delivery

1. **Foundation**: Complete Setup + Foundational (T001-T013) → Foundation ready
2. **MVP**: Add US1 + US2 (T014-T061) → Test independently → Deploy/Demo
3. **Enhanced**: Add US3 (T062-T069) → Test independently → Deploy/Demo
4. **Complete**: Add US4 (T070-T076) → Test independently → Deploy/Demo
5. **Polish**: Integration + Polish (T077-T095) → Final release

Each phase adds value without breaking previous functionality.

### Parallel Team Strategy

With multiple developers:

1. **Team completes Setup + Foundational together** (T001-T013)
2. **Once Foundational is done:**
   - Developer A: User Story 1 (T014-T023)
   - Developer B: User Story 2 tests (T024-T029, T039-T041, T046-T048, T053-T057)
3. **After tests are written:**
   - Developer A: User Story 2 implementation (T030-T061)
   - Developer B: User Story 3 (T062-T069)
   - Developer C: User Story 4 (T070-T076)
4. **Final integration**: All developers - Integration + Polish (T077-T095)

---

## Task Count Summary

- **Phase 1 (Setup)**: 7 tasks
- **Phase 2 (Foundational)**: 6 tasks
- **Phase 3 (User Story 1)**: 10 tasks
- **Phase 4-7 (User Story 2)**: 38 tasks
- **Phase 8 (User Story 3)**: 8 tasks
- **Phase 9 (User Story 4)**: 7 tasks
- **Phase 10 (Integration)**: 7 tasks
- **Phase 11 (Polish)**: 12 tasks

**Total**: 95 tasks

**MVP Scope** (US1 + US2): 61 tasks (Setup + Foundational + US1 + US2)
**Parallel Opportunities**: 42 tasks marked [P] can run in parallel within their phase

---

## Notes

- All tasks follow constitution's TDD requirement (Principle III)
- [P] tasks have no file conflicts and can run in parallel
- [Story] labels enable traceability to spec.md user stories
- Each user story is independently completable and testable
- Tests written before implementation (red-green-refactor)
- Commit after each logical group of tasks
- Stop at any checkpoint to validate story independently
- VS Code API mocks enable fast unit testing without VS Code running
- Integration tests verify actual VS Code behavior
- Manual testing covers theme support and accessibility
