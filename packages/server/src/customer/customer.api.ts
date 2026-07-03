import * as z from "zod";
import type { SemaphorePayEngine } from "../database/index";
import {
  deleteCustomerRecord,
  getCustomerWithDetails,
  upsertCustomerRecord,
} from "./customer.service";

const upsertCustomerSchema = z.object({
  /** Existing customer ID to update. Omit to create a new customer. */
  id: z.string().optional(),
  /** Your application's user identifier. */
  userId: z.string(),
  /** Customer email — required for Nomba checkout. */
  email: z.string().optional(),
  /** Customer display name. */
  name: z.string().optional(),
  /** Arbitrary key/value metadata. */
  metadata: z.record(z.string(), z.string()).optional(),
});

const customerIdSchema = z.object({
  customerId: z.string(),
});

/**
 * Create or update a customer. If an ID is provided and the customer
 * exists, the record is updated; otherwise a new customer is created.
 *
 * @param engine - The SemaphorePay engine.
 * @param input - Validated customer upsert data.
 * @param context.collectionId - The collection scope.
 * @returns The customer row.
 */
export async function upsertCustomer(
  engine: SemaphorePayEngine<any>,
  input: z.infer<typeof upsertCustomerSchema>,
  context: { collectionId: string },
) {
  const parsedInput = upsertCustomerSchema.parse(input);
  return await upsertCustomerRecord(engine, {
    ...parsedInput,
    collectionId: context.collectionId,
  });
}

/**
 * Fetch a customer with their active subscriptions and entitlements.
 *
 * @returns A {@link CustomerWithDetails} object, or `null` if
 *   not found or soft-deleted.
 */
export async function getCustomer(
  engine: SemaphorePayEngine<any>,
  input: z.infer<typeof customerIdSchema>,
  context: { collectionId: string },
) {
  const parsedInput = customerIdSchema.parse(input);
  return await getCustomerWithDetails(
    engine,
    parsedInput.customerId,
    context.collectionId,
  );
}

/**
 * Soft-delete a customer. Active subscriptions are immediately canceled.
 * Billing history is preserved — the record stays in the database.
 *
 * @returns `{ success: true }`.
 */
export async function deleteCustomer(
  engine: SemaphorePayEngine<any>,
  input: z.infer<typeof customerIdSchema>,
  context: { collectionId: string },
) {
  const parsedInput = customerIdSchema.parse(input);
  await deleteCustomerRecord(engine, parsedInput.customerId, context.collectionId);
  return { success: true };
}
