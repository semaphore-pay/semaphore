import type { NombaHttpClient } from "./nomba.http";
import type {
  BankAccountLookupRequest,
  BankAccountLookupResult,
  BankAccountTransferRequest,
  BankAccountTransferResponse,
  BanksListResults,
} from "./nomba.types";

/**
 * Transfers — bank payouts from your Nomba balance.
 * See: https://developer.nomba.com/nomba-api-reference/transfers
 *
 * Typical flow: fetchBanks() -> lookupAccount() -> transferToBank() with a
 * unique merchantTxRef, then wait for the `payout_success` / `payout_failed`
 * webhook (or poll transactions) before treating the payout as final.
 */
export class NombaTransferClient {
  constructor(private readonly http: NombaHttpClient) {}

  /** Fetch all supported banks and their codes, for use in lookups/transfers. */
  fetchBanks(): Promise<BanksListResults> {
    return this.http.get<BanksListResults>("/v1/transfers/banks");
  }

  /** Verify a recipient's name for a given account number + bank code before transferring. */
  lookupAccount(request: BankAccountLookupRequest): Promise<BankAccountLookupResult> {
    return this.http.post<BankAccountLookupResult>("/v1/transfers/bank/lookup", request);
  }

  /**
   * Initiate a bank transfer from the parent account. `merchantTxRef` is your
   * idempotency key — reuse it on retry rather than generating a new one, to
   * avoid duplicate payouts.
   *
   * A `description`/`data.status` of `PENDING_BILLING` means the transfer is
   * still processing — do not retry, wait for the `payout_success` /
   * `payout_failed` webhook (or poll) instead.
   */
  transferToBank(request: BankAccountTransferRequest): Promise<BankAccountTransferResponse> {
    // This endpoint uses a richer envelope (code/description/message/status/data)
    // than the standard `code: "00"` shape, and legitimately returns non-"00"
    // codes (e.g. "201"/PROCESSING) on success, so we skip the generic check
    // and let the caller inspect `description`/`data.status` directly.
    return this.http.post<BankAccountTransferResponse>("/v2/transfers/bank", request, {
      skipCodeCheck: true,
    });
  }

  /** Convenience helper: true if a transfer response indicates it's still processing. */
  static isPending(response: BankAccountTransferResponse): boolean {
    return (
      response.description === "PROCESSING" ||
      (response.data as { status?: string })?.status === "PENDING_BILLING"
    );
  }

  /** Convenience helper: true if a transfer response indicates final success. */
  static isSuccess(response: BankAccountTransferResponse): boolean {
    return response.description === "SUCCESS";
  }
}
