import * as vscode from 'vscode';

export class GitHubAuthProvider {
    private static readonly GITHUB_AUTH_PROVIDER_ID = 'github';
    private static readonly SCOPES = ['user:email', 'read:org'];
    private static readonly SESSION_KEY = 'github-copilot-session';

    constructor(private context: vscode.ExtensionContext) {}

    async authenticate(): Promise<void> {
        try {
            const session = await vscode.authentication.getSession(
                GitHubAuthProvider.GITHUB_AUTH_PROVIDER_ID,
                GitHubAuthProvider.SCOPES,
                { createIfNone: true }
            );

            if (session) {
                await this.context.secrets.store(
                    GitHubAuthProvider.SESSION_KEY,
                    JSON.stringify(session)
                );
                vscode.window.showInformationMessage('Successfully authenticated with GitHub');
            }
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to authenticate: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
            throw error;
        }
    }

    async getAccessToken(): Promise<string | undefined> {
        try {
            // Try to get existing session without prompting
            const session = await vscode.authentication.getSession(
                GitHubAuthProvider.GITHUB_AUTH_PROVIDER_ID,
                GitHubAuthProvider.SCOPES,
                { createIfNone: false }
            );

            if (session) {
                return session.accessToken;
            }

            // If no session exists, prompt user to authenticate
            const choice = await vscode.window.showInformationMessage(
                'GitHub authentication required to display Copilot premium requests',
                'Authenticate'
            );

            if (choice === 'Authenticate') {
                await this.authenticate();
                return await this.getAccessToken();
            }

            return undefined;
        } catch (error) {
            console.error('Error getting access token:', error);
            return undefined;
        }
    }

    async signOut(): Promise<void> {
        await this.context.secrets.delete(GitHubAuthProvider.SESSION_KEY);
    }
}
