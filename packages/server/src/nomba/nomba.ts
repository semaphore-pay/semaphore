import { NombaAuthClient } from "./nomba.client";
import { NombaHttpClient } from "./nomba.http";
import { NombaCheckoutClient } from "./nomba.checkout";
import { NombaVirtualAccountClient } from "./nomba.virtual-accounts";
import { NombaTransferClient } from "./nomba.transfers";
import { NombaTransactionClient } from "./nomba.transactions";
import { NombaDirectDebitClient } from "./nomba.direct-debits";
import { NombaTokenizedCardClient } from "./nomba.tokenized-cards";
import { NombaWebhookVerifier } from "./nomba.webhooks";
import type { NombaEnvironment } from "./nomba.types";

export interface NombaClientOptions {
  clientId: string;
  clientSecret: string;
  accountId: string;
  /** Defaults to "production". Use "sandbox" for testing — never mix credentials across environments. */
  environment?: NombaEnvironment;
  /**
   * Your dashboard-configured webhook signature key. Optional — only needed
   * if you plan to use `client.webhooks`.
   */
  webhookSignatureKey?: string;
}

/**
 * Top-level Nomba API client. Handles authentication (issue/refresh
 * automatically, ~5 min before the 30-min expiry) and exposes resource
 * clients for each product area.
 *
 * @example
 * const nomba = new NombaClient({
 *   clientId: process.env.NOMBA_CLIENT_ID!,
 *   clientSecret: process.env.NOMBA_CLIENT_SECRET!,
 *   accountId: process.env.NOMBA_ACCOUNT_ID!,
 *   environment: "sandbox",
 * });
 *
 * const order = await nomba.checkout.createOrder({
 *   order: { amount: 5000, currency: "NGN", customerEmail: "a@b.com", callbackUrl: "https://..." },
 * });
 */
export class NombaClient {
  public readonly checkout: NombaCheckoutClient;
  public readonly virtualAccounts: NombaVirtualAccountClient;
  public readonly transfers: NombaTransferClient;
  public readonly transactions: NombaTransactionClient;
  public readonly directDebits: NombaDirectDebitClient;
  public readonly tokenizedCards: NombaTokenizedCardClient;
  public readonly webhooks: NombaWebhookVerifier;

  private readonly authClient: NombaAuthClient;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt: number | null = null; // epoch ms
  private inFlightAuth: Promise<string> | null = null;

  constructor(private readonly options: NombaClientOptions) {
    const environment = options.environment ?? "production";

    this.authClient = new NombaAuthClient(
      options.clientId,
      options.clientSecret,
      options.accountId,
      environment
    );

    const http = new NombaHttpClient({
      accountId: options.accountId,
      environment,
      getAccessToken: () => this.getValidAccessToken(),
    });

    this.checkout = new NombaCheckoutClient(http);
    this.virtualAccounts = new NombaVirtualAccountClient(http);
    this.transfers = new NombaTransferClient(http);
    this.transactions = new NombaTransactionClient(http);
    this.directDebits = new NombaDirectDebitClient(http);
    this.tokenizedCards = new NombaTokenizedCardClient(http);

    // webhookSignatureKey may be added later via setWebhookSignatureKey, so
    // default to a placeholder verifier that throws a clear error if unset.
    this.webhooks = new NombaWebhookVerifier(
      options.webhookSignatureKey ?? NombaClient.MISSING_WEBHOOK_KEY_SENTINEL
    );
  }

  private static readonly MISSING_WEBHOOK_KEY_SENTINEL = "__NOMBA_WEBHOOK_KEY_NOT_CONFIGURED__";

  /**
   * Returns a valid access token, issuing or refreshing it as needed.
   * Concurrent callers share a single in-flight auth request.
   */
  private async getValidAccessToken(): Promise<string> {
    const now = Date.now();
    const REFRESH_SKEW_MS = 5 * 60 * 1000; // refresh 5 min before expiry

    if (this.accessToken && this.expiresAt && now < this.expiresAt - REFRESH_SKEW_MS) {
      return this.accessToken;
    }

    if (this.inFlightAuth) {
      return this.inFlightAuth;
    }

    this.inFlightAuth = this.refreshOrIssueToken();
    try {
      return await this.inFlightAuth;
    } finally {
      this.inFlightAuth = null;
    }
  }

  private async refreshOrIssueToken(): Promise<string> {
    if (this.accessToken && this.refreshToken) {
      const refreshed = await this.authClient.refreshAccessToken(
        this.accessToken,
        this.refreshToken
      );
      if (refreshed) {
        this.setTokenState(refreshed.data.access_token, refreshed.data.refresh_token, refreshed.data.expiresAt);
        return this.accessToken as string;
      }
      // Refresh failed (e.g. refresh token itself expired) — fall through to a fresh issue.
    }

    const issued = await this.authClient.getAccessToken();
    if (!issued) {
      throw new Error(
        "Failed to authenticate with Nomba: token issue request failed. Check clientId/clientSecret/accountId and environment."
      );
    }
    this.setTokenState(issued.data.access_token, issued.data.refresh_token, issued.data.expiresAt);
    return this.accessToken as string;
  }

  private setTokenState(accessToken: string, refreshToken: string, expiresAt: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    const parsed = Date.parse(expiresAt);
    // Fall back to a conservative 30-min-from-now if the date is unparseable,
    // matching Nomba's documented token lifetime.
    this.expiresAt = Number.isNaN(parsed) ? Date.now() + 30 * 60 * 1000 : parsed;
  }

  /** Revoke the current access token (e.g. on shutdown). Safe to call even if no token was ever issued. */
  async revokeToken(): Promise<void> {
    if (!this.accessToken) return;
    await this.authClient.revokeAccessToken(this.accessToken);
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = null;
  }
}

export { NombaAuthClient } from "./nomba.client";
export { NombaHttpClient, NombaApiError } from "./nomba.http";
export { NombaCheckoutClient } from "./nomba.checkout";
export { NombaVirtualAccountClient } from "./nomba.virtual-accounts";
export { NombaTransferClient } from "./nomba.transfers";
export { NombaTransactionClient } from "./nomba.transactions";
export { NombaDirectDebitClient } from "./nomba.direct-debits";
export { NombaTokenizedCardClient } from "./nomba.tokenized-cards";
export { NombaWebhookVerifier } from "./nomba.webhooks";
export * from "./nomba.types";