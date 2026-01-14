# Copilot Premium Requests Status Bar

A Visual Studio Code extension that displays your current GitHub Copilot premium request usage directly in the status bar, with a rich sidebar panel for detailed tracking of both included and budget requests.

## Features

- 📊 **Rich Sidebar Panel**: Interactive webview panel with color-coded progress bars and detailed usage statistics
- 💰 **Budget Tracking**: Configure and monitor your premium request budget with dollar-based input
- 📈 **Pacing Guidance**: See current vs required daily usage to stay within your quota
- 🔄 **Auto-refresh**: Automatically updates when sidebar becomes visible after 5+ minutes
- 📋 **Clipboard Export**: Copy usage summary as formatted Markdown
- 🔐 **Secure Authentication**: Uses GitHub OAuth web flow (no manual tokens required)
- 💡 **Status Bar Integration**: Compact display with detailed tooltip on hover
- 🎨 **VS Code Theming**: Automatically adapts to your VS Code theme

## Installation

### From VS Code Marketplace (Coming Soon)

1. Open VS Code
2. Press `Ctrl+P` / `Cmd+P` to open the Quick Open dialog
3. Type `ext install copilot-premium-requests-status-bar`
4. Click Install

### Manual Installation

1. Clone this repository
2. Run `npm install` to install dependencies
3. Press `F5` to open a new VS Code window with the extension loaded

## Usage

### Authentication

When you first start using the extension, you'll be prompted to authenticate with GitHub:

1. Click on the status bar item when it shows "Auth Required"
2. Or run the command: `Copilot Premium Requests: Authenticate`
3. Follow the GitHub OAuth flow in your browser
4. Return to VS Code - you're now authenticated!

### Status Bar Display

Once authenticated, the status bar shows your usage:

```
Copilot: 300/300 + 400/750 (67%)
```

This displays:
- **Included**: 300/300 (fully used)
- **Budget**: 400/750 (53% of budget used)
- **Overall**: 67% of total quota consumed

### Sidebar Panel

Click the Copilot icon in the Activity Bar to open the rich sidebar panel showing:

- **Color-coded progress bars** (green <50%, yellow 50-80%, red >80%)
- **Included vs Budget breakdown** with separate stat lines
- **Pacing guidance**: Current daily usage (40/day) vs Required rate (≤21/day)
- **Reset countdown** and exact reset date
- **Interactive buttons**: Refresh, Copy Summary, Configure Budget

### Budget Configuration

Configure your premium request budget:

1. Click "Configure Budget" in the sidebar panel
2. Set `budgetDollars` to your budget amount (e.g., $30 = 750 requests @ $0.04/request)
3. The panel automatically refreshes to show your budget tracking

### Commands

- `Copilot Premium Requests: Authenticate` - Authenticate with GitHub
- `Copilot Premium Requests: Refresh` - Manually refresh usage data
- `Copilot Premium Requests: Show Details` - Open the sidebar panel
- `Copilot Premium Requests: Debug API Response` - Inspect raw API data

## Extension Settings

This extension contributes the following settings:

- `copilotPremiumRequests.budgetDollars`: Your premium request budget in dollars (default: 0)
- `copilotPremiumRequests.budgetRequests`: Advanced - direct request count budget (default: 0)
- `copilotPremiumRequests.refreshInterval`: Auto-refresh interval in seconds (default: 300)
- `copilotPremiumRequests.warningThreshold`: Warning threshold percentage (default: 90)
- `copilotPremiumRequests.displayFormat`: Status bar display format (default: "compact")

## Requirements

- Visual Studio Code version 1.85.0 or higher
- Active GitHub Copilot subscription with premium features

## Development

### Building from Source

```bash
git clone https://github.com/fuzzwah/vscode-extension-copilot-premium-requests-status-bar.git
cd vscode-extension-copilot-premium-requests-status-bar
npm install
npm run compile
```

### Running Tests

```bash
npm test              # Run all tests
npm run test:unit     # Run unit tests only
```

### Packaging

```bash
npm install -g @vscode/vsce
vsce package
```

### Project Structure

```
.
├── src/
│   ├── api/              # API client and authentication
│   ├── statusBar/        # Status bar controller and formatter
│   ├── webview/          # Sidebar panel and HTML generation
│   └── extension.ts      # Extension entry point
├── tests/
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
├── specs/                # Feature specifications
└── README.md
```

## Privacy

This extension:
- Only requests GitHub scopes necessary for reading user information
- Does not collect or store any data outside of VS Code
- Uses VS Code's secure secret storage for authentication tokens
- All data processing happens locally

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Known Issues

- GitHub Copilot API is internal/undocumented - may change without notice
- Budget limit (`overage_limit`) not exposed by API - requires manual configuration
- Some API fields (like `overage_count`) may be unreliable

Please report any issues on the [GitHub Issues page](https://github.com/fuzzwah/vscode-extension-copilot-premium-requests-status-bar/issues).

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Changelog

### [0.1.0] - Unreleased
- Rich webview sidebar panel with interactive UI
- Budget tracking and configuration
- Pacing guidance with current vs required usage
- Auto-refresh on visibility
- Clipboard export (Markdown summary)
- Comprehensive test suite (156 tests)

---

**Note**: This extension is not officially affiliated with or endorsed by GitHub or Microsoft.
