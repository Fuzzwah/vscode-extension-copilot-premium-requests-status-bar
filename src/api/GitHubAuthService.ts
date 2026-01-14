import * as vscode from 'vscode';

/**
 * Service for managing GitHub authentication using VS Code's built-in auth API
 */
export class GitHubAuthService {
  private readonly GITHUB_PROVIDER_ID = 'github';
  private readonly REQUIRED_SCOPES = ['user:email'];

  /**
   * Get GitHub access token
   * @param createIfNone If true, prompts user to sign in if not authenticated
   */
  async getToken(createIfNone: boolean = true): Promise<string | undefined> {
    try {
      const session = await vscode.authentication.getSession(
        this.GITHUB_PROVIDER_ID,
        this.REQUIRED_SCOPES,
        { createIfNone }
      );
      
      return session?.accessToken;
    } catch (error) {
      console.error('Failed to get GitHub authentication session:', error);
      return undefined;
    }
  }

  /**
   * Check if user is currently authenticated with GitHub
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken(false);
    return token !== undefined;
  }

  /**
   * Subscribe to authentication state changes
   */
  onDidChangeSession(callback: () => void | Promise<void>): vscode.Disposable {
    return vscode.authentication.onDidChangeSessions(async (e) => {
      if (e.provider.id === this.GITHUB_PROVIDER_ID) {
        await callback();
      }
    });
  }

  dispose(): void {
    // No cleanup needed - VS Code manages sessions
  }
}
