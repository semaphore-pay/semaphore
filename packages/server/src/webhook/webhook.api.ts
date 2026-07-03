import type { SemaphorePayEngine } from "../database/index";
import { processNombaEvent } from "./webhook.service";

/** Required inputs for verifying and processing a Nomba webhook. */
export interface WebhookInput {
  /** Raw request body string (not parsed JSON). */
  rawBody: string;
  /** Value of the `nomba-signature` header. */
  signature: string;
  /** Your webhook secret configured in the Nomba dashboard. */
  webhookSecret: string;
}

async function verifyNombaSignature(
  rawBody: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(rawBody);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const signatureBytes = new Uint8Array(
    signature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [],
  );

  return await crypto.subtle.verify(
    "HMAC",
    cryptoKey,
    signatureBytes,
    messageData,
  );
}

/**
 * Verify and process an incoming Nomba webhook event.
 *
 * 1. Validates the HMAC-SHA256 signature against the raw body.
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
) {
  if (!input.rawBody || !input.signature || !input.webhookSecret) {
    throw new Error("Missing required webhook verification parameters.");
  }

  const isValid = await verifyNombaSignature(
    input.rawBody,
    input.signature,
    input.webhookSecret,
  );

  if (!isValid) {
    throw new Error("Invalid Nomba webhook signature. Payload rejected.");
  }

  let payload: Record<string, any>;
  try {
    payload = JSON.parse(input.rawBody);
  } catch {
    throw new Error("Malformed webhook payload. Expected valid JSON.");
  }

  return await processNombaEvent(engine, payload);
}
