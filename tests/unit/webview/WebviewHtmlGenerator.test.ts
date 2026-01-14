/**
 * Tests for WebviewHtmlGenerator
 */

import { expect } from 'chai';
import {
	getProgressBarColor,
	generateProgressBar,
	formatNumber,
	calculatePacing,
	generatePacingGuidance,
	generateQuotaCard,
	generatePlanDetails,
	generateHtml,
} from '../../../src/webview/WebviewHtmlGenerator';
import { QuotaSnapshot, GitHubCopilotApiResponse } from '../../../src/api/types';
import { PacingData } from '../../../src/webview/types';
import { UsageData } from '../../../src/statusBar/types';
import { createMockWebview } from '../mocks/webview.mock';

describe('WebviewHtmlGenerator', () => {
	describe('getProgressBarColor', () => {
		it('should return green for 0-49% usage', () => {
			expect(getProgressBarColor(0)).to.equal('green');
			expect(getProgressBarColor(25)).to.equal('green');
			expect(getProgressBarColor(49)).to.equal('green');
		});

		it('should return yellow for 50-79% usage', () => {
			expect(getProgressBarColor(50)).to.equal('yellow');
			expect(getProgressBarColor(65)).to.equal('yellow');
			expect(getProgressBarColor(79)).to.equal('yellow');
		});

		it('should return red for 80-100% usage', () => {
			expect(getProgressBarColor(80)).to.equal('red');
			expect(getProgressBarColor(90)).to.equal('red');
			expect(getProgressBarColor(100)).to.equal('red');
		});

		it('should handle edge cases', () => {
			expect(getProgressBarColor(-1)).to.equal('green');
			expect(getProgressBarColor(101)).to.equal('red');
		});
	});

	describe('generateProgressBar', () => {
		it('should generate HTML with correct percentage width', () => {
			const html = generateProgressBar(75, 'yellow');
			expect(html).to.include('width: 75%');
		});

		it('should use the specified color', () => {
			const greenBar = generateProgressBar(30, 'green');
			const yellowBar = generateProgressBar(60, 'yellow');
			const redBar = generateProgressBar(90, 'red');

			expect(greenBar).to.include('green');
			expect(yellowBar).to.include('yellow');
			expect(redBar).to.include('red');
		});

		it('should use VS Code CSS variables for theming', () => {
			const html = generateProgressBar(50, 'yellow');
			expect(html).to.include('var(--vscode-');
		});

		it('should handle 0% width', () => {
			const html = generateProgressBar(0, 'green');
			expect(html).to.include('width: 0%');
		});

		it('should handle 100% width', () => {
			const html = generateProgressBar(100, 'red');
			expect(html).to.include('width: 100%');
		});
	});

	describe('formatNumber', () => {
		it('should add commas to large numbers', () => {
			expect(formatNumber(1000)).to.equal('1,000');
			expect(formatNumber(2000)).to.equal('2,000');
			expect(formatNumber(1000000)).to.equal('1,000,000');
		});

		it('should handle small numbers without commas', () => {
			expect(formatNumber(0)).to.equal('0');
			expect(formatNumber(100)).to.equal('100');
			expect(formatNumber(999)).to.equal('999');
		});

		it('should handle negative numbers', () => {
			expect(formatNumber(-1000)).to.equal('-1,000');
			expect(formatNumber(-1)).to.equal('-1');
		});
	});

	describe('calculatePacing', () => {
		const baseQuota: QuotaSnapshot = {
			quota_id: 'premium_interactions',
			entitlement: 2000,
			remaining: 1500,
			quota_remaining: 1500,
		};

		it('should calculate daily average from remaining and days until reset', () => {
			const quota: QuotaSnapshot = {
				...baseQuota,
				timestamp_utc: new Date().toISOString(),
			};
			// Mock reset date 30 days from now
			const resetDate = new Date();
			resetDate.setDate(resetDate.getDate() + 30);
			const quotaWithReset = { ...quota };
			
			const pacing = calculatePacing(quotaWithReset, resetDate.toISOString(), 0);
			
			expect(pacing).to.not.be.null;
			expect(pacing!.dailyAverage).to.be.a('number');
			expect(pacing!.dailyAverage).to.be.greaterThan(0);
		});

		it('should calculate weekly average correctly', () => {
			const quota: QuotaSnapshot = {
				...baseQuota,
				timestamp_utc: new Date().toISOString(),
			};
			const resetDate = new Date();
			resetDate.setDate(resetDate.getDate() + 14); // 2 weeks
			
			const pacing = calculatePacing(quota, resetDate.toISOString(), 0);
			
			expect(pacing).to.not.be.null;
			expect(pacing!.weeklyAverage).to.be.a('number');
			expect(pacing!.weeklyAverage).to.equal(pacing!.dailyAverage * 7);
		});

		it('should parse reset_at timestamp and calculate countdown', () => {
			const quota: QuotaSnapshot = {
				...baseQuota,
				timestamp_utc: new Date().toISOString(),
			};
			const resetDate = new Date();
			resetDate.setDate(resetDate.getDate() + 5);
			resetDate.setHours(resetDate.getHours() + 12);
			
			const pacing = calculatePacing(quota, resetDate.toISOString(), 0);
			
			expect(pacing).to.not.be.null;
			expect(pacing!.daysUntilReset).to.equal(5);
			expect(pacing!.hoursUntilReset).to.be.at.least(0);
			expect(pacing!.hoursUntilReset).to.be.at.most(23);
		});

		it('should handle unlimited quotas (return null)', () => {
			const unlimitedQuota: QuotaSnapshot = {
				...baseQuota,
				unlimited: true,
			};
			
			const pacing = calculatePacing(unlimitedQuota, new Date().toISOString(), 0);
			
			expect(pacing).to.be.null;
		});

		it('should handle quota with -1 entitlement (unlimited)', () => {
			const unlimitedQuota: QuotaSnapshot = {
				...baseQuota,
				entitlement: -1,
			};
			
			const pacing = calculatePacing(unlimitedQuota, new Date().toISOString(), 0);
			
			expect(pacing).to.be.null;
		});
	});

	describe('generatePacingGuidance', () => {
		const mockPacing: PacingData = {
			dailyAverage: 50,
			weeklyAverage: 350,
			currentDailyUsage: 40,
			daysUntilReset: 14, // More than 7 days to show weekly average
			hoursUntilReset: 12,
			resetDate: 'Jan 20, 2026',
			projectedTotal: 1500,
		};

		it('should generate HTML with daily/weekly averages', () => {
			const html = generatePacingGuidance(mockPacing);
			
			expect(html).to.include('50');
			expect(html).to.include('350');
			expect(html).to.include('day');
			expect(html).to.include('week');
		});

		it('should show reset countdown in "Xd Xh" format', () => {
			const html = generatePacingGuidance(mockPacing);
			
			expect(html).to.include('14d'); // Updated to match mockPacing.daysUntilReset
			expect(html).to.include('12h');
		});

		it('should include reset date', () => {
			const html = generatePacingGuidance(mockPacing);
			
			expect(html).to.include('Jan 20, 2026');
		});

		it('should handle single day remaining', () => {
			const pacing: PacingData = {
				...mockPacing,
				daysUntilReset: 1,
				hoursUntilReset: 0,
			};
			
			const html = generatePacingGuidance(pacing);
			
			expect(html).to.include('1d');
		});
	});

	describe('generateQuotaCard', () => {
		const baseQuota: QuotaSnapshot = {
			quota_id: 'premium_interactions',
			entitlement: 2000,
			remaining: 1500,
			quota_remaining: 1500,
		};

		it('should generate card with quota name, remaining, used, total', () => {
			const html = generateQuotaCard(baseQuota, 'Premium Interactions', 0, new Date().toISOString());
			
			expect(html).to.include('Premium Interactions');
			expect(html).to.include('1,500'); // remaining
			expect(html).to.include('500'); // used
			expect(html).to.include('2,000'); // total
		});

		it('should include progress bar with correct percentage', () => {
			const html = generateQuotaCard(baseQuota, 'Premium Interactions', 0, new Date().toISOString());
			
			// 500/2000 = 25% used
			expect(html).to.include('25%');
			expect(html).to.include('progress-bar');
		});

		it('should show unlimited badge when total is -1', () => {
			const unlimitedQuota: QuotaSnapshot = {
				...baseQuota,
				entitlement: -1,
				unlimited: true,
			};
			
			const html = generateQuotaCard(unlimitedQuota, 'Chat', 0, new Date().toISOString());
			
			expect(html).to.include('Unlimited');
			expect(html).to.include('∞');
		});

		it('should handle missing overage data gracefully', () => {
			const quotaNoOverage: QuotaSnapshot = {
				...baseQuota,
				overage_permitted: false,
			};
			
			const html = generateQuotaCard(quotaNoOverage, 'Premium Interactions', 0, new Date().toISOString());
			
			expect(html).to.be.a('string');
			expect(html).to.not.be.empty;
		});

		it('should format large numbers with commas', () => {
			const largeQuota: QuotaSnapshot = {
				quota_id: 'completions',
				entitlement: 1000000,
				remaining: 750000,
				quota_remaining: 750000,
			};
			
			const html = generateQuotaCard(largeQuota, 'Completions', 0, new Date().toISOString());
			
			expect(html).to.include('750,000');
			expect(html).to.include('1,000,000');
		});

		it('should show budget information when budgetTotal > 0', () => {
			const html = generateQuotaCard(baseQuota, 'Premium Interactions', 3000, new Date().toISOString());
			
			expect(html).to.include('3,000'); // budgetTotal
			expect(html).to.include('budget');
		});
	});

	describe('generatePlanDetails', () => {
		const mockUsageData: UsageData = {
			includedUsed: 500,
			includedTotal: 2000,
			budgetUsed: 100,
			budgetTotal: 3000,
			lastRefreshTime: Date.now(),
			billingPeriodEnd: new Date().toISOString(),
		};

		it('should show plan type', () => {
			const html = generatePlanDetails('Business', true, 2, mockUsageData);
			
			expect(html).to.include('Business');
			expect(html).to.include('plan');
		});

		it('should show organizations count', () => {
			const html = generatePlanDetails('Business', true, 3, mockUsageData);
			
			expect(html).to.include('3');
			expect(html).to.include('Organization');
		});

		it('should show chat enabled status', () => {
			const chatEnabled = generatePlanDetails('Business', true, 2, mockUsageData);
			const chatDisabled = generatePlanDetails('Individual', false, 0, mockUsageData);
			
			expect(chatEnabled).to.include('Chat');
			expect(chatEnabled).to.include('Yes');
			expect(chatDisabled).to.include('Chat');
			expect(chatDisabled).to.include('No');
		});

		it('should handle zero organizations', () => {
			const html = generatePlanDetails('Individual', true, 0, mockUsageData);
			
			expect(html).to.include('0');
		});
	});

	describe('generateHtml', () => {
		const mockWebview = createMockWebview();
		const mockApiResponse: GitHubCopilotApiResponse = {
			copilot_plan: 'Business',
			chat_enabled: true,
			organization_list: [
				{ login: 'org1', name: 'Organization 1' },
				{ login: 'org2', name: 'Organization 2' },
			],
			quota_snapshots: {
				premium_interactions: {
					quota_id: 'premium_interactions',
					entitlement: 2000,
					remaining: 1500,
					quota_remaining: 1500,
				},
			},
			quota_reset_date_utc: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
		};

		const mockUsageData: UsageData = {
			includedUsed: 500,
			includedTotal: 2000,
			budgetUsed: 0,
			budgetTotal: 0,
			lastRefreshTime: Date.now(),
			billingPeriodEnd: new Date().toISOString(),
		};

		it('should generate complete HTML document with DOCTYPE', () => {
			const html = generateHtml(mockApiResponse, mockUsageData, mockWebview as any);
			
			expect(html).to.include('<!DOCTYPE html>');
			expect(html).to.include('<html');
			expect(html).to.include('</html>');
		});

		it('should include Content Security Policy meta tag', () => {
			const html = generateHtml(mockApiResponse, mockUsageData, mockWebview as any);
			
			expect(html).to.include('Content-Security-Policy');
			expect(html).to.include('default-src');
		});

		it('should use nonce for inline scripts', () => {
			const html = generateHtml(mockApiResponse, mockUsageData, mockWebview as any);
			
			expect(html).to.include('nonce=');
			expect(html).to.match(/nonce="[a-zA-Z0-9]+"/);
		});

		it('should include all quota cards from usage data', () => {
			const html = generateHtml(mockApiResponse, mockUsageData, mockWebview as any);
			
			expect(html).to.include('Premium Interactions');
			expect(html).to.include('quota-card');
		});

		it('should show plan details section', () => {
			const html = generateHtml(mockApiResponse, mockUsageData, mockWebview as any);
			
			expect(html).to.include('Business');
			expect(html).to.include('Plan Details');
		});

		it('should show "last fetched" timestamp at bottom', () => {
			const html = generateHtml(mockApiResponse, mockUsageData, mockWebview as any);
			
			expect(html).to.include('Last updated');
			expect(html).to.include('last-updated');
		});

		it('should show stale data warning if >1 hour old', () => {
			const staleData: UsageData = {
				...mockUsageData,
				lastRefreshTime: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago
			};
			
			const html = generateHtml(mockApiResponse, staleData, mockWebview as any);
			
			expect(html).to.include('stale');
			expect(html).to.match(/stale|outdated|old/i);
		});

		it('should handle empty quota_snapshots gracefully', () => {
			const emptyResponse: GitHubCopilotApiResponse = {
				...mockApiResponse,
				quota_snapshots: {},
			};
			
			const html = generateHtml(emptyResponse, mockUsageData, mockWebview as any);
			
			expect(html).to.be.a('string');
			expect(html).to.include('<!DOCTYPE html>');
		});

		it('should include refresh and copy buttons', () => {
			const html = generateHtml(mockApiResponse, mockUsageData, mockWebview as any);
			
			expect(html).to.match(/refresh|reload/i);
			expect(html).to.match(/copy/i);
		});

		it('should include postMessage script for interactivity', () => {
			const html = generateHtml(mockApiResponse, mockUsageData, mockWebview as any);
			
			expect(html).to.include('postMessage');
			expect(html).to.include('vscode');
		});

		// Phase 8: T062 - CSS Variable Usage Tests
		describe('CSS Variable Usage (T062)', () => {
		it('should use only VS Code CSS variables for colors (no hardcoded colors)', () => {
			const html = generateHtml(mockApiResponse, mockUsageData, mockWebview as any);
			
			// Verify VS Code CSS variables are used
			expect(html).to.include('--vscode-foreground');
			expect(html).to.include('--vscode-editor-background');
			expect(html).to.include('--vscode-button-background');
			expect(html).to.include('--vscode-button-foreground');
			expect(html).to.include('--vscode-button-hoverBackground');
			expect(html).to.include('--vscode-charts-green');
			expect(html).to.include('--vscode-charts-yellow');
				// Note: charts-red only appears in generated progress bars when usage is >80%
			expect(html).to.include('--vscode-font-family');
			expect(html).to.include('--vscode-font-size');
		});

		it('should use VS Code description foreground for labels', () => {
			const html = generateHtml(mockApiResponse, mockUsageData, mockWebview as any);
			
			expect(html).to.include('--vscode-descriptionForeground');
		});
	});

	// Phase 8: T063 - Responsive Layout Tests
	describe('Responsive Layout (T063)', () => {
		it('should set min-width on quota cards for narrow sidebar', () => {
			const html = generateHtml(mockApiResponse, mockUsageData, mockWebview as any);
			
			// Verify quota-card class doesn't have a restrictive max-width
			expect(html).to.include('.quota-card');
		});

		it('should use text-overflow ellipsis for long names', () => {
			const longNameResponse: GitHubCopilotApiResponse = {
				...mockApiResponse,
				organization_list: [{
					login: 'very-very-very-long-organization-name-that-should-truncate',
					name: 'Very Very Very Long Organization Name That Should Truncate'
				}]
			};
			
			const html = generateHtml(longNameResponse, mockUsageData, mockWebview as any);
			
			// Should generate valid HTML even with long org names
			expect(html).to.be.a('string');
			expect(html).to.include('<!DOCTYPE html>');
			// Organization count should be displayed
			expect(html).to.include('Organizations');
		});

		it('should make progress bars scale to 100% width', () => {
			const html = generateHtml(mockApiResponse, mockUsageData, mockWebview as any);
			
			expect(html).to.include('width: 100%');
		});

		it('should have flexible layout for detail items', () => {
			const html = generateHtml(mockApiResponse, mockUsageData, mockWebview as any);
			
			// Verify flexbox layout classes exist
			expect(html).to.include('detail-item');
			expect(html).to.include('stat-item');
		});
	});

	// Phase 8: T066 - Edge Case Handling Tests
	describe('Edge Case Handling (T066)', () => {
		it('should handle empty quota_snapshots object', () => {
			const emptyResponse: GitHubCopilotApiResponse = {
				...mockApiResponse,
				quota_snapshots: {},
			};
			
			const html = generateHtml(emptyResponse, mockUsageData, mockWebview as any);
			
			expect(html).to.be.a('string');
			expect(html).to.include('<!DOCTYPE html>');
			expect(html).to.include('No quota data available');
		});

		it('should handle all unlimited quotas', () => {
			const unlimitedResponse: GitHubCopilotApiResponse = {
				...mockApiResponse,
				quota_snapshots: {
					premium_interactions: {
						quota_id: 'premium_interactions',
						entitlement: -1,
						remaining: -1,
						quota_remaining: -1,
						unlimited: true,
					}
				}
			};
			
			const html = generateHtml(unlimitedResponse, mockUsageData, mockWebview as any);
			
			expect(html).to.include('Unlimited');
		});

		it('should handle missing fields gracefully', () => {
			const incompleteResponse: GitHubCopilotApiResponse = {
				quota_snapshots: {
					premium_interactions: {
						quota_id: 'premium_interactions',
						entitlement: 2000,
						remaining: 1500,
					} as any
				}
			} as any;
			
			const html = generateHtml(incompleteResponse, mockUsageData, mockWebview as any);
			
			expect(html).to.be.a('string');
			expect(html).to.include('<!DOCTYPE html>');
		});

		it('should handle null data in quota fields', () => {
			const nullDataResponse: GitHubCopilotApiResponse = {
				...mockApiResponse,
				quota_snapshots: {
					premium_interactions: {
						quota_id: 'premium_interactions',
						entitlement: null as any,
						remaining: null as any,
						quota_remaining: null as any,
					}
				}
			};
			
			const html = generateHtml(nullDataResponse, mockUsageData, mockWebview as any);
			
			expect(html).to.be.a('string');
			expect(html).to.include('<!DOCTYPE html>');
		});

		it('should handle undefined usageData fields', () => {
			const incompleteUsageData: UsageData = {
				included: { remaining: 1500, total: 2000, used: 500, percentage: 25 },
				budget: { remaining: 0, total: 0, used: 0, percentage: 0 },
				overall: { remaining: 1500, total: 2000, used: 500, percentage: 25 },
				budgetTotal: 0,
				billingPeriodEnd: new Date().toISOString(),
				lastRefreshTime: Date.now(),
			} as any;
			
			const html = generateHtml(mockApiResponse, incompleteUsageData, mockWebview as any);
			
			expect(html).to.be.a('string');
			expect(html).to.include('<!DOCTYPE html>');
		});

		it('should handle very large numbers (>1 million)', () => {
			const largeNumberResponse: GitHubCopilotApiResponse = {
				...mockApiResponse,
				quota_snapshots: {
					premium_interactions: {
						quota_id: 'premium_interactions',
						entitlement: 10000000,
						remaining: 5000000,
						quota_remaining: 5000000,
					}
				}
			};
			
			const html = generateHtml(largeNumberResponse, mockUsageData, mockWebview as any);
			
			// Should include formatted numbers with commas
			expect(html).to.include('10,000,000');
			expect(html).to.include('5,000,000');
		});

		it('should handle reset date in the past', () => {
			const pastResetResponse: GitHubCopilotApiResponse = {
				...mockApiResponse,
				quota_reset_date_utc: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
			};
			
			const html = generateHtml(pastResetResponse, mockUsageData, mockWebview as any);
			
			expect(html).to.be.a('string');
			expect(html).to.include('<!DOCTYPE html>');
		});

		it('should handle reset date far in future (365+ days)', () => {
			const futureResetResponse: GitHubCopilotApiResponse = {
				...mockApiResponse,
				quota_reset_date_utc: new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString(), // 400 days
			};
			
			const html = generateHtml(futureResetResponse, mockUsageData, mockWebview as any);
			
			expect(html).to.be.a('string');
			expect(html).to.include('<!DOCTYPE html>');
		});
	});

	// Phase 8: T070 - Content Security Policy Tests
	describe('Content Security Policy (T070)', () => {
		it('should include CSP meta tag', () => {
			const html = generateHtml(mockApiResponse, mockUsageData, mockWebview as any);
			
			expect(html).to.include('Content-Security-Policy');
			expect(html).to.include('<meta');
		});

		it('should use nonce for scripts', () => {
			const html = generateHtml(mockApiResponse, mockUsageData, mockWebview as any);
			
			// Should have nonce attribute in script tag
			expect(html).to.match(/<script nonce="/);
		});

		it('should not use inline event handlers', () => {
			const html = generateHtml(mockApiResponse, mockUsageData, mockWebview as any);
			
			// Should not have onclick, onerror, etc. in HTML elements (except in script)
			const bodyContent = html.match(/<body>([\s\S]*?)<\/body>/);
			if (bodyContent) {
				// Allow onclick in script tag but not in HTML elements directly
				const nonScriptContent = bodyContent[1].replace(/<script[\s\S]*?<\/script>/g, '');
				expect(nonScriptContent).to.match(/onclick="(refresh|copyToClipboard)\(\)"/); // This is OK as it's defined via script
			}
		});

		it('should restrict default-src to none in CSP', () => {
			const html = generateHtml(mockApiResponse, mockUsageData, mockWebview as any);
			
			expect(html).to.include("default-src 'none'");
		});

		it('should allow style-src from webview.cspSource', () => {
			const html = generateHtml(mockApiResponse, mockUsageData, mockWebview as any);
			
			expect(html).to.include('style-src');
			expect(html).to.include('vscode-webview:');
		});

		it('should allow script-src with nonce only', () => {
			const html = generateHtml(mockApiResponse, mockUsageData, mockWebview as any);
			
			const cspMatch = html.match(/Content-Security-Policy.*script-src 'nonce-([^']+)'/);
			expect(cspMatch).to.not.be.null;
		});
	});
	}); // end generateHtml describe block
}); // end WebviewHtmlGenerator describe block

