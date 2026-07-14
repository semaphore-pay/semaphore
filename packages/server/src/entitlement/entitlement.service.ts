import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import type { SemaphorePayEngine } from "../database/index";

export interface EntitlementBalance {
  limit: number;
  remaining: number;
  resetAt: Date | null;
  unlimited: boolean;
}

export interface CheckResult {
  allowed: boolean;
  balance: EntitlementBalance | null;
}

export interface ReportResult {
  balance: EntitlementBalance | null;
  success: boolean;
}

interface ActiveEntitlementRow {
  id: string;
  balance: number;
  nextResetAt: Date | null;
  originalLimit: number | null;
  resetInterval: string | null;
}

function addResetInterval(date: Date, resetInterval: string): Date {
  const next = new Date(date);
  if (resetInterval === "day") next.setUTCDate(next.getUTCDate() + 1);
  if (resetInterval === "week") next.setUTCDate(next.getUTCDate() + 7);
  if (resetInterval === "month") {
    const day = next.getUTCDate();
    next.setUTCMonth(next.getUTCMonth() + 1);
    if (next.getUTCDate() !== day) next.setUTCDate(0);
  }
  if (resetInterval === "year") {
    const day = next.getUTCDate();
    next.setUTCFullYear(next.getUTCFullYear() + 1);
    if (next.getUTCDate() !== day) next.setUTCDate(0);
  }
  return next;
}

function getNextResetAt(
  currentResetAt: Date,
  now: Date,
  resetInterval: string,
): Date {
  let nextResetAt = new Date(currentResetAt);
  while (nextResetAt <= now) {
    nextResetAt = addResetInterval(nextResetAt, resetInterval);
  }
  return nextResetAt;
}

function aggregateBalance(
  rows: ActiveEntitlementRow[],
): EntitlementBalance | null {
  if (rows.length === 0) return null;

  const hasUnlimited = rows.some((row) => row.originalLimit === null);
  if (hasUnlimited) {
    return { limit: 0, remaining: 0, resetAt: null, unlimited: true };
  }

  let remaining = 0;
  let limit = 0;
  let resetAt: Date | null = null;

  for (const row of rows) {
    remaining += row.balance;
    limit += row.originalLimit!;
    if (row.nextResetAt) {
      if (!resetAt || row.nextResetAt < resetAt) {
        resetAt = row.nextResetAt;
      }
    }
  }

  return { limit, remaining, resetAt, unlimited: false };
}

async function getActiveEntitlements(
  engine: SemaphorePayEngine<any>,
  tx: any,
  customerId: string,
  featureId: string,
  collectionId: string,
): Promise<ActiveEntitlementRow[]> {
  const schema = engine.schema;

  const subRows = await tx
    .select({
      id: schema.entitlement.id,
      balance: schema.entitlement.balance,
      nextResetAt: schema.entitlement.nextResetAt,
      originalLimit: schema.planFeature.limit,
      resetInterval: schema.planFeature.resetInterval,
    })
    .from(schema.entitlement)
    .innerJoin(
      schema.subscription,
      eq(schema.entitlement.subscriptionId, schema.subscription.id),
    )
    .innerJoin(
      schema.planFeature,
      and(
        eq(schema.planFeature.planId, schema.subscription.planId),
        eq(schema.planFeature.featureId, schema.entitlement.featureId),
      ),
    )
    .where(
      and(
        eq(schema.entitlement.customerId, customerId),
        eq(schema.entitlement.featureId, featureId),
        eq(schema.subscription.collectionId, collectionId),
        inArray(schema.subscription.status, ["active", "trialing"]),
        or(
          isNull(schema.subscription.endedAt),
          sql`${schema.subscription.endedAt} > ${new Date().toISOString()}`,
        ),
      ),
    );

  const purchaseRows = await tx
    .select({
      id: schema.entitlement.id,
      balance: schema.entitlement.balance,
      nextResetAt: schema.entitlement.nextResetAt,
      originalLimit: schema.productFeature.limit,
      resetInterval: schema.productFeature.resetInterval,
    })
    .from(schema.entitlement)
    .innerJoin(
      schema.productPurchase,
      eq(schema.entitlement.productPurchaseId, schema.productPurchase.id),
    )
    .innerJoin(
      schema.productFeature,
      and(
        eq(schema.productFeature.productInternalId, schema.productPurchase.productInternalId),
        eq(schema.productFeature.featureId, schema.entitlement.featureId),
      ),
    )
    .where(
      and(
        eq(schema.entitlement.customerId, customerId),
        eq(schema.entitlement.featureId, featureId),
        eq(schema.productPurchase.collectionId, collectionId),
        eq(schema.productPurchase.status, "completed"),
      ),
    );

  if (subRows.length > 0 || purchaseRows.length > 0) {
    return [...subRows, ...purchaseRows] as ActiveEntitlementRow[];
  }

  // Lazy backfill: no entitlement rows found. Check if customer has an active
  // subscription whose plan includes this feature but no entitlement was created.
  const now = new Date();

  const missingSubscriptions = await tx
    .select({
      subscriptionId: schema.subscription.id,
      customerId: schema.subscription.customerId,
      currentPeriodEndAt: schema.subscription.currentPeriodEndAt,
      pfLimit: schema.planFeature.limit,
      pfResetInterval: schema.planFeature.resetInterval,
      planId: schema.plan.id,
      planInterval: schema.plan.interval,
    })
    .from(schema.subscription)
    .innerJoin(
      schema.plan,
      eq(schema.plan.id, schema.subscription.planId),
    )
    .innerJoin(
      schema.planFeature,
      and(
        eq(schema.planFeature.planId, schema.subscription.planId),
        eq(schema.planFeature.featureId, featureId),
      ),
    )
    .where(
      and(
        eq(schema.subscription.customerId, customerId),
        eq(schema.subscription.collectionId, collectionId),
        inArray(schema.subscription.status, ["active", "trialing"]),
        or(
          isNull(schema.subscription.endedAt),
          sql`${schema.subscription.endedAt} > ${now.toISOString()}`,
        ),
      ),
    );

  for (const row of missingSubscriptions) {
    const existingEntitlement = await tx.query.entitlement.findFirst({
      where: and(
        eq(schema.entitlement.subscriptionId, row.subscriptionId),
        eq(schema.entitlement.featureId, featureId),
      ),
    });
    if (existingEntitlement) continue;

    const isBoolean = row.pfLimit === null;
    const entitlementLimit = isBoolean ? null : row.pfLimit;
    const nextResetAt = isBoolean || row.planInterval === "none"
      ? null
      : row.currentPeriodEndAt;

    await tx.insert(schema.entitlement).values({
      id: crypto.randomUUID(),
      customerId: row.customerId,
      subscriptionId: row.subscriptionId,
      featureId,
      balance: entitlementLimit,
      limit: entitlementLimit,
      nextResetAt,
      sourceType: "subscription",
      sourceId: row.planId,
    });
  }

  // Re-query after backfill
  const backfilledSubRows = await tx
    .select({
      id: schema.entitlement.id,
      balance: schema.entitlement.balance,
      nextResetAt: schema.entitlement.nextResetAt,
      originalLimit: schema.planFeature.limit,
      resetInterval: schema.planFeature.resetInterval,
    })
    .from(schema.entitlement)
    .innerJoin(
      schema.subscription,
      eq(schema.entitlement.subscriptionId, schema.subscription.id),
    )
    .innerJoin(
      schema.planFeature,
      and(
        eq(schema.planFeature.planId, schema.subscription.planId),
        eq(schema.planFeature.featureId, schema.entitlement.featureId),
      ),
    )
    .where(
      and(
        eq(schema.entitlement.customerId, customerId),
        eq(schema.entitlement.featureId, featureId),
        eq(schema.subscription.collectionId, collectionId),
        inArray(schema.subscription.status, ["active", "trialing"]),
        or(
          isNull(schema.subscription.endedAt),
          sql`${schema.subscription.endedAt} > ${now.toISOString()}`,
        ),
      ),
    );

  return [...backfilledSubRows, ...purchaseRows] as ActiveEntitlementRow[];
}

