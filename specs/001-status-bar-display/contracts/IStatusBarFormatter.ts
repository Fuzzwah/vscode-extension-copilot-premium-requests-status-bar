/**
 * Status Bar Formatter Interface
 * 
 * Formats usage data into display strings and tooltips for the status bar.
 * Implements different formatting strategies (compact, detailed, percentage).
 * 
 * @feature 001-status-bar-display
 * @phase Phase 1 - Design & Contracts
 */

import * as vscode from 'vscode';
import { DisplayState, FormattedDisplay } from './types';
import { UsageData } from '../../002-usage-api-integration/contracts/types';
import { StatusBarConfig } from './IStatusBarController';

/**
 * Service for formatting usage data into status bar display text.
 * 
 * Responsibilities:
 * - Format usage data according to selected display mode
 * - Generate rich tooltips with detailed information
 * - Apply icons and theme colors based on state
 * - Ensure formatted text meets length constraints
 * 
 * @example
 * ```typescript
 * const formatter = new StatusBarFormatter();
 * const display = formatter.format(usageData, config);
 * 
 * statusBarItem.text = display.text;
 * statusBarItem.tooltip = display.tooltip;
 * statusBarItem.backgroundColor = display.backgroundColor;
 * ```
 */
export interface IStatusBarFormatter {
  /**
   * Format usage data into a complete display structure.
   * 
   * This is the primary method that combines all formatting logic:
   * - Determines the appropriate icon based on state
   * - Formats the text according to displayFormat setting
   * - Generates a rich tooltip with detailed information
   * - Applies theme colors for warning/error states
   * 
   * @param data - Usage data to format (undefined if not yet loaded)
   * @param state - Current display state
   * @param config - Display configuration settings
   * @returns Complete formatted display structure
   * 
   * @example
   * ```typescript
   * const display = formatter.format(usageData, DisplayState.NORMAL, config);
   * // Returns:
   * // {
   * //   text: "Copilot: 250/300 (83%)",
   * //   tooltip: MarkdownString with details,
   * //   backgroundColor: undefined,
   * //   icon: "$(check)",
   * //   state: DisplayState.NORMAL
   * // }
   * ```
   */
  format(
    data: UsageData | undefined,
    state: DisplayState,
    config: StatusBarConfig
  ): FormattedDisplay;

  /**
   * Format usage data into compact text.
   * 
   * Format: "Copilot: {used}/{total} ({percent}%)"
   * With budget: "Copilot: {used}/{total} + {budget} budget ({percent}%)"
   * 
   * @param data - Usage data to format
   * @param showIcon - Whether to include an icon prefix
   * @returns Formatted compact string
   * 
   * @example
   * ```typescript
   * formatter.formatCompact(data, true);
   * // Returns: "$(check) Copilot: 250/300 (83%)"
   * 
   * formatter.formatCompact(dataWithBudget, false);
   * // Returns: "Copilot: 250/300 + 5 budget (83%)"
   * ```
   */
  formatCompact(data: UsageData, showIcon: boolean): string;

  /**
   * Format usage data into detailed text.
   * 
   * Format: "Copilot: {used}/{total} included, {budget} budget ({percent}%)"
   * Without budget: "Copilot: {used}/{total} included ({percent}%)"
   * 
   * @param data - Usage data to format
   * @param showIcon - Whether to include an icon prefix
   * @returns Formatted detailed string
   * 
   * @example
   * ```typescript
   * formatter.formatDetailed(data, true);
   * // Returns: "$(check) Copilot: 250/300 included (83%)"
   * 
   * formatter.formatDetailed(dataWithBudget, false);
   * // Returns: "Copilot: 250/300 included, 5 budget (83%)"
   * ```
   */
  formatDetailed(data: UsageData, showIcon: boolean): string;

  /**
   * Format usage data into percentage-only text.
   * 
   * Format: "Copilot: {percent}%"
   * 
   * @param data - Usage data to format
   * @param showIcon - Whether to include an icon prefix
   * @returns Formatted percentage string
   * 
   * @example
   * ```typescript
   * formatter.formatPercentage(data, true);
   * // Returns: "$(check) Copilot: 83%"
   * ```
   */
  formatPercentage(data: UsageData, showIcon: boolean): string;

  /**
   * Generate a rich tooltip with detailed usage information.
   * 
   * The tooltip includes:
   * - Used and remaining request counts
   * - Budget usage (if applicable)
   * - Last refresh timestamp
   * - Billing period end date
   * - Click instruction
   * 
   * @param data - Usage data to format (undefined if not yet loaded)
   * @param state - Current display state
   * @returns MarkdownString for tooltip
   * 
   * @example
   * ```typescript
   * const tooltip = formatter.formatTooltip(data, DisplayState.NORMAL);
   * // Returns MarkdownString:
   * // **GitHub Copilot Premium Requests**
   * //
   * // • Used: 250 of 300
   * // • Remaining: 50 (17%)
   * //
   * // ---
   * //
   * // Last updated: 1/12/2026, 3:00:00 PM
   * // Period ends: 2/1/2026
   * //
   * // _Click for details_
   * ```
   */
  formatTooltip(
    data: UsageData | undefined,
    state: DisplayState
  ): vscode.MarkdownString;

  /**
   * Get the appropriate icon for a display state.
   * 
   * Icon mapping:
   * - LOADING: $(sync~spin)
   * - NORMAL: $(check)
   * - WARNING: $(warning)
   * - ERROR: $(error)
   * - NO_AUTH: $(person)
   * - NO_SUBSCRIPTION: $(x)
   * 
   * @param state - Display state
   * @returns Codicon identifier string
   * 
   * @example
   * ```typescript
   * formatter.getIconForState(DisplayState.WARNING);
   * // Returns: "$(warning)"
   * ```
   */
  getIconForState(state: DisplayState): string;

  /**
   * Get the appropriate background color for a display state.
   * 
   * Color mapping:
   * - NORMAL, LOADING, NO_AUTH, NO_SUBSCRIPTION: undefined (no background)
   * - WARNING: statusBarItem.warningBackground
   * - ERROR: statusBarItem.errorBackground
   * 
   * @param state - Display state
   * @returns ThemeColor or undefined
   * 
   * @example
   * ```typescript
   * formatter.getBackgroundColorForState(DisplayState.WARNING);
   * // Returns: ThemeColor("statusBarItem.warningBackground")
   * ```
   */
  getBackgroundColorForState(state: DisplayState): vscode.ThemeColor | undefined;

  /**
   * Calculate usage percentage from usage data.
   * 
   * @param data - Usage data
   * @returns Percentage (0-100), rounded to nearest integer
   * 
   * @example
   * ```typescript
   * formatter.calculatePercentage({ includedUsed: 250, includedTotal: 300 });
   * // Returns: 83
   * ```
   */
  calculatePercentage(data: UsageData): number;

  /**
   * Validate that formatted text meets length constraints.
   * 
   * Status bar text should be:
   * - Non-empty
   * - Max 100 characters (including icon)
   * 
   * @param text - Text to validate
   * @returns True if valid
   * 
   * @throws {Error} If text is invalid
   */
  validateText(text: string): boolean;
}
