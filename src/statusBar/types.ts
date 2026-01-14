import * as vscode from 'vscode';

/**
 * Display state enum representing the current state of the status bar item.
 */
export enum DisplayState {
  /** Initial state, fetching data from API */
  LOADING = 'loading',
  
  /** Normal state, usage below warning threshold */
  NORMAL = 'normal',
  
  /** Warning state, usage exceeds threshold */
  WARNING = 'warning',
  
  /** Error state, API failure or network error */
  ERROR = 'error',
  
  /** User not authenticated with GitHub */
  NO_AUTH = 'no_auth',
  
  /** User has no Copilot subscription */
  NO_SUBSCRIPTION = 'no_subscription',
}

/**
 * Formatted display structure containing all elements needed to update
 * the VS Code status bar item.
 */
export interface FormattedDisplay {
  /** The text to display in the status bar */
  text: string;
  
  /** The tooltip (can be plain string or MarkdownString) */
  tooltip: string | vscode.MarkdownString;
  
  /** Optional background color for warning/error states */
  backgroundColor?: vscode.ThemeColor;
  
  /** Icon to prefix the text (Codicon identifier, e.g., "$(check)") */
  icon: string;
  
  /** The current display state */
  state: DisplayState;
}

/**
 * Configuration for status bar display behavior.
 */
export interface StatusBarConfig {
  /** Whether the status bar item is visible */
  enabled: boolean;
  
  /** Display format for usage text */
  displayFormat: 'compact' | 'detailed' | 'percentage';
  
  /** Threshold percentage (0-100) for warning state */
  warningThreshold: number;
  
  /** Priority value for status bar positioning (higher = more left) */
  priority: number;
  
  /** Whether to show icons in status bar text */
  showIcons: boolean;
}

/**
 * Default configuration values.
 */
export const DEFAULT_STATUS_BAR_CONFIG: StatusBarConfig = {
  enabled: true,
  displayFormat: 'compact',
  warningThreshold: 90,
  priority: 100,
  showIcons: true,
};

/**
 * Usage data from GitHub Copilot API.
 * This is defined in spec 002-usage-api-integration.
 */
export interface UsageData {
  /** Number of included requests used in current billing period */
  includedUsed: number;
  
  /** Total included requests in subscription */
  includedTotal: number;
  
  /** Number of budget (overage) requests used */
  budgetUsed: number;
  
  /** Total budget (overage) requests available (0 if no budget) */
  budgetTotal: number;
  
  /** Timestamp of last data refresh */
  lastRefreshTime: number;
  
  /** End date of current billing period */
  billingPeriodEnd: string; // ISO 8601 format
}
