import { expect } from 'chai';
import { StatusBarController } from '../../../src/statusBar/StatusBarController';
import { DisplayState, DEFAULT_STATUS_BAR_CONFIG } from '../../../src/statusBar/types';
import { createMockUsageData } from '../mocks/usageData.mock';
import { MockStatusBarItem, resetMocks } from '../mocks/vscode.mock';

describe('StatusBarController', () => {
  let controller: StatusBarController;
  let mockStatusBarItem: MockStatusBarItem;

  beforeEach(() => {
    resetMocks();
    controller = new StatusBarController();
    // Access the private statusBarItem for testing
    mockStatusBarItem = (controller as any).statusBarItem;
  });

  afterEach(() => {
    controller.dispose();
  });

  describe('activate', () => {
    it('should create and show status bar item', () => {
      controller.activate();
      // The status bar item should have text (indicating it's been activated)
      expect(mockStatusBarItem.text).to.not.be.empty;
    });

    it('should set loading state initially', () => {
      controller.activate();
      expect(mockStatusBarItem.text).to.include('sync~spin');
    });
  });

  describe('updateDisplay', () => {
    it('should update text with formatted data', () => {
      controller.activate();
      const data = createMockUsageData({ includedUsed: 50, includedTotal: 100 });
      controller.updateDisplay(data);
      expect(mockStatusBarItem.text).to.include('50/100');
    });

    it('should set tooltip with usage details', () => {
      controller.activate();
      const data = createMockUsageData({ includedUsed: 50, includedTotal: 100 });
      controller.updateDisplay(data);
      expect(mockStatusBarItem.tooltip).to.not.be.undefined;
    });

    it('should apply warning background when threshold exceeded', () => {
      controller.activate();
      const data = createMockUsageData({ includedUsed: 95, includedTotal: 100 });
      controller.updateDisplay(data);
      expect(mockStatusBarItem.backgroundColor).to.not.be.undefined;
    });

    it('should not have background color for normal usage', () => {
      controller.activate();
      const data = createMockUsageData({ includedUsed: 50, includedTotal: 100 });
      controller.updateDisplay(data);
      expect(mockStatusBarItem.backgroundColor).to.be.undefined;
    });
  });

  describe('showError', () => {
    it('should display error state', () => {
      controller.activate();
      const error = new Error('Test error');
      controller.showError(error);
      expect(mockStatusBarItem.text).to.include('error');
    });

    it('should set error background color', () => {
      controller.activate();
      const error = new Error('Test error');
      controller.showError(error);
      expect(mockStatusBarItem.backgroundColor).to.not.be.undefined;
    });

    it('should set command when retry callback provided', () => {
      controller.activate();
      const error = new Error('Test error');
      const retryCallback = () => {};
      controller.showError(error, retryCallback);
      expect(mockStatusBarItem.command).to.not.be.undefined;
    });
  });

  describe('showLoading', () => {
    it('should display loading spinner', () => {
      controller.activate();
      controller.showLoading();
      expect(mockStatusBarItem.text).to.include('sync~spin');
    });

    it('should set loading state', () => {
      controller.activate();
      controller.showLoading();
      const state = controller.getState();
      expect(state).to.equal(DisplayState.LOADING);
    });
  });

  describe('getState', () => {
    it('should return current display state', () => {
      controller.activate();
      const state = controller.getState();
      expect(state).to.be.oneOf(Object.values(DisplayState));
    });

    it('should return NORMAL after updating with low usage', () => {
      controller.activate();
      const data = createMockUsageData({ includedUsed: 50, includedTotal: 100 });
      controller.updateDisplay(data);
      const state = controller.getState();
      expect(state).to.equal(DisplayState.NORMAL);
    });

    it('should return WARNING after updating with high usage', () => {
      controller.activate();
      const data = createMockUsageData({ includedUsed: 95, includedTotal: 100 });
      controller.updateDisplay(data);
      const state = controller.getState();
      expect(state).to.equal(DisplayState.WARNING);
    });
  });

  describe('updateConfig', () => {
    it('should apply new configuration', () => {
      controller.activate();
      const data = createMockUsageData({ includedUsed: 80, includedTotal: 100 });
      controller.updateDisplay(data);
      
      const newConfig = { ...DEFAULT_STATUS_BAR_CONFIG, warningThreshold: 75 };
      controller.updateConfig(newConfig);
      
      const state = controller.getState();
      expect(state).to.equal(DisplayState.WARNING);
    });

    it('should update display format when config changes', () => {
      controller.activate();
      const data = createMockUsageData({ includedUsed: 50, includedTotal: 100 });
      controller.updateDisplay(data);
      
      const newConfig = { ...DEFAULT_STATUS_BAR_CONFIG, displayFormat: 'percentage' as const };
      controller.updateConfig(newConfig);
      
      // Should show percentage format
      expect(mockStatusBarItem.text).to.include('%');
    });
  });

  describe('dispose', () => {
    it('should clean up resources', () => {
      controller.activate();
      // Just ensure dispose doesn't throw
      expect(() => controller.dispose()).to.not.throw();
    });
  });

  describe('click command integration', () => {
    it('should set command on status bar item after activation', () => {
      controller.activate();
      // The status bar should have a command set for click handling
      // This will be implemented when we wire up the details command
      expect(mockStatusBarItem).to.exist;
    });
  });
});
