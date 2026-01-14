"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const StatusBarFormatter_1 = require("../../../src/statusBar/StatusBarFormatter");
const usageData_mock_1 = require("../mocks/usageData.mock");
const types_1 = require("../../../src/statusBar/types");
describe('StatusBarFormatter', () => {
    let formatter;
    beforeEach(() => {
        formatter = new StatusBarFormatter_1.StatusBarFormatter();
    });
    describe('formatCompact', () => {
        it('should format basic usage without budget', () => {
            const data = (0, usageData_mock_1.createMockUsageData)({ includedUsed: 250, includedTotal: 300 });
            const result = formatter.formatCompact(data, false);
            (0, chai_1.expect)(result).to.equal('Copilot: 250/300 (83%)');
        });
        it('should format usage with budget', () => {
            const data = (0, usageData_mock_1.createMockUsageData)({
                includedUsed: 250,
                includedTotal: 300,
                budgetUsed: 5
            });
            const result = formatter.formatCompact(data, false);
            (0, chai_1.expect)(result).to.equal('Copilot: 250/300 + 5 budget (83%)');
        });
        it('should include icon when requested', () => {
            const data = (0, usageData_mock_1.createMockUsageData)({ includedUsed: 250, includedTotal: 300 });
            const result = formatter.formatCompact(data, true);
            (0, chai_1.expect)(result).to.match(/^\$\(.*\) Copilot:/);
        });
        it('should handle zero usage', () => {
            const data = usageData_mock_1.MockUsageDataScenarios.zero;
            const result = formatter.formatCompact(data, false);
            (0, chai_1.expect)(result).to.equal('Copilot: 0/300 (0%)');
        });
        it('should handle 100% usage', () => {
            const data = usageData_mock_1.MockUsageDataScenarios.atLimit;
            const result = formatter.formatCompact(data, false);
            (0, chai_1.expect)(result).to.equal('Copilot: 300/300 (100%)');
        });
    });
    describe('calculatePercentage', () => {
        it('should calculate percentage correctly', () => {
            const data = (0, usageData_mock_1.createMockUsageData)({ includedUsed: 250, includedTotal: 300 });
            const result = formatter.calculatePercentage(data);
            (0, chai_1.expect)(result).to.equal(83);
        });
        it('should round to nearest integer', () => {
            const data = (0, usageData_mock_1.createMockUsageData)({ includedUsed: 251, includedTotal: 300 });
            const result = formatter.calculatePercentage(data);
            (0, chai_1.expect)(result).to.equal(84); // 83.666... rounds to 84
        });
        it('should return 0 for zero total', () => {
            const data = (0, usageData_mock_1.createMockUsageData)({ includedUsed: 0, includedTotal: 0 });
            const result = formatter.calculatePercentage(data);
            (0, chai_1.expect)(result).to.equal(0);
        });
        it('should handle 100% usage', () => {
            const data = (0, usageData_mock_1.createMockUsageData)({ includedUsed: 100, includedTotal: 100 });
            const result = formatter.calculatePercentage(data);
            (0, chai_1.expect)(result).to.equal(100);
        });
    });
    describe('getIconForState', () => {
        it('should return loading icon for LOADING state', () => {
            const icon = formatter.getIconForState(types_1.DisplayState.LOADING);
            (0, chai_1.expect)(icon).to.equal('$(sync~spin)');
        });
        it('should return check icon for NORMAL state', () => {
            const icon = formatter.getIconForState(types_1.DisplayState.NORMAL);
            (0, chai_1.expect)(icon).to.equal('$(check)');
        });
        it('should return warning icon for WARNING state', () => {
            const icon = formatter.getIconForState(types_1.DisplayState.WARNING);
            (0, chai_1.expect)(icon).to.equal('$(warning)');
        });
        it('should return error icon for ERROR state', () => {
            const icon = formatter.getIconForState(types_1.DisplayState.ERROR);
            (0, chai_1.expect)(icon).to.equal('$(error)');
        });
        it('should return person icon for NO_AUTH state', () => {
            const icon = formatter.getIconForState(types_1.DisplayState.NO_AUTH);
            (0, chai_1.expect)(icon).to.equal('$(person)');
        });
        it('should return x icon for NO_SUBSCRIPTION state', () => {
            const icon = formatter.getIconForState(types_1.DisplayState.NO_SUBSCRIPTION);
            (0, chai_1.expect)(icon).to.equal('$(x)');
        });
    });
});
//# sourceMappingURL=StatusBarFormatter.test.js.map