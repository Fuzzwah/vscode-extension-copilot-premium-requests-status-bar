/**
 * WebviewMessageHandler - Handles messages from webview to extension
 */

import * as vscode from 'vscode';
import { GitHubCopilotApiResponse } from '../api/types';
import { UsageData } from '../statusBar/types';

/**
 * Formats usage data as Markdown summary for clipboard export
 * @param apiResponse Raw API response with plan details and quotas
 * @param usageData Processed usage data
 * @returns Formatted Markdown string
 */
export function formatMarkdownSummary(
	apiResponse: GitHubCopilotApiResponse,
	usageData: UsageData
): string {
	const lines: string[] = [];

	// Header
	lines.push('# GitHub Copilot Usage Summary');
	lines.push('');

	// Plan Details
	lines.push('## Plan Details');
	lines.push('');
	lines.push(`- **Plan Type**: ${apiResponse.copilot_plan}`);
	lines.push(`- **Chat Enabled**: ${apiResponse.chat_enabled ? 'Yes' : 'No'}`);
	lines.push(`- **Organizations**: ${apiResponse.organization_list?.length || 0}`);
	lines.push('');

	// Quota Usage
	lines.push('## Quota Usage');
	lines.push('');

	// Overall summary
	lines.push('### Overall Usage');
	lines.push('');
	lines.push(`- **Included Used**: ${formatNumber(usageData.includedUsed)}`);
	lines.push(`- **Included Total**: ${formatNumber(usageData.includedTotal)}`);

	if (usageData.budgetTotal > 0) {
		lines.push(`- **Budget Used**: ${formatNumber(usageData.budgetUsed)}`);
		lines.push(`- **Budget Total**: ${formatNumber(usageData.budgetTotal)}`);
	}

	const totalUsed = usageData.includedUsed + usageData.budgetUsed;
	const totalQuota = usageData.includedTotal + usageData.budgetTotal;
	const percentage = totalQuota > 0 ? Math.round((totalUsed / totalQuota) * 100) : 0;
	lines.push(`- **Percentage Used**: ${percentage}%`);
	lines.push('');

	// Individual quotas
	if (apiResponse.quota_snapshots) {
		lines.push('### Individual Quotas');
		lines.push('');

		for (const [quotaId, quota] of Object.entries(apiResponse.quota_snapshots)) {
			if (!quota || quota.entitlement === undefined || quota.remaining === undefined) {
				continue;
			}

			const used = quota.entitlement - quota.remaining;
			const isUnlimited = quota.entitlement === -1;

			lines.push(`#### ${quotaId}`);
			lines.push('');
			lines.push(`- **Used**: ${formatNumber(used)}`);
			lines.push(`- **Remaining**: ${isUnlimited ? 'Unlimited' : formatNumber(quota.remaining)}`);
			lines.push(`- **Total**: ${isUnlimited ? 'Unlimited' : formatNumber(quota.entitlement)}`);
			lines.push('');
		}
	}

	// Reset Date
	lines.push('## Reset Information');
	lines.push('');
	lines.push(`- **Reset Date**: ${new Date(usageData.billingPeriodEnd).toLocaleString()}`);
	lines.push('');

	// Timestamp
	const now = new Date().toLocaleString();
	lines.push(`---`);
	lines.push(`*Generated at: ${now}*`);

	return lines.join('\n');
}

/**
 * Formats a number with commas for thousands separator
 * @param num Number to format
 * @returns Formatted string
 */
function formatNumber(num: number): string {
	return num.toLocaleString();
}

/**
 * Handles messages from webview
 * @param message Message from webview
 * @param apiResponse Current API response data
 * @param usageData Current usage data
 * @param outputChannel Output channel for logging
 */
export async function handleMessage(
	message: any,
	apiResponse: GitHubCopilotApiResponse,
	usageData: UsageData,
	outputChannel: vscode.OutputChannel
): Promise<void> {
	try {
		outputChannel.appendLine(`Handling webview message: ${message.command}`);

		switch (message.command) {
			case 'copy':
				await handleCopyCommand(apiResponse, usageData, outputChannel);
				break;

			case 'refresh':
				// Refresh is handled by the provider directly
				outputChannel.appendLine('Refresh command received (handled by provider)');
				break;

			default:
				outputChannel.appendLine(`Unknown command: ${message.command}`);
				break;
		}
	} catch (error) {
		outputChannel.appendLine(`Error handling message: ${error}`);
	}
}

/**
 * Handles the copy command - copies usage summary to clipboard
 * @param apiResponse Current API response data
 * @param usageData Current usage data
 * @param outputChannel Output channel for logging
 */
async function handleCopyCommand(
	apiResponse: GitHubCopilotApiResponse,
	usageData: UsageData,
	outputChannel: vscode.OutputChannel
): Promise<void> {
	try {
		const markdown = formatMarkdownSummary(apiResponse, usageData);
		await vscode.env.clipboard.writeText(markdown);
		
		outputChannel.appendLine('Usage summary copied to clipboard');
		
		await vscode.window.showInformationMessage(
			'✓ Usage summary copied to clipboard'
		);
	} catch (error) {
		outputChannel.appendLine(`Error copying to clipboard: ${error}`);
		
		await vscode.window.showErrorMessage(
			'Failed to copy usage summary to clipboard'
		);
	}
}
