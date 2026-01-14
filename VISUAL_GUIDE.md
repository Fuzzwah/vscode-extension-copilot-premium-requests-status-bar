# Visual Guide

## Extension Features

### Status Bar Item

The extension displays Copilot premium request usage in the VS Code status bar (bottom right):

**Normal Display:**
```
$(copilot) Included: 27/50 | Budget: 55/100
```

**Demo/Placeholder Mode:**
```
(Demo) $(copilot) Included: 27/50 | Budget: 55/100
```
_Shows with orange/warning background when API endpoint is unavailable_

**Authentication Required:**
```
$(copilot) Auth Required
```
_Shows with orange/warning background when not authenticated_

**Error State:**
```
$(copilot) Error
```
_Shows with red/error background when an error occurs_

### Tooltip

Hover over the status bar item to see detailed information:

```
GitHub Copilot Premium Requests

Included Requests:
  Used: 23
  Remaining: 27
  Total: 50

Budget Requests:
  Used: 45
  Remaining: 55
  Total: 100

Click to refresh
```

When displaying placeholder data:
```
GitHub Copilot Premium Requests

⚠️  DEMO DATA - API endpoint not available

Included Requests:
  Used: 23
  Remaining: 27
  Total: 50

Budget Requests:
  Used: 45
  Remaining: 55
  Total: 100

Click to refresh
```

## Commands

Access these commands via the Command Palette (Ctrl+Shift+P / Cmd+Shift+P):

1. **Copilot Premium Requests: Authenticate**
   - Opens GitHub OAuth flow in your browser
   - Securely authenticates your GitHub account

2. **Copilot Premium Requests: Refresh**
   - Manually refreshes usage data
   - Same as clicking the status bar item

## Authentication Flow

1. Extension activates when VS Code starts
2. If not authenticated, status bar shows "Auth Required"
3. Click the status bar item or run the authenticate command
4. Browser opens to GitHub OAuth page
5. Authorize the application
6. Return to VS Code - authentication complete!
7. Extension starts displaying usage data

## Auto-Refresh

The extension automatically refreshes usage data every 5 minutes to keep the information current without manual intervention.
