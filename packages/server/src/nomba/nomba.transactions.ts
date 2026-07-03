import type { NombaHttpClient } from "./nomba.http";
import type {
  FetchSingleTransactionParams,
  FilterTransactionRequest,
  ListTransactionsParams,
  TransactionListResults,
  TransactionResult,
} from "./nomba.types";

/**
 * Transactions — verification and reconciliation on the parent account.
 * See: https://developer.nomba.com/nomba-api-reference/transactions
 *
 * Always verify a transaction here server-side (don't rely on the webhook
 * alone) before delivering goods or services.
 */
export class NombaTransactionClient {
  constructor(private readonly http: NombaHttpClient) {}

  /**
   * Fetch a single transaction. Supply at least one of transactionRef,
   * merchantTxRef, orderReference, or orderId.
   */
  fetchSingle(params: FetchSingleTransactionParams): Promise<TransactionResult> {
    return this.http.get<TransactionResult>("/v1/transactions/accounts/single", {
      query: { ...params },
    });
  }

  /** List transactions on the parent account, with cursor-based pagination and date range. */
  list(params: ListTransactionsParams = {}): Promise<TransactionListResults> {
    return this.http.get<TransactionListResults>("/v1/transactions/accounts", {
      query: { ...params },
    });
  }

  /** Filter transactions on the parent account by status, type, source, refs, etc. */
  filter(
    request: FilterTransactionRequest = {},
    pagination: ListTransactionsParams = {}
  ): Promise<TransactionListResults> {
    return this.http.post<TransactionListResults>("/v1/transactions/accounts", request, {
      query: { ...pagination },
    });
  }

  /** Requery a transaction by session ID to force a fresh status check upstream. */
  requery(sessionId: string): Promise<TransactionResult> {
    return this.http.get<TransactionResult>(
      `/v1/transactions/requery/${encodeURIComponent(sessionId)}`
    );
  }

  /**
   * Poll a transaction until it reaches a terminal status (SUCCESS, REFUND,
   * PAYMENT_FAILED, CANCELLED, or REVERSED_BY_VENDOR), or until maxAttempts
   * is reached. Use this as a fallback when webhooks are unreliable, or in
   * addition to webhooks for critical transactions.
   */
  async pollUntilTerminal(
    params: FetchSingleTransactionParams,
    options: { intervalMs?: number; maxAttempts?: number } = {}
  ): Promise<TransactionResult> {
    const intervalMs = options.intervalMs ?? 3000;
    const maxAttempts = options.maxAttempts ?? 10;
    const terminalStatuses = new Set([
      "SUCCESS",
      "REFUND",
      "PAYMENT_FAILED",
      "CANCELLED",
      "REVERSED_BY_VENDOR",
    ]);

    let lastResult: TransactionResult | undefined;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      lastResult = await this.fetchSingle(params);
      if (terminalStatuses.has(lastResult.status)) {
        return lastResult;
      }
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }
    // Exhausted attempts; return the last known (still pending) result rather
    // than throwing, so callers can decide how to handle a timeout.
    return lastResult as TransactionResult;
  }
}
