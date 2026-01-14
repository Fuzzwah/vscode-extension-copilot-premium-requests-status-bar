import { UsageData } from '../../src/statusBar/types';

/**
 * Cache freshness levels for determining data age
 */
export enum CacheFreshness {
  /** < 5 minutes old - show as current */
  FRESH = 'fresh',
  
  /** 5-60 minutes old - acceptable for display */
  VALID = 'valid',
  
  /** 1-24 hours old - show staleness warning */
  STALE = 'stale',
  
  /** > 24 hours old - show error indicator */
  VERY_STALE = 'very_stale'
}

/**
 * Service for caching usage data locally across VS Code sessions
 * 
 * Contract Requirements:
 * - MUST cache last successful response (FR-017)
 * - MUST clear cache when user signs out (FR-015)
 * - MUST persist across VS Code restarts
 * - MUST provide cache age information for staleness indicators
 * 
 * @example
 * ```typescript
 * const cache: IUsageCache = new UsageCache(context);
 * 
 * // Store fresh data
 * await cache.store(usageData);
 * 
 * // Retrieve later (e.g., on offline error)
 * const cached = await cache.retrieve();
 * const freshness = await cache.getFreshness();
 * 
 * if (freshness === CacheFreshness.FRESH) {
 *   // Show without staleness indicator
 * } else if (freshness === CacheFreshness.STALE) {
 *   // Show with warning
 * }
 * ```
 */
export interface IUsageCache {
  /**
   * Store usage data in persistent cache
   * 
   * @param data Usage data to cache
   * 
   * @remarks
   * - Overwrites any existing cached data
   * - Persists across VS Code restarts
   * - Stores timestamp automatically for age calculation
   * - Should be called after every successful API fetch
   */
  store(data: UsageData): Promise<void>;
  
  /**
   * Retrieve cached usage data
   * 
   * @returns Cached data or undefined if no cache exists
   * 
   * @remarks
   * - Returns undefined if cache was cleared or never set
   * - Does not automatically check freshness - use getFreshness() for that
   * - Safe to call even if cache is empty
   */
  retrieve(): Promise<UsageData | undefined>;
  
  /**
   * Get age of cached data in milliseconds
   * 
   * @returns Age in milliseconds since data was cached, or undefined if no cache
   * 
   * @remarks
   * - Useful for calculating custom staleness thresholds
   * - Returns undefined if retrieve() would return undefined
   */
  getCacheAge(): Promise<number | undefined>;
  
  /**
   * Get freshness level of cached data
   * 
   * @returns Freshness category or undefined if no cache
   * 
   * @remarks
   * Freshness levels:
   * - FRESH (< 5 min): Show as current
   * - VALID (5-60 min): Acceptable, show "cached" indicator
   * - STALE (1-24 hours): Show warning icon and "stale" text
   * - VERY_STALE (> 24 hours): Show error icon and "very old" text
   */
  getFreshness(): Promise<CacheFreshness | undefined>;
  
  /**
   * Clear all cached data
   * 
   * @remarks
   * - MUST be called when user signs out (FR-015)
   * - Safe to call even if cache is empty
   * - Cannot be undone
   */
  clear(): Promise<void>;
}
