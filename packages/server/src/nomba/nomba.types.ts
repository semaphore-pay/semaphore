// ============================================================================
// Shared / envelope types
// ============================================================================

/** Standard Nomba API response envelope. `code: "00"` means success. */
export interface NombaEnvelope<T> {
  code: string;
  description: string;
  data: T;
}

export interface NombaErrorResponse {
  code: string;
  description: string;
}

export type NombaEnvironment = "production" | "sandbox";

// ============================================================================
// Auth
// ============================================================================

export interface NombaAuthResponse {
  code: string;
  description: string;
  data: {
    businessId: string;
    access_token: string;
    refresh_token: string;
    expiresAt: string;
  };
}

export interface NombaRevokeResponse {
  code: string;
  description: string;
}

// ============================================================================
// Checkout / Online Checkout
// ============================================================================

export type NombaCurrency = "NGN" | "CDF" | "USD";

export type NombaAllowedPaymentMethod =
  | "Card"
  | "Transfer"
  | "Nomba QR"
  | "USSD"
  | "Buy Now Pay Later"
  | "MOMO"
  | "Intl Card"
  | "Apple Pay";

export interface NombaSplitListItem {
  /** The accountId whose wallet will be credited when the order is paid. */
  accountId: string;
  /** The percentage of the order amount, or the actual value, to credit to this account. */
  value: number;
}

export interface NombaSplitRequest {
  splitType: "PERCENTAGE" | "AMOUNT";
  splitList: NombaSplitListItem[];
}

export interface NombaOrder {
  /** Reference of the order to be created. Auto-generated if omitted. */
  orderReference?: string;
  customerId?: string;
  /** Merchant callback url for redirect after payment. Required. */
  callbackUrl: string;
  /** Customer email. Required. */
  customerEmail: string;
  /** Amount to pay. Required. */
  amount: number;
  /** ISO 4217 currency code. NGN for Nigerian checkout; CDF or USD for DRC. Required. */
  currency: NombaCurrency;
  /** If specified, the account where funds will be deposited. */
  accountId?: string;
  /** Optional list of payment methods to display on the checkout page. */
  allowedPaymentMethods?: NombaAllowedPaymentMethod[];
  /** Split the inflow across multiple accounts. */
  splitRequest?: NombaSplitRequest;
  /**
   * Arbitrary string key/value metadata attached to the order and echoed back
   * in webhook payloads. Set `region: "CD"` to route through DRC checkout.
   */
  orderMetaData?: Record<string, string>;
}

export interface CreateOrderRequest {
  order: NombaOrder;
  /** Whether the card used for payment should be tokenized. */
  tokenizeCard?: boolean;
}

export interface CreateOrderResponse {
  /** Load this URL in a browser/iframe for the customer to complete payment. */
  checkoutLink: string;
  orderReference: string;
}

export interface CancelCheckoutOrderRequest {
  orderReference: string;
}

export interface RefundCheckoutTransactionRequest {
  transactionId: string;
  /** Amount to refund. Omit to refund the full amount. */
  amount?: number;
  reason?: string;
}

// ============================================================================
// Tokenized Cards (recurring / subscription card billing)
// ============================================================================

export interface TokenizedCardData {
  /** The key associated with the tokenized card — save this to charge the card again later. */
  tokenKey: string;
  customerEmail: string;
  cardType: string;
  /** Masked card PAN, e.g. "234818********7580". */
  cardPan: string;
  /** e.g. "20/20" (MM/YY-ish format as returned by Nomba). */
  tokenExpirationDate: string;
}

export interface TokenizedCardPaymentRequest {
  /** The tokenKey captured from the `payment_success` webhook's `tokenizedCardData`. */
  tokenKey: string;
  /**
   * The order to charge. `amount`, `currency`, `customerEmail`, and
   * `callbackUrl` are required, same as a normal checkout order — this lets
   * you charge a different amount each billing cycle against the saved card.
   */
  order: NombaOrder;
}

