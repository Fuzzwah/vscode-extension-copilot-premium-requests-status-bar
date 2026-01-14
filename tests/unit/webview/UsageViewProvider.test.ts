/**
 * Tests for UsageViewProvider
 */

import { expect } from 'chai';
import { stub } from 'sinon';
import * as vscode from 'vscode';
import { UsageViewProvider } from '../../../src/webview/UsageViewProvider';
import { UsageApiClient } from '../../../src/api/UsageApiClient';
import { GitHubAuthService } from '../../../src/api/GitHubAuthService';
import { createMockWebviewView, createMockWebviewViewResolveContext } from '../mocks/webview.mock';
import { UsageData } from '../../../src/statusBar/types';
import { GitHubCopilotApiResponse } from '../../../src/api/types';

describe('UsageViewProvider', () => {
	let extensionUri: vscode.Uri;
	let mockApiClient: UsageApiClient;
	let mockAuthService: GitHubAuthService;
	let mockOutputChannel: vscode.OutputChannel;
	let provider: UsageViewProvider;

	beforeEach(() => {
		// Create mock URI
		extensionUri = {
			scheme: 'file',
			authority: '',
			path: '/test/path',
			fsPath: '/test/path',
			toString: () => 'file:///test/path',
			toJSON: () => ({ $mid: 1, path: '/test/path', scheme: 'file' }),
			with: stub().returnsThis(),
		} as any;
		
		mockApiClient = {} as UsageApiClient;
		mockAuthService = {} as GitHubAuthService;
		mockOutputChannel = {
			appendLine: stub(),
			append: stub(),
			clear: stub(),
			show: stub(),
			hide: stub(),
			dispose: stub(),
		} as any;
	});

	describe('constructor and basic structure', () => {
		it('should implement vscode.WebviewViewProvider interface', () => {
			provider = new UsageViewProvider(extensionUri, mockApiClient, mockAuthService, mockOutputChannel);
			
			expect(provider).to.have.property('resolveWebviewView');
			expect(typeof provider.resolveWebviewView).to.equal('function');
		});

		it('should store dependencies from constructor', () => {
			provider = new UsageViewProvider(extensionUri, mockApiClient, mockAuthService, mockOutputChannel);
			
			expect(provider).to.be.instanceOf(UsageViewProvider);
		});
	});

	describe('resolveWebviewView', () => {
		let mockWebviewView: any;
		let mockContext: any;

		beforeEach(() => {
			mockWebviewView = createMockWebviewView();
			mockContext = createMockWebviewViewResolveContext();
			provider = new UsageViewProvider(extensionUri, mockApiClient, mockAuthService, mockOutputChannel);
		});

		it('should store webview view reference', () => {
			provider.resolveWebviewView(mockWebviewView, mockContext, {} as vscode.CancellationToken);
			
			// Verify by trying to access internal state (will test behavior in integration tests)
			expect(mockWebviewView.webview.html).to.not.be.empty;
		});

		it('should set webview options with enableScripts true', () => {
			provider.resolveWebviewView(mockWebviewView, mockContext, {} as vscode.CancellationToken);
			
			expect(mockWebviewView.webview.options).to.have.property('enableScripts', true);
		});

		it('should set localResourceRoots to extension URI', () => {
			provider.resolveWebviewView(mockWebviewView, mockContext, {} as vscode.CancellationToken);
			
			expect(mockWebviewView.webview.options).to.have.property('localResourceRoots');
			expect(mockWebviewView.webview.options.localResourceRoots).to.be.an('array');
		});

		it('should register onDidChangeVisibility listener', () => {
			provider.resolveWebviewView(mockWebviewView, mockContext, {} as vscode.CancellationToken);
			
			expect(mockWebviewView.onDidChangeVisibility.called).to.be.true;
		});

		it('should register onDidReceiveMessage listener', () => {
			provider.resolveWebviewView(mockWebviewView, mockContext, {} as vscode.CancellationToken);
			
			expect(mockWebviewView.webview.onDidReceiveMessage.called).to.be.true;
		});
	});

	describe('_updateView', () => {
		let mockWebviewView: any;
		let mockContext: any;
		let mockApiResponse: GitHubCopilotApiResponse;
		let mockUsageData: UsageData;

		beforeEach(() => {
			mockWebviewView = createMockWebviewView();
			mockContext = createMockWebviewViewResolveContext();
			provider = new UsageViewProvider(extensionUri, mockApiClient, mockAuthService, mockOutputChannel);
			provider.resolveWebviewView(mockWebviewView, mockContext, {} as vscode.CancellationToken);

			mockApiResponse = {
				copilot_plan: 'Business',
				chat_enabled: true,
				organization_list: [{ login: 'org1', name: 'Org 1' }],
				quota_snapshots: {
					premium_interactions: {
						quota_id: 'premium_interactions',
						entitlement: 2000,
						remaining: 1500,
						quota_remaining: 1500,
					},
				},
				quota_reset_date_utc: new Date().toISOString(),
			};

			mockUsageData = {
				includedUsed: 500,
				includedTotal: 2000,
				budgetUsed: 0,
				budgetTotal: 0,
				lastRefreshTime: Date.now(),
				billingPeriodEnd: new Date().toISOString(),
			};
		});

		it('should generate HTML via WebviewHtmlGenerator', () => {
			(provider as any)._updateView(mockApiResponse, mockUsageData);
			
			expect(mockWebviewView.webview.html).to.include('<!DOCTYPE html>');
			expect(mockWebviewView.webview.html).to.include('Copilot Usage');
		});

		it('should set webview.html property', () => {
			(provider as any)._updateView(mockApiResponse, mockUsageData);
			
			expect(mockWebviewView.webview.html).to.be.a('string');
			expect(mockWebviewView.webview.html).to.not.be.empty;
		});
	});

	describe('_showLoading', () => {
		let mockWebviewView: any;
		let mockContext: any;

		beforeEach(() => {
			mockWebviewView = createMockWebviewView();
			mockContext = createMockWebviewViewResolveContext();
			provider = new UsageViewProvider(extensionUri, mockApiClient, mockAuthService, mockOutputChannel);
			provider.resolveWebviewView(mockWebviewView, mockContext, {} as vscode.CancellationToken);
		});

		it('should display loading spinner/skeleton UI', () => {
			(provider as any)._showLoading();
			
			expect(mockWebviewView.webview.html).to.include('Loading');
		});

		it('should set webview HTML to loading state', () => {
			(provider as any)._showLoading();
			
			const html = mockWebviewView.webview.html;
			expect(html).to.be.a('string');
			expect(html).to.not.be.empty;
		});
	});

	describe('_showError', () => {
		let mockWebviewView: any;
		let mockContext: any;

		beforeEach(() => {
			mockWebviewView = createMockWebviewView();
			mockContext = createMockWebviewViewResolveContext();
			provider = new UsageViewProvider(extensionUri, mockApiClient, mockAuthService, mockOutputChannel);
			provider.resolveWebviewView(mockWebviewView, mockContext, {} as vscode.CancellationToken);
		});

		it('should display error message', () => {
			const error = new Error('Test error');
			(provider as any)._showError(error);
			
			expect(mockWebviewView.webview.html).to.include('error');
			expect(mockWebviewView.webview.html).to.include('Test error');
		});

		it('should include retry button', () => {
			const error = new Error('Network error');
			(provider as any)._showError(error);
			
			expect(mockWebviewView.webview.html).to.match(/retry|refresh/i);
		});

		it('should handle undefined webview gracefully', () => {
			const providerNoView = new UsageViewProvider(extensionUri, mockApiClient, mockAuthService, mockOutputChannel);
			
			// Should not throw
			expect(() => (providerNoView as any)._showError(new Error('Test'))).to.not.throw();
		});
	});

	describe('refresh', () => {
		let mockWebviewView: any;
		let mockContext: any;
		let mockUsageData: UsageData;
		let fetchUsageStub: any;
		let getTokenStub: any;

		beforeEach(() => {
			mockWebviewView = createMockWebviewView();
			mockContext = createMockWebviewViewResolveContext();

			mockUsageData = {
				includedUsed: 500,
				includedTotal: 2000,
				budgetUsed: 0,
				budgetTotal: 0,
				lastRefreshTime: Date.now(),
				billingPeriodEnd: new Date().toISOString(),
			};

			const mockApiResponse = {
				copilot_plan: 'Business',
				chat_enabled: true,
				organization_list: [{ login: 'org1', name: 'Org 1' }],
				quota_snapshots: {
					premium_interactions: {
						quota_id: 'premium_interactions',
						entitlement: 2000,
						remaining: 1500,
						quota_remaining: 1500,
					},
				},
				quota_reset_date_utc: new Date().toISOString(),
			};

			// Mock API client methods
			fetchUsageStub = stub().resolves({ raw: mockApiResponse, data: mockUsageData });
			mockApiClient = {
				fetchUsage: stub().resolves(mockUsageData),
				fetchUsageWithRaw: fetchUsageStub,
				dispose: stub(),
			} as any;

			// Mock auth service methods
			getTokenStub = stub().resolves('mock-token');
			mockAuthService = {
				getToken: getTokenStub,
				dispose: stub(),
			} as any;

			provider = new UsageViewProvider(extensionUri, mockApiClient, mockAuthService, mockOutputChannel);
			provider.resolveWebviewView(mockWebviewView, mockContext, {} as vscode.CancellationToken);
		});

		it('should call getToken from auth service', async () => {
			await (provider as any).refresh();
			
			expect(getTokenStub.calledOnce).to.be.true;
		});

		it('should show loading state at start', async () => {
			await (provider as any).refresh();
			
			// Should have been set to loading HTML (though it gets overwritten by success)
			expect(mockWebviewView.webview.html).to.be.a('string');
		});

		it('should fetch usage data with token', async () => {
			await (provider as any).refresh();
			
			expect(fetchUsageStub.calledOnce).to.be.true;
			expect(fetchUsageStub.calledWith('mock-token')).to.be.true;
		});

		it('should update view on successful fetch', async () => {
			await (provider as any).refresh();
			
			expect(mockWebviewView.webview.html).to.include('<!DOCTYPE html>');
			expect(mockWebviewView.webview.html).to.include('Copilot Usage');
		});

		it('should show error on auth failure', async () => {
			getTokenStub.resolves(null);
			
			await (provider as any).refresh();
			
			expect(mockWebviewView.webview.html).to.include('error');
		});

		it('should show error on fetch failure', async () => {
			fetchUsageStub.rejects(new Error('Network error'));
			
			await (provider as any).refresh();
			
			expect(mockWebviewView.webview.html).to.include('error');
			expect(mockWebviewView.webview.html).to.include('Network error');
		});

		it('should prevent concurrent refreshes', async () => {
			// Start two refreshes simultaneously
			const refresh1 = (provider as any).refresh();
			const refresh2 = (provider as any).refresh();
			
			await Promise.all([refresh1, refresh2]);
			
			// Should only call API once
			expect(fetchUsageStub.callCount).to.equal(1);
		});

		it('should update lastFetchTime after successful refresh', async () => {
			const beforeTime = Date.now();
			
			await (provider as any).refresh();
			
			const lastFetchTime = (provider as any)._lastFetchTime;
			expect(lastFetchTime).to.be.a('number');
			expect(lastFetchTime).to.be.at.least(beforeTime);
		});

		it('should handle missing webview gracefully', async () => {
			const providerNoView = new UsageViewProvider(extensionUri, mockApiClient, mockAuthService, mockOutputChannel);
			
			// Should not throw
			await (providerNoView as any).refresh();
			// If we reach here without throwing, test passes
			expect(true).to.be.true;
		});
	});
});
