import * as vscode from 'vscode';
import { DisplayState, UsageData, StatusBarConfig, DEFAULT_STATUS_BAR_CONFIG } from './types';
import { StatusBarFormatter } from './StatusBarFormatter';
import { StatusBarUpdater, StateConditions } from './StatusBarUpdater';

/**
 * Main controller for the status bar display feature.
 */
export class StatusBarController implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;
  private formatter: StatusBarFormatter;
  private updater: StatusBarUpdater;
  private currentState: DisplayState = DisplayState.LOADING;
  private currentData?: UsageData;
  private config: StatusBarConfig = DEFAULT_STATUS_BAR_CONFIG;
  private subscriptions: vscode.Disposable[] = [];

  constructor(
    formatter?: StatusBarFormatter,
    updater?: StatusBarUpdater
  ) {
    this.formatter = formatter || new StatusBarFormatter();
    this.updater = updater || new StatusBarUpdater();
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      this.config.priority
    );
  }

  /**
   * Activate the status bar controller.
   */
  public activate(): void {
    this.statusBarItem.command = 'copilotPremiumRequests.showDetails';
    this.showLoading();
    this.statusBarItem.show();
  }

  /**
   * Update the status bar display with new usage data.
   */
  public updateDisplay(data: UsageData): void {
    this.currentData = data;

    // Determine new state
    const conditions: StateConditions = {
      data,
      isAuthenticated: true, // TODO: Get from auth service
      hasSubscription: true, // TODO: Get from auth service
      error: undefined,
      config: this.config,
    };

    this.currentState = this.updater.determineState(conditions);

    // Format and apply display
    const display = this.formatter.format(data, this.currentState, this.config);
    
    this.statusBarItem.text = display.text;
    this.statusBarItem.tooltip = display.tooltip;
    this.statusBarItem.backgroundColor = display.backgroundColor;
  }

  /**
   * Update the status bar configuration.
   */
  public updateConfig(config: StatusBarConfig): void {
    this.config = config;
    
    // Re-apply display with new config
    if (this.currentData) {
      this.updateDisplay(this.currentData);
    }

    // Show/hide based on enabled setting
    if (config.enabled) {
      this.statusBarItem.show();
    } else {
      this.statusBarItem.hide();
    }
  }

  /**
   * Show an error state in the status bar.
   */
  public showError(_error: Error, retryCallback?: () => void): void {
    this.currentState = DisplayState.ERROR;

    const display = this.formatter.format(
      undefined,
      DisplayState.ERROR,
      this.config
    );

    this.statusBarItem.text = display.text;
    this.statusBarItem.tooltip = display.tooltip;
    this.statusBarItem.backgroundColor = display.backgroundColor;

    if (retryCallback) {
      this.statusBarItem.command = {
        title: 'Retry',
        command: 'copilotPremiumRequests.refresh',
      };
    }
  }

  /**
   * Show a loading state in the status bar.
   */
  public showLoading(): void {
    this.currentState = DisplayState.LOADING;

    const display = this.formatter.format(
      undefined,
      DisplayState.LOADING,
      this.config
    );

    this.statusBarItem.text = display.text;
    this.statusBarItem.tooltip = display.tooltip;
    this.statusBarItem.backgroundColor = display.backgroundColor;
  }

  /**
   * Get the current display state.
   */
  public getState(): DisplayState {
    return this.currentState;
  }

  /**
   * Get the current usage data.
   */
  public getCurrentData(): UsageData | undefined {
    return this.currentData;
  }

  /**
   * Clean up resources and dispose the status bar item.
   */
  public dispose(): void {
    this.statusBarItem.dispose();
    this.subscriptions.forEach((sub) => sub.dispose());
    this.subscriptions = [];
  }
}
