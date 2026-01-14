import * as vscode from 'vscode';
import * as sinon from 'sinon';
/**
 * Mock VS Code StatusBarItem for testing.
 */
export declare class MockStatusBarItem implements vscode.StatusBarItem {
    id: string;
    alignment: vscode.StatusBarAlignment;
    priority: number | undefined;
    name: string | undefined;
    text: string;
    tooltip: string | vscode.MarkdownString | undefined;
    color: string | vscode.ThemeColor | undefined;
    backgroundColor: vscode.ThemeColor | undefined;
    command: string | vscode.Command | undefined;
    accessibilityInformation: vscode.AccessibilityInformation | undefined;
    show: sinon.SinonStub<any[], any>;
    hide: sinon.SinonStub<any[], any>;
    dispose: sinon.SinonStub<any[], any>;
}
/**
 * Create a mock status bar item.
 */
export declare function createMockStatusBarItem(): MockStatusBarItem;
/**
 * Mock VS Code window namespace.
 */
export declare const mockWindow: {
    createStatusBarItem: sinon.SinonStub<[alignment?: vscode.StatusBarAlignment | undefined, priority?: number | undefined], vscode.StatusBarItem>;
    showInformationMessage: sinon.SinonStub<any[], any>;
    showErrorMessage: sinon.SinonStub<any[], any>;
    showWarningMessage: sinon.SinonStub<any[], any>;
    showQuickPick: sinon.SinonStub<any[], any>;
};
/**
 * Mock VS Code commands namespace.
 */
export declare const mockCommands: {
    registerCommand: sinon.SinonStub<[string, (...args: any[]) => any], vscode.Disposable>;
    executeCommand: sinon.SinonStub<any[], any>;
};
/**
 * Mock VS Code ThemeColor.
 */
export declare class MockThemeColor extends vscode.ThemeColor {
    id: string;
    constructor(id: string);
}
/**
 * Reset all mocks.
 */
export declare function resetMocks(): void;
//# sourceMappingURL=vscode.mock.d.ts.map