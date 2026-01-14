# Reference Implementation Notes

**Source**: [vscode-copilot-insights](https://github.com/kasuken/vscode-copilot-insights) by @kasuken  
**Date**: 2026-01-12  
**Purpose**: Research notes for understanding GitHub Copilot API

## Key Findings

### GitHub API Endpoint

```
https://api.github.com/copilot_internal/user
```

**⚠️ Important**: This is an **internal** GitHub API endpoint and may change without notice.

### Authentication

- Uses VS Code's built-in GitHub authentication provider
- Minimum required scope: `user:email`
- Auth flow:
  ```typescript
  const session = await vscode.authentication.getSession(
    "github",
    ["user:email"],
    { createIfNone: true }
  );
  ```

### API Response Structure

The API returns a JSON object with the following structure:

```typescript
interface CopilotUserData {
  copilot_plan: string;              // e.g., "Enterprise", "Individual"
  chat_enabled: boolean;
  access_type_sku: string;
  assigned_date: string;
  organization_list: Organization[];
  quota_snapshots: {
    [key: string]: QuotaSnapshot;    // Object, not array!
  };
  quota_reset_date_utc: string;
  quota_reset_date: string;
  tracking_id?: string;
}

interface QuotaSnapshot {
  quota_id: string;                  // e.g., "premium_interactions", "chat", "completions"
  timestamp_utc: string;
  entitlement: number;               // Total quota (e.g., 300 for included)
  quota_remaining: number;
  remaining: number;                 // Use this for calculations
  percent_remaining: number;
  unlimited: boolean;                // Some quotas are unlimited
  overage_permitted: boolean;        // Budget requests allowed
  overage_count: number;            // Budget requests used
}

interface Organization {
  login: string;
  name: string;
}
```

### Key Insights for Our Implementation

1. **Premium Interactions Quota**
   - Quota ID: `"premium_interactions"`
   - Default included: 300 requests/month (for most plans)
   - Budget usage tracked via `overage_count` field
   - Check `overage_permitted` to know if budget is available

2. **Data Structure**
   - `quota_snapshots` is an **object** (not array), needs `Object.values()` conversion
   - Use `remaining` field for accurate calculations
   - `entitlement` = total quota for the period
   - `used = entitlement - remaining`

3. **Display Calculations**
   ```typescript
   const percentRemaining = Math.round((remaining / entitlement) * 100);
   const percentUsed = Math.round(((entitlement - remaining) / entitlement) * 100);
   ```

4. **Status Indicators** (from reference)
   - 🟢 Healthy: >50% remaining
   - 🟡 Watch: 20-50% remaining
   - 🔴 Risk: <20% remaining
   - Mood indicators: 😌 (>75%), 🙂 (>40%), 😬 (>15%), 😱 (<15%)

5. **Request Headers Required**
   ```typescript
   {
     Authorization: `Bearer ${session.accessToken}`,
     Accept: "application/json",
     "User-Agent": "VSCode-Copilot-Premium-Status" // Identify our extension
   }
   ```

## Differences from Reference Implementation

Our extension focuses on:
- ✅ **Status bar only** (not full sidebar panel)
- ✅ **Percentage of included 300** + budget usage
- ✅ **Compact display** optimized for status bar
- ✅ **Less aggressive warnings** (reference warns at 85%, we'll be configurable)

Reference implementation has:
- ❌ Full sidebar panel with detailed quota cards
- ❌ Pacing guidance (daily/weekly/hourly averages)
- ❌ Organization list display
- ❌ Model cost multipliers (0.33x, 1x, 3x)
- ❌ Markdown export functionality
- ❌ Progress bars with mood indicators

We're intentionally simpler for MVP!

## Technical Implementation Notes

### Activation Event

Reference uses webview registration, we should use:
```json
"activationEvents": ["onStartupFinished"]
```

### Status Bar Creation

```typescript
this._statusBarItem = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Right,
  100  // Priority
);
this._statusBarItem.command = "copilotPremiumRequests.showDetails"; // Click handler
this._statusBarItem.show();
```

### Refresh Strategy

Reference implementation:
- Auto-refreshes when sidebar becomes visible
- No periodic polling (user must open sidebar)

Our approach:
- Periodic automatic refresh (configurable interval, default 60s)
- Manual refresh command available
- Auto-refresh on activation

### Error Handling

Common errors to handle:
- 401 Unauthorized: Token expired or invalid
- 403 Forbidden: No Copilot access or endpoint not available
- 404 Not Found: Endpoint may have changed (it's internal!)
- Network errors: Timeout, unreachable

### Performance Considerations

Reference implementation loads data only when sidebar is visible. We need to be more careful since we run on a timer:
- Cache responses
- Don't poll if extension is deactivated
- Cancel in-flight requests on deactivation
- Respect rate limits (60s default should be safe)

## API Response Example (Simplified)

```json
{
  "copilot_plan": "enterprise",
  "chat_enabled": true,
  "access_type_sku": "business",
  "assigned_date": "2025-01-01T00:00:00Z",
  "organization_list": [
    {
      "login": "my-company",
      "name": "My Company Inc"
    }
  ],
  "quota_snapshots": {
    "premium_interactions": {
      "quota_id": "premium_interactions",
      "timestamp_utc": "2026-01-12T10:30:00Z",
      "entitlement": 300,
      "remaining": 250,
      "percent_remaining": 83,
      "unlimited": false,
      "overage_permitted": true,
      "overage_count": 5
    },
    "chat": {
      "quota_id": "chat",
      "unlimited": true
    },
    "completions": {
      "quota_id": "completions",
      "unlimited": true
    }
  },
  "quota_reset_date_utc": "2026-02-01T00:00:00Z",
  "quota_reset_date": "2026-02-01T00:00:00Z"
}
```

## MVP Focus Areas

Based on reference implementation, our MVP should:

1. ✅ Extract `premium_interactions` quota from `quota_snapshots`
2. ✅ Calculate percentage: `(remaining / entitlement) * 100`
3. ✅ Display in status bar: `"Copilot: 250/300 (83%)"`
4. ✅ Show budget usage: `"+ 5 budget"` when `overage_count > 0`
5. ✅ Handle unlimited quotas (some plans have unlimited premium)
6. ✅ Handle auth errors gracefully
7. ✅ Respect the fact that this is an internal API (may break!)

## Testing Strategy

Mock the API endpoint with test data covering:
- ✅ Standard quota (300 included, some used, no budget)
- ✅ With budget usage (overage_count > 0)
- ✅ Unlimited quota (unlimited: true)
- ✅ Near quota limit (>90% used)
- ✅ Quota exceeded (100% used + budget)
- ✅ Auth failures (401, 403)
- ✅ API errors (500, timeout)
- ✅ Invalid response structure
- ✅ Missing fields
- ✅ Multiple organizations

## Security & Privacy

Reference implementation notes:
- ✅ No data collection or telemetry
- ✅ Uses VS Code's secure auth (no manual token handling)
- ✅ Data only fetched on-demand (we'll do periodic polling)
- ✅ No data sent anywhere except GitHub API

Our implementation must maintain same privacy standards.

## Lessons Learned

1. **The endpoint is internal** - build resilience for changes
2. **Quota snapshots are objects** - need conversion
3. **Some quotas are unlimited** - handle boolean flag
4. **Budget = overage** - terminology mapping
5. **Simple status bar is sufficient** - don't need full panel
6. **Auth is easy** - VS Code handles it
7. **Respect rate limits** - 60s polling is conservative

## Next Steps

1. ✅ Update spec 002 with correct API endpoint
2. ✅ Add NFRs to all specs (performance, TDD)
3. ✅ Clarify UsageData entity structure
4. ✅ Document budget/overage relationship
5. → Ready to create implementation plans for all three specs

## Attribution

Original extension by Emanuele Bartolesi (@kasuken)
- Extension: [vscode-copilot-insights](https://marketplace.visualstudio.com/items?itemName=emanuelebartolesi.vscode-copilot-insights)
- Repository: [github.com/kasuken/vscode-copilot-insights](https://github.com/kasuken/vscode-copilot-insights)
- License: MIT
