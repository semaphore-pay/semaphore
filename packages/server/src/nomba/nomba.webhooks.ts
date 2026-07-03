import { createHmac, timingSafeEqual } from "node:crypto";
import type { NombaWebhookPayload } from "./nomba.types";

/**
 * Verifies and parses Nomba webhooks.
 *
 * Nomba signs each webhook with HMAC-SHA256 over a colon-joined string of:
 *   event_type:requestId:merchant.userId:merchant.walletId:transaction.transactionId:
 *   transaction.type:transaction.time:transaction.responseCode:nomba-timestamp
 * using your dashboard-configured signature/secret key, and sends the result
 * (base64) in the `nomba-signature` header alongside a `nomba-timestamp` header.
 *
 * See: https://developer.nomba.com/docs/api-basics/webhook#webhook-signature-verification
 */
export class NombaWebhookVerifier {
  constructor(private readonly signatureKey: string) {}

  /**
   * Computes the expected signature for a raw webhook body + timestamp.
   * `rawBody` should be the exact JSON string received (parse it separately
   * for `verifyAndParse`, or parse-then-restringify carefully — safest is to
   * keep the raw text available in your webhook handler).
   */
  computeSignature(rawBody: string, nombaTimestamp: string): string {
    const payload = JSON.parse(rawBody) as NombaWebhookPayload;
    return this.computeSignatureFromPayload(payload, nombaTimestamp);
  }

  private computeSignatureFromPayload(
    payload: NombaWebhookPayload,
    nombaTimestamp: string
  ): string {
    const merchant = payload.data?.merchant ?? {};
    const transaction = payload.data?.transaction ?? {};

    let responseCode = (transaction.responseCode as string | undefined) ?? "";
    if (responseCode === "null") responseCode = "";

    const hashingPayload = [
      payload.event_type ?? "",
      payload.requestId ?? "",
      merchant.userId ?? "",
      merchant.walletId ?? "",
      (transaction.transactionId as string | undefined) ?? "",
      (transaction.type as string | undefined) ?? "",
      (transaction.time as string | undefined) ?? "",
      responseCode,
      nombaTimestamp,
    ].join(":");

    return createHmac("sha256", this.signatureKey).update(hashingPayload).digest("base64");
  }

  /**
   * Returns true if the provided signature matches the one computed from the
   * raw body and timestamp. Uses a constant-time comparison.
   */
  verify(rawBody: string, nombaTimestamp: string, receivedSignature: string): boolean {
    let expected: string;
    try {
      expected = this.computeSignature(rawBody, nombaTimestamp);
    } catch {
      return false;
    }

    const expectedBuf = Buffer.from(expected);
    const receivedBuf = Buffer.from(receivedSignature);
    if (expectedBuf.length !== receivedBuf.length) return false;
    return timingSafeEqual(expectedBuf, receivedBuf);
  }

  /**
   * Verifies the signature and, if valid, parses and returns the payload.
   * Throws if the signature is missing or does not match — treat any thrown
   * error as "reject this webhook".
   *
   * @param rawBody exact raw request body text (do not use a re-serialized/
   *   parsed-then-stringified version — whitespace/key order differences will
   *   break verification).
   * @param headers the `nomba-signature` and `nomba-timestamp` request headers.
   */
  verifyAndParse(
    rawBody: string,
    headers: { "nomba-signature"?: string; "nomba-timestamp"?: string }
  ): NombaWebhookPayload {
    const signature = headers["nomba-signature"];
    const timestamp = headers["nomba-timestamp"];

    if (!signature || !timestamp) {
      throw new Error("Missing nomba-signature or nomba-timestamp header");
    }

    if (!this.verify(rawBody, timestamp, signature)) {
      throw new Error("Nomba webhook signature verification failed");
    }

    return JSON.parse(rawBody) as NombaWebhookPayload;
  }
}