export interface TokenizedCardPaymentResponse {
  /** Whether the charge was approved. */
  status: boolean;
  /** Gateway message, e.g. "Approved by Financial Institution". */
  message: string;
}

export interface ListTokenizedCardsParams {
  customerEmail?: string;
  /** ISO date-time, filters by token creation date. */
  startDate?: string;
  /** ISO date-time, filters by token creation date. */
  endDate?: string;
  /** Page number; omit or 0 for the first page. */
  page?: number;
}

export interface ListTokenizedCardsResponse {
  /** Next page number, or "0" if there are no more pages. */
  nextPage?: string;
  tokenizedCardDataList: TokenizedCardData[];
}

export interface UpdateTokenizedCardDataRequest {
  tokenKey: string;
  currentEmailAddress: string;
  newEmailAddress: string;
}

export interface UpdateTokenizedCardDataResponse {
  status: boolean;
  message: string;
  tokenizedCardData?: TokenizedCardData[];
}

export interface DeleteTokenizedCardDataRequest {
  tokenKey: string;
}

export interface DeleteTokenizedCardDataResponse {
  status: boolean;
  message: string;
}

// ============================================================================
// Virtual Accounts
// ============================================================================

export interface CreateVirtualAccountRequest {
  /** 16-64 chars, unique per merchant. */
  accountRef: string;
  /** Account holder's name, 8-64 chars. */
  accountName: string;
  /** Account holder's BVN. Optional. */
  bvn?: string;
  /** Expiry date, e.g. "2026-01-30 12:15:00". Makes this a dynamic (time-bound) account. Optional. */
  expiryDate?: string;
  /**
   * Amount this account can receive. Once set, only that exact amount is
   * accepted for future payments into this account. Optional.
   */
  expectedAmount?: number;
}

export interface CreateVirtualAccountResponse {
  createdAt: string;
  accountHolderId: string;
  accountRef: string;
  bvn: string;
  accountName: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  currency: "NGN";
  callbackUrl?: string;
  expired?: boolean;
}

export interface VirtualAccountObject {
  createdAt: string;
  accountId?: string;
  accountHolderId: string;
  accountRef: string;
  bvn: string;
  status?: string;
  type?: string;
  accountName: string;
  banks?: unknown;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  currency: "NGN";
  callbackUrl?: string;
  expired?: boolean;
}

export interface UpdateVirtualAccountRequest {
  /** New account reference to issue to this virtual account. */
  newAccountRef?: string;
  accountName?: string;
  callbackUrl?: string;
  /**
   * If passed, the virtual account will only accept payments for this exact
   * amount. Once set it can never accept any other amount (though you can
   * update the expected amount again later).
   */
  expectedAmount?: string;
}

export interface UpdateVirtualAccountResponse {
  updated: boolean;
}

export interface ExpireVirtualAccountResponse {
  expired: boolean;
}

export interface FilterVirtualAccountRequest {
  accountName?: string;
  accountRef?: string;
  bvn?: string;
  bankAccountNumber?: string;
  /** ISO date-time. */
  dateCreatedFrom?: string;
  /** ISO date-time. */
  dateCreatedTo?: string;
  expired?: boolean;
  resourceAcquired?: boolean;
}

export interface VirtualAccountListResults {
  results: VirtualAccountObject[];
  /** Empty string/undefined means there is no next page. */
  cursor?: string;
}

export interface PaginationParams {
  /** Max page size (max 50). */
  limit?: number;
  /** Opaque cursor returned from a previous call. Do not construct manually. */
  cursor?: string;
}

// ============================================================================
// Transfers
// ============================================================================

export interface NombaBank {
  code: string;
  name: string;
}

export interface BanksListResults {
  results: NombaBank[];
}

export interface BankAccountLookupRequest {
  /** 10-digit destination account number. */
  accountNumber: string;
  /** Bank code, obtained from GET /v1/transfers/banks. */
  bankCode: string;
}

