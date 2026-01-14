"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockThemeColor = exports.mockCommands = exports.mockWindow = exports.MockStatusBarItem = void 0;
exports.createMockStatusBarItem = createMockStatusBarItem;
exports.resetMocks = resetMocks;
const vscode = __importStar(require("vscode"));
const sinon = __importStar(require("sinon"));
/**
 * Mock VS Code StatusBarItem for testing.
 */
class MockStatusBarItem {
    constructor() {
        this.id = 'test-status-bar';
        this.alignment = vscode.StatusBarAlignment.Right;
        this.priority = 100;
        this.name = 'Test Status Bar';
        this.text = '';
        this.tooltip = '';
        this.show = sinon.stub();
        this.hide = sinon.stub();
        this.dispose = sinon.stub();
    }
}
exports.MockStatusBarItem = MockStatusBarItem;
/**
 * Create a mock status bar item.
 */
function createMockStatusBarItem() {
    return new MockStatusBarItem();
}
/**
 * Mock VS Code window namespace.
 */
exports.mockWindow = {
    createStatusBarItem: sinon.stub().returns(new MockStatusBarItem()),
    showInformationMessage: sinon.stub(),
    showErrorMessage: sinon.stub(),
    showWarningMessage: sinon.stub(),
    showQuickPick: sinon.stub(),
};
/**
 * Mock VS Code commands namespace.
 */
exports.mockCommands = {
    registerCommand: sinon.stub().returns({
        dispose: sinon.stub(),
    }),
    executeCommand: sinon.stub(),
};
/**
 * Mock VS Code ThemeColor.
 */
class MockThemeColor extends vscode.ThemeColor {
    constructor(id) {
        super(id);
        this.id = id;
    }
}
exports.MockThemeColor = MockThemeColor;
/**
 * Reset all mocks.
 */
function resetMocks() {
    sinon.reset();
    exports.mockWindow.createStatusBarItem.returns(new MockStatusBarItem());
}
//# sourceMappingURL=vscode.mock.js.map