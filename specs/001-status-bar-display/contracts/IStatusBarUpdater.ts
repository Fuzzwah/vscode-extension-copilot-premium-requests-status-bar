/**
 * Status Bar Updater Interface
 * 
 * Determines the appropriate display state based on usage data, configuration,
 * and authentication status.
 * 
 * @feature 001-status-bar-display
 * @phase Phase 1 - Design & Contracts
 */

import { DisplayState } from './types';
import { UsageData } from '../../002-usage-api-integration/contracts/types';
import { StatusBarConfig } from './IStatusBarController';

/**
 * Service for determining and transitioning display states.
 * 
 * Responsibilities:
 * - Evaluate current conditions (auth, subscription, data, errors)
 * - Determine the appropriate DisplayState
 * - Validate state transitions
 * - Check warning threshold
 * 
 * @example
 * ```typescript
 * const updater = new StatusBarUpdater();
 * 
 * const state = updater.determineState({
 *   data: usageData,
 *   isAuthenticated: true,
 *   hasSubscription: true,
 *   error: undefined,
 *   config
 * });
 * 
 * if (state === DisplayState.WARNING) {
 *   // Show warning notification
 * }
 * ```
 */
export interface IStatusBarUpdater {
  /**
   * Determine the appropriate display state based on current conditions.
   * 
   * This method implements the priority-based state determination algorithm:
   * 
   * Priority order (highest to lowest):
   * 1. NO_AUTH - User not authenticated with GitHub
   * 2. NO_SUBSCRIPTION - User has no Copilot subscription
   * 3. ERROR - API error or invalid data
   * 4. LOADING - No data available yet
   * 5. WARNING - Usage exceeds threshold
   * 6. NORMAL - Default state
   * 
   * @param conditions - Current state conditions
   * @returns The determined DisplayState
   * 
   * @example
   * ```typescript
   * // Normal state
   * updater.determineState({
   *   data: { includedUsed: 100, includedTotal: 300, ... },
   *   isAuthenticated: true,
   *   hasSubscription: true,
   *   error: undefined,
   *   config: { warningThreshold: 90, ... }
   * });
   * // Returns: DisplayState.NORMAL
   * 
   * // Warning state
   * updater.determineState({
   *   data: { includedUsed: 285, includedTotal: 300, ... },
   *   isAuthenticated: true,
   *   hasSubscription: true,
   *   error: undefined,
   *   config: { warningThreshold: 90, ... }
   * });
   * // Returns: DisplayState.WARNING
   * 
   * // Error state
   * updater.determineState({
   *   data: undefined,
   *   isAuthenticated: true,
   *   hasSubscription: true,
   *   error: new Error("Network timeout"),
   *   config
   * });
   * // Returns: DisplayState.ERROR
   * ```
   */
  determineState(conditions: StateConditions): DisplayState;

  /**
   * Check if usage has exceeded the warning threshold.
   * 
   * @param data - Usage data
   * @param threshold - Warning threshold percentage (0-100)
   * @returns True if usage >= threshold
   * 
   * @example
   * ```typescript
   * updater.isWarningThresholdExceeded(
   *   { includedUsed: 285, includedTotal: 300, ... },
   *   90
   * );
   * // Returns: true (95% >= 90%)
   * ```
   */
  isWarningThresholdExceeded(data: UsageData, threshold: number): boolean;

  /**
   * Validate that a state transition is valid.
   * 
   * Valid transitions follow the state machine diagram in data-model.md.
   * Some transitions are always allowed (e.g., any state → ERROR),
   * while others are restricted (e.g., NORMAL → NO_AUTH requires re-evaluation).
   * 
   * @param currentState - Current display state
   * @param newState - Proposed new state
   * @returns True if transition is valid
   * 
   * @example
   * ```typescript
   * updater.isValidTransition(DisplayState.LOADING, DisplayState.NORMAL);
   * // Returns: true
   * 
   * updater.isValidTransition(DisplayState.NORMAL, DisplayState.LOADING);
   * // Returns: true (manual refresh)
   * 
   * updater.isValidTransition(DisplayState.NO_SUBSCRIPTION, DisplayState.NORMAL);
   * // Returns: true (subscription activated)
   * ```
   */
  isValidTransition(currentState: DisplayState, newState: DisplayState): boolean;

  /**
   * Validate that usage data is valid.
   * 
   * Checks:
   * - includedTotal > 0 (cannot divide by zero)
   * - includedUsed >= 0 (cannot be negative)
   * - budgetUsed >= 0 (cannot be negative)
   * 
   * @param data - Usage data to validate
   * @returns True if valid
   * 
   * @throws {Error} If data is invalid with reason
   * 
   * @example
   * ```typescript
   * updater.validateUsageData({
   *   includedUsed: 250,
   *   includedTotal: 300,
   *   budgetUsed: 5,
   *   lastRefreshTime: Date.now(),
   *   billingPeriodEnd: "2026-02-01T00:00:00Z"
   * });
   * // Returns: true
   * 
   * updater.validateUsageData({
   *   includedUsed: 250,
   *   includedTotal: 0,  // Invalid!
   *   budgetUsed: 5,
   *   ...
   * });
   * // Throws: Error("includedTotal must be greater than 0")
   * ```
   */
  validateUsageData(data: UsageData): boolean;
}

/**
 * Conditions used to determine the current display state.
 */
export interface StateConditions {
  /** Current usage data (undefined if not yet loaded) */
  data: UsageData | undefined;

  /** Whether the user is authenticated with GitHub */
  isAuthenticated: boolean;

  /** Whether the user has a Copilot subscription */
  hasSubscription: boolean;

  /** Current error (undefined if no error) */
  error: Error | undefined;

  /** Current configuration */
  config: StatusBarConfig;
}
