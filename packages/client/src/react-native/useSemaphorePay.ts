import { useState, useCallback, useRef } from "react";
import { SemaphorePayClient, type PlanInterval } from "../index";

/**
 * State shape returned by {@link useSemaphorePay}.
 */
export interface SemaphorePayState {
  /** Whether the initial setup (collection + customer creation) is done. */
  ready: boolean;
  /** The customer ID. Set after {@link SemaphorePayClient.createCustomer} succeeds. */
  customerId: string | null;
  /** The selected plan's ID (from {@link SemaphorePayClient.createPlan}). */
  planId: string | null;
  /** Whether the subscription is active (paid + completed) or a free plan. */
  subscribed: boolean;
  /** The current subscription's status. */
  subscriptionStatus: string | null;
  /** Any error that occurred during setup / subscription. */
  error: string | null;
}

export interface UseSemaphorePayOptions {
  /** The base URL of your SemaphorePay server. */
  baseUrl: string;
  /**
   * Collection name. If omitted, a new collection is created each session.
   * In production you'd likely use a pre-existing collection ID.
   */
  collectionName?: string;
  /**
   * Plan ID to subscribe to (e.g. "plan_starter_monthly").
   * The plan must already exist in the collection.
   */
  planId?: string;
  /** User identifier from your app's auth system. */
  userId?: string;
  /** Customer email. */
  userEmail?: string;
  /** Customer display name. */
  userName?: string;
  /** Whether to automatically subscribe on mount (defaults to true). */
  autoSubscribe?: boolean;
}

/**
 * Full return value of {@link useSemaphorePay}.
 */
export interface UseSemaphorePayReturn extends SemaphorePayState {
  /** The underlying API client. Use it for direct calls. */
  client: SemaphorePayClient;
  /**
   * Subscribe the current customer to the plan (or re-subscribe).
   * Returns the server response with `checkoutLink` for paid plans.
   */
  subscribe: () => Promise<any>;
  /** Re-run the entitlement check for a feature. */
  check: (featureId: string, required?: number) => Promise<any>;
  /** Report usage of a metered feature. */
  report: (featureId: string, amount?: number) => Promise<any>;
}

/**
 * useSemaphorePay — React hook for managing the full SemaphorePay lifecycle
 * from collection creation through subscription via a single hook.
 *
 * On mount (if `autoSubscribe` is true), it:
 * 1. Creates (or finds) a collection
 * 2. Creates/upserts a customer
 * 3. Subscribes the customer to the plan
 *
 * ```tsx
 * import { useSemaphorePay } from "@semaphore-pay/client/react-native";
 * import { SemaphorePayPaywall } from "@semaphore-pay/client/react-native";
 *
 * function App() {
 *   const { ready, subscribed, error, subscribe, client, customerId } =
 *     useSemaphorePay({
 *       baseUrl: "https://your-server.example.com",
 *       userId: "user-123",
 *       userEmail: "a@b.com",
 *       planId: "plan_starter_monthly",
 *     });
 *
 *   if (error) return <ErrorScreen message={error} />;
 *   if (!ready) return <Spinner />;
 *
 *   // Free plan: immediately active
 *   if (subscribed) return <Dashboard />;
 *
 *   // Paid plan: show paywall
 *   React.useEffect(() => {
 *     subscribe().then((result) => {
 *       if (result.checkout?.checkoutLink) setCheckoutLink(result.checkout.checkoutLink);
 *     });
 *   }, []);
 *
 *   return checkoutLink ? (
 *     <SemaphorePayPaywall
 *       visible={true}
 *       checkoutLink={checkoutLink}
 *       callbacks={{ onSuccess: () => setPaid(true) }}
 *     />
 *   ) : null;
 * }
 * ```
 */
