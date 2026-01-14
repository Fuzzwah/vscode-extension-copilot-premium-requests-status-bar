import * as vscode from 'vscode';
import * as sinon from 'sinon';

/**
 * Mock VS Code StatusBarItem for testing.
 */
export class MockStatusBarItem implements vscode.StatusBarItem {
  public id: string = 'test-status-bar';
  public alignment: vscode.StatusBarAlignment = vscode.StatusBarAlignment.Right;
  public priority: number | undefined = 100;
  public name: string | undefined = 'Test Status Bar';
  public text: string = '';
  public tooltip: string | vscode.MarkdownString | undefined = '';
  public color: string | vscode.ThemeColor | undefined;
  public backgroundColor: vscode.ThemeColor | undefined;
  public command: string | vscode.Command | undefined;
  public accessibilityInformation: vscode.AccessibilityInformation | undefined;
  
  public show = sinon.stub();
  public hide = sinon.stub();
  public dispose = sinon.stub();
}

/**
 * Create a mock status bar item.
 */
export function createMockStatusBarItem(): MockStatusBarItem {
  return new MockStatusBarItem();
}

/**
 * Mock VS Code window namespace.
 */
export const mockWindow = {
  createStatusBarItem: sinon.stub<
    [alignment?: vscode.StatusBarAlignment, priority?: number],
    vscode.StatusBarItem
  >().returns(new MockStatusBarItem()),
  showInformationMessage: sinon.stub(),
  showErrorMessage: sinon.stub(),
  showWarningMessage: sinon.stub(),
  showQuickPick: sinon.stub(),
};

/**
 * Mock VS Code commands namespace.
 */
export const mockCommands = {
  registerCommand: sinon.stub<[string, (...args: any[]) => any], vscode.Disposable>().returns({
    dispose: sinon.stub(),
  }),
  executeCommand: sinon.stub(),
};

/**
 * Mock VS Code ThemeColor.
 */
export class MockThemeColor extends vscode.ThemeColor {
  constructor(public id: string) {
    super(id);
  }
}

/**
 * Reset all mocks.
 */
export function resetMocks(): void {
  sinon.reset();
  mockWindow.createStatusBarItem.returns(new MockStatusBarItem());
}
