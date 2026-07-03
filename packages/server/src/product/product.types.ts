import * as z from "zod";

/** Zod schema for a product feature (entitlement) definition. */
export const productFeatureSchema = z.object({
  /** Unique identifier used in entitlement checks (e.g. "seats"). */
  featureId: z.string(),
  /** "boolean" for on/off features, "limit" for countable/metered. */
  type: z.enum(["boolean", "limit"]),
  /** Maximum allowed value for metered features. `null` means unlimited. */
  limit: z.number().int().nonnegative().optional().nullable(),
  /** How often the metered balance resets. */
  resetInterval: z.enum(["day", "week", "month", "year"]).optional().nullable(),
  /** Optional key/value config for this feature. */
  config: z.record(z.string(), z.unknown()).optional(),
});

/** Zod schema for creating a product. Used by {@link createProduct}. */
export const createProductSchema = z.object({
  /** Unique product identifier in your app (e.g. "starter"). */
  id: z.string(),
  /** Display name. */
  name: z.string(),
  /** Optional grouping label (e.g. "Team Plans"). */
  group: z.string().optional(),
  /** Whether this is the default product for the collection. */
  isDefault: z.boolean().optional(),
  /** Price in smallest currency unit (e.g. 5000 = ₦5000). Omit for free. */
  priceAmount: z.number().int().nonnegative().optional().nullable(),
  /** ISO 4217 currency code (e.g. "NGN"). */
  priceCurrency: z.string().optional(),
  /** Billing interval (e.g. "monthly", "yearly"). */
  priceInterval: z.string().optional(),
  /** Product version. Increment to trigger migrations/upgrades. */
  version: z.number().int().optional(),
  /** Features (entitlements) included in this product. */
  features: z.array(productFeatureSchema).optional(),
});

/** Inferred type from {@link createProductSchema}. */
export type CreateProductRequest = z.infer<typeof createProductSchema>;

/** Extended input with server-injected collection/environment context. */
export interface CreateProductInput extends CreateProductRequest {
  collectionId: string;
  environment: "development" | "production";
}
