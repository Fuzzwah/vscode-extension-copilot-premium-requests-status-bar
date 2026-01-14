<!--
Sync Impact Report - Constitution v1.0.0
========================================
Version Change: INITIAL → 1.0.0
Modified Principles: All (initial creation)
Added Sections: All
Removed Sections: None

Templates Status:
✅ plan-template.md - Reviewed, compatible (constitution check gate present)
✅ spec-template.md - Reviewed, compatible (user stories and requirements align)
✅ tasks-template.md - Reviewed, compatible (testing discipline reflected)

Follow-up Actions: None (initial baseline)
-->

# Copilot Premium Requests Status Bar Constitution

## Core Principles

### I. Extension-First Architecture

Every feature MUST be implemented as a VS Code extension capability using the VS Code Extension API. Code MUST be:

- Self-contained within the extension context
- Independently testable without VS Code running (where possible via mocking)
- Well-documented with inline comments and API documentation
- Aligned with VS Code extension best practices and guidelines

**Rationale**: Ensures maintainability, testability, and compliance with VS Code marketplace requirements.

### II. User Privacy & Data Security

User data MUST be handled with utmost care:

- NO collection or transmission of personal usage data without explicit user consent
- All GitHub Copilot API interactions MUST use secure, authenticated channels
- Configuration data stored locally MUST use VS Code's secure storage APIs
- Extension MUST gracefully handle authentication failures and API errors

**Rationale**: Protects user privacy, builds trust, and ensures compliance with GitHub's API terms of service.

### III. Test-First Development (NON-NEGOTIABLE)

Test-driven development is MANDATORY for all features:

- Tests MUST be written before implementation
- Tests MUST fail initially (Red phase)
- Implementation makes tests pass (Green phase)
- Code MUST be refactored for clarity (Refactor phase)
- Each user story MUST have independent acceptance tests

**Rationale**: Ensures code quality, prevents regressions, and validates that each feature delivers the promised value.

### IV. Performance & Responsiveness

The extension MUST NOT degrade VS Code performance:

- Status bar updates MUST be asynchronous and non-blocking
- API polling intervals MUST be configurable (default: 60 seconds, minimum: 30 seconds)
- Memory usage MUST remain under 50MB during normal operation
- Extension activation MUST complete within 2 seconds
- UI updates MUST not block the editor

**Rationale**: Poor extension performance frustrates users and violates VS Code marketplace quality standards.

### V. Semantic Versioning & Breaking Changes

Version numbering MUST follow semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Breaking changes to configuration schema or removed features
- **MINOR**: New features, backward-compatible API additions
- **PATCH**: Bug fixes, performance improvements, documentation updates
- Breaking changes MUST be documented in CHANGELOG with migration guide
- Deprecations MUST include warnings for at least one MINOR version before removal

**Rationale**: Users depend on predictable upgrade paths and clear communication of changes.

### VI. Simplicity & YAGNI

Start simple and add complexity only when needed:

- Implement ONLY the features specified in the current user story
- Avoid speculative features or "nice-to-have" additions
- Prefer simple, readable code over clever optimizations
- When in doubt, choose the simpler implementation
- Justify any added complexity in documentation

**Rationale**: Prevents scope creep, reduces maintenance burden, and keeps the codebase approachable.

## Technical Standards

### Technology Stack

- **Language**: TypeScript 5.x or later
- **Build System**: VS Code Extension development tools (vsce)
- **Testing Framework**: Mocha with @vscode/test-electron for integration tests
- **Linting**: ESLint with TypeScript-specific rules
- **Formatting**: Prettier with project-standard configuration
- **VS Code API**: Minimum version 1.85.0

### Code Quality Requirements

- All TypeScript code MUST have strict mode enabled
- All public APIs MUST have TSDoc documentation
- Code coverage MUST be maintained at or above 80% for core logic
- ESLint violations MUST be resolved before merge (no warnings allowed)
- All commits MUST pass automated tests in CI/CD pipeline

### VS Code Extension Requirements

- Extension MUST declare all required activation events
- Extension MUST contribute settings via `package.json` contribution points
- Extension MUST handle activation errors gracefully
- Extension MUST properly dispose of resources on deactivation
- Extension MUST respect VS Code theming (light/dark/high-contrast)

## Development Workflow

### Specification-Driven Development

All features MUST follow this workflow:

1. Create feature specification in `.specify/specs/[###-feature-name]/spec.md`
2. Generate implementation plan using SpecKit workflow
3. Write tests based on acceptance criteria
4. Implement feature incrementally per user stories (P1 → P2 → P3)
5. Validate each user story independently before proceeding
6. Update documentation and CHANGELOG

### Code Review Standards

All code changes MUST be reviewed and:

- Comply with all Core Principles defined in this constitution
- Include appropriate tests (unit and/or integration)
- Update relevant documentation
- Pass all automated checks (linting, tests, type checking)
- Be approved by at least one other contributor (for team projects)

### Testing Gates

Before merging code, the following MUST pass:

- All unit tests (npm test)
- All integration tests (VS Code extension host tests)
- TypeScript compilation with no errors
- ESLint with no errors or warnings
- Manual smoke test of changed functionality

## Governance

This constitution represents the foundational principles for the Copilot Premium Requests Status Bar extension. All development practices, code reviews, and feature decisions MUST align with these principles.

### Amendment Process

1. Proposed amendments MUST be documented with clear rationale
2. Changes MUST be reviewed against existing codebase impact
3. Breaking principle changes require MAJOR version bump of constitution
4. New principles or expanded guidance require MINOR version bump
5. Clarifications and typo fixes require PATCH version bump
6. All amendments MUST update the Sync Impact Report at the top of this file

### Compliance & Enforcement

- All specifications MUST include a "Constitution Check" section referencing relevant principles
- All pull requests MUST verify compliance with applicable principles
- Deviations from principles MUST be documented and justified in the "Complexity Tracking" section of the plan
- Regular reviews (quarterly recommended) to ensure constitution remains relevant

### Related Documentation

For detailed development guidance and SpecKit command usage, refer to the templates in `.specify/templates/` and command documentation in `.specify/templates/commands/`.

**Version**: 1.0.0 | **Ratified**: 2026-01-12 | **Last Amended**: 2026-01-12
