import * as vscode from 'vscode';
import { DisplayState, FormattedDisplay, UsageData, StatusBarConfig } from './types';

/**
 * Service for formatting usage data into status bar display text.
 */
export class StatusBarFormatter {
  /**
   * Format usage data into compact text.
   * Format: "Copilot: {used}/{total} ({percent}%)"
   * With budget: "Copilot: {used}/{total} + {budget} budget ({percent}%)"
   */
  public formatCompact(data: UsageData, showIcon: boolean): string {
    const percent = this.calculatePercentage(data);
    let text = `Copilot: ${data.includedUsed}/${data.includedTotal} (${percent}%)`;
    
    if (data.budgetUsed > 0) {
      text = `Copilot: ${data.includedUsed}/${data.includedTotal} + ${data.budgetUsed} budget (${percent}%)`;
    }
    
    if (showIcon) {
      const icon = this.getIconForState(DisplayState.NORMAL);
      text = `${icon} ${text}`;
    }
    
    return text;
  }

  /**
   * Format usage data into detailed text.
   * Format: "Copilot: {used}/{total} included, {budget} budget ({percent}%)"
   * Without budget: "Copilot: {used}/{total} included ({percent}%)"
   */
  public formatDetailed(data: UsageData, showIcon: boolean): string {
    const percent = this.calculatePercentage(data);
    let text = `Copilot: ${data.includedUsed}/${data.includedTotal} included`;
    
    if (data.budgetUsed > 0) {
      text += `, ${data.budgetUsed} budget`;
    }
    
    text += ` (${percent}%)`;
    
    if (showIcon) {
      const icon = this.getIconForState(DisplayState.NORMAL);
      text = `${icon} ${text}`;
    }
    
    return text;
  }

  /**
   * Format usage data into percentage-only text.
   * Format: "Copilot: {percent}%"
   */
  public formatPercentage(data: UsageData, showIcon: boolean): string {
    const percent = this.calculatePercentage(data);
    let text = `Copilot: ${percent}%`;
    
    if (showIcon) {
      const icon = this.getIconForState(DisplayState.NORMAL);
      text = `${icon} ${text}`;
    }
    
    return text;
  }

  /**
   * Format usage data into a complete display structure.
   */
  public format(
    data: UsageData | undefined,
    state: DisplayState,
    config: StatusBarConfig
  ): FormattedDisplay {
    // Handle states without data
    if (state === DisplayState.LOADING) {
      return {
        text: `${this.getIconForState(state)} Copilot: Loading...`,
        tooltip: 'Fetching GitHub Copilot usage data...',
        backgroundColor: undefined,
        icon: this.getIconForState(state),
        state,
      };
    }

    if (state === DisplayState.ERROR) {
      return {
        text: `${this.getIconForState(state)} Copilot: Error`,
        tooltip: 'Failed to fetch usage data. Click to retry.',
        backgroundColor: this.getBackgroundColorForState(state),
        icon: this.getIconForState(state),
        state,
      };
    }

    if (state === DisplayState.NO_AUTH) {
      return {
        text: `${this.getIconForState(state)} Copilot: Sign In`,
        tooltip: 'Click to authenticate with GitHub',
        backgroundColor: undefined,
        icon: this.getIconForState(state),
        state,
      };
    }

    if (state === DisplayState.NO_SUBSCRIPTION) {
      return {
        text: `${this.getIconForState(state)} Copilot: No Access`,
        tooltip: 'GitHub Copilot subscription required',
        backgroundColor: undefined,
        icon: this.getIconForState(state),
        state,
      };
    }

    // States with data
    if (!data) {
      throw new Error('Data required for NORMAL and WARNING states');
    }

    let text: string;
    switch (config.displayFormat) {
      case 'detailed':
        text = this.formatDetailed(data, config.showIcons);
        break;
      case 'percentage':
        text = this.formatPercentage(data, config.showIcons);
        break;
      case 'compact':
      default:
        text = this.formatCompact(data, config.showIcons);
        break;
    }

    return {
      text,
      tooltip: this.formatTooltip(data, state),
      backgroundColor: this.getBackgroundColorForState(state),
      icon: this.getIconForState(state),
      state,
    };
  }

  /**
   * Generate a rich tooltip with detailed usage information.
   */
  public formatTooltip(data: UsageData | undefined, state: DisplayState): vscode.MarkdownString {
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;
    markdown.supportHtml = true;

    if (!data) {
      markdown.appendMarkdown('**GitHub Copilot Premium Requests**\n\n');
      markdown.appendMarkdown('_No data available_');
      return markdown;
    }

    const percent = this.calculatePercentage(data);
    const remaining = data.includedTotal - data.includedUsed;
    const lastUpdate = new Date(data.lastRefreshTime).toLocaleString();
    const periodEnd = new Date(data.billingPeriodEnd).toLocaleDateString();

    markdown.appendMarkdown('**GitHub Copilot Premium Requests**\n\n');

    if (state === DisplayState.WARNING) {
      markdown.appendMarkdown('⚠️ **Warning**: You are nearing your quota limit\n\n');
    }

    markdown.appendMarkdown(`• **Used**: ${data.includedUsed} of ${data.includedTotal}\n`);
    markdown.appendMarkdown(`• **Remaining**: ${remaining} (${100 - percent}%)\n`);

    if (data.budgetUsed > 0) {
      markdown.appendMarkdown(`• **Budget Used**: ${data.budgetUsed}\n`);
    }

    markdown.appendMarkdown(`\n---\n\n`);
    markdown.appendMarkdown(`Last updated: ${lastUpdate}\n`);
    markdown.appendMarkdown(`Period ends: ${periodEnd}\n\n`);
    markdown.appendMarkdown(`_Click for details_`);

    return markdown;
  }

  /**
   * Get the appropriate icon for a display state.
   */
  public getIconForState(state: DisplayState): string {
    switch (state) {
      case DisplayState.LOADING:
        return '$(sync~spin)';
      case DisplayState.NORMAL:
        return '$(check)';
      case DisplayState.WARNING:
        return '$(warning)';
      case DisplayState.ERROR:
        return '$(error)';
      case DisplayState.NO_AUTH:
        return '$(person)';
      case DisplayState.NO_SUBSCRIPTION:
        return '$(x)';
      default:
        return '$(question)';
    }
  }

  /**
   * Get the appropriate background color for a display state.
   */
  public getBackgroundColorForState(state: DisplayState): vscode.ThemeColor | undefined {
    switch (state) {
      case DisplayState.WARNING:
        return new vscode.ThemeColor('statusBarItem.warningBackground');
      case DisplayState.ERROR:
        return new vscode.ThemeColor('statusBarItem.errorBackground');
      default:
        return undefined;
    }
  }

  /**
   * Calculate usage percentage from usage data.
   * Uses total quota (included + budget) as denominator for accurate percentage.
   */
  public calculatePercentage(data: UsageData): number {
    const totalQuota = data.includedTotal + data.budgetTotal;
    if (totalQuota === 0) {
      return 0;
    }
    const totalConsumed = data.includedUsed + data.budgetUsed;
    return Math.round((totalConsumed / totalQuota) * 100);
  }

  /**
   * Validate that formatted text meets length constraints.
   */
  public validateText(text: string): boolean {
    if (text.length === 0) {
      throw new Error('Status bar text cannot be empty');
    }
    if (text.length > 100) {
      throw new Error('Status bar text exceeds 100 character limit');
    }
    return true;
  }
}
