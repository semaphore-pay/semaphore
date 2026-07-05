import type { NombaHttpClient } from "./nomba.http";
import type {
  CreateMandateRequest,
  CreateMandateResponse,
  DebitMandateRequest,
  DebitMandateResponse,
  GetMandateStatusResponse,
  ListMandatesData,
  ListMandatesParams,
  ListMandatesResponse,
  UpdateMandateStatusResponse,
} from "./nomba.types";

/**
 * Direct Debits — NIBSS e-mandate based recurring bank debits. This is
 * Nomba's actual "pull money on a schedule" primitive: a customer authorizes
 * a mandate once, then you debit it repeatedly without further customer
 * action, subject to the mandate's `frequency` and `endDate`.
 *
 * See: https://developer.nomba.com/nomba-api-reference/direct-debits
 *
 * Typical subscription flow:
 *   1. createMandate() with the customer's bank details and billing cadence.
 *   2. Customer completes NIBSS authentication (the `description` field in
 *      the response tells them how — usually a small token payment).
 *   3. Poll getStatus() or getMandate() until `mandateStatus`/`status` is
 *      ACTIVE (or listen for your own reconciliation webhook if you build
 *      one — Nomba's dashboard webhooks list payment/payout events, not
 *      mandate state changes, so polling is currently the reliable path).
 *   4. On each billing cycle, call debit() with the mandate ID and amount.
 *   5. Call updateStatus() with SUSPEND/ACTIVE to pause/resume, or DELETE to
 *      cancel the mandate permanently (e.g. on subscription cancellation).
 *
 * All endpoints here return a richer envelope (code/description/message/
 * status/data) than the standard `code: "00"` shape used elsewhere, and the
 * HTTP client is called with skipCodeCheck so callers can inspect `status`/
 * `description` directly.
 */
export class NombaDirectDebitClient {
  constructor(private readonly http: NombaHttpClient) {}

  /**
   * Create a new direct debit mandate. The customer must complete NIBSS
   * e-mandate authentication (instructions are in the response's
   * `description` field) before the mandate becomes ACTIVE and debitable.
   */
  async createMandate(request: CreateMandateRequest): Promise<CreateMandateResponse> {
    const response = await this.http.post<{
      responseMessage: string;
      responseCode: string;
      data: CreateMandateResponse;
    }>("/v1/direct-debits", request, { skipCodeCheck: true });

    if (response.responseCode !== "00") {
      throw new Error(`Failed to create mandate: ${response.responseMessage}`);
    }
    return response.data;
  }

  /**
   * Debit an ACTIVE mandate for the given amount. Check
   * `response.data.status` — a non-"SUCCESS" status means the debit didn't
   * go through (e.g. insufficient funds); it is not necessarily an HTTP
   * error, so inspect the response body rather than relying on try/catch.
   */
  debit(request: DebitMandateRequest): Promise<DebitMandateResponse> {
    return this.http.post<DebitMandateResponse>("/v1/direct-debits/debit-mandate", request, {
      skipCodeCheck: true,
    });
  }

  /** Fetch the authentication/authorization status of a mandate by ID. */
  getStatus(mandateId: string): Promise<GetMandateStatusResponse> {
    return this.http.get<GetMandateStatusResponse>("/v1/direct-debits/status", {
      query: { mandateId },
      skipCodeCheck: true,
    });
  }

  /** Fetch the status of a mandate by ID (alias for getStatus — uses the same endpoint). */
  getMandate(mandateId: string): Promise<GetMandateStatusResponse> {
    return this.http.get<GetMandateStatusResponse>("/v1/direct-debits/status", {
      query: { mandateId },
      skipCodeCheck: true,
    });
  }

  /**
   * Update a mandate's status: SUSPEND (pause billing, keep the mandate),
   * ACTIVE (resume), or DELETE (cancel permanently — cannot be undone).
   */
  updateStatus(
    mandateId: string,
    status: "SUSPEND" | "ACTIVE" | "DELETE"
  ): Promise<UpdateMandateStatusResponse> {
    return this.http.put<UpdateMandateStatusResponse>(
      "/v1/direct-debits/update-status",
      { mandateId, status },
      { skipCodeCheck: true }
    );
  }

  /** List/search mandates with pagination and optional date range/status filter. */
  async listMandates(params: ListMandatesParams): Promise<ListMandatesData> {
    const response = await this.http.get<ListMandatesResponse>("/v1/direct-debits/mandates", {
      query: { ...params },
      skipCodeCheck: true,
    });
    return response.data;
  }
}
