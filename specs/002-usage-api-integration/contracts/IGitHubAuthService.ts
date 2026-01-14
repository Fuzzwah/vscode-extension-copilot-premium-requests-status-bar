import * as vscode from 'vscode';

/**
 * Service for managing GitHub authentication in VS Code
 * 
 * Contract Requirements:
 * - MUST use vscode.authentication API (FR-001)
 * - MUST request 'user:email' scope minimum (FR-018)
 * - MUST handle authentication state changes (FR-015)
 * - MUST gracefully handle when user is not signed in
 * 
 * @example
 * ```typescript
 * const authService: IGitHubAuthService = new GitHubAuthService();
 * 
 * // Get token (prompts sign-in if needed)
 * const token = await authService.getToken(true);
 * 
 * // Listen for auth changes
 * authService.onDidChangeSession(async () => {
 *   const isAuth = await authService.isAuthenticated();
 *   if (!isAuth) {
 *     // User signed out - clear cache
 *   }
 * });
 * ```
 */
export interface IGitHubAuthService extends vscode.Disposable {
  /**
   * Get current GitHub access token
   * 
   * @param createIfNone If true, prompts user to sign in if not authenticated
   * @returns Access token or undefined if not authenticated
   * 
   * @throws Never throws - returns undefined if authentication fails
   * 
   * @remarks
   * - When createIfNone=true, shows VS Code authentication prompt
   * - When createIfNone=false, silently returns undefined if not authenticated
   * - Token is automatically refreshed by VS Code when expired
   */
  getToken(createIfNone?: boolean): Promise<string | undefined>;
  
  /**
   * Check if user is currently authenticated with GitHub
   * 
   * @returns True if user has valid GitHub session
   * 
   * @remarks
   * - Non-blocking check, does not prompt for authentication
   * - Useful for determining initial state without disturbing user
   */
  isAuthenticated(): Promise<boolean>;
  
  /**
   * Subscribe to authentication state changes
   * 
   * @param callback Function called when auth state changes (sign-in, sign-out, token refresh)
   * @returns Disposable to unsubscribe from event
   * 
   * @remarks
   * - Callback is invoked for ANY GitHub session change
   * - Caller should check isAuthenticated() in callback to determine new state
   * - Callback may be async
   * 
   * @example
   * ```typescript
   * const disposable = authService.onDidChangeSession(async () => {
   *   if (await authService.isAuthenticated()) {
   *     console.log('User signed in or token refreshed');
   *   } else {
   *     console.log('User signed out');
   *   }
   * });
   * ```
   */
  onDidChangeSession(callback: () => void | Promise<void>): vscode.Disposable;
}
