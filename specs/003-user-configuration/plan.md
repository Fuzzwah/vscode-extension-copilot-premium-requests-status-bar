# Implementation Plan: User Configuration

**Branch**: `003-user-configuration` | **Date**: 2026-01-12 | **Spec**: [spec.md](./spec.md)

## Summary

Provide comprehensive user configuration settings for the Copilot Premium Requests extension, allowing users to customize refresh intervals, display formats, status bar visibility, warning thresholds, and budget overrides. This builds upon the existing `budgetRequests` setting just implemented and expands configuration to cover all user-facing behaviors.

## Technical Context

**Language/Version**: TypeScript 5.3.3 (strict mode, ES2020 target)  
**Primary Dependencies**: VS Code Extension API 1.85.0+, vscode.workspace.getConfiguration  
**Storage**: VS Code settings (user/workspace scope via workspace.getConfiguration)  
**Testing**: Mocha 10.2.0, Chai v4, Sinon 17.0.1 (continue TDD approach from specs 001-002)  
**Target Platform**: VS Code 1.85.0+ (cross-platform: Windows, macOS, Linux)  
**Project Type**: Single project (VS Code extension)  
**Performance Goals**: Configuration changes applied within 1 second, no blocking operations  
**Constraints**: Memory usage <50MB, activation time <2 seconds, no restart required for config changes  
**Scale/Scope**: 5 new configuration settings + validation + real-time updates

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Based on `.specify/memory/constitution.md`:**

✅ **Single Responsibility**: ConfigurationService handles only configuration management, validation is separate  
✅ **Avoid Premature Abstraction**: Use VS Code's built-in configuration API directly, no custom config layer  
✅ **Test Before Implementation**: Write failing tests for each configuration setting before implementing  
✅ **Incremental Delivery**: Each setting can be implemented and tested independently  
✅ **Minimal Dependencies**: Zero new external dependencies, use only VS Code API  
✅ **Clear Interfaces**: Configuration changes trigger events via VS Code's onDidChangeConfiguration  

**No violations detected** - all requirements align with constitution principles.

## Project Structure

### Documentation (this feature)

```text
specs/003-user-configuration/
├── plan.md              # This file
├── research.md          # Phase 0: Research VS Code configuration patterns
├── data-model.md        # Phase 1: Configuration schema and validation rules
├── quickstart.md        # Phase 1: Usage guide for extension settings
└── contracts/           # Phase 1: Configuration TypeScript interfaces
    └── configuration.types.ts
```

### Source Code (repository root)

```text
src/
├── config/
│   ├── ConfigurationService.ts      # NEW: Manages extension configuration
│   ├── ConfigurationValidator.ts    # NEW: Validates configuration values
│   └── types.ts                     # NEW: Configuration-related types
├── statusBar/
│   ├── StatusBarController.ts       # MODIFIED: React to config changes
│   ├── StatusBarFormatter.ts        # MODIFIED: Use displayFormat config
│   ├── StatusBarUpdater.ts          # MODIFIED: Use warningThreshold config
│   └── types.ts                     # MODIFIED: Update StatusBarConfig type
├── api/
│   └── UsageApiClient.ts            # MODIFIED: Use budgetRequests config (already done)
└── extension.ts                     # MODIFIED: Use refreshInterval, showInStatusBar configs

tests/unit/
├── config/
│   ├── ConfigurationService.test.ts      # NEW: Test configuration management
│   └── ConfigurationValidator.test.ts    # NEW: Test validation logic
└── statusBar/
    ├── StatusBarController.test.ts       # MODIFIED: Test config change handling
    ├── StatusBarFormatter.test.ts        # MODIFIED: Test format variations
    └── StatusBarUpdater.test.ts          # MODIFIED: Test threshold variations
```

**Structure Decision**: Single project structure with new `config/` directory for configuration services. This maintains consistency with existing architecture from specs 001-002 while providing clear separation for configuration concerns.

## Complexity Tracking

No constitution violations - table not needed.

---

## Phase 0: Outline & Research

### Research Tasks

