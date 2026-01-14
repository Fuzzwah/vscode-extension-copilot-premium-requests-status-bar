/**
 * Status Bar Controller Interface
 * 
 * Manages the lifecycle and state of the VS Code status bar item for displaying
 * GitHub Copilot premium request usage.
 * 
 * @feature 001-status-bar-display
 * @phase Phase 1 - Design & Contracts
 */

import * as vscode from 'vscode';
import { DisplayState } from './types';
import { UsageData } from '../../002-usage-api-integration/contracts/types';

/**
 * Main controller for the status bar display feature.
 * 
 * Responsibilities:
 * - Initialize and manage the VS Code StatusBarItem
 * - Subscribe to data and configuration changes
 * - Coordinate between formatter and updater services
 * - Manage display state transitions
 * - Handle user interactions (click events)
 * 
 * @example
 * ```typescript
 * const controller = new StatusBarController(
 *   usageDataService,
 *   configService,
 *   formatter,
 *   updater
 * );
 * 
 * controller.activate();
 * // Status bar appears and updates automatically
 * 
 * controller.dispose();
 * // Clean up resources
 * ```
 */
export interface IStatusBarController extends vscode.Disposable {
  /**
   * Activate the status bar controller.
   * 
   * This method:
   * 1. Creates the VS Code StatusBarItem
   * 2. Subscribes to data and configuration changes
   * 3. Sets initial loading state
   * 4. Shows the status bar item
   * 
   * @throws {Error} If called when already activated
   */
  activate(): void;

  /**
   * Update the status bar display with new usage data.
   * 
   * This method:
   * 1. Determines the new display state
   * 2. Formats the display using the formatter
   * 3. Applies the formatted display to the status bar item
   * 4. Updates the internal state
   * 
   * @param data - Latest usage data from the API service
   * 
   * @example
   * ```typescript
   * usageService.onDataChange((data) => {
   *   controller.updateDisplay(data);
   * });
   * ```
   */
  updateDisplay(data: UsageData): void;

  /**
   * Update the status bar configuration.
   * 
   * This method:
   * 1. Updates internal config state
   * 2. Re-evaluates warning threshold
   * 3. Re-formats display if needed
   * 4. Shows/hides status bar based on enabled setting
   * 
   * @param config - New configuration settings
   */
  updateConfig(config: StatusBarConfig): void;

  /**
   * Show an error state in the status bar.
   * 
   * @param error - The error that occurred
   * @param retryCallback - Optional callback to retry the failed operation
   * 
   * @example
   * ```typescript
   * try {
   *   await fetchUsageData();
   * } catch (error) {
   *   controller.showError(error, () => fetchUsageData());
   * }
   * ```
   */
  showError(error: Error, retryCallback?: () => void): void;

  /**
   * Show a loading state in the status bar.
   * 
   * Typically called when:
   * - Initial activation
   * - Manual refresh triggered
   * - Automatic refresh starting
   */
  showLoading(): void;

  /**
   * Get the current display state.
   * 
   * @returns The current DisplayState enum value
   * 
   * @example
   * ```typescript
   * if (controller.getState() === DisplayState.WARNING) {
   *   // Show warning notification
   * }
   * ```
   */
  getState(): DisplayState;

  /**
   * Clean up resources and dispose the status bar item.
   * 
   * This method:
   * 1. Disposes all event subscriptions
   * 2. Hides and disposes the StatusBarItem
   * 3. Clears internal state
   * 
   * Called automatically when the extension is deactivated.
   */
  dispose(): void;
}

/**
 * Configuration for status bar display behavior.
 * 
 * This interface defines all settings that affect how the status bar
 * displays usage information. Settings are read from VS Code workspace
 * configuration (see spec 003).
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