export interface BankAccountLookupResult {
  accountNumber: string;
  accountName: string;
}

export interface BankAccountTransferRequest {
  amount: number;
  /** 10-digit destination account number. */
  accountNumber: string;
  /** Name on the destination account (from a bank lookup). */
  accountName: string;
  /** Code of the recipient bank. */
  bankCode: string;
  /**
   * Idempotency key — must be unique per transaction. Reusing this on retry
   * prevents duplicate transfers.
   */
  merchantTxRef: string;
  senderName?: string;
  narration?: string;
}

export type NombaTransferStatus = "SUCCESS" | "PENDING_BILLING";

export interface BankAccountTransferMetaObject {
  [key: string]: unknown;
}

export interface BankAccountTransferResult {
  amount: string;
  source: string;
  sourceUserId?: string;
  customerBillerId?: string;
  productId?: string;
  meta: BankAccountTransferMetaObject;
  fee: number;
  timeCreated: string;
  id: string;
  type:
    | "withdrawal"
    | "purchase"
    | "transfer"
    | "p2p"
    | "online_checkout"
    | "qrt_credit"
    | "qrt_debit";
  status: NombaTransferStatus;
}

/**
 * Full response shape for POST /v2/transfers/bank. A 201 status with
 * description "PROCESSING" means the transfer is pending — wait for the
 * webhook rather than retrying with a new reference.
 */
export interface BankAccountTransferResponse {
  code: string;
  description:
    | "SUCCESS"
    | "PROCESSING"
    | "FAILED"
    | "BAD_REQUEST"
    | "INSUFFICIENT_BALANCE"
    | "ACCOUNT_NOT_FOUND"
    | "INVALID_TRANSACTION"
    | "WALLET_NOT_FOUND"
    | "BLACKLISTED";
  message: string;
  status: boolean;
  data: BankAccountTransferResult | { status: "PENDING_BILLING" };
}

// ============================================================================
// Direct Debits (mandate-based recurring bank debits)
// ============================================================================

export type NombaMandateFrequency =
  | "VARIABLE"
  | "WEEKLY"
  | "EVERY_TWO_WEEKS"
  | "MONTHLY"
  | "EVERY_TWO_MONTHS"
  | "EVERY_THREE_MONTHS"
  | "EVERY_FOUR_MONTHS"
  | "EVERY_FIVE_MONTHS"
  | "EVERY_SIX_MONTHS"
  | "EVERY_SEVEN_MONTHS"
  | "EVERY_EIGHT_MONTHS"
  | "EVERY_NINE_MONTHS"
  | "EVERY_TEN_MONTHS"
  | "EVERY_ELEVEN_MONTHS"
  | "EVERY_TWELVE_MONTHS";

export interface CreateMandateRequest {
  /** Customer's 10-digit bank account number to debit. */
  customerAccountNumber: string;
  /** Bank code for the customer's bank — from GET /v1/transfers/banks. */
  bankCode: string;
  customerName: string;
  customerAddress?: string;
  customerAccountName: string;
  /** Default/reference amount for the mandate. Individual debits can specify their own amount up to this, depending on `frequency`. */
  amount: number;
  frequency: NombaMandateFrequency;
  narration?: string;
  customerPhoneNumber: string;
  /**
   * A NUMERIC string (0-9) used to track this mandate — must be unique per
   * mandate. Good fit for your internal subscription/customer id.
   */
  merchantReference: string;
  /** e.g. "2025-08-29T14:58" */
  startDate: string;
  /** e.g. "2025-08-30T10:40" */
  endDate: string;
  customerEmail: string;
  /** If true, the mandate authentication flow begins immediately. */
  startImmediately?: boolean;
}

export interface CreateMandateResponse {
  mandateId: string;
  merchantReference: string;
  /** Phone number the NIBSS authentication prompt was sent to. */
  phoneNumber: string;
  /** Human-readable instructions for the customer to complete mandate authentication (e.g. a token payment to trigger NIBSS auth). */
  description: string;
}

