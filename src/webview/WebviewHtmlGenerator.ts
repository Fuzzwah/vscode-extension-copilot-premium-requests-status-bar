/**
 * HTML generation utilities for webview sidebar panel
 */

import * as vscode from 'vscode';
import { QuotaSnapshot, GitHubCopilotApiResponse } from '../api/types';
import { PacingData } from './types';
import { UsageData } from '../statusBar/types';

/**
 * Determines progress bar color based on usage percentage
 * @param percentage Usage percentage (0-100)
 * @returns Color indicator: 'green' (<50%), 'yellow' (50-79%), 'red' (>=80%)
 */
export function getProgressBarColor(percentage: number): 'green' | 'yellow' | 'red' {
	if (percentage < 50) {
		return 'green';
	} else if (percentage < 80) {
		return 'yellow';
	} else {
		return 'red';
	}
}

/**
 * Generates HTML for a progress bar
 * @param percentage Percentage filled (0-100)
 * @param color Color of the progress bar
 * @returns HTML string for progress bar
 */
export function generateProgressBar(percentage: number, color: 'green' | 'yellow' | 'red'): string {
	const colorMap = {
		green: 'var(--vscode-charts-green)',
		yellow: 'var(--vscode-charts-yellow)',
		red: 'var(--vscode-charts-red)',
	};

	return `
		<div class="progress-bar-container">
			<div class="progress-bar-fill" style="width: ${percentage}%; background-color: ${colorMap[color]};"></div>
		</div>
	`;
}

/**
 * Formats a number with comma separators
 * @param num Number to format
 * @returns Formatted string with commas
 */
export function formatNumber(num: number): string {
	return num.toLocaleString('en-US');
}

/**
 * Calculates pacing guidance for a quota
 * @param quota Quota snapshot data
 * @param resetDateUtc Reset date in UTC ISO format
 * @param budgetTotal Total budget available
 * @returns Pacing data or null if unlimited
 */
