import type { NombaHttpClient } from "./nomba.http";
import type {
  CreateOrderRequest,
  CreateOrderResponse,
  DeleteTokenizedCardDataRequest,
  DeleteTokenizedCardDataResponse,
  ListTokenizedCardsParams,
  ListTokenizedCardsResponse,
  TokenizedCardPaymentRequest,
  TokenizedCardPaymentResponse,
  UpdateTokenizedCardDataRequest,
  UpdateTokenizedCardDataResponse,
} from "./nomba.types";

/**
 * Tokenized Cards — recurring/subscription card billing. This is Nomba's
 * "charge a saved card without re-prompting the customer" primitive, and the
 * card-based counterpart to direct debit mandates.
 *
 * See: https://developer.nomba.com/docs/products/accept-payment/recurring-payments
 *
 * Flow:
 *   1. First charge: create a checkout order via
 *      NombaCheckoutClient.createOrder() with `tokenizeCard: true`, and send
 *      the customer to `checkoutLink`.
 *   2. On success, Nomba sends a `payment_success` webhook whose
 *      `data.tokenizedCardData.tokenKey` you must save — it's the only way
 *      to charge this card again. There is no other way to retrieve a
 *      tokenKey after the fact for a specific card, so persist it
 *      immediately in your webhook handler.
 *   3. Subsequent charges: call charge() with the saved tokenKey and a new
 *      order (you can vary the amount each cycle). No customer interaction
 *      needed.
 *   4. Always verify the resulting transaction server-side (e.g. via
 *      NombaTransactionClient) before extending access for that billing
 *      cycle — don't rely on `response.status` alone.
 */
export class NombaTokenizedCardClient {
  constructor(private readonly http: NombaHttpClient) {}

  /**
   * Convenience: create a checkout order with `tokenizeCard` forced to true,
   * for the first charge in a recurring billing relationship. Equivalent to
   * calling NombaCheckoutClient.createOrder() with `tokenizeCard: true`.
   */
  createTokenizingOrder(
    request: Omit<CreateOrderRequest, "tokenizeCard">
  ): Promise<CreateOrderResponse> {
    return this.http.post<CreateOrderResponse>("/v1/checkout/order", {
      ...request,
      tokenizeCard: true,
    });
  }

  /**
   * Charge a previously tokenized card. Use the `tokenKey` captured from the
   * `payment_success` webhook of the original tokenizing order.
   */
  charge(request: TokenizedCardPaymentRequest): Promise<TokenizedCardPaymentResponse> {
    return this.http.post<TokenizedCardPaymentResponse>(
      "/v1/checkout/tokenized-card-payment",
      request
    );
  }

  /** List tokenized cards for this merchant, optionally filtered by customer email or creation date range. */
  list(params: ListTokenizedCardsParams = {}): Promise<ListTokenizedCardsResponse> {
    return this.http.get<ListTokenizedCardsResponse>("/v1/checkout/tokenized-card-data", {
      query: { ...params },
    });
  }

  /** Re-associate a tokenized card with a different customer email. */
  update(request: UpdateTokenizedCardDataRequest): Promise<UpdateTokenizedCardDataResponse> {
    return this.http.post<UpdateTokenizedCardDataResponse>(
      "/v1/checkout/tokenized-card-data",
      request
    );
  }

  /** Permanently delete a tokenized card, e.g. when a subscription is cancelled or a card is replaced. */
  delete(request: DeleteTokenizedCardDataRequest): Promise<DeleteTokenizedCardDataResponse> {
    return this.http.delete<DeleteTokenizedCardDataResponse>(
      "/v1/checkout/tokenized-card-data",
      request
    );
  }
}
