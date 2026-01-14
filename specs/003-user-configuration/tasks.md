# Tasks: User Configuration

**Feature**: 003-user-configuration  
**Input**: Design documents from `/specs/003-user-configuration/`  
**Prerequisites**: plan.md (✓), spec.md (✓)

**Scope Notes**:
- ✅ **In Scope**: User Stories 1-4 (Refresh Interval, Display Format, Status Bar Toggle, Warning Threshold)
- ⏸️ **Deferred to Future Spec**: User Story 5 (Color Customization) - requires design work for theme integration
- ⏸️ **Deferred**: FR-014 (enableLogging setting) - will use console.log for MVP, add setting in spec 004
- ⏸️ **Deferred**: FR-015 (Activation events) - current activation sufficient, no changes needed
- ⚠️ **Minimal Implementation**: FR-012 (Logging) - console.log only when invalid config detected, full logging in spec 004

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add configuration schema to package.json and create configuration types

- [ ] T001 Add refreshInterval configuration to package.json contributes.configuration
- [ ] T002 Add showInStatusBar configuration to package.json contributes.configuration
- [ ] T003 Add displayFormat configuration to package.json contributes.configuration
- [ ] T004 Add warningThreshold configuration to package.json contributes.configuration
- [ ] T005 Create src/config/types.ts with configuration interfaces

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core configuration services that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 [P] Create tests/unit/config/ConfigurationValidator.test.ts with failing tests
- [ ] T007 [P] Create tests/unit/config/ConfigurationService.test.ts with failing tests
- [ ] T008 Create src/config/ConfigurationValidator.ts with validation logic
- [ ] T009 Create src/config/ConfigurationService.ts with configuration management
- [ ] T010 Run tests to verify ConfigurationValidator and ConfigurationService work correctly

**Checkpoint**: Configuration foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Refresh Interval Configuration (Priority: P1) 🎯 MVP

**Goal**: Allow users to configure how often the extension refreshes usage data (30-3600 seconds)

**Independent Test**: Change refreshInterval setting, verify timer updates and data refreshes at new interval

### Implementation for User Story 1

- [ ] T011 [P] [US1] Update tests/unit/mocks/vscode.mock.ts to mock onDidChangeConfiguration event
- [ ] T012 [US1] Update src/extension.ts to use ConfigurationService.getRefreshInterval()
- [ ] T013 [US1] Update src/extension.ts to listen for configuration changes and restart refresh timer
- [ ] T014 [US1] Add validation for minimum 30 seconds with warning notification in src/extension.ts
- [ ] T015 [US1] Update tests for extension.ts to verify refresh interval configuration handling
- [ ] T016 [US1] Manual test: Change setting, verify new interval applies within 1 second

**Checkpoint**: User Story 1 complete - users can configure refresh intervals

---

## Phase 4: User Story 2 - Display Format Configuration (Priority: P2)

**Goal**: Allow users to choose between compact, detailed, or percentage display formats

**Independent Test**: Change displayFormat setting, verify status bar text updates to match selected format

**Format Specifications**:
- **compact**: "Copilot: 50/100 (50%)" or "Copilot: 50/100+5 (50%)" if budget used
- **detailed**: "Copilot: 50/100 included (50%), 5 budget" if budget used, otherwise same as compact
- **percentage**: "Copilot: 50%"

### Implementation for User Story 2

- [ ] T017 [P] [US2] Add DisplayFormat enum to src/config/types.ts
- [ ] T018 [P] [US2] Update tests/unit/statusBar/StatusBarFormatter.test.ts with format variation tests
- [ ] T019 [US2] Update src/statusBar/StatusBarFormatter.ts to support all three display formats
- [ ] T020 [US2] Update src/statusBar/StatusBarController.ts to use ConfigurationService.getDisplayFormat()
- [ ] T021 [US2] Update src/statusBar/StatusBarController.ts to listen for format config changes
- [ ] T022 [US2] Run tests to verify display format variations work correctly
- [ ] T023 [US2] Manual test: Toggle between formats, verify status bar updates

**Checkpoint**: User Story 2 complete - users can customize display format

---

## Phase 5: User Story 3 - Enable/Disable Status Bar Display (Priority: P2)

**Goal**: Allow users to hide/show the status bar item

**Independent Test**: Toggle showInStatusBar setting, verify status bar appears/disappears

### Implementation for User Story 3

- [ ] T024 [P] [US3] Update tests/unit/statusBar/StatusBarController.test.ts with visibility toggle tests
- [ ] T025 [US3] Update src/statusBar/StatusBarController.ts to use ConfigurationService.isStatusBarEnabled()
- [ ] T026 [US3] Update src/statusBar/StatusBarController.ts to show/hide on configuration change
- [ ] T027 [US3] Update src/extension.ts to continue background refreshes even when hidden
- [ ] T028 [US3] Run tests to verify show/hide behavior
- [ ] T029 [US3] Manual test: Disable setting, verify item hidden but data still refreshes

**Checkpoint**: User Story 3 complete - users can toggle status bar visibility

---

## Phase 6: User Story 4 - Warning Threshold Configuration (Priority: P3)

**Goal**: Allow users to configure when status bar shows warning colors (0-100%)

**Independent Test**: Set threshold to 80%, verify warning color appears at 80% usage

### Implementation for User Story 4

