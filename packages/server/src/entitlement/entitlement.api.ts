import * as z from "zod";
import type { SemaphorePayEngine } from "../database/index";
import { checkEntitlement, reportEntitlement } from "./entitlement.service";

const entitlementCheckSchema = z.object({
  /** The customer ID. */
  customerId: z.string(),
  /** Feature identifier (e.g. "seats", "pro_mode"). */
  featureId: z.string(),
  /** How many units are needed. Defaults to 1. */
  required: z.number().positive().optional(),
});

const entitlementReportSchema = z.object({
  customerId: z.string(),
  featureId: z.string(),
  /** Units used (consumed). Defaults to 1. */
  amount: z.number().positive().optional(),
});

/**
 * Check whether a customer has access to a feature.
 *
 * - Boolean features: returns `allowed: true` if any active
 *   subscription includes the feature.
 * - Metered features: checks if combined balance >= `required`.
 *
 * @returns A {@link CheckResult} with the aggregated balance.
 */
export async function check(
  engine: SemaphorePayEngine<any>,
  input: z.infer<typeof entitlementCheckSchema>,
  context: { collectionId: string },
) {
  const parsedInput = entitlementCheckSchema.parse(input);

  return await checkEntitlement(engine, {
    customerId: parsedInput.customerId,
    featureId: parsedInput.featureId,
    collectionId: context.collectionId,
    required: parsedInput.required,
  });
}

/**
 * Report usage — deduct `amount` from a metered entitlement.
 * Balances are deducted across active subscriptions until the
 * requested amount is satisfied or balances run out.
 *
 * @returns A {@link ReportResult} — `success: false` if
 *   insufficient balance, plus the post-deduction balance.
 */
export async function report(
  engine: SemaphorePayEngine<any>,
  input: z.infer<typeof entitlementReportSchema>,
  context: { collectionId: string },
) {
  const parsedInput = entitlementReportSchema.parse(input);

  return await reportEntitlement(engine, {
    customerId: parsedInput.customerId,
    featureId: parsedInput.featureId,
    collectionId: context.collectionId,
    amount: parsedInput.amount,
  });
}
