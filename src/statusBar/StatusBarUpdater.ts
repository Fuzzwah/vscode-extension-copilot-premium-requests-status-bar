import { DisplayState, UsageData, StatusBarConfig } from './types';

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

/**
 * Service for determining and transitioning display states.
 */
export class StatusBarUpdater {
  /**
   * Determine the appropriate display state based on current conditions.
   */
  public determineState(conditions: StateConditions): DisplayState {
    // Priority order (highest to lowest):
    
    // 1. Not authenticated
    if (!conditions.isAuthenticated) {
      return DisplayState.NO_AUTH;
    }
    
    // 2. No subscription
    if (!conditions.hasSubscription) {
      return DisplayState.NO_SUBSCRIPTION;
    }
    
    // 3. Error state
    if (conditions.error !== undefined) {
      return DisplayState.ERROR;
    }
    
    // 4. Loading state (no data yet)
    if (conditions.data === undefined) {
      return DisplayState.LOADING;
    }
    
    // 5. Warning or normal based on threshold
    const percentUsed = (conditions.data.includedUsed / conditions.data.includedTotal) * 100;
    if (percentUsed >= conditions.config.warningThreshold) {
      return DisplayState.WARNING;
    }
    
    return DisplayState.NORMAL;
  }

  /**
   * Check if usage has exceeded the warning threshold.
   */
  public isWarningThresholdExceeded(data: UsageData, threshold: number): boolean {
    if (data.includedTotal === 0) {
      return false;
    }
    const percentUsed = (data.includedUsed / data.includedTotal) * 100;
    return percentUsed >= threshold;
  }

  /**
   * Validate that a state transition is valid.
   */
  public isValidTransition(_currentState: DisplayState, _newState: DisplayState): boolean {
    // All transitions are valid for this simple state machine
    // Any state can transition to any other state based on conditions
    return true;
  }

  /**
   * Validate that usage data is valid.
   */
  public validateUsageData(data: UsageData): boolean {
    if (data.includedTotal <= 0) {
      throw new Error('includedTotal must be greater than 0');
    }
    if (data.includedUsed < 0) {
      throw new Error('includedUsed cannot be negative');
    }
    if (data.budgetUsed < 0) {
      throw new Error('budgetUsed cannot be negative');
    }
    return true;
  }
}
