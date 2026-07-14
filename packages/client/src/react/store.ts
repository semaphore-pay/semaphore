import { create } from "zustand";
import { SemaphorePayClient } from "../index";

export interface SemaphorePayStore {
  /** The SemaphorePay client instance. */
  client: SemaphorePayClient | null;
  /** Whether the client is initialized. */
  ready: boolean;
  /** The current customer ID. */
  customerId: string | null;
  /** The current subscription status. */
  subscriptionStatus: string | null;
  /** Whether the user has an active subscription. */
  subscribed: boolean;
  /** Current error message, if any. */
  error: string | null;

  /** Initialize the client with configuration. */
  initialize: (options: {
    baseUrl: string;
    apiKey: string;
    collectionId: string;
  }) => void;
  /** Set the current customer ID. */
  setCustomerId: (id: string) => void;
  /** Set subscription status. */
  setSubscriptionStatus: (status: string | null) => void;
  /** Set error message. */
  setError: (error: string | null) => void;
  /** Reset the store. */
  reset: () => void;
}

const initialState = {
  client: null,
  ready: false,
  customerId: null,
  subscriptionStatus: null,
  subscribed: false,
  error: null,
};

/**
 * Zustand store for SemaphorePay state.
 *
 * Use this in React components to share SemaphorePay state across screens.
 *
 * ```ts
 * import { useSemaphorePayStore } from "@semaphore-pay/client/react";
 *
 * // Initialize once (e.g. in App.tsx)
 * useSemaphorePayStore.getState().initialize({
 *   baseUrl: "https://your-server.example.com",
 *   apiKey: "pk_test_...",
 *   collectionId: "col_...",
 * });
 *
 * // In any component
 * function MyComponent() {
 *   const { customerId, subscribed } = useSemaphorePayStore();
 * }
 * ```
 */
export const useSemaphorePayStore = create<SemaphorePayStore>((set) => ({
  ...initialState,

  initialize: (options) => {
    const client = new SemaphorePayClient(options);
    set({ client, ready: true });
  },

  setCustomerId: (id) => {
    const { client } = useSemaphorePayStore.getState();
    if (client) client.currentCustomerId = id;
    set({ customerId: id });
  },

  setSubscriptionStatus: (status) => {
    console.log('[Store] setSubscriptionStatus:', status);
    set({
      subscriptionStatus: status,
      subscribed: status === "active" || status === "trialing",
    });
    console.log('[Store] new subscribed:', status === "active" || status === "trialing");
  },

  setError: (error) => set({ error }),

  reset: () => {
    set(initialState);
  },
}));
