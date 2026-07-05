import { SemaphorePayClient, type Plan } from "../src/index.ts";

const baseUrl = (process.env.SEMAPHORE_PAY_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/$/, "");

// ──── Admin helper (direct HTTP, not part of client SDK) ────

async function adminRequest<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  secretKey: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-api-key": secretKey,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`Admin request failed (${response.status}): ${JSON.stringify(payload)}`);
  return payload as T;
}

function extractId(obj: any): string {
  return obj.id ?? obj.customerId ?? obj.data?.id ?? "";
}

async function main() {
  console.log("── SemaphorePayClient Smoke Test ──\n");
  console.log("Server:", baseUrl);

  let passed = 0;
  let failed = 0;

  const check = (condition: boolean, label: string) => {
    if (condition) {
      passed++;
      console.log(`  PASS: ${label}`);
    } else {
      failed++;
      console.error(`  FAIL: ${label}`);
    }
  };

  // ══════════════════════════════════════════════════════════
  // ADMIN SETUP (direct HTTP, secret key)
  // ══════════════════════════════════════════════════════════

  console.log("\n── Admin Setup ──");

  // 1. Create collection
  const colUserId = `user_${crypto.randomUUID().slice(0, 8)}`;
  const colRes = await adminRequest<any>("POST", "/admin/collections", "", { name: "Client Smoke Test", userId: colUserId });
  const collectionId = colRes.collection.id;
  const secretKey = colRes.keys.secret;
  const publicKey = colRes.keys.public;
  check(typeof collectionId === "string", `collection created: ${collectionId}`);

  // 2. Create plans
  const uuid = crypto.randomUUID().slice(0, 8);
  const idFree = `plan_smoke_free_${uuid}_monthly`;
  const idPaid = `plan_smoke_paid_${uuid}_monthly`;

  const freePlan = await adminRequest<any>("POST", "/plans", secretKey, {
    id: idFree,
    name: `smoke free ${uuid}`,
    priceAmount: 0,
    priceCurrency: "NGN",
    interval: "monthly",
    features: [
      { featureId: "seats", type: "limit", limit: 3, resetInterval: "month" },
      { featureId: "admin", type: "boolean" },
    ],
  });
  check(freePlan.priceAmount === 0, "free plan created");

  const paidPlan = await adminRequest<any>("POST", "/plans", secretKey, {
    id: idPaid,
    name: `smoke paid ${uuid}`,
    priceAmount: 1000,
    priceCurrency: "NGN",
    interval: "monthly",
    trialPeriodDays: 0,
    features: [
      { featureId: "seats", type: "limit", limit: 10, resetInterval: "month" },
    ],
  });
  check(paidPlan.priceAmount === 1000, "paid plan created");

  // 3. Create products
  const freeProdRes = await adminRequest<any>("POST", "/products", secretKey, {
    id: `prod_smoke_${uuid}`,
    name: "Smoke Free Add-on",
    priceAmount: 0,
    priceCurrency: "NGN",
  });
  check(typeof freeProdRes.internalId === "string", "free product created");

  const paidProdRes = await adminRequest<any>("POST", "/products", secretKey, {
    id: `prod_smoke_paid_${uuid}`,
    name: "Smoke Paid Add-on",
    priceAmount: 500,
    priceCurrency: "NGN",
    priceInterval: "one_time",
  });
  check(typeof paidProdRes.internalId === "string", "paid product created");

  // ══════════════════════════════════════════════════════════
  // END-USER OPERATIONS (SemaphorePayClient)
  // ══════════════════════════════════════════════════════════

  console.log("\n── End-User Operations ──");

  const client = new SemaphorePayClient({
    baseUrl,
    apiKey: secretKey, // using secret key for test flexibility; in production use publicKey
    collectionId,
  });

  // 4. Plans catalog
  console.log("\n1. listPlans()");
  const plans = await client.listPlans();
  check(Array.isArray(plans), "returns array");
  check(plans.length >= 2, `at least 2 plans (got ${plans.length})`);

  console.log("\n2. getPlan() — by id");
  const fetchedPlan = await client.getPlan(idFree) as any;
  check(fetchedPlan?.id === idFree, "fetched plan matches id");
  check(fetchedPlan?.name === freePlan.name, "fetched plan name matches");

  // 5. Products catalog
  console.log("\n3. listProducts()");
  const prods = await client.listProducts();
  check(Array.isArray(prods), "returns array");
  check(prods.length >= 2, `at least 2 products (got ${prods.length})`);

  // 6. Customer
  const userId = `user_${crypto.randomUUID()}`;
  console.log("\n4. createCustomer()");
  const customer = await client.createCustomer({
    userId,
    email: "smoke@example.com",
    name: "Smoke Tester",
  });
  const customerId = extractId(customer);
  check(typeof customerId === "string" && customerId.length > 0, `customer created: ${customerId}`);

  console.log("\n5. getCustomer()");
  const fetched = await client.getCustomer(customerId) as any;
  check(fetched !== null, "returns customer");
  check(fetched.name === "Smoke Tester", "name matches");
  check(fetched.subscriptions.length === 0, "has 0 subscriptions");

  console.log("\n6. createCustomer() — upsert by id");
  const updated = await client.createCustomer({
    id: customerId,
    userId,
    email: "smoke@example.com",
    name: "Smoke Tester Updated",
  }) as any;
  check(updated.name === "Smoke Tester Updated", "name updated via upsert");

  // 7. Subscribe
  console.log("\n7. subscribeToPlan() — free plan");
  const freeSub = await client.subscribeToPlan({ customerId, planId: idFree });
  check(freeSub.status === "active", "free sub status = active");
  check(freeSub.nombaOrderReference === null, "no Nomba ref for free");

  console.log("\n8. subscribeToPlan() — paid plan (Nomba checkout)");
  const paidSub = await client.subscribeToPlan({ customerId, planId: idPaid });
  check(paidSub.status === "pending_payment", "paid sub status = pending_payment");
  check(typeof paidSub.nombaOrderReference === "string", "has nombaOrderReference");
  check(typeof paidSub.checkout?.checkoutLink === "string", "has checkoutLink");
  check(typeof paidSub.checkout?.orderReference === "string", "has orderReference in checkout");

  console.log("\n9. subscribeToPlan() — free plan again");
  const freeSub2 = await client.subscribeToPlan({ customerId, planId: idFree });
  check(freeSub2.status === "active", "re-subscribe to free plan returns active");

  // 8. Customer detail after subscriptions
  console.log("\n10. getCustomer() — after subscriptions");
  const afterSub = await client.getCustomer(customerId) as any;
  check(afterSub.subscriptions.length >= 1, `at least 1 active sub (got ${afterSub.subscriptions.length})`);
  check(afterSub.entitlements?.seats !== undefined, "has seats entitlement");
  check(afterSub.entitlements?.seats?.limit === 3, "seats limit = 3 (free plan only)");
  check(afterSub.entitlements?.seats?.balance === 3, "seats balance = 3");

  // 9. Entitlements
  console.log("\n11. checkEntitlement() — boolean");
  const boolEnt = await client.checkEntitlement({ customerId, featureId: "admin" });
  check(boolEnt.allowed === true, "boolean admin is allowed");
  check(boolEnt.balance?.unlimited === true, "unlimited");

  console.log("\n12. checkEntitlement() — metered below limit");
  const seatsOk = await client.checkEntitlement({ customerId, featureId: "seats", required: 2 });
  check(seatsOk.allowed === true, "2 seats allowed (limit 3)");

  console.log("\n13. checkEntitlement() — metered over limit");
  const seatsOver = await client.checkEntitlement({ customerId, featureId: "seats", required: 4 });
  check(seatsOver.allowed === false, "4 seats denied");

  console.log("\n14. checkEntitlement() — unknown feature");
  const unknown = await client.checkEntitlement({ customerId, featureId: "nope" });
  check(unknown.allowed === false, "unknown feature denied");

  console.log("\n15. reportEntitlement() — consume 1");
  const reported = await client.reportEntitlement({ customerId, featureId: "seats", amount: 1 });
  check(reported.success === true, "report 1 seat succeeded");
  check(reported.balance?.remaining === 2, "remaining = 2");

  console.log("\n16. reportEntitlement() — consume another");
  const reported2 = await client.reportEntitlement({ customerId, featureId: "seats", amount: 1 });
  check(reported2.success === true, "report 1 more seat succeeded");
  check(reported2.balance?.remaining === 1, "remaining = 1");

  console.log("\n17. reportEntitlement() — over capacity");
  const over = await client.reportEntitlement({ customerId, featureId: "seats", amount: 10 });
  check(over.success === false, "report 10 denied");
  check(over.balance?.remaining === 1, "remaining unchanged at 1");

  // 10. Product purchase (free)
  console.log("\n18. purchaseProduct() — free");
  const freePurchase = await client.purchaseProduct({
    customerId,
    productInternalId: freeProdRes.internalId,
  }) as any;
  check(freePurchase.status === "completed", "free purchase completed");
  check(typeof freePurchase.purchaseId === "string", "has purchaseId");

  // 11. Cancel
  console.log("\n19. cancelSubscription()");
  const canceled = await client.cancelSubscription(freeSub.subscriptionId) as any;
  check(canceled.success === true, "cancel returned success");

  console.log("\n20. getCustomer() — after cancel");
  const afterCancel = await client.getCustomer(customerId) as any;
  check(afterCancel.subscriptions.length >= 1, "still has subs (cancel at period end)");

  // ──── Summary ────
  console.log(`\n── Results: ${passed} passed, ${failed} failed ──`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error("Smoke test crashed:", error);
  process.exit(1);
});