export function calculatePacing(quota: QuotaSnapshot, resetDateUtc: string, budgetTotal: number): PacingData | null {
	// Handle unlimited quotas
	if (quota.unlimited || quota.entitlement === -1) {
		return null;
	}

	const includedTotal = quota.entitlement ?? 0;
	const remaining = quota.remaining ?? quota.quota_remaining ?? 0;
	const totalUsed = includedTotal - remaining;
	
	// Calculate actual remaining quota (includes budget)
	const includedRemaining = Math.max(0, includedTotal - totalUsed);
	const overageUsed = Math.max(0, totalUsed - includedTotal);
	const budgetRemaining = budgetTotal > 0 ? Math.max(0, budgetTotal - overageUsed) : 0;
	const totalRemaining = includedRemaining + budgetRemaining;
	
	const resetDate = new Date(resetDateUtc);
	const now = new Date();
	
	// Calculate time until reset
	const msUntilReset = resetDate.getTime() - now.getTime();
	const daysUntilReset = Math.floor(msUntilReset / (1000 * 60 * 60 * 24));
	const hoursUntilReset = Math.floor((msUntilReset % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
	
	// Calculate pacing based on total remaining (included + budget)
	const totalDays = Math.max(daysUntilReset, 1); // Avoid division by zero
	const dailyAverage = Math.ceil(totalRemaining / totalDays);
	const weeklyAverage = dailyAverage * 7;
	
	// Calculate projected total usage
	const totalQuota = includedTotal + budgetTotal;
	const projectedTotal = totalUsed + totalRemaining;
	
	return {
		dailyAverage,
		weeklyAverage,
		daysUntilReset,
		hoursUntilReset,
		resetDate: resetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
		projectedTotal: Math.min(projectedTotal, totalQuota),
	};
}

/**
 * Generates HTML for pacing guidance section
 * @param pacing Pacing data
 * @returns HTML string for pacing guidance
 */
export function generatePacingGuidance(pacing: PacingData): string {
	return `
		<div class="pacing-guidance">
			<div class="pacing-item">
				<span class="pacing-label">To last until reset:</span>
				<span class="pacing-value">≤ ${formatNumber(pacing.dailyAverage)}/day</span>
			</div>
			${pacing.daysUntilReset > 7 ? `
				<div class="pacing-item">
					<span class="pacing-label">Weekly average:</span>
					<span class="pacing-value">≤ ${formatNumber(pacing.weeklyAverage)}/week</span>
				</div>
			` : ''}
			<div class="pacing-item">
				<span class="pacing-label">Reset in:</span>
				<span class="pacing-value">${pacing.daysUntilReset}d ${pacing.hoursUntilReset}h</span>
			</div>
			<div class="pacing-item pacing-reset-date">
				<span class="pacing-label">Reset date:</span>
				<span class="pacing-value">${pacing.resetDate}</span>
			</div>
		</div>
	`;
}

/**
 * Generates HTML for a quota card
 * @param quota Quota snapshot data
 * @param displayName Display name for the quota
 * @param budgetTotal Total budget available (0 if none)
 * @param resetDateUtc Reset date in UTC ISO format
 * @returns HTML string for quota card
 */
export function generateQuotaCard(
	quota: QuotaSnapshot,
	displayName: string,
	budgetTotal: number,
	resetDateUtc: string
): string {
	const isUnlimited = quota.unlimited || quota.entitlement === -1;
	
	if (isUnlimited) {
		return `
			<div class="quota-card">
				<div class="quota-header">
					<h3 class="quota-name">${displayName}</h3>
					<span class="unlimited-badge">Unlimited ∞</span>
				</div>
			</div>
		`;
	}

	const includedTotal = quota.entitlement ?? 0;
	const remaining = quota.remaining ?? quota.quota_remaining ?? 0;
	const totalUsed = includedTotal - remaining;
	
	// Calculate included vs budget usage
	const includedUsed = Math.min(totalUsed, includedTotal);
	const overageUsed = Math.max(0, totalUsed - includedTotal);
	const includedRemaining = Math.max(0, includedTotal - totalUsed);
	const budgetRemaining = budgetTotal > 0 ? Math.max(0, budgetTotal - overageUsed) : 0;
	const totalRemaining = includedRemaining + budgetRemaining;
	
	// Calculate percentage based on total quota (included + budget)
	const totalQuota = includedTotal + budgetTotal;
	const totalConsumed = includedUsed + overageUsed;
	const percentage = totalQuota > 0 ? Math.round((totalConsumed / totalQuota) * 100) : 0;
	const color = getProgressBarColor(percentage);

	const pacing = calculatePacing(quota, resetDateUtc, budgetTotal);

	return `
		<div class="quota-card">
			<div class="quota-header">
				<h3 class="quota-name">${displayName}</h3>
				<span class="quota-percentage">${percentage}% used</span>
			</div>
			${generateProgressBar(percentage, color)}
			<div class="quota-stats">
				<div class="stat-item">
					<span class="stat-label">Included:</span>
					<span class="stat-value">${formatNumber(includedUsed)} / ${formatNumber(includedTotal)}</span>
				</div>
				${overageUsed > 0 ? `
					<div class="stat-item stat-overage">
						<span class="stat-label">Budget Used:</span>
						<span class="stat-value">${formatNumber(overageUsed)}${budgetTotal > 0 ? ` / ${formatNumber(budgetTotal)}` : ''}</span>
					</div>
				` : budgetTotal > 0 ? `
					<div class="stat-item stat-budget">
						<span class="stat-label">Budget Available:</span>
						<span class="stat-value">${formatNumber(budgetTotal)}</span>
					</div>
				` : ''}
				<div class="stat-item">
					<span class="stat-label">Total Remaining:</span>
					<span class="stat-value">${formatNumber(totalRemaining)}</span>
				</div>
			</div>
			${pacing ? generatePacingGuidance(pacing) : ''}
		</div>
	`;
}

/**
 * Generates HTML for plan details section
 * @param planType Plan type (e.g., "Business", "Individual")
 * @param chatEnabled Whether Copilot Chat is enabled
 * @param organizationCount Number of organizations
 * @param usageData Current usage data
 * @returns HTML string for plan details
 */
export function generatePlanDetails(
	planType: string,
	chatEnabled: boolean,
	organizationCount: number,
	usageData: UsageData
): string {
	return `
		<div class="plan-details">
			<h3 class="section-title">Plan Details</h3>
			<div class="detail-item">
				<span class="detail-label">Plan Type:</span>
				<span class="detail-value">${planType}</span>
			</div>
			<div class="detail-item">
				<span class="detail-label">Chat Enabled:</span>
				<span class="detail-value">${chatEnabled ? 'Yes' : 'No'}</span>
			</div>
			<div class="detail-item">
				<span class="detail-label">Organizations:</span>
				<span class="detail-value">${organizationCount}</span>
			</div>
			<div class="detail-item">
				<span class="detail-label">Billing Period Ends:</span>
				<span class="detail-value">${new Date(usageData.billingPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
			</div>
			<div class="detail-item">
				<span class="detail-label">Budget Total:</span>
				<span class="detail-value">${formatNumber(usageData.budgetTotal)}${usageData.budgetTotal === 0 ? ' (not configured)' : ''}</span>
			</div>
			${usageData.budgetTotal === 0 ? `
				<div class="detail-item">
					<button class="config-button" id="configure-budget-btn">⚙️ Configure Budget</button>
				</div>
			` : ''}
		</div>
	`;
}

/**
 * Generates complete HTML document for webview
 * @param apiResponse Raw API response from GitHub
 * @param usageData Processed usage data
 * @param webview Webview instance for resource URIs
 * @returns Complete HTML document string
 */
export function generateHtml(
	apiResponse: GitHubCopilotApiResponse,
	usageData: UsageData,
	webview: vscode.Webview
): string {
	const nonce = getNonce();
	const quotaSnapshots = apiResponse.quota_snapshots || {};
	const resetDateUtc = apiResponse.quota_reset_date_utc || new Date().toISOString();
	
	// Check if data is stale (>1 hour old)
	const dataAge = Date.now() - usageData.lastRefreshTime;
	const isStale = dataAge > (60 * 60 * 1000); // 1 hour
	
	// Generate quota cards
	const quotaCards = Object.entries(quotaSnapshots).map(([key, quota]) => {
		const displayName = key.split('_').map(word => 
			word.charAt(0).toUpperCase() + word.slice(1)
		).join(' ');
		
		return generateQuotaCard(quota as QuotaSnapshot, displayName, usageData.budgetTotal, resetDateUtc);
	}).join('');

	const planDetails = generatePlanDetails(
		apiResponse.copilot_plan || 'Unknown',
		apiResponse.chat_enabled || false,
		apiResponse.organization_list?.length || 0,
		usageData
	);

	const lastUpdated = new Date(usageData.lastRefreshTime).toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	});

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};">
	<title>Copilot Usage</title>
	<style>
		body {
			padding: 16px;
			color: var(--vscode-foreground);
			background-color: var(--vscode-editor-background);
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
			line-height: 1.5;
		}
		
		h2, h3 {
			margin-top: 0;
			margin-bottom: 12px;
		}
		
		.stale-warning {
			background-color: var(--vscode-editorWarning-background);
			color: var(--vscode-editorWarning-foreground);
			padding: 8px 12px;
			border-radius: 4px;
			margin-bottom: 16px;
			border-left: 4px solid var(--vscode-charts-yellow);
		}
		
		.quota-card {
			background-color: var(--vscode-editor-background);
			border: 1px solid var(--vscode-widget-border);
			border-radius: 6px;
			padding: 16px;
			margin-bottom: 16px;
		}
		
		.quota-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 12px;
		}
		
		.quota-name {
			margin: 0;
			font-size: 1.1em;
		}
		
		.quota-percentage {
			color: var(--vscode-descriptionForeground);
			font-size: 0.9em;
		}
		
		.unlimited-badge {
			color: var(--vscode-charts-green);
			font-weight: bold;
			font-size: 1.1em;
		}
		
		.progress-bar-container {
			width: 100%;
			height: 8px;
			background-color: var(--vscode-progressBar-background);
			border-radius: 4px;
			overflow: hidden;
			margin-bottom: 12px;
		}
		
		.progress-bar-fill {
			height: 100%;
			transition: width 0.3s ease;
		}
		
		.quota-stats {
			margin-bottom: 12px;
		}
		
		.stat-item {
			display: flex;
			justify-content: space-between;
			margin-bottom: 6px;
			font-size: 0.95em;
		}
		
		.stat-label {
			color: var(--vscode-descriptionForeground);
		}
		
		.stat-value {
			font-weight: 500;
		}
		
		.stat-budget {
			color: var(--vscode-charts-blue);
		}
		
		.stat-overage {
			color: var(--vscode-charts-yellow);
		}
		
		.pacing-guidance {
			background-color: var(--vscode-editorWidget-background);
			padding: 12px;
			border-radius: 4px;
			margin-top: 12px;
		}
		
		.pacing-item {
			display: flex;
			justify-content: space-between;
			margin-bottom: 6px;
			font-size: 0.9em;
		}
		
		.pacing-item:last-child {
			margin-bottom: 0;
		}
		
		.pacing-label {
			color: var(--vscode-descriptionForeground);
		}
		
		.pacing-value {
			font-weight: 500;
		}
		
		.pacing-reset-date {
			margin-top: 8px;
			padding-top: 8px;
			border-top: 1px solid var(--vscode-widget-border);
		}
		
		.plan-details {
			background-color: var(--vscode-editor-background);
			border: 1px solid var(--vscode-widget-border);
			border-radius: 6px;
			padding: 16px;
			margin-bottom: 16px;
		}
		
		.section-title {
			margin-top: 0;
			margin-bottom: 12px;
		}
		
		.detail-item {
			display: flex;
			justify-content: space-between;
			margin-bottom: 8px;
		}
		
		.detail-label {
			color: var(--vscode-descriptionForeground);
		}
		
		.detail-value {
			font-weight: 500;
		}
		
		.last-updated {
			text-align: center;
			color: var(--vscode-descriptionForeground);
			font-size: 0.85em;
			margin-top: 24px;
			padding-top: 12px;
			border-top: 1px solid var(--vscode-widget-border);
		}
		
		.actions {
			display: flex;
			gap: 8px;
			margin-bottom: 16px;
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
		
		.config-button {
			background-color: var(--vscode-button-secondaryBackground);
			color: var(--vscode-button-secondaryForeground);
			margin-top: 4px;
			width: 100%;
		}
		
		.config-button:hover {
			background-color: var(--vscode-button-secondaryHoverBackground);
		}
	</style>
</head>
<body>
	${isStale ? `
		<div class="stale-warning">
			⚠️ Data may be outdated. Last refreshed ${Math.floor(dataAge / (60 * 1000))} minutes ago.
		</div>
	` : ''}
	
	<div class="actions">
		<button onclick="refresh()">🔄 Refresh</button>
		<button onclick="copyToClipboard()">📋 Copy Summary</button>
	</div>
	
	${quotaCards || '<p>No quota data available.</p>'}
	
	${planDetails}
	
	<div class="last-updated">
		Last updated: ${lastUpdated}
	</div>
	
	<script nonce="${nonce}">
		const vscode = acquireVsCodeApi();
		
		function refresh() {
			vscode.postMessage({ command: 'refresh' });
		}
		
		function copyToClipboard() {
			vscode.postMessage({ command: 'copy' });
		}
		
		// Add event listener for configure budget button
		document.addEventListener('DOMContentLoaded', () => {
			const configBtn = document.getElementById('configure-budget-btn');
			if (configBtn) {
				configBtn.addEventListener('click', () => {
					vscode.postMessage({ command: 'configureBudget' });
				});
			}
		});
	</script>
</body>
</html>`;
}

/**
 * Generates a random nonce for CSP
 * @returns Random nonce string
 */
function getNonce(): string {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
