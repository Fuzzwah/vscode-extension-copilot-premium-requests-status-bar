# Feature Specification: User Configuration

**Feature Branch**: `003-user-configuration`  
**Created**: 2026-01-12  
**Status**: Draft  
**Input**: Provide configurable settings for users to customize extension behavior and display

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Refresh Interval Configuration (Priority: P1) 🎯 MVP

As a developer, I want to configure how often the extension refreshes usage data so that I can balance between up-to-date information and API rate limits.

**Why this priority**: Different users have different needs - some want real-time updates, others prefer less frequent checks to minimize API calls. This is essential for user control.

**Independent Test**: Can be tested by changing the setting and verifying the refresh timer updates accordingly.

**Acceptance Scenarios**:

1. **Given** I open VS Code settings, **When** I search for "Copilot Premium Requests", **Then** I see a setting for refresh interval
2. **Given** I change the refresh interval to 120 seconds, **When** I save the setting, **Then** the extension updates its refresh timer to 120 seconds
3. **Given** I set the refresh interval below the minimum (30 seconds), **When** I save the setting, **Then** the extension uses the minimum value and shows a warning
4. **Given** I set the refresh interval to a very high value (e.g., 3600 seconds), **When** I save the setting, **Then** the extension accepts the value and refreshes hourly

---

### User Story 2 - Display Format Configuration (Priority: P2)

As a developer, I want to choose how usage information is displayed in the status bar so that I can customize it to my preference for verbosity or compactness.

**Why this priority**: Important for user preference and accommodating different screen sizes, but a sensible default is sufficient for MVP.

**Independent Test**: Can be tested by changing the display format setting and verifying the status bar text updates correctly.

**Acceptance Scenarios**:

1. **Given** I open the display format setting, **When** I view the options, **Then** I see choices like "compact", "detailed", "percentage"
2. **Given** I select "compact" format, **When** the setting is saved, **Then** the status bar shows "Copilot: 50/100 (50%)" (or "50/100+5" if budget used)
3. **Given** I select "detailed" format, **When** the setting is saved, **Then** the status bar shows "Copilot: 50/100 included (50%), 5 budget" when budget is used, otherwise same as compact
4. **Given** I select "percentage" format, **When** the setting is saved, **Then** the status bar shows "Copilot: 50%"

---

### User Story 3 - Enable/Disable Status Bar Display (Priority: P2)

As a developer, I want to hide the status bar item when I don't need it so that I can keep my status bar clean.

**Why this priority**: User choice is important, but most users who install this extension will want it visible. Toggle is nice-to-have.

**Independent Test**: Can be tested by toggling the setting and verifying the status bar item appears or disappears.

**Acceptance Scenarios**:

1. **Given** I open the extension settings, **When** I find "Show in Status Bar", **Then** I see a checkbox/toggle to enable or disable display
2. **Given** I disable "Show in Status Bar", **When** the setting is saved, **Then** the status bar item is removed
3. **Given** the status bar is hidden, **When** I re-enable "Show in Status Bar", **Then** the status bar item reappears with current usage data
4. **Given** the status bar is hidden, **When** usage data refreshes, **Then** data still updates in the background (ready for when status bar is re-enabled)

---

### User Story 4 - Warning Threshold Configuration (Priority: P3)

As a developer, I want to configure when the status bar shows warning colors so that I can set my own threshold for when I consider usage to be high.

**Why this priority**: Nice customization option but a sensible default (90%) works for most users.

**Independent Test**: Can be tested by setting different thresholds and verifying color changes at the specified percentages.

**Acceptance Scenarios**:

1. **Given** I configure warning threshold to 80%, **When** my usage reaches 80/100, **Then** the status bar item changes to warning color
2. **Given** I configure warning threshold to 100%, **When** my usage is at any level below 100, **Then** the status bar item uses normal colors
3. **Given** I set warning threshold to 50%, **When** my usage exceeds 50%, **Then** the status bar shows warning color

---

### User Story 5 - Color Customization (Priority: P3) ⏸️ DEFERRED

As a developer, I want to customize the colors used for different states (normal, warning, error) so that the extension fits my VS Code theme.

**Why this priority**: Advanced customization that most users won't need. Theme compatibility should be handled by default.

**⏸️ DEFERRED TO SPEC 004**: Requires additional design work for theme integration patterns. Current implementation uses VS Code's built-in ThemeColor which already adapts to themes.

**Independent Test**: Can be tested by setting custom colors and verifying they are applied to the status bar item.

**Acceptance Scenarios**:

1. **Given** I set a custom warning color, **When** usage exceeds the threshold, **Then** the status bar uses my custom color
2. **Given** I set a custom error color, **When** an API error occurs, **Then** the status bar uses my custom error color
3. **Given** I reset color settings to default, **When** the reset is applied, **Then** the extension uses theme-appropriate default colors

