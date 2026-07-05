type JsonValue = Record<string, unknown> | unknown[];

const baseUrl = (process.env.SEMAPHORE_PAY_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/$/, "");

async function request<T extends JsonValue>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown,
  apiKey?: string,
): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (apiKey) headers["x-api-key"] = apiKey;

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  const payload = text ? safeJson(text) : null;

  if (!response.ok) {
    throw new Error(
      `Request failed (${response.status} ${method} ${path}): ${JSON.stringify(payload)}`,
    );
  }

  return payload as T;
}

function safeJson(input: string) {
  try {
    return JSON.parse(input);
  } catch {
    return input;
  }
}

function extractId(obj: any): string {
  return obj.id ?? obj.customerId ?? obj.data?.id ?? "";
}

function assert(condition: boolean, label: string) {
  if (!condition) throw new Error(`FAIL: ${label}`);
}

async function main() {
  console.log("Base URL:", baseUrl);
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

  // ─────────────────────────────────────────────
  // 1. CREATE COLLECTION (tenant)
  // ─────────────────────────────────────────────
  console.log("\n── Creating collection ──");
  const collection = await request<{
    collection: { id: string; name: string };
    keys: { public: string; secret: string };
  }>("POST", "/admin/collections", { name: "Demo Collection" });

  console.log("Collection:", collection.collection);
  check(typeof collection.collection.id === "string", "collection has id");
  check(collection.collection.name === "Demo Collection", "collection name matches");
  check(typeof collection.keys.public === "string", "public key returned");
  check(typeof collection.keys.secret === "string", "secret key returned");

  const apiKey = collection.keys.secret;

  // ─────────────────────────────────────────────
  // 2. AUTH — missing / invalid API key
  // ─────────────────────────────────────────────
  console.log("\n── Auth checks ──");
  {
    const res = await fetch(`${baseUrl}/products`, {
      method: "GET",
      headers: { "content-type": "application/json" },
    });
    check(res.status === 401, "GET /products without api key → 401");
  }
  {
    const res = await fetch(`${baseUrl}/products`, {
      method: "GET",
      headers: { "content-type": "application/json", "x-api-key": "garbage" },
    });
    check(res.status === 401, "GET /products with invalid api key → 401");
  }

  // ─────────────────────────────────────────────
  // 3. CREATE FREE PRODUCT
  // ─────────────────────────────────────────────
  console.log("\n── Creating free product ──");
  const freeProduct = await request(
    "POST",
    "/products",
    {
      id: `starter-${crypto.randomUUID().slice(0, 8)}`,
      name: "Starter",
      priceAmount: 0,
      priceCurrency: "NGN",
      priceInterval: "monthly",
      features: [
        { featureId: "seats", type: "limit", limit: 5, resetInterval: "month" },
        { featureId: "pro_mode", type: "boolean" },
      ],
    },
    apiKey,
  );

  console.log("Product:", freeProduct);
  check(typeof (freeProduct as any).internalId === "string", "free product has internalId");
  check((freeProduct as any).priceAmount === 0, "free product priceAmount is 0");

  // ─────────────────────────────────────────────
  // 4. CREATE PAID PRODUCT
  // ─────────────────────────────────────────────
  console.log("\n── Creating paid product ──");
  const paidProduct = await request(
    "POST",
    "/products",
    {
      id: `premium-${crypto.randomUUID().slice(0, 8)}`,
      name: "Premium",
      priceAmount: 5000,
      priceCurrency: "NGN",
      priceInterval: "monthly",
      features: [
        { featureId: "seats", type: "limit", limit: 20, resetInterval: "month" },
        { featureId: "pro_mode", type: "boolean" },
        { featureId: "api_calls", type: "limit", limit: 10000, resetInterval: "month" },
      ],
    },
    apiKey,
  );

  console.log("Product:", paidProduct);
  check((paidProduct as any).priceAmount === 5000, "paid product priceAmount is 5000");

  // ─────────────────────────────────────────────
  // 5. LIST PRODUCTS
  // ─────────────────────────────────────────────
  console.log("\n── Listing products ──");
  const productList = await request<any[]>("GET", "/products", undefined, apiKey);
  check(Array.isArray(productList), "GET /products returns array");
  check(productList.length >= 2, `at least 2 products (got ${productList.length})`);

  // ─────────────────────────────────────────────
  // 6. CREATE / UPSERT CUSTOMER
  // ─────────────────────────────────────────────
  console.log("\n── Creating customer ──");
  const userId = `user_${crypto.randomUUID()}`;
  const customer = await request(
    "POST",
    "/customers",
    { userId, email: "demo@example.com", name: "Demo User" },
    apiKey,
  );

  console.log("Customer:", customer);
  const customerId = extractId(customer);
  check(typeof customerId === "string" && customerId.length > 0, `customerId extracted: ${customerId}`);

  // ─────────────────────────────────────────────
  // 7. GET CUSTOMER (before subscriptions)
  // ─────────────────────────────────────────────
  console.log("\n── GET customer ──");
  const fetchedCustomer = await request<any>("GET", `/customers/${customerId}`, undefined, apiKey);
  check(fetchedCustomer !== null, "GET /customers/:id returns data");
  check(fetchedCustomer.email === "demo@example.com", "customer email matches");
  check(Array.isArray(fetchedCustomer.subscriptions), "customer.subscriptions is array");
  check(fetchedCustomer.subscriptions.length === 0, "has 0 subscriptions initially");

  // ─────────────────────────────────────────────
  // 8. UPSERT CUSTOMER (update name)
  // ─────────────────────────────────────────────
  console.log("\n── Upserting customer ──");
  const updatedCustomer = await request(
    "POST",
    "/customers",
    { id: customerId, userId, email: "demo@example.com", name: "Updated User" },
    apiKey,
  );
  check((updatedCustomer as any).name === "Updated User", "customer name updated via upsert");

  // ─────────────────────────────────────────────
  // 9. SUBSCRIBE TO FREE PRODUCT
  // ─────────────────────────────────────────────
  console.log("\n── Subscribe to free product ──");
  const freeSub = await request<any>(
    "POST",
    "/subscriptions/subscribe",
    { customerId, productInternalId: (freeProduct as any).internalId },
    apiKey,
  );

  console.log("Subscription:", freeSub);
  check(freeSub.status === "active", "free subscription status is active");
  check(freeSub.nombaOrderReference === null, "free plan has no Nomba order reference");
  check(typeof freeSub.subscriptionId === "string", "free sub has subscriptionId");

  // ─────────────────────────────────────────────
  // 10. SUBSCRIBE TO PAID PRODUCT (triggers Nomba checkout)
  // ─────────────────────────────────────────────
  console.log("\n── Subscribe to paid product (Nomba checkout) ──");
  const paidSub = await request<any>(
    "POST",
    "/subscriptions/subscribe",
    { customerId, productInternalId: (paidProduct as any).internalId },
    apiKey,
  );

  console.log("Paid subscription:", paidSub);
  check(paidSub.status === "pending_payment", "paid subscription status is pending_payment");
  check(typeof paidSub.nombaOrderReference === "string", "paid sub has nombaOrderReference");
  check(typeof paidSub.checkout === "object", "paid sub has checkout object");
  check(typeof paidSub.checkout.checkoutLink === "string", "checkout has checkoutLink");
  check(paidSub.checkout.orderReference === paidSub.nombaOrderReference, "orderReference matches");

  // ─────────────────────────────────────────────
  // 11. GET CUSTOMER (with subscriptions)
  // ─────────────────────────────────────────────
  console.log("\n── GET customer with subscriptions ──");
  const customerWithSubs = await request<any>("GET", `/customers/${customerId}`, undefined, apiKey);
  check(Array.isArray(customerWithSubs.subscriptions), "customer.subscriptions is array");
  check(
    customerWithSubs.subscriptions.length === 1,
    `has 1 active subscription (pending_payment excluded) — got ${customerWithSubs.subscriptions.length}`,
  );
  check(typeof customerWithSubs.entitlements === "object", "has entitlements");
  check(customerWithSubs.entitlements?.seats !== undefined, "has seats entitlement");

  // ─────────────────────────────────────────────
  // 12. ENTITLEMENT CHECK (boolean - pro_mode)
  // ─────────────────────────────────────────────
  console.log("\n── Entitlement check (boolean: pro_mode) ──");
  const boolEnt = await request<any>(
    "POST",
    "/entitlements/check",
    { customerId, featureId: "pro_mode" },
    apiKey,
  );
  check(boolEnt.allowed === true, "pro_mode boolean entitlement is allowed");
  check(boolEnt.balance?.unlimited === true, "pro_mode balance is unlimited");

  // ─────────────────────────────────────────────
  // 13. ENTITLEMENT CHECK (metered - seats)
  // ─────────────────────────────────────────────
  console.log("\n── Entitlement check (metered: seats) ──");
  const seatsCheck = await request<any>(
    "POST",
    "/entitlements/check",
    { customerId, featureId: "seats", required: 20 },
    apiKey,
  );
  check(seatsCheck.allowed === false, "seats check with 20 denied (limit is 5)");
  check(seatsCheck.balance?.limit === 5, "limit is 5 (only active free sub, paid pending)");
  check(seatsCheck.balance?.remaining === 5, "remaining is 5");

  // ─────────────────────────────────────────────
  // 14. ENTITLEMENT CHECK (over capacity)
  // ─────────────────────────────────────────────
  console.log("\n── Entitlement check (over capacity) ──");
  const overCap = await request<any>(
    "POST",
    "/entitlements/check",
    { customerId, featureId: "seats", required: 6 },
    apiKey,
  );
  check(overCap.allowed === false, "seats check with 6 exceeds limit 5 → denied");

  // ─────────────────────────────────────────────
  // 15. ENTITLEMENT REPORT (consume usage)
  // ─────────────────────────────────────────────
  console.log("\n── Entitlement report (consume 3 seats) ──");
  const report = await request<any>(
    "POST",
    "/entitlements/report",
    { customerId, featureId: "seats", amount: 3 },
    apiKey,
  );
  check(report.success === true, "report 3 seats succeeded");
  check(report.balance?.remaining === 2, "remaining after 3: 2 (5-3)");

  // ─────────────────────────────────────────────
  // 16. ENTITLEMENT REPORT (consume too many)
  // ─────────────────────────────────────────────
  console.log("\n── Entitlement report (consume too many) ──");
  const overReport = await request<any>(
    "POST",
    "/entitlements/report",
    { customerId, featureId: "seats", amount: 100 },
    apiKey,
  );
  check(overReport.success === false, "report 100 seats failed (over capacity)");
  check(overReport.balance?.remaining === 2, "remaining unchanged at 2 after failed report");

  // ─────────────────────────────────────────────
  // 17. ENTITLEMENT CHECK (unknown feature)
  // ─────────────────────────────────────────────
  console.log("\n── Entitlement check (unknown feature) ──");
  const unknownEnt = await request<any>(
    "POST",
    "/entitlements/check",
    { customerId, featureId: "nonexistent" },
    apiKey,
  );
  check(unknownEnt.allowed === false, "unknown feature is not allowed");
  check(unknownEnt.balance === null, "unknown feature balance is null");

  // ─────────────────────────────────────────────
  // 18. CANCEL FREE SUBSCRIPTION
  // ─────────────────────────────────────────────
  console.log("\n── Cancel subscription ──");
  const cancelResult = await request<any>(
    "POST",
    `/subscriptions/${freeSub.subscriptionId}/cancel`,
    undefined,
    apiKey,
  );
  check(cancelResult.success === true, "cancel returned success");

  // ─────────────────────────────────────────────
  // 19. CRON JOB
  // ─────────────────────────────────────────────
  console.log("\n── Cron ──");
  const cron = await request<any>("POST", "/admin/cron/run", undefined, apiKey);
  check(cron.success === true, "cron returned success");
  check(typeof cron.cancellationsExecuted === "number", "cron has cancellationsExecuted");
  check(typeof cron.accountsFlaggedPastDue === "number", "cron has accountsFlaggedPastDue");

  // ─────────────────────────────────────────────
  // 20. DELETE CUSTOMER
  // ─────────────────────────────────────────────
  console.log("\n── Delete customer ──");
  const deleteResult = await request<any>("DELETE", `/customers/${customerId}`, undefined, apiKey);
  check(deleteResult.success === true, "delete customer returned success");

  // ─────────────────────────────────────────────
  // 21. VERIFY CUSTOMER DELETED (soft delete)
  // ─────────────────────────────────────────────
  console.log("\n── Verify customer soft-deleted ──");
  const afterDel = await request<any>("GET", `/customers/${customerId}`, undefined, apiKey);
  check(afterDel === null, "soft-deleted customer is not retrievable via API");
  check(deleteResult.success === true, "(already checked) delete customer returned success");

  // ─────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────
  console.log(`\n── Results: ${passed} passed, ${failed} failed ──`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});