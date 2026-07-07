import type { SemaphorePayEngine } from "../database/index";
import { processNombaEvent, type WebhookContext } from "./webhook.service";
import { NombaWebhookVerifier } from "../nomba/nomba.webhooks";

/** Required inputs for verifying and processing a Nomba webhook. */
export interface WebhookInput {
  /** Raw request body string (not parsed JSON). */
  rawBody: string;
  /** Value of the `nomba-signature` header. */
  signature: string;
  /** Your webhook secret configured in the Nomba dashboard. */
  webhookSecret: string;
  /** Value of the `nomba-timestamp` header (optional, falls back to transaction.time). */
  nombaTimestamp?: string;
}

/**
 * Verify and process an incoming Nomba webhook event.
 *
 * 1. Validates the HMAC-SHA256 signature against the colon-joined fields.
 * 2. Parses the JSON payload.
 * 3. Routes to {@link processNombaEvent} which handles
 *    idempotency, event type routing, and subscription activation.
 *
 * @throws If signature is invalid or payload is malformed JSON.
 * @returns The result from {@link processNombaEvent}.
 */
export async function handleWebhook(
  engine: SemaphorePayEngine<any>,
  input: WebhookInput,
  context: WebhookContext = {},
) {
  if (!input.rawBody || !input.signature || !input.webhookSecret) {
    throw new Error("Missing required webhook verification parameters.");
  }

  // Use NombaWebhookVerifier for correct HMAC verification.
  // It hashes: event_type:requestId:userId:walletId:transactionId:type:time:responseCode:timestamp
  const verifier = new NombaWebhookVerifier(input.webhookSecret);

  // Try with provided nomba-timestamp first, then fall back to transaction.time
  let valid = false;
  try {
    const ts = input.nombaTimestamp ?? "";
    valid = verifier.verify(input.rawBody, ts, input.signature);
  } catch {
    // fall through
  }

  if (!valid) {
    try {
      const payload = JSON.parse(input.rawBody);
      const txTime = payload.data?.transaction?.time ?? "";
      valid = verifier.verify(input.rawBody, txTime, input.signature);
    } catch {
      // fall through
    }
  }

  if (!valid) {
    throw new Error("Invalid Nomba webhook signature. Payload rejected.");
  }

  let payload: Record<string, any>;
  try {
    payload = JSON.parse(input.rawBody);
  } catch {
    throw new Error("Malformed webhook payload. Expected valid JSON.");
  }

  return await processNombaEvent(engine, payload, context);
}
