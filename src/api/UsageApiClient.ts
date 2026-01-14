import * as https from 'https';
import * as vscode from 'vscode';
import { UsageData } from '../statusBar/types';
import { 
  GitHubCopilotApiResponse, 
  ApiRequestOptions, 
  DEFAULT_API_REQUEST_OPTIONS,
  ApiError,
  ApiErrorType
} from './types';

/**
 * Client for fetching GitHub Copilot usage data
 */
export class UsageApiClient {
  private static readonly API_ENDPOINT = 'api.github.com';
  private static readonly API_PATH = '/copilot_internal/user';
  private static readonly USER_AGENT = 'vscode-copilot-premium-status/0.1.0';

  private isRequestInFlight = false;
  private currentRequest?: Promise<GitHubCopilotApiResponse>;

  /**
   * Fetch usage data from GitHub API
   */
  async fetchUsage(token: string, options?: ApiRequestOptions): Promise<UsageData> {
    if (this.isRequestInFlight && this.currentRequest) {
      // Return data from the in-flight request
      const rawData = await this.currentRequest;
      return this.parseResponse(rawData);
    }

    const opts = { ...DEFAULT_API_REQUEST_OPTIONS, ...options };
    
    this.isRequestInFlight = true;
    this.currentRequest = this.fetchWithRetry(token, opts, 0);
    
    try {
      const rawData = await this.currentRequest;
      return this.parseResponse(rawData);
    } finally {
      this.isRequestInFlight = false;
      this.currentRequest = undefined;
    }
  }

  /**
   * Fetch both raw API response and processed usage data
   */
  async fetchUsageWithRaw(token: string, options?: ApiRequestOptions): Promise<{
    raw: GitHubCopilotApiResponse;
    data: UsageData;
  }> {
    if (this.isRequestInFlight && this.currentRequest) {
      // Return data from the in-flight request
      const rawData = await this.currentRequest;
      const parsedData = this.parseResponse(rawData);
      return { raw: rawData, data: parsedData };
    }

    const opts = { ...DEFAULT_API_REQUEST_OPTIONS, ...options };
    
    this.isRequestInFlight = true;
    this.currentRequest = this.fetchWithRetry(token, opts, 0);
    
    try {
      const rawData = await this.currentRequest;
      const parsedData = this.parseResponse(rawData);
      return { raw: rawData, data: parsedData };
    } finally {
      this.isRequestInFlight = false;
      this.currentRequest = undefined;
    }
  }

  private async fetchWithRetry(
    token: string,
    options: Required<ApiRequestOptions>,
    attempt: number
  ): Promise<GitHubCopilotApiResponse> {
    try {
      return await this.makeRequest(token, options.timeout);
    } catch (error) {
      if (error instanceof ApiError && error.retryable && attempt < options.maxRetries - 1) {
        const delay = Math.min(options.baseDelay * Math.pow(2, attempt), options.maxDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(token, options, attempt + 1);
      }
      throw error;
    }
  }

  private makeRequest(token: string, timeout: number): Promise<GitHubCopilotApiResponse> {
    return new Promise((resolve, reject) => {
      const requestOptions = {
        hostname: UsageApiClient.API_ENDPOINT,
        path: UsageApiClient.API_PATH,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'User-Agent': UsageApiClient.USER_AGENT
        },
        timeout
      };

      const req = https.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(data));
            } catch (error) {
              reject(new ApiError(
                'Invalid JSON response from GitHub API',
                ApiErrorType.VALIDATION,
                undefined,
                false,
                error as Error
              ));
            }
          } else {
            reject(ApiError.fromStatusCode(res.statusCode || 500, data));
          }
        });
      });

      req.on('error', (error) => {
        reject(ApiError.fromNodeError(error));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new ApiError(
          `Request timeout after ${timeout}ms`,
          ApiErrorType.TIMEOUT,
          undefined,
          true
        ));
      });

      req.end();
    });
  }

  private parseResponse(response: GitHubCopilotApiResponse): UsageData {
    const premiumQuota = response.quota_snapshots?.premium_interactions;
    
    if (!premiumQuota) {
      throw new ApiError(
        'Missing premium_interactions in API response',
        ApiErrorType.VALIDATION
      );
    }

    // Handle unlimited quota
    if (premiumQuota.unlimited) {
      return {
        includedUsed: 0,
        includedTotal: Number.MAX_SAFE_INTEGER,
        budgetUsed: 0,
        budgetTotal: this.getBudgetTotal(undefined),
        lastRefreshTime: Date.now(),
        billingPeriodEnd: response.quota_reset_date_utc || new Date().toISOString()
      };
    }

    const entitlement = premiumQuota.entitlement;
    const remaining = premiumQuota.remaining ?? premiumQuota.quota_remaining;
    
    if (entitlement === undefined || remaining === undefined) {
      throw new ApiError(
        'Missing entitlement or remaining in API response',
        ApiErrorType.VALIDATION
      );
    }

    // Calculate actual overage: if remaining is negative, we've gone over quota
    // The API's overage_count is unreliable, so calculate from remaining instead
    const totalUsed = entitlement - remaining;
    const actualOverage = Math.max(0, totalUsed - entitlement);

    return {
      includedUsed: Math.min(totalUsed, entitlement),
      includedTotal: entitlement,
      budgetUsed: actualOverage,
      budgetTotal: this.getBudgetTotal(premiumQuota.overage_limit),
      lastRefreshTime: Date.now(),
      billingPeriodEnd: response.quota_reset_date_utc || new Date().toISOString()
    };
  }

  /**
   * Get budget total from API or user configuration
   */
  private getBudgetTotal(apiValue: number | undefined): number {
    // If API provides a value, use it
    if (apiValue !== undefined && apiValue > 0) {
      console.log(`Using budget from API: ${apiValue}`);
      return apiValue;
    }
    
    // Otherwise check user configuration
    const config = vscode.workspace.getConfiguration('copilotPremiumRequests');
    
    // Check budgetDollars first (easier for users)
    const budgetDollars = config.get<number>('budgetDollars', 0);
    if (budgetDollars > 0) {
      const budgetRequests = Math.round(budgetDollars * 25); // $0.04 per request = 25 requests per dollar
      console.log(`Converting budget from $${budgetDollars} to ${budgetRequests} requests`);
      return budgetRequests;
    }
    
    // Fall back to budgetRequests for advanced users
    const configuredBudget = config.get<number>('budgetRequests', 0);
    console.log(`API budget not available (${apiValue}), using configured budget: ${configuredBudget}`);
    return configuredBudget;
  }

  isRequestPending(): boolean {
    return this.isRequestInFlight;
  }

  dispose(): void {
    // No cleanup needed
  }
}