- [ ] T030 [P] [US4] Update tests/unit/statusBar/StatusBarUpdater.test.ts with threshold variation tests
- [ ] T031 [US4] Update src/statusBar/StatusBarUpdater.ts to use ConfigurationService.getWarningThreshold()
- [ ] T032 [US4] Update src/statusBar/StatusBarController.ts to listen for threshold config changes
- [ ] T033 [US4] Update src/statusBar/StatusBarController.ts to re-apply display state on threshold change
- [ ] T034 [US4] Run tests to verify custom thresholds work correctly
- [ ] T035 [US4] Manual test: Set threshold to 50%, verify warning at 50% usage

**Checkpoint**: User Story 4 complete - users can customize warning threshold

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and integration testing

- [ ] T036 [P] Create quickstart.md user guide for extension settings
- [ ] T037 [P] Update README.md with configuration section
- [ ] T038 Integration test: Change multiple settings simultaneously, verify all apply correctly
- [ ] T039 Integration test: Test workspace vs user settings precedence
- [ ] T040 Integration test: Test invalid values replaced with defaults (negative, non-numeric, out-of-range)
- [ ] T041 Add console.log statements for invalid configuration values (FR-012 minimal logging)
- [ ] T042 Run full test suite and verify all 81+ tests pass

**Edge Case Handling Notes**:
- **Corrupted config file**: Handled by VS Code - extension will receive defaults
- **Removed setting in future**: VS Code handles gracefully - getConfiguration returns undefined, we use default
- **Settings change during runtime**: Handled by onDidChangeConfiguration event listeners (T013, T021, T026, T032)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational (Phase 2) completion
  - User stories can proceed in parallel OR sequentially in priority order
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational - Independent from US1
- **User Story 3 (P2)**: Can start after Foundational - Independent from US1/US2
- **User Story 4 (P3)**: Can start after Foundational - Independent from US1/US2/US3

### Within Each User Story

- Tests marked [P] can run in parallel
- Implementation tasks follow test-first approach
- Manual tests validate each story independently
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**: All tasks can run in parallel (T001-T005 all edit package.json or create new files)

**Phase 2 (Foundational)**:
- T006 and T007 can run in parallel (different test files)
- T008 and T009 depend on tests but can run in parallel with each other (different source files)

**Phases 3-6 (User Stories)**: Once Foundational is complete, ALL user stories can be worked on in parallel by different developers:
- Developer A: User Story 1 (T011-T016)
- Developer B: User Story 2 (T017-T023)
- Developer C: User Story 3 (T024-T029)
- Developer D: User Story 4 (T030-T035)

**Phase 7 (Polish)**: T036 and T037 can run in parallel (different documentation files)

---

## Parallel Example: Foundational Phase

```bash
# Launch test creation in parallel:
Task: "Create tests/unit/config/ConfigurationValidator.test.ts with failing tests"
Task: "Create tests/unit/config/ConfigurationService.test.ts with failing tests"

# Then launch implementation in parallel:
Task: "Create src/config/ConfigurationValidator.ts with validation logic"
Task: "Create src/config/ConfigurationService.ts with configuration management"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T010) - CRITICAL
3. Complete Phase 3: User Story 1 (T011-T016)
4. **STOP and VALIDATE**: Test refresh interval configuration independently
5. Deploy/demo if ready - users can now customize refresh interval!

### Incremental Delivery

1. Setup + Foundational → Configuration framework ready
2. Add User Story 1 → Test → Deploy (MVP: refresh interval)
3. Add User Story 2 → Test → Deploy (display format customization)
4. Add User Story 3 → Test → Deploy (visibility toggle)
5. Add User Story 4 → Test → Deploy (warning threshold)
6. Polish → Complete feature

### Parallel Team Strategy

With 4 developers:

1. **All**: Complete Setup + Foundational together (T001-T010)
2. **Once Foundational is done**:
   - Developer A: User Story 1 (T011-T016) - Refresh interval
   - Developer B: User Story 2 (T017-T023) - Display format
   - Developer C: User Story 3 (T024-T029) - Visibility toggle
   - Developer D: User Story 4 (T030-T035) - Warning threshold
3. **All**: Polish together (T036-T041)

Each developer can work independently after foundational phase!

---

## Task Count Summary

- **Total Tasks**: 42
- **Setup Phase**: 5 tasks
- **Foundational Phase**: 5 tasks (CRITICAL PATH)
- **User Story 1** (P1 - MVP): 6 tasks
- **User Story 2** (P2): 7 tasks
- **User Story 3** (P2): 6 tasks
- **User Story 4** (P3): 6 tasks
- **Polish Phase**: 7 tasks
- **Deferred to Future**: User Story 5, FR-014, FR-015 (not included in task count)

**Parallel Opportunities**:
- Phase 1: 5 tasks can run in parallel
- Phase 2: 2 test files in parallel, then 2 implementation files in parallel
- Phases 3-6: All 4 user stories (25 tasks total) can run in parallel once foundational is complete
- Phase 7: 2 documentation tasks in parallel

---

## Notes

- Configuration validation handled in Foundational phase (Phase 2)
- Each user story independently testable via configuration changes
- No restart required - all changes apply via onDidChangeConfiguration event
- Tests maintain TDD approach from specs 001-002 (write failing tests first)
- Budget requests configuration (already implemented) integrates with new ConfigurationService
- All tasks include exact file paths for clarity
- Manual testing scenarios included for each user story validation
