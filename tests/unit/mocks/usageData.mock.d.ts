import { UsageData } from '../../../src/statusBar/types';
/**
 * Create mock usage data for testing.
 */
export declare function createMockUsageData(overrides?: Partial<UsageData>): UsageData;
/**
 * Mock usage data scenarios for testing.
 */
export declare const MockUsageDataScenarios: {
    /** Normal usage (83%) */
    normal: UsageData;
    /** High usage warning (95%) */
    warning: UsageData;
    /** At quota limit (100%) */
    atLimit: UsageData;
    /** With budget requests */
    withBudget: UsageData;
    /** Low usage (10%) */
    low: UsageData;
    /** Zero usage */
    zero: UsageData;
};
//# sourceMappingURL=usageData.mock.d.ts.map