# Copilot Premium Requests Status Bar

A Visual Studio Code extension that displays your current GitHub Copilot premium request usage directly in the status bar, separating "included" and "budget" requests.

## Features

- 📊 **Real-time Status**: Displays your Copilot premium request usage in the VS Code status bar
- 🔐 **Web Authentication**: Uses GitHub's OAuth web flow for secure authentication (no manual tokens required)
- 📈 **Separate Tracking**: Shows both "included" and "budget" requests separately
- 🔄 **Auto-refresh**: Automatically updates usage every 5 minutes
- 💡 **Detailed Tooltip**: Hover over the status bar item for a detailed breakdown

## Installation

1. Install the extension from the VS Code marketplace (or from VSIX)
2. Reload VS Code
3. The extension will activate automatically

## Usage

### Authentication

When you first start using the extension, you'll be prompted to authenticate with GitHub:

1. Click on the status bar item when it shows "Auth Required"
2. Or run the command: `Copilot Premium Requests: Authenticate`
3. Follow the GitHub OAuth flow in your browser
4. Return to VS Code - you're now authenticated!

### Status Bar Display

Once authenticated, the status bar will show:

```
$(copilot) Included: 45/50 | Budget: 98/100
```

This means:
- **Included**: 45 used out of 50 total included requests (5 remaining)
- **Budget**: 98 used out of 100 total budget requests (2 remaining)

> **Note**: If the GitHub Copilot API endpoint is not yet available or returns an error, the extension will display demo/placeholder data with a "(Demo)" prefix and a warning background color. The tooltip will indicate when placeholder data is being shown.

### Commands

- `Copilot Premium Requests: Authenticate` - Authenticate with GitHub
- `Copilot Premium Requests: Refresh` - Manually refresh usage data

You can also click on the status bar item to refresh the data.

## Requirements

- Visual Studio Code version 1.80.0 or higher
- Active GitHub account with Copilot access

## Development

### Building from Source

```bash
npm install
npm run compile
```

### Packaging

```bash
npm install -g @vscode/vsce
vsce package
```

## Privacy

This extension:
- Only requests GitHub scopes necessary for reading user information
- Does not collect or store any data outside of VS Code
- Uses VS Code's secure secret storage for authentication tokens

## License

See the [LICENSE](LICENSE) file for details.

## Issues

Please report issues on the [GitHub repository](https://github.com/Fuzzwah/vscode-extension-copilot-premium-requests-status-bar/issues).
