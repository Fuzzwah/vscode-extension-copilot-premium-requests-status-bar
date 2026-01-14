/**
 * Tests for WebviewMessageHandler
 */

import { expect } from 'chai';
import { formatMarkdownSummary } from '../../../src/webview/WebviewMessageHandler';
import { GitHubCopilotApiResponse } from '../../../src/api/types';
import { UsageData } from '../../../src/statusBar/types';

describe('WebviewMessageHandler', () => {
	describe('formatMarkdownSummary', () => {
		let mockApiResponse: GitHubCopilotApiResponse;
		let mockUsageData: UsageData;

		beforeEach(() => {
			mockApiResponse = {
				copilot_plan: 'Business',
				chat_enabled: true,
				organization_list: [
					{ login: 'org1', name: 'Organization One' },
					{ login: 'org2', name: 'Organization Two' },
				],
				quota_snapshots: {
					premium_interactions: {
						quota_id: 'premium_interactions',
						entitlement: 2000,
						remaining: 1500,
						quota_remaining: 1500,
					},
					chat: {
						quota_id: 'chat',
						entitlement: 1000,
						remaining: 750,
						quota_remaining: 750,
					},
				},
				quota_reset_date_utc: new Date('2026-02-01T00:00:00Z').toISOString(),
			};

			mockUsageData = {
				includedUsed: 500,
				includedTotal: 2000,
				budgetUsed: 0,
				budgetTotal: 0,
				lastRefreshTime: Date.now(),
				billingPeriodEnd: new Date('2026-02-01T00:00:00Z').toISOString(),
			};
		});

		it('should generate Markdown with headers', () => {
			const result = formatMarkdownSummary(mockApiResponse, mockUsageData);

			expect(result).to.include('# GitHub Copilot Usage Summary');
			expect(result).to.include('## Plan Details');
			expect(result).to.include('## Quota Usage');
		});

		it('should include bullet points for plan details', () => {
			const result = formatMarkdownSummary(mockApiResponse, mockUsageData);

			expect(result).to.include('- **Plan Type**: Business');
			expect(result).to.include('- **Chat Enabled**: Yes');
			expect(result).to.include('- **Organizations**: 2');
		});

		it('should include quota data with usage statistics', () => {
			const result = formatMarkdownSummary(mockApiResponse, mockUsageData);

			expect(result).to.include('premium_interactions');
			expect(result).to.include('**Used**: 500');
			expect(result).to.include('**Remaining**: 1,500');
			expect(result).to.include('**Total**: 2,000');
		});

		it('should include timestamp of when summary was generated', () => {
			const result = formatMarkdownSummary(mockApiResponse, mockUsageData);

			expect(result).to.match(/Generated at: .+/);
		});

		it('should include budget information when budgetTotal > 0', () => {
			mockUsageData.budgetUsed = 100;
			mockUsageData.budgetTotal = 500;

			const result = formatMarkdownSummary(mockApiResponse, mockUsageData);

			expect(result).to.include('**Budget Used**: 100');
			expect(result).to.include('**Budget Total**: 500');
		});

		it('should not include budget information when budgetTotal = 0', () => {
			mockUsageData.budgetUsed = 0;
			mockUsageData.budgetTotal = 0;

			const result = formatMarkdownSummary(mockApiResponse, mockUsageData);

			expect(result).to.not.include('**Budget Used**');
			expect(result).to.not.include('**Budget Total**');
		});

		it('should handle unlimited quotas correctly', () => {
			mockApiResponse.quota_snapshots = {
				premium_interactions: {
					quota_id: 'premium_interactions',
					entitlement: -1,
					remaining: -1,
					quota_remaining: -1,
				},
			};

			const result = formatMarkdownSummary(mockApiResponse, mockUsageData);

			expect(result).to.include('**Total**: Unlimited');
		});

		it('should format large numbers with commas', () => {
			if (mockApiResponse.quota_snapshots?.premium_interactions) {
				mockApiResponse.quota_snapshots.premium_interactions.entitlement = 10000;
				mockApiResponse.quota_snapshots.premium_interactions.remaining = 5000;
			}
			mockUsageData.includedTotal = 10000;
			mockUsageData.includedUsed = 5000;

			const result = formatMarkdownSummary(mockApiResponse, mockUsageData);

			expect(result).to.include('10,000');
			expect(result).to.include('5,000');
		});

		it('should handle multiple quotas', () => {
			const result = formatMarkdownSummary(mockApiResponse, mockUsageData);

			expect(result).to.include('premium_interactions');
			expect(result).to.include('chat');
		});

		it('should handle zero organizations', () => {
			mockApiResponse.organization_list = [];

			const result = formatMarkdownSummary(mockApiResponse, mockUsageData);

			expect(result).to.include('- **Organizations**: 0');
		});

		it('should handle chat disabled', () => {
			mockApiResponse.chat_enabled = false;

			const result = formatMarkdownSummary(mockApiResponse, mockUsageData);

			expect(result).to.include('- **Chat Enabled**: No');
		});

		it('should include reset date information', () => {
			const result = formatMarkdownSummary(mockApiResponse, mockUsageData);

			expect(result).to.include('**Reset Date**');
			expect(result).to.match(/2[/\-]1[/\-]2026|2026[/\-]02[/\-]01/); // Various date formats
		});
	});

	// Note: handleMessage tests require VS Code API mocking which is complex in unit tests
	// These tests are better suited for integration tests where VS Code API is available
	// For now, we've tested formatMarkdownSummary which is the core logic
});
