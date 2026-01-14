/**
 * UsageViewProvider - WebviewViewProvider implementation for sidebar panel
 */

import * as vscode from 'vscode';
import { UsageApiClient } from '../api/UsageApiClient';
import { GitHubAuthService } from '../api/GitHubAuthService';
import { GitHubCopilotApiResponse } from '../api/types';
import { UsageData } from '../statusBar/types';
import { generateHtml } from './WebviewHtmlGenerator';

export class UsageViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'copilotPremiumRequests.usageView';

	private _view?: vscode.WebviewView;
	// @ts-expect-error - Will be read in Phase 5 for auto-refresh
	private _apiResponse?: GitHubCopilotApiResponse;
	// @ts-expect-error - Will be used in later phases
	private _usageData?: UsageData;
	private _lastFetchTime: number = 0;
	private _isRefreshing: boolean = false;

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _apiClient: UsageApiClient,
		private readonly _authService: GitHubAuthService,
		private readonly _outputChannel: vscode.OutputChannel
	) {}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	): void | Thenable<void> {
		this._view = webviewView;

		// Configure webview options
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri],
		};

		// Register event listeners
		webviewView.onDidChangeVisibility(() => {
			if (webviewView.visible && this._shouldAutoRefresh()) {
				this.refresh().catch(error => {
					this._outputChannel.appendLine(`Error during auto-refresh: ${error}`);
				});
			}
		});

		webviewView.webview.onDidReceiveMessage(async (message) => {
			this._outputChannel.appendLine(`Received message: ${JSON.stringify(message)}`);
			
			if (message.command === 'configureBudget') {
				this._outputChannel.appendLine('Opening budget configuration settings');
				await vscode.commands.executeCommand('workbench.action.openSettings', 'copilotPremiumRequests.budgetDollars');
			}
			// Other message handling will be added in Phase 7 (US5)
		});

		// Show loading state initially
		this._showLoading();

		// Trigger initial data fetch
		this.refresh().catch(error => {
			this._outputChannel.appendLine(`Error during initial refresh: ${error}`);
		});
	}

	/**
	 * Updates the webview with new data
	 * @param apiResponse Raw API response
	 * @param usageData Processed usage data
	 */
	private _updateView(apiResponse: GitHubCopilotApiResponse, usageData: UsageData): void {
		if (!this._view) {
			return;
		}

		this._apiResponse = apiResponse;
		this._usageData = usageData;

		this._view.webview.html = generateHtml(apiResponse, usageData, this._view.webview);
	}

	/**
	 * Shows loading state in the webview
	 */
	private _showLoading(): void {
		if (!this._view) {
			return;
		}

		this._view.webview.html = this._getLoadingHtml();
	}

	/**
	 * Refreshes the usage data and updates the view
	 * @returns Promise that resolves when refresh is complete
	 */
	public async refresh(): Promise<void> {
		// Prevent concurrent refreshes
		if (this._isRefreshing) {
			return;
		}

		this._isRefreshing = true;

		try {
			// Show loading state
			this._showLoading();

			// Get authentication token
			const token = await this._authService.getToken(true);
			
			if (!token) {
				this._showError(new Error('Not authenticated with GitHub'));
				return;
			}

			// Fetch both raw API response and processed usage data
			const result = await this._apiClient.fetchUsageWithRaw(token);
			
			// Update last fetch time
			this._lastFetchTime = Date.now();

			// Store the data
			this._apiResponse = result.raw;
			this._usageData = result.data;

			// Update view with new data
			this._updateView(result.raw, result.data);

		} catch (error) {
			this._outputChannel.appendLine(`Error refreshing usage data: ${error}`);
			this._showError(error instanceof Error ? error : new Error('Unknown error'));
		} finally {
			this._isRefreshing = false;
		}
	}

	/**
	 * Determines if auto-refresh should be triggered
	 * @returns True if data is stale (>5 minutes) and no refresh is in progress
	 */
	private _shouldAutoRefresh(): boolean {
		// Don't refresh if already refreshing
		if (this._isRefreshing) {
			return false;
		}

		// Auto-refresh if data is older than 5 minutes
		const STALE_DATA_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds
		const timeSinceLastFetch = Date.now() - this._lastFetchTime;
		
		return timeSinceLastFetch > STALE_DATA_THRESHOLD;
	}

	/**
	 * Shows error state in the webview
	 * @param error Error to display
	 */
	private _showError(error: Error): void {
		if (!this._view) {
			return;
		}

		this._view.webview.html = this._getErrorHtml(error);
	}

	/**
	 * Generates HTML for loading state
	 */
	private _getLoadingHtml(): string {
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Loading...</title>
	<style>
		body {
			padding: 16px;
			color: var(--vscode-foreground);
			background-color: var(--vscode-editor-background);
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			min-height: 200px;
		}
		
		.spinner {
			width: 40px;
			height: 40px;
			border: 4px solid var(--vscode-progressBar-background);
			border-top-color: var(--vscode-button-background);
			border-radius: 50%;
			animation: spin 1s linear infinite;
		}
		
		@keyframes spin {
			to { transform: rotate(360deg); }
		}
		
		.loading-text {
			margin-top: 16px;
			color: var(--vscode-descriptionForeground);
		}
	</style>
</head>
<body>
	<div class="spinner"></div>
	<div class="loading-text">Loading Copilot usage data...</div>
</body>
</html>`;
	}

	/**
	 * Generates HTML for error state
	 * @param error Error to display
	 */
	private _getErrorHtml(error: Error): string {
		const nonce = this._getNonce();
		
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this._view!.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
	<title>Error</title>
	<style>
		body {
			padding: 16px;
			color: var(--vscode-foreground);
			background-color: var(--vscode-editor-background);
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
		}
		
		.error-container {
			background-color: var(--vscode-inputValidation-errorBackground);
			border: 1px solid var(--vscode-inputValidation-errorBorder);
			border-left: 4px solid var(--vscode-editorError-foreground);
			padding: 16px;
			border-radius: 4px;
		}
		
		.error-title {
			color: var(--vscode-editorError-foreground);
			font-weight: bold;
			margin-bottom: 8px;
		}
		
		.error-message {
			margin-bottom: 16px;
			color: var(--vscode-foreground);
		}
		
		button {
			background-color: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			padding: 6px 12px;
			border-radius: 4px;
			cursor: pointer;
			font-size: 0.9em;
		}
		
		button:hover {
			background-color: var(--vscode-button-hoverBackground);
		}
	</style>
</head>
<body>
	<div class="error-container">
		<div class="error-title">❌ Error Loading Usage Data</div>
		<div class="error-message">${this._escapeHtml(error.message)}</div>
		<button onclick="retry()">🔄 Retry</button>
	</div>
	
	<script nonce="${nonce}">
		const vscode = acquireVsCodeApi();
		
		function retry() {
			vscode.postMessage({ command: 'refresh' });
		}
	</script>
</body>
</html>`;
	}

	/**
	 * Escapes HTML special characters
	 * @param unsafe Unsafe string
	 */
	private _escapeHtml(unsafe: string): string {
		return unsafe
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	/**
	 * Generates a random nonce for CSP
	 */
	private _getNonce(): string {
		let text = '';
		const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		for (let i = 0; i < 32; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	}
}