---

### Edge Cases

- What happens when a user sets an invalid refresh interval (negative number, non-numeric)?
- How does the system validate configuration values before applying them?
- What happens when configuration file is corrupted?
- How does the extension handle when a setting is removed in a future version?
- What happens when user has both workspace and user settings with different values?
- How does the extension behave when settings change while VS Code is running?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Extension MUST contribute all settings via `contributes.configuration` in package.json
- **FR-002**: Extension MUST provide `copilotPremiumRequests.refreshInterval` setting (type: number, default: 60, minimum: 30)
- **FR-003**: Extension MUST provide `copilotPremiumRequests.showInStatusBar` setting (type: boolean, default: true)
- **FR-004**: Extension MUST provide `copilotPremiumRequests.displayFormat` setting (type: enum, options: "compact", "detailed", "percentage", default: "compact")
- **FR-005**: Extension MUST provide `copilotPremiumRequests.warningThreshold` setting (type: number, default: 90, minimum: 0, maximum: 100)
- **FR-006**: Extension MUST listen for configuration changes and update behavior in real-time (no restart required)
- **FR-007**: Extension MUST validate configuration values and use defaults for invalid values
- **FR-008**: Extension MUST show informative descriptions for each setting in VS Code settings UI
- **FR-009**: Extension MUST handle both workspace and user-level settings with proper precedence
- **FR-010**: Extension MUST apply configuration changes within 1 second of user saving settings
- **FR-011**: Settings MUST be organized under "Copilot Premium Requests" category in VS Code settings
- **FR-012**: Extension MUST log invalid configuration values to console for debugging purposes (full logging feature deferred to spec 004)
- **FR-013**: Invalid configuration values MUST show user-friendly error messages
- **FR-014**: ⏸️ DEFERRED - Extension SHOULD provide `copilotPremiumRequests.enableLogging` setting for debugging (deferred to spec 004)
- **FR-015**: ⏸️ NOT NEEDED - Current activation events are sufficient, no changes required
- **FR-016**: Refresh interval values below minimum (30 seconds) MUST be clamped to minimum with warning notification
- **FR-017**: Refresh interval negative or non-numeric values MUST be replaced with default (60 seconds) with error notification

### Non-Functional Requirements

- **NFR-001**: Configuration changes MUST be applied asynchronously without blocking the editor
- **NFR-002**: Extension memory usage MUST remain under 50MB during normal operation
- **NFR-003**: Extension activation MUST complete within 2 seconds
- **NFR-004**: All test scenarios MUST have failing tests written before implementation begins (TDD)

### Key Entities *(include if feature involves data)*

- **ConfigurationService**: Manages extension configuration
  - `getRefreshInterval()`: number - retrieves current refresh interval
  - `getDisplayFormat()`: DisplayFormat - retrieves current display format
  - `isStatusBarEnabled()`: boolean - checks if status bar should be shown
  - `getWarningThreshold()`: number - retrieves warning threshold percentage
  - `onConfigurationChange(callback)`: void - subscribes to config changes

- **ConfigurationValidator**: Validates configuration values
  - `validateRefreshInterval(value: number)`: number - validates and clamps refresh interval
  - `validateWarningThreshold(value: number)`: number - validates and clamps threshold
  - `validateDisplayFormat(value: string)`: DisplayFormat - validates format option

- **DisplayFormat**: Enumeration of display format options
  - `COMPACT`: "compact" - minimal display ("50/100" or "50/100+5" if budget)
  - `DETAILED`: "detailed" - full information ("50/100 included (50%), 5 budget")
  - `PERCENTAGE`: "percentage" - percentage only ("50%")

**Implementation Notes**:
- Edge cases (corrupted config, removed settings) handled by VS Code platform
- Logging uses console.log for MVP (full enableLogging setting deferred to spec 004)
- Color customization (US5) deferred to spec 004
- Current activation events sufficient, no changes needed

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All settings are discoverable in VS Code settings UI within 5 seconds of searching "copilot"
- **SC-002**: Configuration changes take effect within 1 second of being saved
- **SC-003**: 100% of invalid configuration values are caught and replaced with valid defaults
- **SC-004**: Setting descriptions are clear enough that 95% of users understand them without external documentation
- **SC-005**: Extension handles 100% of test cases for workspace vs user settings precedence correctly
- **SC-006**: Users can customize refresh interval from 30 seconds to 3600 seconds (1 hour) without errors
- **SC-007**: All configuration changes are applied without requiring VS Code restart
- **SC-008**: Configuration validation provides helpful error messages for 100% of invalid input cases
