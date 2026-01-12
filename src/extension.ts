import * as vscode from 'vscode';
import { GitHubAuthProvider } from './auth';
import { CopilotApiClient } from './copilotApi';
import { StatusBarManager } from './statusBar';

let statusBarManager: StatusBarManager | undefined;
let refreshInterval: NodeJS.Timeout | undefined;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Copilot Premium Requests Status Bar is now active');

    const authProvider = new GitHubAuthProvider(context);
    const apiClient = new CopilotApiClient(authProvider);
    statusBarManager = new StatusBarManager(apiClient);

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('copilot-premium-requests.authenticate', async () => {
            await authProvider.authenticate();
            await statusBarManager?.refresh();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('copilot-premium-requests.refresh', async () => {
            await statusBarManager?.refresh();
        })
    );

    // Show status bar
    statusBarManager.show();

    // Initial refresh
    await statusBarManager.refresh();

    // Auto-refresh every 5 minutes
    refreshInterval = setInterval(async () => {
        await statusBarManager?.refresh();
    }, 5 * 60 * 1000);

    context.subscriptions.push({
        dispose: () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        }
    });
}

export function deactivate() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    statusBarManager?.dispose();
}
