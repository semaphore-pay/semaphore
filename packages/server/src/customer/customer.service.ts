import { and, desc, eq, inArray, isNull, or, sql, ilike, count } from "drizzle-orm";
import type { SemaphorePayEngine } from "../database/index";
import type {
  CustomerEntitlement,
  CustomerWithDetails,
  ListCustomersResult,
} from "./customer.types";

/**
 * List customers for a collection with optional search and pagination.
 * Returns basic customer rows without subscription/entitlement details.
 */
export async function listCustomers(
  engine: SemaphorePayEngine<any>,
  input: {
    collectionId: string;
    search?: string;
    limit?: number;
    offset?: number;
  },
): Promise<ListCustomersResult> {
  const schema = engine.schema;
  const limit = input.limit ?? 50;
  const offset = input.offset ?? 0;

  const where = and(
    eq(schema.customer.collectionId, input.collectionId),
    isNull(schema.customer.deletedAt),
    input.search
      ? or(
          ilike(schema.customer.name, `%${input.search}%`),
          ilike(schema.customer.email, `%${input.search}%`),
          ilike(schema.customer.userId, `%${input.search}%`),
        )
      : undefined,
  );

  const [data, countResult] = await Promise.all([
    engine.db
      .select()
      .from(schema.customer)
      .where(where)
      .orderBy(desc(schema.customer.createdAt))
      .limit(limit)
      .offset(offset),
    engine.db
      .select({ value: count() })
      .from(schema.customer)
      .where(where),
  ]);

  const total = Number((countResult as any)[0]?.value ?? 0);

  return {
    data: data.map((row: any) => ({
      ...row,
      subscriptions: [],
      entitlements: {},
    })),
    total,
    hasMore: offset + data.length < total,
    limit,
    offset,
  };
}

/**
 * Upsert a customer: update if `id` matches an existing record,
 * otherwise insert a new row.
 *
 * @returns The upserted customer row.
 */
export async function upsertCustomerRecord(
  engine: SemaphorePayEngine<any>,
  input: {
    id?: string;
    userId: string;
    collectionId: string;
    email?: string;
    name?: string;
    metadata?: Record<string, string>;
  },
) {
  const schema = engine.schema;
  const existing = await engine.getCustomerByUserId({
    userId: input.userId,
    collectionId: input.collectionId,
  });

  if (existing) {
    const rows = await engine.db
      .update(schema.customer)
      .set({
        email: input.email ?? existing.email,
        name: input.name ?? existing.name,
        metadata: input.metadata ?? existing.metadata,
        updatedAt: new Date(),
      })
      .where(eq(schema.customer.id, existing.id))
      .returning();
    return rows[0];
  }

  const customerId = input.id ?? crypto.randomUUID();
  const rows = await engine.db
    .insert(schema.customer)
    .values({
      id: customerId,
      userId: input.userId,
      collectionId: input.collectionId,
      email: input.email ?? null,
      name: input.name ?? null,
      metadata: input.metadata ?? null,
    })
    .returning();

  return rows[0];
}

/**
 * Fetch a customer with active subscriptions and resolved entitlements.
 * Soft-deleted customers (`deletedAt` not null) return `null`.
 *
 * @returns A {@link CustomerWithDetails} or `null`.
 */
export async function getCustomerWithDetails(
  engine: SemaphorePayEngine<any>,
  customerId: string,
  collectionId: string,
): Promise<CustomerWithDetails | null> {
  const schema = engine.schema;

  const customerRow = await engine.db.query.customer.findFirst({
    where: and(
      eq(schema.customer.id, customerId),
      eq(schema.customer.collectionId, collectionId),
      isNull(schema.customer.deletedAt),
    ),
  });

  if (!customerRow) return null;

  const subRows = await engine.db
    .select({
      productInternalId: schema.subscription.productInternalId,
      status: schema.subscription.status,
      cancelAtPeriodEnd: schema.subscription.cancelAtPeriodEnd,
      currentPeriodStart: schema.subscription.currentPeriodStartAt,
      currentPeriodEnd: schema.subscription.currentPeriodEndAt,
    })
    .from(schema.subscription)
    .where(
      and(
        eq(schema.subscription.customerId, customerId),
        eq(schema.subscription.collectionId, collectionId),
        inArray(schema.subscription.status, ["active", "trialing", "past_due"]),
        or(
          isNull(schema.subscription.endedAt),
          sql`${schema.subscription.endedAt} > ${new Date().toISOString()}`,
        ),
      ),
    )
    .orderBy(desc(schema.subscription.createdAt));

  const entRows = await engine.db
    .select({
      featureId: schema.entitlement.featureId,
      balance: schema.entitlement.balance,
      limit: schema.entitlement.limit,
      nextResetAt: schema.entitlement.nextResetAt,
    })
    .from(schema.entitlement)
    .innerJoin(
      schema.subscription,
      eq(schema.subscription.id, schema.entitlement.subscriptionId),
    )
    .where(
      and(
        eq(schema.entitlement.customerId, customerId),
        eq(schema.subscription.collectionId, collectionId),
        inArray(schema.subscription.status, ["active", "trialing"]),
        or(
          isNull(schema.subscription.endedAt),
          sql`${schema.subscription.endedAt} > ${new Date().toISOString()}`,
        ),
      ),
    );

  const entitlements: Record<string, CustomerEntitlement> = {};
  for (const row of entRows) {
    const isUnlimited = row.limit === null;
    entitlements[row.featureId] = {
      featureId: row.featureId,
      balance: row.balance ?? 0,
      limit: row.limit ?? 0,
      usage: isUnlimited ? 0 : (row.limit ?? 0) - (row.balance ?? 0),
      unlimited: isUnlimited,
      nextResetAt: row.nextResetAt,
    };
  }

  return {
    ...customerRow,
    subscriptions: subRows,
    entitlements,
  };
}

/**
 * Soft-delete a customer. Sets `deletedAt` and immediately cancels
 * all active/trialing/past_due subscriptions in a transaction.
 */
export async function deleteCustomerRecord(
  engine: SemaphorePayEngine<any>,
  customerId: string,
  collectionId: string,
): Promise<void> {
  const schema = engine.schema;

  await engine.transaction(async (tx: any) => {
    await tx
      .update(schema.customer)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(schema.customer.id, customerId),
          eq(schema.customer.collectionId, collectionId),
        ),
      );

    await tx
      .update(schema.subscription)
      .set({ status: "canceled", canceledAt: new Date(), endedAt: new Date() })
      .where(
        and(
          eq(schema.subscription.customerId, customerId),
          eq(schema.subscription.collectionId, collectionId),
          inArray(schema.subscription.status, [
            "active",
            "trialing",
            "past_due",
          ]),
        ),
      );
  });
}
