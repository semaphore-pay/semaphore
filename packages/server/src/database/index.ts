import * as pgSchema from "./schema/pg";
import * as sqliteSchema from "./schema/sqlite";
import { and, eq } from "drizzle-orm";

export { pgSchema, sqliteSchema };
export type PgSchemaType = typeof pgSchema;
export type SqliteSchemaType = typeof sqliteSchema;

/**
 * Configuration for initialising the SemaphorePay engine.
 *
 * @typeParam T - `"pg"` for PostgreSQL or `"sqlite"` for SQLite (including D1).
 */
export interface SemaphorePayConfig<T extends "pg" | "sqlite"> {
  /** Database dialect. Determines which schema and column types are used. */
  dialect: T;
  /** A Drizzle ORM database instance matching the chosen dialect. */
  db: T extends "pg"
    ? any
    : any;
  /**
   * Whether the underlying database supports native transactions.
   * Set to `false` for Cloudflare D1 (which lacks `db.transaction()`).
   * When false, transaction blocks run sequentially on the raw db handle.
   */
  supportsTransactions?: boolean;
}

/**
 * SemaphorePayEngine — the core database abstraction for the SemaphorePay
 * billing engine. Created via {@link initSemaphorePay}.
 *
 * Provides:
 * - Dialect-aware schema access (`pg` / `sqlite`)
 * - Customer lookup helpers used by auth hooks
 * - A safe `transaction()` wrapper that degrades gracefully on D1
 *
 * @example
 * ```ts
 * import { drizzle } from "drizzle-orm/d1";
 * import { initSemaphorePay } from "@semaphore-pay/server";
 *
 * const engine = initSemaphorePay({
 *   dialect: "sqlite",
 *   db: drizzle(env.DB, { schema: sqliteSchema }),
 *   supportsTransactions: false, // D1 doesn't support transactions
 * });
 * ```
 */
export class SemaphorePayEngine<T extends "pg" | "sqlite"> {
  /** The configured dialect (`"pg"` or `"sqlite"`). */
  public dialect: T;
  /** The raw Drizzle database instance. */
  public db: any;
  /** The table schema object (pgSchema or sqliteSchema) for query building. */
  public schema: T extends "pg" ? PgSchemaType : SqliteSchemaType;
  /** Whether `db.transaction()` is available. */
  public supportsTransactions: boolean;

  constructor(config: SemaphorePayConfig<T>) {
    this.dialect = config.dialect;
    this.db = config.db;
    this.supportsTransactions = config.supportsTransactions ?? true;
    this.schema = (config.dialect === "pg" ? pgSchema : sqliteSchema) as any;
  }

  /**
   * Look up a customer by your application's userId within a collection.
   * Used internally by {@link getSemaphorePayHooks} and the customer API.
   *
   * @returns The customer row, or `null` if not found.
   */
  async getCustomerByUserId(input: { userId: string; collectionId: string }) {
    const schema = this.dialect === "pg" ? pgSchema : sqliteSchema;
    const results = await this.db
      .select()
      .from(schema.customer)
      .where(
        and(
          eq(schema.customer.userId, input.userId),
          eq(schema.customer.collectionId, input.collectionId),
        ),
      );

    return results[0] || null;
  }

  /**
   * Create a new customer record. Generates a UUID for the customer ID.
   * Used by {@link getSemaphorePayHooks} when a Better Auth user is created.
   *
   * @returns The generated customer ID (UUID string).
   */
  async createCustomer(data: {
    userId: string;
    email: string | null;
    name: string | null;
    collectionId: string;
  }): Promise<string> {
    const targetSchema = this.dialect === "pg" ? pgSchema : sqliteSchema;
    const customerId = crypto.randomUUID();

    await this.db.insert(targetSchema.customer).values({
      id: customerId,
      userId: data.userId,
      collectionId: data.collectionId,
      email: data.email,
      name: data.name,
    });

    return customerId;
  }

  /**
   * Run a block of queries within a database transaction.
   *
   * When {@link supportsTransactions} is `false` (e.g. Cloudflare D1),
   * the handler runs directly against `this.db` without wrapping.
   *
   * @param handler - Async function that receives the transactional db handle.
   * @returns The value returned by `handler`.
   */
  async transaction<T>(handler: (tx: any) => Promise<T>): Promise<T> {
    if (!this.supportsTransactions || typeof this.db?.transaction !== "function") {
      return await handler(this.db);
    }
    return await this.db.transaction(handler);
  }
}


/**
 * Create a new SemaphorePay engine instance.
 *
 * @param config - Database configuration (dialect, db handle, transaction support).
 * @returns A configured {@link SemaphorePayEngine}.
 */
export function initSemaphorePay<T extends "pg" | "sqlite">(
  config: SemaphorePayConfig<T>,
) {
  return new SemaphorePayEngine(config);
}