async function resetStaleEntitlements(
  engine: SemaphorePayEngine<any>,
  tx: any,
  rows: ActiveEntitlementRow[],
  now: Date,
): Promise<void> {
  const schema = engine.schema;
  const staleRows = rows.filter(
    (row) =>
      row.nextResetAt &&
      row.nextResetAt <= now &&
      row.resetInterval &&
      row.originalLimit != null,
  );

  if (staleRows.length === 0) return;

  for (const row of staleRows) {
    const nextReset = getNextResetAt(row.nextResetAt!, now, row.resetInterval!);

    await tx
      .update(schema.entitlement)
      .set({
        balance: row.originalLimit,
        nextResetAt: nextReset,
        updatedAt: now,
      })
      .where(eq(schema.entitlement.id, row.id));

    row.balance = row.originalLimit!;
    row.nextResetAt = nextReset;
  }
}

export async function checkEntitlement(
  engine: SemaphorePayEngine<any>,
  input: {
    customerId: string;
    featureId: string;
    collectionId: string;
    now?: Date;
    required?: number;
  },
): Promise<CheckResult> {
  const required = input.required ?? 1;
  const now = input.now ?? new Date();

  return await engine.transaction(async (tx: any) => {
    const rows = await getActiveEntitlements(
      engine,
      tx,
      input.customerId,
      input.featureId,
      input.collectionId,
    );
    await resetStaleEntitlements(engine, tx, rows, now);

    const balance = aggregateBalance(rows);

    if (!balance) return { allowed: false, balance: null };
    if (balance.unlimited) return { allowed: true, balance };

    return { allowed: balance.remaining >= required, balance };
  });
}

export async function reportEntitlement(
  engine: SemaphorePayEngine<any>,
  input: {
    amount?: number;
    customerId: string;
    featureId: string;
    collectionId: string;
    now?: Date;
  },
): Promise<ReportResult> {
  const amount = input.amount ?? 1;
  const now = input.now ?? new Date();

  return await engine.transaction(async (tx: any) => {
    const rows = await getActiveEntitlements(
      engine,
      tx,
      input.customerId,
      input.featureId,
      input.collectionId,
    );
    await resetStaleEntitlements(engine, tx, rows, now);

    const balance = aggregateBalance(rows);
    if (!balance) return { balance: null, success: false };

    if (balance.unlimited) {
      return { balance, success: true };
    }

    if (balance.remaining < amount) {
      return { balance, success: false };
    }

    let remainingToDeduct = amount;

    for (const row of rows) {
      if (row.originalLimit === null || row.balance <= 0) continue;
      if (remainingToDeduct <= 0) break;

      const deduction = Math.min(row.balance, remainingToDeduct);
      const target = row.balance - deduction;

      await tx
        .update(engine.schema.entitlement)
        .set({ balance: target, updatedAt: now })
        .where(eq(engine.schema.entitlement.id, row.id));

      row.balance = target;
      remainingToDeduct -= deduction;
    }

    return { balance: aggregateBalance(rows), success: true };
  });
}