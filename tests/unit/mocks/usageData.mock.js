"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockUsageDataScenarios = void 0;
exports.createMockUsageData = createMockUsageData;
/**
 * Create mock usage data for testing.
 */
function createMockUsageData(overrides) {
    return {
        includedUsed: 250,
        includedTotal: 300,
        budgetUsed: 0,
        lastRefreshTime: Date.now(),
        billingPeriodEnd: '2026-02-01T00:00:00Z',
        ...overrides,
    };
}
/**
 * Mock usage data scenarios for testing.
 */
exports.MockUsageDataScenarios = {
    /** Normal usage (83%) */
    normal: createMockUsageData({ includedUsed: 250, includedTotal: 300 }),
    /** High usage warning (95%) */
    warning: createMockUsageData({ includedUsed: 285, includedTotal: 300 }),
    /** At quota limit (100%) */
    atLimit: createMockUsageData({ includedUsed: 300, includedTotal: 300 }),
    /** With budget requests */
    withBudget: createMockUsageData({ includedUsed: 300, includedTotal: 300, budgetUsed: 15 }),
    /** Low usage (10%) */
    low: createMockUsageData({ includedUsed: 10, includedTotal: 100 }),
    /** Zero usage */
    zero: createMockUsageData({ includedUsed: 0, includedTotal: 300 }),
};
//# sourceMappingURL=usageData.mock.js.map