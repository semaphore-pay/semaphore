// packages/server/src/invoice/invoice.service.ts
import { eq } from "drizzle-orm";
import type { SemaphorePayEngine } from "../database/index";

export async function upsertInvoiceRecord(
  engine: SemaphorePayEngine<any>,
  input: {
    collectionId: string;
    customerId: string;
    subscriptionId?: string | null;
    amount: number;
    currency: string;
    nombaTransactionId: string;
    status: string;
  },
) {
  const schema = engine.schema;
  const now = new Date();

  // Enforce idempotency: check if Nomba already sent this exact transaction
  const existing = await engine.db.query.invoice.findFirst({
    where: eq(schema.invoice.nombaTransactionId, input.nombaTransactionId),
  });

  const values = {
    amount: input.amount,
    currency: input.currency,
    collectionId: input.collectionId,
    customerId: input.customerId,
    nombaTransactionId: input.nombaTransactionId,
    status: input.status,
    subscriptionId: input.subscriptionId ?? null,
    updatedAt: now,
  };

  if (existing) {
    const rows = await engine.db
      .update(schema.invoice)
      .set(values)
      .where(eq(schema.invoice.id, existing.id))
      .returning();
    return rows[0];
  }

  const rows = await engine.db
    .insert(schema.invoice)
    .values({
      ...values,
      id: crypto.randomUUID(),
      type: "renewal", // Defaulting to renewal for recurring Nomba charges
      periodStartAt: now,
      periodEndAt: now,
    })
    .returning();

  return rows[0];
}
