# Feature Specification: Usage API Integration

**Feature Branch**: `002-usage-api-integration`  
**Created**: 2026-01-12  
**Status**: Draft  
**Input**: Fetch and manage GitHub Copilot premium request usage data from GitHub API

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fetch Current Usage Data (Priority: P1) 🎯 MVP

As a developer, I want the extension to automatically fetch my current Copilot usage from GitHub so that I always see up-to-date information without manual intervention.

**Why this priority**: Without the ability to fetch real data, the extension cannot fulfill its core purpose. This is the foundation for all other features.

**Independent Test**: Can be tested with mocked GitHub API responses to verify data fetching, parsing, and error handling work correctly.

**Acceptance Scenarios**:

1. **Given** I have a valid GitHub Copilot subscription, **When** the extension activates, **Then** it fetches my current usage data from the GitHub API
2. **Given** the API returns valid usage data, **When** the data is received, **Then** it is parsed correctly and stored in the extension's state
3. **Given** the API returns an error (401, 403, 500), **When** the fetch fails, **Then** the extension logs the error and shows an appropriate error state
4. **Given** the API is unreachable (network error), **When** the fetch times out, **Then** the extension gracefully handles the failure and retries later

---

### User Story 2 - Automatic Periodic Refresh (Priority: P1) 🎯 MVP

As a developer, I want the extension to automatically refresh usage data periodically so that I always see current information without manual refresh.

**Why this priority**: Static data becomes stale quickly. Automatic refresh is essential for the extension to be useful throughout a work session.

**Independent Test**: Can be tested by verifying a timer/interval is set up correctly and triggers refresh at the configured interval.

**Acceptance Scenarios**:

1. **Given** the extension is active, **When** the configured refresh interval elapses, **Then** usage data is automatically fetched again
2. **Given** a refresh is in progress, **When** the interval elapses again, **Then** the pending refresh completes before starting a new one (no overlapping requests)
3. **Given** a refresh fails, **When** the next interval elapses, **Then** the extension retries fetching data
4. **Given** the user changes the refresh interval setting, **When** the setting is saved, **Then** the timer is updated to use the new interval

---

### User Story 3 - Authentication Handling (Priority: P1) 🎯 MVP

As a developer, I want the extension to securely authenticate with GitHub using my existing VS Code GitHub authentication so that I don't need to provide credentials separately.

**Why this priority**: Without authentication, we cannot access the GitHub API. Using VS Code's built-in authentication provides the best user experience.

**Independent Test**: Can be tested by mocking VS Code's authentication API and verifying token retrieval and usage.

**Acceptance Scenarios**:

1. **Given** I am not signed into GitHub in VS Code, **When** the extension tries to fetch data, **Then** it prompts me to sign in via VS Code's authentication flow
2. **Given** I am signed into GitHub in VS Code, **When** the extension activates, **Then** it uses my existing authentication token
3. **Given** my GitHub token expires, **When** an API request fails with 401, **Then** the extension requests a new token and retries
4. **Given** I sign out of GitHub in VS Code, **When** the sign-out occurs, **Then** the extension clears cached data and shows an unauthenticated state

---

### User Story 4 - Manual Refresh Command (Priority: P2)

As a developer, I want to manually trigger a refresh of usage data so that I can get updated information immediately when needed.

**Why this priority**: Useful for checking usage after a heavy work session, but automatic refresh is sufficient for MVP.

**Independent Test**: Can be tested by invoking the refresh command and verifying it triggers a data fetch regardless of the timer.

**Acceptance Scenarios**:

1. **Given** the extension is active, **When** I execute the "Refresh Copilot Usage" command, **Then** usage data is fetched immediately
2. **Given** a manual refresh is triggered, **When** the refresh completes, **Then** the status bar updates with the new data
3. **Given** a manual refresh is triggered while an automatic refresh is in progress, **When** the manual refresh is invoked, **Then** the extension waits for the in-flight request to complete before starting manual refresh (no concurrent requests per FR-013)

---

### User Story 5 - Offline/Error State Caching (Priority: P3)

As a developer, I want the extension to remember my last known usage data when offline so that I can still see approximate usage even without internet connectivity.

**Why this priority**: Nice-to-have for resilience, but not critical for MVP since most development requires internet anyway.

**Independent Test**: Can be tested by simulating network failures and verifying cached data is displayed with appropriate staleness indicators.

**Acceptance Scenarios**:

1. **Given** usage data was previously fetched successfully, **When** subsequent fetches fail due to network error, **Then** the last known data is shown with a staleness indicator
2. **Given** cached data is more than 24 hours old, **When** displaying the data, **Then** a clear warning is shown that data may be outdated
3. **Given** the extension is restarted, **When** no network connection is available, **Then** cached data from the previous session is loaded (if available)

---

### Edge Cases

