/**
 * Mock factories for webview testing
 */

import * as vscode from 'vscode';
import { SinonStub, stub } from 'sinon';

export interface MockWebview {
	html: string;
	options: vscode.WebviewOptions;
	onDidReceiveMessage: SinonStub;
	postMessage: SinonStub;
	asWebviewUri: SinonStub;
	cspSource: string;
}

export interface MockWebviewView {
	webview: MockWebview;
	visible: boolean;
	onDidChangeVisibility: SinonStub;
	onDidDispose: SinonStub;
	show: SinonStub;
}

/**
 * Creates a mock Webview object for testing
 */
export function createMockWebview(): MockWebview {
	return {
		html: '',
		options: {},
		onDidReceiveMessage: stub(),
		postMessage: stub().resolves(true),
		asWebviewUri: stub().callsFake((uri: vscode.Uri) => uri),
		cspSource: 'vscode-webview:',
	};
}

/**
 * Creates a mock WebviewView object for testing
 */
export function createMockWebviewView(): MockWebviewView {
	return {
		webview: createMockWebview(),
		visible: true,
		onDidChangeVisibility: stub(),
		onDidDispose: stub(),
		show: stub(),
	};
}

/**
 * Creates a mock WebviewViewResolveContext for testing
 */
export function createMockWebviewViewResolveContext(): vscode.WebviewViewResolveContext {
	return {
		state: undefined,
	};
}
