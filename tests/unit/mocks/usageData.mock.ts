import { UsageData } from '../../../src/statusBar/types';

/**
 * Create mock usage data for testing.
 */
export function createMockUsageData(overrides?: Partial<UsageData>): UsageData {
  return {
    includedUsed: 250,
    includedTotal: 300,
    budgetUsed: 0,
    budgetTotal: 2000, // Default $20 budget (~2000 requests)
    lastRefreshTime: Date.now(),
    billingPeriodEnd: '2026-02-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Mock usage data scenarios for testing.
 */
export const MockUsageDataScenarios = {
  /** Normal usage (83%) */
  normal: createMockUsageData({ includedUsed: 250, includedTotal: 300 }),
  
  /** High usage warning (95%) */
  warning: createMockUsageData({ includedUsed: 285, includedTotal: 300 }),
  
  /** At quota limit (100%) */
  atLimit: createMockUsageData({ includedUsed: 300, includedTotal: 300 }),
  
  /** With budget requests */
  withBudget: createMockUsageData({ includedUsed: 300, includedTotal: 300, budgetUsed: 15, budgetTotal: 2000 }),
  
  /** Low usage (10%) */
  low: createMockUsageData({ includedUsed: 10, includedTotal: 100 }),
  
  /** Zero usage */
  zero: createMockUsageData({ includedUsed: 0, includedTotal: 300 }),
};
