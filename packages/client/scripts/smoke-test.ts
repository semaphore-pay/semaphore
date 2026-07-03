import { SemaphorePayClient, type SubscribeToPlanResult, type Plan } from "../src/index.ts";

const baseUrl = (process.env.SEMAPHORE_PAY_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/$/, "");

function extractId(obj: any): string {
  return obj.id ?? obj.customerId ?? obj.data?.id ?? "";
}

async function main() {
  console.log("── SemaphorePayClient Smoke Test ──\n");
  console.log("Server:", baseUrl);

  const client = new SemaphorePayClient({ baseUrl });
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

  // ──── 1. Collection ────
  console.log("\n1. createCollection()");
  const col = await client.createCollection({ name: "Client Smoke Test" });
  check(typeof col.collection.id === "string", "returns collection.id");
  check(typeof col.keys.secret === "string", "returns secret key");
  client.setApiKey(col.keys.secret);

  // ──── 2. Plans ────
  const uuid = crypto.randomUUID().slice(0, 8);
  const planNameFree = `smoke free ${uuid}`;
  const planNamePaid = `smoke paid ${uuid}`;
  const idFree = `plan_smoke_free_${uuid}_monthly`;
  const idPaid = `plan_smoke_paid_${uuid}_monthly`;

  console.log("\n2. createPlan() — free");
  const free = await client.createPlan({
    id: idFree,
    name: planNameFree,
    priceAmount: 0,
    priceCurrency: "NGN",
    interval: "monthly",
    features: [
      { featureId: "seats", type: "limit", limit: 3, resetInterval: "month" },
      { featureId: "admin", type: "boolean" },
    ],
  });
  check(free.priceAmount === 0, "free plan priceAmount is 0");
  const freePlanId = idFree;

  console.log("\n3. createPlan() — paid");
  const paid = await client.createPlan({
    id: idPaid,
    name: planNamePaid,
    priceAmount: 1000,
    priceCurrency: "NGN",
    interval: "monthly",
    trialPeriodDays: 0,
    features: [
      { featureId: "seats", type: "limit", limit: 10, resetInterval: "month" },
    ],
  });
  check(paid.priceAmount === 1000, "paid plan priceAmount is 1000");
  const paidPlanId = idPaid;

  console.log("\n4. listPlans()");
  const plans = await client.listPlans();
  check(Array.isArray(plans), "returns array");
  check(plans.length >= 2, `at least 2 plans (got ${plans.length})`);

  // ──── 3. Customer ────
  console.log("\n5. createCustomer()");
  const userId = `user_${crypto.randomUUID()}`;
  const customer = await client.createCustomer({
    userId,
    email: "smoke@example.com",
    name: "Smoke Tester",
  });
  const customerId = extractId(customer);
  check(typeof customerId === "string" && customerId.length > 0, `customer created: ${customerId}`);

console.log("\n6. getCustomer() — before subscriptions");
  const fetched = await client.getCustomer(customerId) as any;
  check(fetched !== null, "returns customer");
  check(fetched.name === "Smoke Tester", "name matches");
  check(fetched.subscriptions.length === 0, "has 0 subscriptions");

  console.log("\n7. createCustomer() — upsert by id");
  const updated = await client.createCustomer({
    id: customerId,
    userId,
    email: "smoke@example.com",
    name: "Smoke Tester Updated",
  }) as any;
  check(updated.name === "Smoke Tester Updated", "name updated via upsert");

  // ──── 4. Subscribe ────
  console.log("\n8. subscribeToPlan() — free plan");
  const freeSub = await client.subscribeToPlan({ customerId, planId: freePlanId });
  check(freeSub.status === "active", "free sub status = active");
  check(freeSub.nombaOrderReference === null, "no Nomba ref for free");
  const freeSubId = freeSub.subscriptionId;

  console.log("\n9. subscribeToPlan() — paid plan (Nomba checkout)");
  const paidSub = await client.subscribeToPlan({ customerId, planId: paidPlanId });
  check(paidSub.status === "pending_payment", "paid sub status = pending_payment");
  check(typeof paidSub.nombaOrderReference === "string", "has nombaOrderReference");
  check(paidSub.checkout?.success === true, "checkout.success is true");
  check(typeof paidSub.checkout?.checkoutLink === "string", "has checkoutLink");

  // ──── 5. Customer detail after subscriptions ────
  console.log("\n10. getCustomer() — after subscriptions");
  const afterSub = await client.getCustomer(customerId) as any;
  check(afterSub.subscriptions.length === 1, "1 active sub (pending_payment excluded)");
  check(afterSub.entitlements?.seats !== undefined, "has seats entitlement");
  check(afterSub.entitlements?.seats?.limit === 3, "seats limit = 3 (free plan only)");
  check(afterSub.entitlements?.seats?.balance === 3, "seats balance = 3");

  // ──── 6. Entitlements ────
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

  console.log("\n16. reportEntitlement() — over capacity");
  const over = await client.reportEntitlement({ customerId, featureId: "seats", amount: 10 });
  check(over.success === false, "report 10 denied");
  check(over.balance?.remaining === 2, "remaining unchanged at 2");

  // ──── 7. Cancel ────
  console.log("\n17. cancelSubscription()");
  const canceled = await client.cancelSubscription(freeSubId) as any;
  check(canceled.success === true, "cancel returned success");

  // ──── 8. Delete ────
  console.log("\n18. deleteCustomer()");
  const deleted = await client.deleteCustomer(customerId) as any;
  check(deleted.success === true, "delete returned success");

  console.log("\n19. getCustomer() — after soft-delete");
  const afterDel = await client.getCustomer(customerId);
  check(afterDel === null, "soft-deleted customer is null");

  // ──── Summary ────
  console.log(`\n── Results: ${passed} passed, ${failed} failed ──`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error("Smoke test crashed:", error);
  process.exit(1);
});