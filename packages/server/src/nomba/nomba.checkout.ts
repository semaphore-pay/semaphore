import type { NombaHttpClient } from "./nomba.http";
import type {
  CreateOrderRequest,
  CreateOrderResponse,
  RefundCheckoutTransactionRequest,
  TransactionResult,
} from "./nomba.types";

/**
 * Online Checkout — hosted payment pages (card, bank transfer, USSD, etc).
 * See: https://developer.nomba.com/nomba-api-reference/online-checkout
 */
export class NombaCheckoutClient {
  constructor(private readonly http: NombaHttpClient) {}

  /**
   * Create a checkout order. Redirect the customer to the returned
   * `checkoutLink` to complete payment.
   */
  createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    return this.http.post<CreateOrderResponse>("/v1/checkout/order", request);
  }

  /** Fetch the details of a checkout order by its orderReference. */
  getOrder(orderReference: string): Promise<unknown> {
    return this.http.get(`/v1/checkout/order/${encodeURIComponent(orderReference)}`);
  }

  /** Cancel a checkout order before it's paid. */
  cancelOrder(orderReference: string): Promise<unknown> {
    return this.http.post("/v1/checkout/order/cancel", { orderReference });
  }

  /** Fetch a checkout transaction's details. */
  getTransaction(transactionId: string): Promise<TransactionResult> {
    return this.http.get<TransactionResult>("/v1/checkout/transaction", {
      query: { transactionId },
    });
  }

  /** Cancel a checkout transaction. */
  cancelTransaction(transactionId: string): Promise<unknown> {
    return this.http.post("/v1/checkout/transaction/cancel", { transactionId });
  }

  /** Refund a completed checkout transaction, in full or in part. */
  refund(request: RefundCheckoutTransactionRequest): Promise<unknown> {
    return this.http.post("/v1/checkout/refund", request);
  }
}