export function useSemaphorePay(
  options: UseSemaphorePayOptions
): UseSemaphorePayReturn {
  const {
    baseUrl,
    collectionName,
    planId,
    userId,
    userEmail,
    userName,
    autoSubscribe = true,
  } = options;

  const clientRef = useRef(new SemaphorePayClient({ baseUrl }));
  const client = clientRef.current;
  const ranSetup = useRef(false);

  const [state, setState] = useState<SemaphorePayState>({
    ready: false,
    customerId: null,
    planId: null,
    subscribed: false,
    subscriptionStatus: null,
    error: null,
  });

  const setError = useCallback((msg: string) => {
    setState((prev) => ({ ...prev, error: msg, ready: true }));
  }, []);

  const runSetup = useCallback(async () => {
    if (ranSetup.current) return;
    ranSetup.current = true;

    try {
      // 1. Collection
      const col = await client.createCollection({
        name: collectionName ?? "SemaphorePay RN App",
        userId: userId ?? `rn_user_${crypto.randomUUID()}`,
      });
      client.setPublicApiKey(col.keys.public);

      // 2. Customer — generates a unique userId if not provided
      const uid = userId ?? `rn_user_${crypto.randomUUID()}`;
      const customer = await client.createCustomer({
        userId: uid,
        email: userEmail,
        name: userName,
      });
      const cid = (customer as any).id;
      client.currentCustomerId = cid;

      // 3. Plan — look it up
      let resolvedPlanId: string | null = null;
      if (planId) {
        const plans = (await client.listPlans()) as any[];
        const match = plans.find((p: any) => p.id === planId);
        if (match) {
          resolvedPlanId = match.id;
        } else {
          throw new Error(`Plan "${planId}" not found in collection. Create it via the admin API.`);
        }
      }

      // 4. Subscribe
      if (autoSubscribe && resolvedPlanId && cid) {
        const subResult = await client.subscribeToPlan({
          customerId: cid,
          planId: resolvedPlanId,
        });
        const s = subResult as any;
        setState({
          ready: true,
          customerId: cid,
          planId: resolvedPlanId,
          subscribed: s.status === "active" || s.status === "trialing",
          subscriptionStatus: s.status,
          error: null,
        });
      } else {
        setState({
          ready: true,
          customerId: cid,
          planId: resolvedPlanId,
          subscribed: false,
          subscriptionStatus: null,
          error: null,
        });
      }
    } catch (err: any) {
      setError(err.message ?? "Setup failed.");
    }
  }, [
    client,
    collectionName,
    planId,
    userId,
    userEmail,
    userName,
    autoSubscribe,
  ]);

  // Trigger setup on mount
  if (!ranSetup.current) {
    runSetup(); // intentional fire-and-forget; state updates via setState
  }

  const subscribe = useCallback(async (): Promise<any> => {
    if (!state.customerId || !state.planId) {
      setError("Customer or plan not initialized. Call useSemaphorePay first.");
      return null;
    }
    try {
      const result = await client.subscribeToPlan({
        customerId: state.customerId,
        planId: state.planId,
      });
      const s = result as any;
      setState((prev) => ({
        ...prev,
        subscribed: s.status === "active" || s.status === "trialing",
        subscriptionStatus: s.status,
        error: null,
      }));
      return result;
    } catch (err: any) {
      setError(err.message ?? "Subscribe failed.");
      return null;
    }
  }, [client, state.customerId, state.planId, setError]);

  const check = useCallback(
    async (featureId: string, required?: number): Promise<any> => {
      const cid = state.customerId ?? client.currentCustomerId;
      if (!cid) throw new Error("No customerId.");
      return client.checkEntitlement({ customerId: cid, featureId, required });
    },
    [client, state.customerId]
  );

  const report = useCallback(
    async (featureId: string, amount?: number): Promise<any> => {
      const cid = state.customerId ?? client.currentCustomerId;
      if (!cid) throw new Error("No customerId.");
      return client.reportEntitlement({ customerId: cid, featureId, amount });
    },
    [client, state.customerId]
  );

  // Re-run setup if mount hasn't triggered it yet (React strict mode double-mount guard)
  if (!ranSetup.current) {
    setTimeout(() => runSetup(), 0);
  }

  return {
    client,
    ...state,
    subscribe,
    check,
    report,
  };
}