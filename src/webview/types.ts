/**
 * Types for webview sidebar panel implementation
 */

/**
 * Message sent from webview to extension via postMessage
 */
export interface WebviewMessage {
	command: 'refresh' | 'copy' | 'configureBudget';
	data?: any;
}

/**
 * Calculated pacing guidance for a quota
 */
export interface PacingData {
	/** Requests per day to stay within quota */
	dailyAverage: number;
	/** Requests per week to stay within quota */
	weeklyAverage: number;
	/** Current actual daily usage rate */
	currentDailyUsage: number;
	/** Days remaining in billing period */
	daysUntilReset: number;
	/** Hours component of time remaining */
	hoursUntilReset: number;
	/** Formatted reset date string */
	resetDate: string;
	/** Projected total usage by end of period at current rate */
	projectedTotal: number;
}

/**
 * Data for rendering a quota card
 */
export interface QuotaCardData {
	/** Display name of the quota (e.g., "Premium Interactions") */
	name: string;
	/** Remaining quota */
	remaining: number;
	/** Used quota */
	used: number;
	/** Total quota available */
	total: number;
	/** Percentage used (0-100) */
	percentage: number;
	/** True if quota is unlimited */
	isUnlimited: boolean;
	/** Color indicator based on usage */
	color: 'green' | 'yellow' | 'red';
}
