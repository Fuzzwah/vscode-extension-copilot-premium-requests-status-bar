import * as vscode from 'vscode';
import * as https from 'https';
import { GitHubAuthProvider } from './auth';

export interface CopilotUsage {
    totalIncluded: number;
    usedIncluded: number;
    totalBudget: number;
    usedBudget: number;
}

export class CopilotApiClient {
    private static readonly COPILOT_API_BASE = 'https://api.github.com';

    constructor(private authProvider: GitHubAuthProvider) {}

    async fetchUsage(): Promise<CopilotUsage | undefined> {
        const token = await this.authProvider.getAccessToken();
        if (!token) {
            return undefined;
        }

        try {
            // First, get the authenticated user
            const user = await this.makeRequest('/user', token);
            if (!user || !user.login) {
                throw new Error('Failed to get user information');
            }

            // Fetch Copilot usage data
            // Note: The actual API endpoint might vary. Using a plausible endpoint structure.
            // GitHub's Copilot API might be at different endpoints or require different approaches.
            const usage = await this.makeRequest(`/copilot/billing/usage`, token);
            
            if (usage) {
                return this.parseUsage(usage);
            }

            return undefined;
        } catch (error) {
            console.error('Error fetching Copilot usage:', error);
            vscode.window.showErrorMessage(
                `Failed to fetch Copilot usage: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
            return undefined;
        }
    }

    private parseUsage(data: any): CopilotUsage {
        // Parse the response based on actual API structure
        // This is a placeholder structure that should be adjusted based on actual API
        return {
            totalIncluded: data.included_requests?.total || 0,
            usedIncluded: data.included_requests?.used || 0,
            totalBudget: data.budget_requests?.total || 0,
            usedBudget: data.budget_requests?.used || 0
        };
    }

    private makeRequest(path: string, token: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.github.com',
                path: path,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json',
                    'User-Agent': 'VSCode-Copilot-Premium-Requests-Extension',
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (error) {
                            reject(new Error('Failed to parse response'));
                        }
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.end();
        });
    }
}