export interface DebitMandateRequest {
  /** The mandate to debit — must be ACTIVE. */
  mandateId: string;
  amount: string;
}

export type NombaMandateDebitStatus = "SUCCESS" | "FAILED" | "PENDING";

export interface DebitMandateResult {
  mandateId: string;
  status: string;
  amount: string;
  message: string;
}

export interface DebitMandateResponse {
  code: string;
  description: string;
  data: DebitMandateResult;
  message: string;
  status: boolean;
}

export type NombaMandateStatus = "ACTIVE" | "SUSPEND" | "SUSPENDED" | "DELETE" | "DELETED" | "PENDING" | string;

export interface GetMandateStatusResult {
  customerAccountName: string;
  mandateId: string;
  customerAccountNumber: string;
  mandateStatus: string;
  rejectionComment?: string;
  mandateAdviceStatus?: string;
}

export interface GetMandateStatusResponse {
  code: string;
  description: string;
  data: GetMandateStatusResult;
  message: string;
  status: boolean;
}

export interface UpdateMandateStatusRequest {
  mandateId: string;
  /** New status: SUSPEND (pause), ACTIVE (resume), or DELETE (cancel permanently). */
  status: "SUSPEND" | "ACTIVE" | "DELETE";
}

export interface UpdateMandateStatusResult {
  mandateId: string;
  mandateStatus: string;
}

export interface UpdateMandateStatusResponse {
  code: string;
  description: string;
  data: UpdateMandateStatusResult;
  message: string;
  status: boolean;
}

export interface DirectDebitMandateData {
  status: string;
  customerAccountNumber: string;
  customerAccountName: string;
  bankCode: string;
  amount: number;
  customerName: string;
  customerAddress?: string;
  customerEmail?: string;
  customerPhoneNumber?: string;
  merchantReference: string;
  frequency: string;
  startDate: string;
  endDate: string;
  mandateAdviceStatus?: string;
  mandateId: string;
}

export interface ListMandatesParams {
  /** Page number, 0-indexed. */
  page: number;
  pageSize: number;
  /** ISO date. */
  from?: string;
  /** ISO date. */
  to?: string;
  status?: string;
}

