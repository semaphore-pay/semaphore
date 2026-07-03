import type { NombaAuthResponse, NombaRevokeResponse, NombaEnvironment } from "./nomba.types";

const AUTH_BASE_URLS: Record<NombaEnvironment, string> = {
  production: "https://api.nomba.com/v1/auth",
  sandbox: "https://sandbox.nomba.com/v1/auth",
};

export class NombaAuthClient {
  private readonly baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private accountId: string;

  constructor(
    clientId: string,
    clientSecret: string,
    accountId: string,
    environment: NombaEnvironment = "production"
  ) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.accountId = accountId;
    this.baseUrl = AUTH_BASE_URLS[environment];
  }

  public async getAccessToken(): Promise<NombaAuthResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/token/issue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "accountId": this.accountId,
        },
        body: JSON.stringify({
          grant_type: "client_credentials",
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Debug: getAccessToken failed. Status: ${response.status}. Response: ${errorText}`);
        return null;
      }

      return (await response.json()) as NombaAuthResponse;
    } catch (error) {
      console.error("Debug: Exception in getAccessToken:", error);
      return null;
    }
  }

  public async refreshAccessToken(
    currentAccessToken: string,
    refreshToken: string
  ): Promise<NombaAuthResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/token/refresh`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${currentAccessToken}`,
          "Content-Type": "application/json",
          "accountId": this.accountId,
        },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Debug: refreshAccessToken failed. Status: ${response.status}. Response: ${errorText}`);
        return null;
      }

      return (await response.json()) as NombaAuthResponse;
    } catch (error) {
      console.error("Debug: Exception in refreshAccessToken:", error);
      return null;
    }
  }

  public async revokeAccessToken(accessTokenToRevoke: string): Promise<NombaRevokeResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/token/revoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "accountId": this.accountId,
        },
        body: JSON.stringify({
          clientId: this.clientId,
          access_token: accessTokenToRevoke,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Debug: revokeAccessToken failed. Status: ${response.status}. Response: ${errorText}`);
        return null;
      }

      return (await response.json()) as NombaRevokeResponse;
    } catch (error) {
      console.error("Debug: Exception in revokeAccessToken:", error);
      return null;
    }
  }
}
