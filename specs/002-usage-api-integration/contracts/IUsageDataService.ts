import * as vscode from 'vscode';
import { UsageData } from '../../src/statusBar/types';

/**
 * Event emitted when usage data changes
 */
export interface UsageDataChangeEvent {
  /** New usage data (undefined if fetch failed and no cache available) */
  data: UsageData | undefined;
  
  /** Whether data came from cache vs fresh API fetch */
  fromCache: boolean;
  
  /** Error if fetch failed (even if fallback cache was used) */
  error?: Error;
  
  /** Age of cached data in milliseconds (if fromCache is true) */
  cacheAge?: number;
}

/**
 * High-level facade service orchestrating all API integration components
 * 
 * This service coordinates:
 * - GitHubAuthService (authentication)
 * - UsageApiClient (API requests)
 * - UsageCache (local persistence)
 * - RefreshScheduler (automatic polling)
 * 
 * Contract Requirements:
 * - MUST fetch on activation (FR-003)
 * - MUST auto-refresh at configured interval (FR-004)
 * - MUST handle authentication state changes (FR-015)
 * - MUST provide manual refresh (FR-014)
 * - MUST cache last successful response (FR-017)
 * - MUST emit events for StatusBarController to subscribe (integration with 001)
 * 
 * @example
 * ```typescript
 * // In extension.ts activate()
 * const usageDataService = new UsageDataService(context);
 * 
 * // Subscribe to data changes
 * usageDataService.onDataChange(event => {
 *   if (event.data) {
 *     statusBarController.updateDisplay(event.data);
 *   } else if (event.error) {
 *     statusBarController.showError(event.error.message);
 *   }
 * });
 * 
 * // Start service (fetch initial data and start auto-refresh)
 * await usageDataService.activate();
 * 
 * // Manual refresh command
 * commands.registerCommand('copilotPremiumRequests.refresh', async () => {
 *   await usageDataService.refresh();
 * });
 * ```
 */
export interface IUsageDataService extends vscode.Disposable {
  /**
   * Activate the service
   * 
   * @remarks
   * - Fetches initial usage data (FR-003)
   * - Starts automatic refresh timer (FR-004)
   * - Subscribes to authentication changes
   * - Falls back to cache if initial fetch fails
   * - Emits initial UsageDataChangeEvent
   * 
   * Call Order:
   * 1. Check authentication
   * 2. Try fetch from API
   * 3. On success: cache + emit event
   * 4. On failure: try cache + emit event with error
   * 5. Start automatic refresh scheduler
   * 
   * @throws Never throws - handles all errors internally and emits via events
   */
  activate(): Promise<void>;
  
  /**
   * Get current usage data
   * 
   * @returns Current data from memory, or undefined if unavailable
   * 
   * @remarks
   * - Returns in-memory cached copy (no API call)
   * - Use refresh() to fetch fresh data
   * - Returns undefined if no data has been fetched yet
   * - Synchronous access to data (Promise for consistency with other methods)
   */
  getCurrentData(): Promise<UsageData | undefined>;
  
  /**
   * Manually refresh usage data
   * 
   * @returns Promise that resolves when refresh completes
   * 
   * @remarks
   * - Satisfies FR-014 (manual refresh command)
   * - Triggers immediate API fetch
   * - Respects concurrency control (waits if auto-refresh in progress)
   * - Emits UsageDataChangeEvent on success or failure
   * - Updates cache on successful fetch
   * - Falls back to cache on failure (if available)
   * 
   * @throws Never throws - emits errors via UsageDataChangeEvent
   */
  refresh(): Promise<void>;
  
  /**
   * Subscribe to usage data changes
   * 
   * @param callback Function called whenever data changes (fetch, refresh, cache fallback, errors)
   * @returns Disposable to unsubscribe
   * 
   * @remarks
   * - Called on every data update (successful or failed)
   * - Called when initial activation fetch completes
   * - Called on each automatic refresh
   * - Called on manual refresh
   * - Called when authentication state changes (sign-out clears data)
   * 
   * Event Properties:
   * - data: New usage data or undefined
   * - fromCache: True if showing cached data due to fetch failure
   * - error: Error object if fetch failed (even if cache fallback succeeded)
   * - cacheAge: Age in ms if fromCache is true
   * 
   * @example
   * ```typescript
   * usageDataService.onDataChange(event => {
   *   if (event.error) {
   *     console.error('Fetch failed:', event.error);
   *   }
   *   
   *   if (event.data) {
   *     if (event.fromCache) {
   *       console.log('Showing cached data (age: ' + event.cacheAge + 'ms)');
   *     }
   *     // Update UI with event.data
   *   } else {
   *     // No data available (no cache, fetch failed)
   *     // Show error state
   *   }
   * });
   * ```
   */
  onDataChange(callback: (event: UsageDataChangeEvent) => void | Promise<void>): vscode.Disposable;
}
