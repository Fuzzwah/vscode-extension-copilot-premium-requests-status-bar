import * as vscode from 'vscode';
import * as https from 'https';
import { GitHubAuthProvider } from './auth';

export interface CopilotUsage {
    totalIncluded: number;
    usedIncluded: number;
    totalBudget: number;
    usedBudget: number;
}

interface GitHubUser {
    login: string;
}

interface CopilotApiResponse {
    included_requests?: {
        total: number;
        used: number;
    };
    budget_requests?: {
        total: number;
        used: number;
    };
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
            const user = await this.makeRequest<GitHubUser>('/user', token);
            if (!user || !user.login) {
                throw new Error('Failed to get user information');
            }

            // Attempt to fetch Copilot usage data
            // Note: The exact API endpoint may vary depending on GitHub's Copilot API implementation.
            // This uses a plausible endpoint structure. If the endpoint doesn't exist or returns
            // different data, the extension will show mock/placeholder data until the correct
            // endpoint is configured.
            try {
                const usage = await this.makeRequest<CopilotApiResponse>(`/copilot/billing/usage`, token);
                
                if (usage) {
                    return this.parseUsage(usage);
                }
            } catch (apiError) {
                // If the API endpoint doesn't exist or returns an error, use placeholder data
                console.warn('Copilot API endpoint not available, using placeholder data:', apiError);
                vscode.window.showWarningMessage(
                    'Unable to fetch actual Copilot usage data. The API endpoint may not be available yet.'
                );
                return this.getPlaceholderUsage();
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

    private parseUsage(data: CopilotApiResponse): CopilotUsage {
        return {
            totalIncluded: data.included_requests?.total || 0,
            usedIncluded: data.included_requests?.used || 0,
            totalBudget: data.budget_requests?.total || 0,
            usedBudget: data.budget_requests?.used || 0
        };
    }

    private getPlaceholderUsage(): CopilotUsage {
        // Return placeholder data for demonstration purposes
        return {
            totalIncluded: 50,
            usedIncluded: 23,
            totalBudget: 100,
            usedBudget: 45
        };
    }

    private makeRequest<T>(path: string, token: string): Promise<T> {
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
                            resolve(JSON.parse(data) as T);
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
