import type { BetterAuthOptions } from "better-auth";
import type { SemaphorePayEngine } from "./database/index";

/**
 * Generates Better Auth database hooks that automatically create a SemaphorePay
 * customer record whenever a new user signs up via Better Auth.
 *
 * @param engine - A configured {@link SemaphorePayEngine}.
 * @param options.collectionId - The collection (tenant) ID to associate
 *   customers with. Required.
 * @returns A `databaseHooks` object suitable for passing to Better Auth's options.
 *
 * @example
 * ```ts
 * import { betterAuth } from "better-auth";
 * import { initSemaphorePay, getSemaphorePayHooks } from "@semaphore-pay/server";
 *
 * const engine = initSemaphorePay({ dialect: "sqlite", db });
 * const auth = betterAuth({
 *   databaseHooks: getSemaphorePayHooks(engine, { collectionId: "col_abc" }),
 *   // ... other Better Auth options
 * });
 * ```
 */
export function getSemaphorePayHooks(
  engine: SemaphorePayEngine<any>,
  options?: { collectionId: string },
): BetterAuthOptions["databaseHooks"] {
  return {
    user: {
      create: {
        after: async (user) => {
          if (!options?.collectionId) {
            throw new Error(
              "collectionId is required to create semaphore-pay customers via Better Auth hooks.",
            );
          }
          await engine.createCustomer({
            userId: user.id,
            email: user.email,
            name: user.name,
            collectionId: options.collectionId,
          });
        },
      },
    },
  };
}
