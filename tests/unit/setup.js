// Mock vscode module before any imports
const vscode = {
  StatusBarAlignment: {
    Left: 1,
    Right: 2,
  },
  ThemeColor: class ThemeColor {
    constructor(id) {
      this.id = id;
    }
  },
  MarkdownString: class MarkdownString {
    constructor(value, supportThemeIcons) {
      this.value = value || '';
      this.isTrusted = undefined;
      this.supportHtml = undefined;
      this.supportThemeIcons = supportThemeIcons;
      this.baseUri = undefined;
    }
    appendMarkdown(value) {
      this.value += value;
      return this;
    }
    appendText(value) {
      this.value += value;
      return this;
    }
    appendCodeblock(value, language) {
      this.value += '\n```' + (language || '') + '\n' + value + '\n```\n';
      return this;
    }
  },
  window: {
    createStatusBarItem: () => ({
      text: '',
      tooltip: undefined,
      backgroundColor: undefined,
      command: undefined,
      show: () => {},
      hide: () => {},
      dispose: () => {},
    }),
    showInformationMessage: () => Promise.resolve(undefined),
    showWarningMessage: () => Promise.resolve(undefined),
    showErrorMessage: () => Promise.resolve(undefined),
  },
  commands: {
    registerCommand: () => ({ dispose: () => {} }),
    executeCommand: () => Promise.resolve(undefined),
  },
};

// Override require for vscode module
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function (id) {
  if (id === 'vscode') {
    return vscode;
  }
  return originalRequire.apply(this, arguments);
};
