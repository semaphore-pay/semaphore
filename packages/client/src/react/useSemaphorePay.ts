import { useCallback } from "react";
import { useSemaphorePayStore } from "./store";

/**
 * Convenience hook that provides common SemaphorePay operations
 * backed by the zustand store.
 *
 * ```tsx
 * import { useSemaphorePay } from "@semaphore-pay/client/react";
 *
 * function SubscribeButton({ planId }: { planId: string }) {
 *   const { customerId, subscribe, loading, error } = useSemaphorePay();
 *
 *   return (
 *     <button disabled={loading} onClick={() => subscribe(planId)}>
 *       {loading ? "Loading..." : "Subscribe"}
 *     </button>
 *   );
 * }
 * ```
 */
export function useSemaphorePay() {
  const client = useSemaphorePayStore((s) => s.client);
  const customerId = useSemaphorePayStore((s) => s.customerId);
  const subscribed = useSemaphorePayStore((s) => s.subscribed);
  const subscriptionStatus = useSemaphorePayStore((s) => s.subscriptionStatus);
  const error = useSemaphorePayStore((s) => s.error);
  const setCustomerId = useSemaphorePayStore((s) => s.setCustomerId);
  const setSubscriptionStatus = useSemaphorePayStore((s) => s.setSubscriptionStatus);
  const setError = useSemaphorePayStore((s) => s.setError);

  const createCustomer = useCallback(
    async (input: { userId: string; email?: string; name?: string }) => {
      if (!client) throw new Error("Client not initialized. Call initialize() first.");
      const result = await client.createCustomer(input);
      const id = (result as any).id;
      setCustomerId(id);
      return result;
    },
    [client, setCustomerId],
  );

  const subscribe = useCallback(
    async (planId: string) => {
      if (!client) throw new Error("Client not initialized.");
      if (!customerId) throw new Error("No customer. Call createCustomer() first.");
      const result = await client.subscribeToPlan({ customerId, planId });
      const s = result as any;
      setSubscriptionStatus(s.status);
      return result;
    },
    [client, customerId, setSubscriptionStatus],
  );

  const checkEntitlement = useCallback(
    async (featureId: string, required?: number) => {
      if (!client) throw new Error("Client not initialized.");
      if (!customerId) throw new Error("No customer.");
      return client.checkEntitlement({ customerId, featureId, required });
    },
    [client, customerId],
  );

  const reportEntitlement = useCallback(
    async (featureId: string, amount?: number) => {
      if (!client) throw new Error("Client not initialized.");
      if (!customerId) throw new Error("No customer.");
      return client.reportEntitlement({ customerId, featureId, amount });
    },
    [client, customerId],
  );

  const cancelSubscription = useCallback(
    async (subscriptionId: string) => {
      if (!client) throw new Error("Client not initialized.");
      return client.cancelSubscription(subscriptionId);
    },
    [client],
  );

  return {
    client,
    customerId,
    subscribed,
    subscriptionStatus,
    error,
    loading: !client,
    createCustomer,
    subscribe,
    checkEntitlement,
    reportEntitlement,
    cancelSubscription,
    setError,
  };
}
