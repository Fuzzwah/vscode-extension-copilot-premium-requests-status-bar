import * as vscode from 'vscode';
import { StatusBarController } from './statusBar/StatusBarController';
import { GitHubAuthService } from './api/GitHubAuthService';
import { UsageApiClient } from './api/UsageApiClient';
import { ApiError, ApiErrorType } from './api/types';
import { UsageViewProvider } from './webview/UsageViewProvider';

let statusBarController: StatusBarController | undefined;
let outputChannel: vscode.OutputChannel | undefined;
let authService: GitHubAuthService | undefined;
let apiClient: UsageApiClient | undefined;
let usageViewProvider: UsageViewProvider | undefined;

/**
 * Extension activation function.
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('GitHub Copilot Premium Requests Status Bar extension is now active');

  // Create output channel for detailed usage display
  outputChannel = vscode.window.createOutputChannel('Copilot Usage Details');

  // Initialize services
  authService = new GitHubAuthService();
  apiClient = new UsageApiClient();

  // Register webview provider
  usageViewProvider = new UsageViewProvider(
    context.extensionUri,
    apiClient,
    authService,
    outputChannel
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      UsageViewProvider.viewType,
      usageViewProvider
    )
  );

  // Initialize status bar controller
  statusBarController = new StatusBarController();
  statusBarController.activate();

  // Listen for configuration changes
  const configWatcher = vscode.workspace.onDidChangeConfiguration(async (e) => {
    if (e.affectsConfiguration('copilotPremiumRequests.budgetRequests') || 
        e.affectsConfiguration('copilotPremiumRequests.budgetDollars')) {
      // Budget configuration changed, refresh the webview
      if (usageViewProvider) {
        await usageViewProvider.refresh();
      }
    }
  });
  context.subscriptions.push(configWatcher);

  // Register commands
  const debugApiCommand = vscode.commands.registerCommand(
    'copilotPremiumRequests.debugApi',
    async () => {
      if (!authService || !apiClient || !outputChannel) {
        return;
      }

      try {
        const token = await authService.getToken(true);
        if (!token) {
          vscode.window.showErrorMessage('Failed to authenticate with GitHub');
          return;
        }

        const { raw } = await apiClient.fetchUsageWithRaw(token);
        
        outputChannel.clear();
        outputChannel.appendLine('=== GitHub Copilot User API Response ===');
        outputChannel.appendLine(JSON.stringify(raw, null, 2));
        outputChannel.appendLine('');
        outputChannel.appendLine('=== Budget Analysis ===');
        
        const premiumQuota = raw.quota_snapshots?.premium_interactions;
        if (premiumQuota) {
          outputChannel.appendLine(`Entitlement: ${premiumQuota.entitlement}`);
          outputChannel.appendLine(`Remaining: ${premiumQuota.remaining ?? premiumQuota.quota_remaining}`);
          outputChannel.appendLine(`Overage Count: ${premiumQuota.overage_count ?? 'N/A'}`);
          outputChannel.appendLine(`Overage Limit: ${premiumQuota.overage_limit ?? 'NOT PROVIDED BY API'}`);
          outputChannel.appendLine(`Overage Permitted: ${premiumQuota.overage_permitted ?? 'N/A'}`);
        }

        // Try to fetch organization billing info if user is in an org
        if (raw.organization_list && raw.organization_list.length > 0) {
          const orgLogin = raw.organization_list[0].login;
          outputChannel.appendLine('');
          outputChannel.appendLine(`=== Attempting to fetch org billing for: ${orgLogin} ===`);
          
          try {
            const orgBillingResponse = await new Promise<string>((resolve, reject) => {
              const https = require('https');
              const requestOptions = {
                hostname: 'api.github.com',
                path: `/orgs/${orgLogin}/copilot/billing`,
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Accept': 'application/vnd.github+json',
                  'User-Agent': 'vscode-copilot-premium-status/0.1.0',
                  'X-GitHub-Api-Version': '2022-11-28'
                },
                timeout: 30000
              };

              const req = https.request(requestOptions, (res: any) => {
                let data = '';
                res.on('data', (chunk: any) => { data += chunk; });
                res.on('end', () => {
                  if (res.statusCode === 200) {
                    resolve(data);
                  } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                  }
                });
              });

              req.on('error', reject);
              req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
              });

              req.end();
            });

            const orgBilling = JSON.parse(orgBillingResponse);
            outputChannel.appendLine(JSON.stringify(orgBilling, null, 2));
            outputChannel.appendLine('');
            outputChannel.appendLine('NOTE: Check if this response contains budget/overage limit fields.');
          } catch (orgError: any) {
            outputChannel.appendLine(`Failed to fetch org billing: ${orgError.message}`);
            outputChannel.appendLine('This likely means you need org owner or billing manager permissions.');
          }

          // Try enterprise-level endpoint patterns
          outputChannel.appendLine('');
          outputChannel.appendLine('=== Attempting enterprise-level endpoints ===');
          
          const enterprisePatterns = [
            `/enterprises/${orgLogin}/settings/copilot`,
            `/enterprises/${orgLogin}/copilot/billing`,
            `/orgs/${orgLogin}/copilot/settings`,
          ];

          for (const path of enterprisePatterns) {
            try {
              outputChannel.appendLine(`Trying: ${path}`);
              const response = await new Promise<string>((resolve, reject) => {
                const https = require('https');
                const requestOptions = {
                  hostname: 'api.github.com',
                  path: path,
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json',
                    'User-Agent': 'vscode-copilot-premium-status/0.1.0',
                    'X-GitHub-Api-Version': '2022-11-28'
                  },
                  timeout: 10000
                };

                const req = https.request(requestOptions, (res: any) => {
                  let data = '';
                  res.on('data', (chunk: any) => { data += chunk; });
                  res.on('end', () => {
                    resolve(`Status ${res.statusCode}: ${data}`);
                  });
                });

                req.on('error', reject);
                req.on('timeout', () => {
                  req.destroy();
                  reject(new Error('Timeout'));
                });

                req.end();
              });

              outputChannel.appendLine(response);
              outputChannel.appendLine('');
            } catch (error: any) {
              outputChannel.appendLine(`Error: ${error.message}`);
            }
          }
        }
        
        outputChannel.show();
        
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to fetch API data: ${error}`);
      }
    }
  );

  const showDetailsCommand = vscode.commands.registerCommand(
    'copilotPremiumRequests.showDetails',
    () => {
      // Focus the webview panel (view IDs are automatically registered as focus commands)
      vscode.commands.executeCommand('copilotPremiumRequests.usageView.focus');
    }
  );

  const refreshUsageViewCommand = vscode.commands.registerCommand(
    'copilotPremiumRequests.refreshUsageView',
    async () => {
      if (usageViewProvider) {
        await usageViewProvider.refresh();
      }
    }
  );

  const refreshCommand = vscode.commands.registerCommand(
    'copilotPremiumRequests.refresh',
    async () => {
      if (!statusBarController || !authService || !apiClient) {
        return;
      }

      statusBarController.showLoading();
      
      try {
        // Get GitHub token
        const token = await authService.getToken(true);
        
        if (!token) {
          vscode.window.showErrorMessage('Failed to authenticate with GitHub. Please sign in.');
          statusBarController.showError(new Error('Not authenticated'));
          return;
        }

        // Fetch usage data
        const usageData = await apiClient.fetchUsage(token);
        
        // Update display
        statusBarController.updateDisplay(usageData);
        vscode.window.showInformationMessage('Usage data refreshed successfully!');
        
      } catch (error) {
        console.error('Failed to refresh usage data:', error);
        
        if (error instanceof ApiError) {
          if (error.type === ApiErrorType.AUTH) {
            statusBarController.showError(new Error('Not authenticated'));
            vscode.window.showErrorMessage('GitHub authentication failed. Please sign in again.');
          } else if (error.type === ApiErrorType.FORBIDDEN) {
            statusBarController.showError(new Error('No Copilot subscription'));
            vscode.window.showErrorMessage('You do not have access to GitHub Copilot Premium.');
          } else if (error.type === ApiErrorType.NOT_FOUND) {
            statusBarController.showError(new Error('API unavailable'));
            vscode.window.showErrorMessage('GitHub Copilot API endpoint not found. The API may have changed.');
          } else {
            statusBarController.showError(new Error('Failed to fetch data'));
            vscode.window.showErrorMessage(`Failed to fetch usage data: ${error.message}`);
          }
        } else {
          statusBarController.showError(new Error('Unknown error'));
          vscode.window.showErrorMessage('An unexpected error occurred.');
        }
      }
    }
  );

  context.subscriptions.push(statusBarController);
  context.subscriptions.push(debugApiCommand);
  context.subscriptions.push(showDetailsCommand);
  context.subscriptions.push(refreshUsageViewCommand);
  context.subscriptions.push(refreshCommand);
  if (outputChannel) {
    context.subscriptions.push(outputChannel);
  }

  // Fetch initial usage data
  (async () => {
    if (!authService || !apiClient || !statusBarController) {
      return;
    }

    statusBarController.showLoading();

    try {
      const token = await authService.getToken(true);
      
      if (!token) {
        console.log('User not authenticated with GitHub');
        statusBarController.showError(new Error('Sign in to GitHub'));
        return;
      }

      const usageData = await apiClient.fetchUsage(token);
      statusBarController.updateDisplay(usageData);
      console.log('Successfully fetched GitHub Copilot usage data');
      
    } catch (error) {
      console.error('Failed to fetch initial usage data:', error);
      
      if (error instanceof ApiError) {
        if (error.type === ApiErrorType.AUTH) {
          statusBarController.showError(new Error('Authentication required'));
        } else if (error.type === ApiErrorType.FORBIDDEN) {
          statusBarController.showError(new Error('No Copilot access'));
        } else {
          statusBarController.showError(new Error('Failed to load'));
        }
      } else {
        statusBarController.showError(new Error('Error'));
      }
    }
  })();
}

/**
 * Extension deactivation function.
 */
export function deactivate(): void {
  if (statusBarController) {
    statusBarController.dispose();
    statusBarController = undefined;
  }
  if (outputChannel) {
    outputChannel.dispose();
    outputChannel = undefined;
  }
  if (authService) {
    authService.dispose();
    authService = undefined;
  }
  if (apiClient) {
    apiClient.dispose();
    apiClient = undefined;
  }
}
