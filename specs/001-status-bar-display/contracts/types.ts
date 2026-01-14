/**
 * Type definitions for Status Bar Display feature
 * 
 * @feature 001-status-bar-display
 * @phase Phase 1 - Design & Contracts
 */

import * as vscode from 'vscode';

/**
 * Display state enum representing the current state of the status bar item.
 * 
 * State transitions follow the state machine defined in data-model.md.
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
 * 
 * This is the output type of the formatter service.
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
 * Internal state maintained by StatusBarController.
 * 
 * This is not exposed in the public API but is used internally
 * to track the controller's state.
 */
export interface StatusBarState {
  /** The VS Code status bar item instance */
  statusBarItem: vscode.StatusBarItem;

  /** Current display state */
  displayState: DisplayState;

  /** Last formatted display (for comparison/caching) */
  lastDisplay?: FormattedDisplay;

  /** Latest usage data received */
  currentData?: UsageData;

  /** Current configuration */
  config: StatusBarConfig;

  /** Error message if in ERROR state */
  errorMessage?: string;

  /** Disposables for cleanup */
  subscriptions: vscode.Disposable[];
}

/**
 * Re-export UsageData from spec 002 for convenience.
 * 
 * This allows consumers to import both UsageData and DisplayState
 * from the same module.
 */
export { UsageData } from '../../002-usage-api-integration/contracts/types';

/**
 * Re-export StatusBarConfig from controller interface.
 */
export { StatusBarConfig } from './IStatusBarController';
