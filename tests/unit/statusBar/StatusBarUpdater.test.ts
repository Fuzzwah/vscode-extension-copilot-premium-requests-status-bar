import { expect } from 'chai';
import { StatusBarUpdater, StateConditions } from '../../../src/statusBar/StatusBarUpdater';
import { DisplayState } from '../../../src/statusBar/types';
import { createMockUsageData } from '../mocks/usageData.mock';
import { DEFAULT_STATUS_BAR_CONFIG } from '../../../src/statusBar/types';

describe('StatusBarUpdater', () => {
  let updater: StatusBarUpdater;

  beforeEach(() => {
    updater = new StatusBarUpdater();
  });

  describe('determineState', () => {
    it('should return ERROR when error is present', () => {
      const conditions: StateConditions = {
        data: createMockUsageData(),
        isAuthenticated: true,
        hasSubscription: true,
        error: new Error('Test error'),
        config: DEFAULT_STATUS_BAR_CONFIG,
      };
      const result = updater.determineState(conditions);
      expect(result).to.equal(DisplayState.ERROR);
    });

    it('should return NO_AUTH when not authenticated', () => {
      const conditions: StateConditions = {
        data: createMockUsageData(),
        isAuthenticated: false,
        hasSubscription: true,
        error: undefined,
        config: DEFAULT_STATUS_BAR_CONFIG,
      };
      const result = updater.determineState(conditions);
      expect(result).to.equal(DisplayState.NO_AUTH);
    });

    it('should return NO_SUBSCRIPTION when no subscription', () => {
      const conditions: StateConditions = {
        data: createMockUsageData(),
        isAuthenticated: true,
        hasSubscription: false,
        error: undefined,
        config: DEFAULT_STATUS_BAR_CONFIG,
      };
      const result = updater.determineState(conditions);
      expect(result).to.equal(DisplayState.NO_SUBSCRIPTION);
    });

    it('should return WARNING when usage equals total', () => {
      const data = createMockUsageData({ includedUsed: 100, includedTotal: 100 });
      const conditions: StateConditions = {
        data,
        isAuthenticated: true,
        hasSubscription: true,
        error: undefined,
        config: DEFAULT_STATUS_BAR_CONFIG,
      };
      const result = updater.determineState(conditions);
      expect(result).to.equal(DisplayState.WARNING);
    });

    it('should return WARNING when threshold exceeded', () => {
      const data = createMockUsageData({ includedUsed: 95, includedTotal: 100 });
      const conditions: StateConditions = {
        data,
        isAuthenticated: true,
        hasSubscription: true,
        error: undefined,
        config: DEFAULT_STATUS_BAR_CONFIG,
      };
      const result = updater.determineState(conditions);
      expect(result).to.equal(DisplayState.WARNING);
    });

    it('should return NORMAL when usage is below threshold', () => {
      const data = createMockUsageData({ includedUsed: 50, includedTotal: 100 });
      const conditions: StateConditions = {
        data,
        isAuthenticated: true,
        hasSubscription: true,
        error: undefined,
        config: DEFAULT_STATUS_BAR_CONFIG,
      };
      const result = updater.determineState(conditions);
      expect(result).to.equal(DisplayState.NORMAL);
    });

    it('should use custom warning threshold from config', () => {
      const data = createMockUsageData({ includedUsed: 80, includedTotal: 100 });
      const customConfig = { ...DEFAULT_STATUS_BAR_CONFIG, warningThreshold: 75 };
      const conditions: StateConditions = {
        data,
        isAuthenticated: true,
        hasSubscription: true,
        error: undefined,
        config: customConfig,
      };
      const result = updater.determineState(conditions);
      expect(result).to.equal(DisplayState.WARNING);
    });

    it('should return NORMAL when threshold not exceeded with custom config', () => {
      const data = createMockUsageData({ includedUsed: 70, includedTotal: 100 });
      const customConfig = { ...DEFAULT_STATUS_BAR_CONFIG, warningThreshold: 75 };
      const conditions: StateConditions = {
        data,
        isAuthenticated: true,
        hasSubscription: true,
        error: undefined,
        config: customConfig,
      };
      const result = updater.determineState(conditions);
      expect(result).to.equal(DisplayState.NORMAL);
    });
  });

  describe('isWarningThresholdExceeded', () => {
    it('should return true when usage exceeds default threshold (90%)', () => {
      const data = createMockUsageData({ includedUsed: 95, includedTotal: 100 });
      const result = updater.isWarningThresholdExceeded(data, 90);
      expect(result).to.be.true;
    });

    it('should return false when usage is below default threshold', () => {
      const data = createMockUsageData({ includedUsed: 85, includedTotal: 100 });
      const result = updater.isWarningThresholdExceeded(data, 90);
      expect(result).to.be.false;
    });

    it('should return true when exactly at threshold', () => {
      const data = createMockUsageData({ includedUsed: 90, includedTotal: 100 });
      const result = updater.isWarningThresholdExceeded(data, 90);
      expect(result).to.be.true;
    });

    it('should use custom threshold from config', () => {
      const data = createMockUsageData({ includedUsed: 80, includedTotal: 100 });
      const result = updater.isWarningThresholdExceeded(data, 75);
      expect(result).to.be.true;
    });

    it('should handle low total values correctly', () => {
      const data = createMockUsageData({ includedUsed: 9, includedTotal: 10 });
      const result = updater.isWarningThresholdExceeded(data, 90);
      expect(result).to.be.true; // 9/10 is exactly 90%, which meets the threshold
    });

    it('should handle zero usage', () => {
      const data = createMockUsageData({ includedUsed: 0, includedTotal: 100 });
      const result = updater.isWarningThresholdExceeded(data, 90);
      expect(result).to.be.false;
    });
  });

  describe('validateUsageData', () => {
    it('should return true for valid data', () => {
      const data = createMockUsageData({ includedUsed: 50, includedTotal: 100 });
      const result = updater.validateUsageData(data);
      expect(result).to.be.true;
    });

    it('should throw error when includedTotal is zero', () => {
      const data = createMockUsageData({ includedUsed: 0, includedTotal: 0 });
      expect(() => updater.validateUsageData(data)).to.throw('includedTotal must be greater than 0');
    });

    it('should throw error when includedTotal is negative', () => {
      const data = createMockUsageData({ includedUsed: 0, includedTotal: -100 });
      expect(() => updater.validateUsageData(data)).to.throw('includedTotal must be greater than 0');
    });

    it('should throw error when includedUsed is negative', () => {
      const data = createMockUsageData({ includedUsed: -10, includedTotal: 100 });
      expect(() => updater.validateUsageData(data)).to.throw('includedUsed cannot be negative');
    });

    it('should throw error when budgetUsed is negative', () => {
      const data = createMockUsageData({ includedUsed: 50, includedTotal: 100, budgetUsed: -5 });
      expect(() => updater.validateUsageData(data)).to.throw('budgetUsed cannot be negative');
    });

    it('should allow usage to exceed total (edge case)', () => {
      const data = createMockUsageData({ includedUsed: 150, includedTotal: 100 });
      const result = updater.validateUsageData(data);
      expect(result).to.be.true;
    });

    it('should allow zero usage', () => {
      const data = createMockUsageData({ includedUsed: 0, includedTotal: 100 });
      const result = updater.validateUsageData(data);
      expect(result).to.be.true;
    });

    it('should allow zero budget usage', () => {
      const data = createMockUsageData({ includedUsed: 50, includedTotal: 100, budgetUsed: 0 });
      const result = updater.validateUsageData(data);
      expect(result).to.be.true;
    });
  });

  describe('isValidTransition', () => {
    it('should allow transition from LOADING to NORMAL', () => {
      const result = updater.isValidTransition(DisplayState.LOADING, DisplayState.NORMAL);
      expect(result).to.be.true;
    });

    it('should allow transition from NORMAL to WARNING', () => {
      const result = updater.isValidTransition(DisplayState.NORMAL, DisplayState.WARNING);
      expect(result).to.be.true;
    });

    it('should allow transition from WARNING to ERROR', () => {
      const result = updater.isValidTransition(DisplayState.WARNING, DisplayState.ERROR);
      expect(result).to.be.true;
    });

    it('should allow transition from ERROR to LOADING', () => {
      const result = updater.isValidTransition(DisplayState.ERROR, DisplayState.LOADING);
      expect(result).to.be.true;
    });

    it('should allow transition from NO_AUTH to NORMAL', () => {
      const result = updater.isValidTransition(DisplayState.NO_AUTH, DisplayState.NORMAL);
      expect(result).to.be.true;
    });

    it('should allow transition from NO_SUBSCRIPTION to NORMAL', () => {
      const result = updater.isValidTransition(DisplayState.NO_SUBSCRIPTION, DisplayState.NORMAL);
      expect(result).to.be.true;
    });

    it('should allow same state transitions', () => {
      const result = updater.isValidTransition(DisplayState.NORMAL, DisplayState.NORMAL);
      expect(result).to.be.true;
    });
  });
});
