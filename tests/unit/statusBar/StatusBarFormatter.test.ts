import { expect } from 'chai';
import { StatusBarFormatter } from '../../../src/statusBar/StatusBarFormatter';
import { createMockUsageData, MockUsageDataScenarios } from '../mocks/usageData.mock';
import { DisplayState } from '../../../src/statusBar/types';

describe('StatusBarFormatter', () => {
  let formatter: StatusBarFormatter;

  beforeEach(() => {
    formatter = new StatusBarFormatter();
  });

  describe('formatCompact', () => {
    it('should format basic usage without budget', () => {
      const data = createMockUsageData({ includedUsed: 250, includedTotal: 300 });
      const result = formatter.formatCompact(data, false);
      expect(result).to.equal('Copilot: 250/300 (83%)');
    });

    it('should format usage with budget', () => {
      const data = createMockUsageData({ 
        includedUsed: 250, 
        includedTotal: 300,
        budgetUsed: 5
      });
      const result = formatter.formatCompact(data, false);
      expect(result).to.equal('Copilot: 250/300 + 5 budget (83%)');
    });

    it('should include icon when requested', () => {
      const data = createMockUsageData({ includedUsed: 250, includedTotal: 300 });
      const result = formatter.formatCompact(data, true);
      expect(result).to.match(/^\$\(.*\) Copilot:/);
    });

    it('should handle zero usage', () => {
      const data = MockUsageDataScenarios.zero;
      const result = formatter.formatCompact(data, false);
      expect(result).to.equal('Copilot: 0/300 (0%)');
    });

    it('should handle 100% usage', () => {
      const data = MockUsageDataScenarios.atLimit;
      const result = formatter.formatCompact(data, false);
      expect(result).to.equal('Copilot: 300/300 (100%)');
    });
  });

  describe('calculatePercentage', () => {
    it('should calculate percentage correctly', () => {
      const data = createMockUsageData({ includedUsed: 250, includedTotal: 300 });
      const result = formatter.calculatePercentage(data);
      expect(result).to.equal(83);
    });

    it('should round to nearest integer', () => {
      const data = createMockUsageData({ includedUsed: 251, includedTotal: 300 });
      const result = formatter.calculatePercentage(data);
      expect(result).to.equal(84); // 83.666... rounds to 84
    });

    it('should return 0 for zero total', () => {
      const data = createMockUsageData({ includedUsed: 0, includedTotal: 0 });
      const result = formatter.calculatePercentage(data);
      expect(result).to.equal(0);
    });

    it('should handle 100% usage', () => {
      const data = createMockUsageData({ includedUsed: 100, includedTotal: 100 });
      const result = formatter.calculatePercentage(data);
      expect(result).to.equal(100);
    });
  });

  describe('getIconForState', () => {
    it('should return loading icon for LOADING state', () => {
      const icon = formatter.getIconForState(DisplayState.LOADING);
      expect(icon).to.equal('$(sync~spin)');
    });

    it('should return check icon for NORMAL state', () => {
      const icon = formatter.getIconForState(DisplayState.NORMAL);
      expect(icon).to.equal('$(check)');
    });

    it('should return warning icon for WARNING state', () => {
      const icon = formatter.getIconForState(DisplayState.WARNING);
      expect(icon).to.equal('$(warning)');
    });

    it('should return error icon for ERROR state', () => {
      const icon = formatter.getIconForState(DisplayState.ERROR);
      expect(icon).to.equal('$(error)');
    });

    it('should return person icon for NO_AUTH state', () => {
      const icon = formatter.getIconForState(DisplayState.NO_AUTH);
      expect(icon).to.equal('$(person)');
    });

    it('should return x icon for NO_SUBSCRIPTION state', () => {
      const icon = formatter.getIconForState(DisplayState.NO_SUBSCRIPTION);
      expect(icon).to.equal('$(x)');
    });
  });
  describe('getBackgroundColorForState', () => {
    it('should return undefined for NORMAL state', () => {
      const result = formatter.getBackgroundColorForState(DisplayState.NORMAL);
      expect(result).to.be.undefined;
    });

    it('should return undefined for LOADING state', () => {
      const result = formatter.getBackgroundColorForState(DisplayState.LOADING);
      expect(result).to.be.undefined;
    });

    it('should return warning color for WARNING state', () => {
      const result = formatter.getBackgroundColorForState(DisplayState.WARNING);
      expect(result).to.not.be.undefined;
      expect(result).to.have.property('id', 'statusBarItem.warningBackground');
    });

    it('should return error color for ERROR state', () => {
      const result = formatter.getBackgroundColorForState(DisplayState.ERROR);
      expect(result).to.not.be.undefined;
      expect(result).to.have.property('id', 'statusBarItem.errorBackground');
    });

    it('should return undefined for NO_AUTH state', () => {
      const result = formatter.getBackgroundColorForState(DisplayState.NO_AUTH);
      expect(result).to.be.undefined;
    });

    it('should return undefined for NO_SUBSCRIPTION state', () => {
      const result = formatter.getBackgroundColorForState(DisplayState.NO_SUBSCRIPTION);
      expect(result).to.be.undefined;
    });
  });

  describe('formatDetailed', () => {
    it('should format with percentage and "included" label', () => {
      const data = createMockUsageData({ includedUsed: 250, includedTotal: 300 });
      const result = formatter.formatDetailed(data, false);
      expect(result).to.equal('Copilot: 250/300 included (83%)');
    });

    it('should include icon when requested', () => {
      const data = createMockUsageData({ includedUsed: 250, includedTotal: 300 });
      const result = formatter.formatDetailed(data, true);
      expect(result).to.equal('$(check) Copilot: 250/300 included (83%)');
    });

    it('should handle 100% usage', () => {
      const data = createMockUsageData({ includedUsed: 100, includedTotal: 100 });
      const result = formatter.formatDetailed(data, false);
      expect(result).to.equal('Copilot: 100/100 included (100%)');
    });
  });

  describe('formatPercentage', () => {
    it('should format with percentage only', () => {
      const data = createMockUsageData({ includedUsed: 83, includedTotal: 100 });
      const result = formatter.formatPercentage(data, false);
      expect(result).to.equal('Copilot: 83%');
    });

    it('should include icon when requested', () => {
      const data = createMockUsageData({ includedUsed: 50, includedTotal: 100 });
      const result = formatter.formatPercentage(data, true);
      expect(result).to.match(/^\$\(.+\) Copilot: 50%$/);
    });

    it('should handle 100% usage', () => {
      const data = createMockUsageData({ includedUsed: 100, includedTotal: 100 });
      const result = formatter.formatPercentage(data, false);
      expect(result).to.equal('Copilot: 100%');
    });

    it('should handle 0% usage', () => {
      const data = createMockUsageData({ includedUsed: 0, includedTotal: 100 });
      const result = formatter.formatPercentage(data, false);
      expect(result).to.equal('Copilot: 0%');
    });
  });

  describe('budget display', () => {
    it('should include budget in compact format when budgetUsed > 0', () => {
      const data = createMockUsageData({ 
        includedUsed: 50, 
        includedTotal: 100, 
        budgetUsed: 10 
      });
      const result = formatter.formatCompact(data, false);
      expect(result).to.include('budget');
      expect(result).to.include('10');
    });

    it('should not include budget in compact format when budgetUsed = 0', () => {
      const data = createMockUsageData({ 
        includedUsed: 50, 
        includedTotal: 100, 
        budgetUsed: 0 
      });
      const result = formatter.formatCompact(data, false);
      expect(result).to.not.include('budget');
    });

    it('should include budget in detailed format when budgetUsed > 0', () => {
      const data = createMockUsageData({ 
        includedUsed: 50, 
        includedTotal: 100, 
        budgetUsed: 15 
      });
      const result = formatter.formatDetailed(data, false);
      expect(result).to.include('budget');
      expect(result).to.include('15');
    });

    it('should not include budget in detailed format when budgetUsed = 0', () => {
      const data = createMockUsageData({ 
        includedUsed: 50, 
        includedTotal: 100, 
        budgetUsed: 0 
      });
      const result = formatter.formatDetailed(data, false);
      expect(result).to.not.include('budget');
    });

    it('should include budget in tooltip when budgetUsed > 0', () => {
      const data = createMockUsageData({ 
        includedUsed: 50, 
        includedTotal: 100, 
        budgetUsed: 20 
      });
      const result = formatter.formatTooltip(data, DisplayState.NORMAL);
      expect(result.value).to.include('Budget Used');
      expect(result.value).to.include('20');
    });

    it('should not include budget in tooltip when budgetUsed = 0', () => {
      const data = createMockUsageData({ 
        includedUsed: 50, 
        includedTotal: 100, 
        budgetUsed: 0 
      });
      const result = formatter.formatTooltip(data, DisplayState.NORMAL);
      expect(result.value).to.not.include('Budget Used');
    });
  });
});