1. **VS Code Configuration API Patterns**
   - How to define configuration schema in package.json `contributes.configuration`
   - Best practices for configuration scopes (user vs workspace)
   - How to listen for configuration changes with `vscode.workspace.onDidChangeConfiguration`
   - Patterns for validating configuration values
   - How to provide helpful error messages for invalid configurations

2. **Configuration Validation**
   - TypeScript patterns for runtime validation (no external libraries)
   - How to clamp numeric values to min/max ranges
   - How to provide user feedback for invalid values (notifications vs console)
   - VS Code best practices for configuration defaults

3. **Real-time Configuration Updates**
   - How to update extension behavior without restart
   - Managing timer intervals that change based on config (clearInterval/setInterval)
   - Updating status bar display when format changes
   - Thread safety for configuration changes during API calls

4. **Existing Implementation Review**
   - Review current `budgetRequests` implementation in UsageApiClient
   - Review current StatusBarConfig interface and its usage
   - Identify which parts of extension already support configuration
   - Identify gaps in current configuration support

**Output**: `research.md` with consolidated findings and recommendations

---

## Phase 1: Design & Contracts

### Deliverables

1. **`data-model.md`**: Define configuration entities
   - `ExtensionConfiguration` interface (all settings together)
   - `RefreshIntervalConfig` type (number with validation rules)
   - `DisplayFormatConfig` enum (compact/detailed/percentage)
   - `ValidationResult` interface (success/error with messages)
   - Configuration defaults and constraints

2. **`contracts/configuration.types.ts`**: TypeScript interfaces for configuration
   - Export all configuration types
   - Document min/max/default values in JSDoc
   - Include validation constraints

3. **`quickstart.md`**: User guide for configuration
   - How to find extension settings in VS Code
   - Description of each setting and its effect
   - Examples of common configuration scenarios
   - Troubleshooting invalid configurations

4. **Update `package.json`**: Add all configuration contributions
   - `copilotPremiumRequests.refreshInterval`: number (30-3600, default 60)
   - `copilotPremiumRequests.showInStatusBar`: boolean (default true)
   - `copilotPremiumRequests.displayFormat`: enum (default "compact")
   - `copilotPremiumRequests.warningThreshold`: number (0-100, default 90)
   - `copilotPremiumRequests.budgetRequests`: number (0+, default 0) - already exists
   - Helpful descriptions for each setting

**Output**: Complete configuration schema, type definitions, and user documentation

---

## Phase 2: Implementation Planning

*Note: Phase 2 is handled by `/speckit.tasks` command - NOT created by this plan*

### High-Level Implementation Order (for reference)

1. **Package.json updates** - Add all configuration schema
2. **Configuration types** - Create src/config/types.ts
3. **ConfigurationValidator** - Implement validation logic with tests
4. **ConfigurationService** - Implement configuration management with tests
5. **Update StatusBarController** - React to config changes, update tests
6. **Update StatusBarFormatter** - Support displayFormat variations, update tests
7. **Update StatusBarUpdater** - Use warningThreshold, update tests
8. **Update extension.ts** - Use refreshInterval and showInStatusBar, update tests
9. **Integration testing** - Test complete config change workflows
10. **Documentation** - Update README with configuration guide

---

## Success Metrics

- ✅ All 5 settings discoverable in VS Code settings within 5 seconds of search
- ✅ Configuration changes applied within 1 second (no restart)
- ✅ 100% of invalid values caught with helpful error messages
- ✅ All tests pass (maintain 100% test pass rate from specs 001-002)
- ✅ Zero new external dependencies
- ✅ Memory usage remains <50MB
- ✅ Activation time remains <2 seconds

---

## Notes

- **Already implemented**: `budgetRequests` setting in package.json and UsageApiClient
- **Build on existing**: StatusBarConfig interface in types.ts already has some configuration fields
- **Real-time updates**: VS Code's `onDidChangeConfiguration` event makes this straightforward
- **Validation strategy**: Fail-safe approach - invalid values replaced with defaults + user notification
- **Testing priority**: Focus on edge cases (negative numbers, out-of-range values, non-numeric input)
