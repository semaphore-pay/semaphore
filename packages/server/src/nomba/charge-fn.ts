import type { ChargeFn } from "../cron";
import type { NombaClient } from "./nomba";

/**
 * Build a {@link ChargeFn} that charges a customer's saved tokenized card
 * via the Nomba API. The returned function selects the correct Nomba client
 * based on the subscription's collection environment.
 *
 * @param clients - Pre-built Nomba clients keyed by environment.
 * @param callbackUrl - Fallback callback URL for the charge request.
 */
export function buildChargeFn(
  clients: { sandbox?: NombaClient | null; production?: NombaClient | null },
  callbackUrl: string,
): ChargeFn {
  return async (input) => {
    const key = input.environment === "production" ? "production" : "sandbox";
    const client = clients[key] ?? clients.sandbox ?? clients.production;
    if (!client) {
      throw new Error(`No Nomba client configured for environment: ${input.environment}`);
    }

    try {
      const result = await client.tokenizedCards.charge({
        tokenKey: input.tokenKey,
        order: {
          orderReference: input.orderReference,
          amount: input.amount,
          currency: input.currency as any,
          customerEmail: input.customerEmail,
          callbackUrl,
        },
      });
      return { success: result.status, status: result.message };
    } catch {
      return { success: false };
    }
  };
}