- What happens when GitHub API rate limits are hit?
- How does the system handle when GitHub Copilot API endpoint changes or is deprecated?
- What displays when a user has multiple GitHub accounts signed in?
- How does the extension behave when GitHub API returns unexpected data structure?
- What happens when the user's GitHub Copilot subscription is cancelled mid-session?
- How does the extension handle very slow API responses (>30 seconds)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Extension MUST use VS Code's authentication API to obtain GitHub tokens
- **FR-002**: Extension MUST make authenticated HTTPS requests to GitHub Copilot API endpoints
- **FR-003**: Extension MUST fetch usage data on activation (after authentication)
- **FR-004**: Extension MUST automatically refresh usage data at configurable intervals (default 60 seconds)
- **FR-005**: Extension MUST parse GitHub API responses and extract: included requests used, included requests total, budget requests used
- **FR-006**: Extension MUST handle API errors gracefully (4xx, 5xx responses)
- **FR-007**: Extension MUST handle network errors gracefully (timeouts, unreachable host)
- **FR-008**: Extension MUST respect GitHub API rate limits and back off when limits are hit
- **FR-009**: Extension MUST timeout API requests after 30 seconds
- **FR-010**: Extension MUST validate API response structure before using data
- **FR-011**: Extension MUST log API interactions for debugging (without logging sensitive tokens)
- **FR-012**: Extension MUST cancel in-flight requests when extension is deactivated
- **FR-013**: Extension MUST NOT make concurrent requests (prevent request overlap)
- **FR-014**: Extension MUST provide a command to manually trigger data refresh
- **FR-015**: Extension MUST clear cached authentication state when user signs out
- **FR-016**: Extension MUST use GitHub API endpoint `https://api.github.com/copilot_internal/user` (note: internal endpoint may change)
- **FR-017**: Extension SHOULD cache last successful response for display during transient failures
- **FR-018**: Extension MUST request GitHub authentication scope `user:email` (minimum required scope)
- **FR-019**: Extension MUST handle rate limiting with exponential backoff strategy
- **FR-020**: Extension MUST set User-Agent header to identify the extension (e.g., "VSCode-Copilot-Premium-Status")

### Non-Functional Requirements

- **NFR-001**: API requests MUST complete asynchronously without blocking the editor
- **NFR-002**: Extension memory usage MUST remain under 50MB during normal operation
- **NFR-003**: Extension activation MUST complete within 2 seconds
- **NFR-004**: All test scenarios MUST have failing tests written before implementation begins (TDD)

### Key Entities *(include if feature involves data)*

- **UsageData**: Represents current usage statistics (primary data model)
  - `includedUsed`: number - count of included requests used
  - `includedTotal`: number - total included requests in plan (entitlement)
  - `budgetUsed`: number - count of budget requests used (if applicable)
  - `lastRefreshTime`: Date - when data was last updated (timestamp_utc)
  - `billingPeriodEnd`: Date - when current billing period ends (quota_reset_date_utc)
  - `copilotPlan`: string - user's Copilot plan type (e.g., "Enterprise", "Individual")
  - `chatEnabled`: boolean - whether Copilot chat is enabled

- **GitHubAuthService**: Manages authentication with GitHub
  - `getAuthToken()`: Promise<string> - retrieves valid GitHub auth token
  - `onAuthChange(callback)`: void - subscribes to auth state changes
  - `isAuthenticated()`: boolean - checks if user is authenticated

- **UsageAPIClient**: Handles communication with GitHub Copilot API
  - `fetchUsage(token: string)`: Promise<UsageData> - fetches current usage
  - `validateResponse(data: any)`: boolean - validates API response structure
  - `handleError(error: any)`: void - processes API errors

- **UsageCache**: Manages local caching of usage data
  - `store(data: UsageData)`: void - saves usage data locally
  - `retrieve()`: UsageData | null - retrieves last cached data
  - `isStale()`: boolean - checks if cached data is outdated
  - `clear()`: void - clears cached data

- **RefreshScheduler**: Manages automatic refresh timing
  - `start(intervalSeconds: number)`: void - starts refresh timer
  - `stop()`: void - stops refresh timer
  - `trigger()`: void - manually triggers immediate refresh
  - `updateInterval(intervalSeconds: number)`: void - changes refresh frequency

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Extension successfully fetches usage data within 5 seconds of activation for 95% of users with valid subscriptions
- **SC-002**: Authentication flow completes within 10 seconds from user clicking "Sign In" to successful token retrieval
- **SC-003**: API requests fail gracefully with user-friendly error messages (no crashes or unhandled exceptions)
- **SC-004**: Automatic refresh operates for 8+ hours without memory leaks or performance degradation
- **SC-005**: Extension handles 100% of documented GitHub API error codes (4xx, 5xx) without crashing
- **SC-006**: Cached data is successfully restored after VS Code restart in 100% of test cases
- **SC-007**: Manual refresh command completes within 3 seconds when API is responsive
- **SC-008**: Extension stays within GitHub API rate limits during normal usage (60-second default interval is sufficient)
