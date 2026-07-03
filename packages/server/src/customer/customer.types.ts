/** A single subscription returned as part of a customer detail response. */
export interface CustomerSubscription {
  /** The product's internalId. */
  productInternalId: string;
  /** Current subscription status: "active", "trialing", "past_due", etc. */
  status: string;
  /** Whether the subscription is scheduled to cancel at period end. */
  cancelAtPeriodEnd: boolean;
  /** Start of the current billing period. */
  currentPeriodStart: Date | null;
  /** End of the current billing period. */
  currentPeriodEnd: Date | null;
}

/** A single entitlement record resolved for a customer. */
export interface CustomerEntitlement {
  /** Feature identifier (e.g. "seats"). */
  featureId: string;
  /** Remaining units. */
  balance: number;
  /** Maximum allowed units. */
  limit: number;
  /** Used units (limit - balance). */
  usage: number;
  /** Whether this is a boolean (unlimited/unmetered) entitlement. */
  unlimited: boolean;
  /** When the balance resets, or null for boolean features. */
  nextResetAt: Date | null;
}

/**
 * Full customer response from {@link getCustomerWithDetails}.
 * Includes the customer record, active subscriptions, and
 * resolved entitlements indexed by featureId.
 */
export interface CustomerWithDetails {
  id: string;
  userId: string;
  email: string | null;
  name: string | null;
  metadata: Record<string, string> | null;
  /** Nomba customer ID, if linked. */
  nombaCustomerId: string | null;
  /** Active subscriptions (active/trialing/past_due, not ended). */
  subscriptions: CustomerSubscription[];
  /** Entitlements keyed by featureId. */
  entitlements: Record<string, CustomerEntitlement>;
}

/** Paginated customer list result. */
export interface ListCustomersResult {
  data: CustomerWithDetails[];
  total: number;
  hasMore: boolean;
  limit: number;
  offset: number;
}
