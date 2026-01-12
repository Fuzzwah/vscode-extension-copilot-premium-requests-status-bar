import * as vscode from 'vscode';
import { CopilotApiClient, CopilotUsage } from './copilotApi';

export class StatusBarManager {
    private statusBarItem: vscode.StatusBarItem;

    constructor(private apiClient: CopilotApiClient) {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'copilot-premium-requests.refresh';
    }

    show(): void {
        this.statusBarItem.show();
    }

    hide(): void {
        this.statusBarItem.hide();
    }

    async refresh(): Promise<void> {
        try {
            const usage = await this.apiClient.fetchUsage();

            if (usage) {
                this.updateStatusBar(usage);
            } else {
                this.showAuthRequired();
            }
        } catch (error) {
            console.error('Error refreshing status bar:', error);
            this.showError();
        }
    }

    private updateStatusBar(usage: CopilotUsage): void {
        const includedRemaining = usage.totalIncluded - usage.usedIncluded;
        const budgetRemaining = usage.totalBudget - usage.usedBudget;

        const placeholderPrefix = usage.isPlaceholder ? '(Demo) ' : '';
        const text = `${placeholderPrefix}$(copilot) Included: ${includedRemaining}/${usage.totalIncluded} | Budget: ${budgetRemaining}/${usage.totalBudget}`;
        
        this.statusBarItem.text = text;
        this.statusBarItem.tooltip = this.buildTooltip(usage);
        
        if (usage.isPlaceholder) {
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else {
            this.statusBarItem.backgroundColor = undefined;
        }
    }

    private buildTooltip(usage: CopilotUsage): string {
        const lines = [
            'GitHub Copilot Premium Requests',
            ''
        ];

        if (usage.isPlaceholder) {
            lines.push('⚠️  DEMO DATA - API endpoint not available');
            lines.push('');
        }

        lines.push(
            'Included Requests:',
            `  Used: ${usage.usedIncluded}`,
            `  Remaining: ${usage.totalIncluded - usage.usedIncluded}`,
            `  Total: ${usage.totalIncluded}`,
            '',
            'Budget Requests:',
            `  Used: ${usage.usedBudget}`,
            `  Remaining: ${usage.totalBudget - usage.usedBudget}`,
            `  Total: ${usage.totalBudget}`,
            '',
            'Click to refresh'
        );

        return lines.join('\n');
    }

    private showAuthRequired(): void {
        this.statusBarItem.text = '$(copilot) Auth Required';
        this.statusBarItem.tooltip = 'Click to authenticate with GitHub';
        this.statusBarItem.command = 'copilot-premium-requests.authenticate';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }

    private showError(): void {
        this.statusBarItem.text = '$(copilot) Error';
        this.statusBarItem.tooltip = 'Failed to fetch Copilot usage. Click to retry.';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    }

    dispose(): void {
        this.statusBarItem.dispose();
    }
}
