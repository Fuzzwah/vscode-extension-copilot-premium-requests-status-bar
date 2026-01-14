# Copilot Premium Requests Status Bar

A Visual Studio Code extension that displays your current GitHub Copilot premium request usage directly in the status bar, helping you track both included and budget requests at a glance.

## Features

- **Real-time Usage Tracking**: Monitor your GitHub Copilot premium request consumption
- **Dual Metrics Display**: Separate counters for included requests and budget-based requests
- **Status Bar Integration**: Unobtrusive display in the VS Code status bar
- **At-a-Glance Visibility**: Know exactly where you stand with your request limits without leaving your editor

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
4. Test the extension in the Extension Development Host

## Usage

Once installed, the extension automatically displays your premium request usage in the status bar:

- **Included Requests**: Shows usage against your plan's included quota
- **Budget Requests**: Displays any additional requests charged to your budget

Click on the status bar item for more detailed information about your usage.

## Requirements

- Visual Studio Code version 1.85.0 or higher
- Active GitHub Copilot subscription with premium features

## Extension Settings

This extension contributes the following settings:

- `copilotPremiumRequests.refreshInterval`: Set the refresh interval (in seconds) for updating usage statistics (default: 60)
- `copilotPremiumRequests.showInStatusBar`: Enable/disable the status bar display (default: true)
- `copilotPremiumRequests.displayFormat`: Choose how usage is displayed (default: "compact")

## Known Issues

This extension is currently in development. Please report any issues on the [GitHub Issues page](https://github.com/fuzzwah/vscode-extension-copilot-premium-requests-status-bar/issues).

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/fuzzwah/vscode-extension-copilot-premium-requests-status-bar.git

# Navigate to the project directory
cd vscode-extension-copilot-premium-requests-status-bar

# Install dependencies
npm install

# Compile the extension
npm run compile

# Run tests
npm test
```

### Project Structure

```
.
├── src/              # Source code
├── test/             # Test files
├── .vscode/          # VS Code configuration
├── LICENSE           # GPL-3.0 License
└── README.md         # This file
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Thanks to the GitHub Copilot team for creating an amazing AI pair programming tool
- Built with the VS Code Extension API

## Support

If you encounter any issues or have questions:

- Open an issue on [GitHub](https://github.com/fuzzwah/vscode-extension-copilot-premium-requests-status-bar/issues)
- Check existing issues for solutions

## Changelog

### [Unreleased]
- Initial development
- Basic status bar integration
- Premium request tracking functionality

---

**Note**: This extension is not officially affiliated with or endorsed by GitHub or Microsoft.