export interface ListMandatesData {
  /**
   * NOTE: Nomba's OpenAPI spec/docs currently describe `items` as a single
   * object, which conflicts with the sibling `totalItems`/`totalPages`/
   * `hasMore` pagination fields. We model it as an array (the only shape
   * that makes sense for a paginated list) — verify against a live sandbox
   * response and adjust if Nomba's actual behavior differs.
   */
  items: DirectDebitMandateData[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ListMandatesResponse {
  code: string;
  description: string;
  data: ListMandatesData;
  message: string;
  status: boolean;
}

export interface GetMandateByIdResult {
  status: string;
  customerAccountNumber: string;
  customerAccountName: string;
  bankCode: string;
  amount: number;
  customerName: string;
  customerAddress?: string;
  customerEmail?: string;
  customerPhoneNumber?: string;
  merchantReference: string;
  frequency: string;
  /** Nomba returns these as [year, month, day, hour, minute] tuples for this endpoint (unlike the ISO strings used elsewhere). */
  startDate: number[];
  endDate: number[];
  mandateAdviceStatus?: string | null;
  mandateId: string;
}

export interface GetMandateByIdResponse {
  code: string;
  description: string;
  data: GetMandateByIdResult;
  message: string;
  status: boolean;
}

// ============================================================================
// Transactions
// ============================================================================

export type NombaTransactionStatus =
  | "SUCCESS"
  | "PENDING_BILLING"
  | "REFUND"
  | "CANCELLED"
  | "PAYMENT_FAILED"
  | "REVERSED_BY_VENDOR";

export type NombaTransactionSource = "api" | "pos" | "web" | "android_app" | "ios_app";

export type NombaTransactionType =
  | "withdrawal"
  | "purchase"
  | "transfer"
  | "p2p"
  | "online_checkout"
  | "qrt_credit"
  | "qrt_debit";

export interface TransactionResult {
  id: string;
  status: NombaTransactionStatus;
  amount: number;
  fixedCharge?: number;
  source: NombaTransactionSource;
  type: NombaTransactionType;
  gatewayMessage: string;
  customerBillerId?: string;
  timeCreated: string;
  posTid?: string;
  terminalId?: string;
  providerTerminalId?: string;
  rrn?: string;
  posSerialNumber?: string;
  posTerminalLabel?: string;
  stan?: string;
  paymentVendorReference?: string;
  userId?: string;
  posRrn?: string;
  merchantTxRef?: string;
}

/** Query params for fetching a single transaction — supply at least one. */
export interface FetchSingleTransactionParams {
  transactionRef?: string;
  merchantTxRef?: string;
  orderReference?: string;
  orderId?: string;
}

export interface FilterTransactionRequest {
  transactionRef?: string;
  status?:
    | "NEW"
    | "PENDING_PAYMENT"
    | "PAYMENT_SUCCESSFUL"
    | "PAYMENT_FAILED"
    | "PENDING_BILLING"
    | "SUCCESS"
    | "REFUND";
  source?: NombaTransactionSource;
  type?: NombaTransactionType;
  terminalId?: string;
  rrn?: string;
  merchantTxRef?: string;
  orderReference?: string;
  orderId?: string;
}

export interface ListTransactionsParams extends PaginationParams {
  /** ISO 8601 UTC start date, e.g. 2023-01-01T00:00:00 */
  dateFrom?: string;
  /** ISO 8601 UTC end date, e.g. 2024-09-30T23:59:59 */
  dateTo?: string;
}

export interface TransactionListResults {
  results: TransactionResult[];
  cursor?: string;
}

// ============================================================================
// Webhooks
// ============================================================================

export type NombaWebhookEventType =
  | "payment_success"
  | "payment_failed"
  | "payout_success"
  | "payout_failed"
  | "payment_reversal"
  | "payout_refund";

export interface NombaWebhookMerchant {
  userId?: string;
  walletId?: string;
  walletBalance?: number;
}

export interface NombaWebhookTransaction {
  transactionId?: string;
  type?: string;
  time?: string;
  responseCode?: string;
  transactionAmount?: number;
  fee?: number;
  merchantTxRef?: string;
  [key: string]: unknown;
}

export interface NombaWebhookOrder {
  orderReference?: string;
  orderId?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  accountId?: string;
  customerEmail?: string;
  cardType?: string;
  cardLast4Digits?: string;
  [key: string]: unknown;
}

export interface NombaWebhookCustomer {
  billerId?: string;
  senderName?: string;
  bankCode?: string;
  bankName?: string;
  accountNumber?: string;
  [key: string]: unknown;
}

export interface NombaWebhookPayload {
  event_type: NombaWebhookEventType | string;
  requestId: string;
  data: {
    merchant?: NombaWebhookMerchant;
    terminal?: Record<string, unknown>;
    transaction?: NombaWebhookTransaction;
    order?: NombaWebhookOrder;
    customer?: NombaWebhookCustomer;
    /**
     * Present on `payment_success` webhooks for checkout orders created with
     * `tokenizeCard: true`. Save `tokenizedCardData.tokenKey` to charge this
     * card again later via NombaTokenizedCardClient.charge().
     */
    tokenizedCardData?: TokenizedCardData;
    [key: string]: unknown;
  };
}

/** Headers Nomba sends alongside every webhook POST. */
export interface NombaWebhookHeaders {
  "nomba-signature": string;
  "nomba-sig-value"?: string;
  "nomba-signature-algorithm"?: "HmacSHA256";
  "nomba-timestamp": string;
}