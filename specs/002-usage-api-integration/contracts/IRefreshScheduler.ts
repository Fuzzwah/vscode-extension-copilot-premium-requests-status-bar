import * as vscode from 'vscode';

/**
 * Configuration for automatic refresh behavior
 */
export interface RefreshConfig {
  /** Refresh interval in seconds (default: 60, minimum: 30) */
  intervalSeconds: number;
  
  /** Whether auto-refresh is enabled (default: true) */
  enabled: boolean;
}

/**
 * Scheduler for automatic usage data refresh
 * 
 * Contract Requirements:
 * - MUST automatically refresh at configurable intervals (FR-004)
 * - MUST prevent overlapping requests (FR-013)
 * - MUST support manual refresh trigger (FR-014)
 * - MUST allow dynamic interval updates
 * - MUST clean up timers on dispose
 * 
 * @example
 * ```typescript
 * const scheduler: IRefreshScheduler = new RefreshScheduler(
 *   { intervalSeconds: 60, enabled: true },
 *   async () => {
 *     // Refresh callback - fetch new data
 *     await usageDataService.refresh();
 *   }
 * );
 * 
 * // Start automatic refresh
 * scheduler.start();
 * 
 * // User triggers manual refresh
 * await scheduler.trigger(); // Waits if refresh in progress
 * 
 * // User changes settings
 * scheduler.updateConfig({ intervalSeconds: 120, enabled: true });
 * 
 * // Extension deactivates
 * scheduler.dispose();
 * ```
 */
export interface IRefreshScheduler extends vscode.Disposable {
  /**
   * Start automatic refresh with configured interval
   * 
   * @remarks
   * - Starts timer based on config.intervalSeconds
   * - Does nothing if config.enabled is false
   * - Clears any existing timer before starting new one (idempotent)
   * - Refresh callback must handle its own errors
   * - Uses mutex to prevent overlapping refreshes
   */
  start(): void;
  
  /**
   * Stop automatic refresh
   * 
   * @remarks
   * - Clears the interval timer
   * - Does NOT cancel in-flight refresh (use dispose for that)
   * - Safe to call even if not started
   * - Idempotent
   */
  stop(): void;
  
  /**
   * Manually trigger refresh immediately
   * 
   * @returns Promise that resolves when refresh completes
   * 
   * @remarks
   * - Satisfies FR-014 (manual refresh command)
   * - Respects concurrency control (FR-013)
   * - If refresh already in progress, waits for it to complete before triggering new one
   * - Does NOT reset the automatic refresh timer
   * - Safe to call multiple times (queues properly)
   * 
   * @example
   * ```typescript
   * // User executes "Refresh Copilot Usage" command
   * await scheduler.trigger();
   * vscode.window.showInformationMessage('Usage data refreshed');
   * ```
   */
  trigger(): Promise<void>;
  
  /**
   * Update refresh configuration
   * 
   * @param config New refresh configuration
   * 
   * @remarks
   * - Restarts scheduler if it was running
   * - If config.enabled changes from true to false, stops scheduler
   * - If config.enabled changes from false to true, starts scheduler
   * - If only intervalSeconds changes, restarts with new interval
   * - Validates intervalSeconds >= minIntervalSeconds (default 30)
   */
  updateConfig(config: RefreshConfig): void;
  
  /**
   * Check if refresh is currently in progress
   * 
   * @returns True if refresh callback is executing
   * 
   * @remarks
   * - Useful for UI feedback (show loading indicator)
   * - Used internally to implement concurrency control
   */
  isRefreshing(): boolean;
}
