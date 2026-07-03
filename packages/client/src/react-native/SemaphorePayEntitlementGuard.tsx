import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import type { SemaphorePayClient } from "../index";

/**
 * Props for {@link SemaphorePayEntitlementGuard}.
 */
export interface SemaphorePayEntitlementGuardProps {
  /** The SemaphorePay client instance (must have an API key set). */
  client: SemaphorePayClient;
  /**
   * The feature ID to check (e.g. "pro_mode", "seats").
   * Must match a feature defined on the product.
   */
  featureId: string;
  /**
   * How many units are required for metered features.
   * Defaults to 1. Ignored for boolean features.
   */
  required?: number;
  /**
   * The customer ID returned by {@link SemaphorePayClient.createCustomer}.
   * Falls back to `client.currentCustomerId` if the hook sets that
   * internally.
   */
  customerId?: string;
  /**
   * Content to render while the entitlement check is in progress.
   * Defaults to a centred spinner.
   */
  fallback?: React.ReactNode;
  /**
   * Content to render when the entitlement check fails (feature not
   * available, insufficient balance, or the customer hasn't paid).
   * Typically: an upsell paywall, a "upgrade" button, or explanatory text.
   */
  denied?: React.ReactNode;
  /** Content to render when the entitlement check passes. */
  children: React.ReactNode;
  /**
   * Called after the check completes with the result.
   * Useful for analytics or logging.
   */
  onChecked?: (allowed: boolean) => void;
}

interface CheckState {
  status: "idle" | "loading" | "allowed" | "denied" | "error";
  errorMessage?: string;
}

/**
 * SemaphorePayEntitlementGuard — gates content behind a feature entitlement.
 *
 * On mount, it calls {@link SemaphorePayClient.checkEntitlement} and renders
 * `children` only when access is granted. While the check is running it
 * shows `fallback` (or a spinner). If the check fails it shows `denied`.
 *
 * ```tsx
 * import { SemaphorePayEntitlementGuard } from "@semaphore-pay/client/react-native";
 *
 * function ProDashboard() {
 *   return (
 *     <SemaphorePayEntitlementGuard
 *       client={semaphoreClient}
 *       featureId="pro_mode"
 *       customerId={currentCustomerId}
 *       denied={
 *         <View>
 *           <Text>Upgrade to Pro to access this dashboard.</Text>
 *           <Button title="Upgrade" onPress={openPaywall} />
 *         </View>
 *       }
 *     >
 *       <ProFeaturesScreen />
 *     </SemaphorePayEntitlementGuard>
 *   );
 * }
 *
 * // For metered features:
 * function ExportButton() {
 *   return (
 *     <SemaphorePayEntitlementGuard
 *       client={semaphoreClient}
 *       featureId="exports"
 *       required={1}
 *       customerId={currentCustomerId}
 *       denied={<Text>Export quota exceeded. Upgrade your plan.</Text>}
 *     >
 *       <Button title="Export CSV" onPress={doExport} />
 *     </SemaphorePayEntitlementGuard>
 *   );
 * }
 * ```
 */
export function SemaphorePayEntitlementGuard({
  client,
  featureId,
  required = 1,
  customerId,
  fallback = <DefaultFallback />,
  denied,
  children,
  onChecked,
}: SemaphorePayEntitlementGuardProps) {
  const [state, setState] = React.useState<CheckState>({ status: "idle" });
  const checkRan = React.useRef(false);

  React.useEffect(() => {
    if (checkRan.current) return;
    checkRan.current = true;

    const id = customerId ?? (client as any).currentCustomerId;
    if (!id) {
      setState({ status: "error", errorMessage: "No customerId provided." });
      return;
    }

    setState({ status: "loading" });

    client
      .checkEntitlement({ customerId: id, featureId, required })
      .then((result: any) => {
        if (result.allowed) {
          setState({ status: "allowed" });
          onChecked?.(true);
        } else {
          setState({ status: "denied" });
          onChecked?.(false);
        }
      })
      .catch((err: Error) => {
        setState({
          status: "error",
          errorMessage: err.message ?? "Entitlement check failed.",
        });
        onChecked?.(false);
      });
  }, [client, featureId, required, customerId, onChecked]);

  if (state.status === "loading" || state.status === "idle") {
    return <>{fallback}</>;
  }

  if (state.status === "error") {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {state.errorMessage ?? "Something went wrong."}
        </Text>
      </View>
    );
  }

  if (state.status === "denied") {
    return <>{denied ?? null}</>;
  }

  return <>{children}</>;
}

function DefaultFallback() {
  return (
    <View style={styles.fallbackContainer}>
      <ActivityIndicator size="small" />
      <Text style={styles.fallbackText}>Checking access…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  fallbackText: { marginLeft: 8, fontSize: 14, color: "#888" },
  errorContainer: { padding: 16 },
  errorText: { fontSize: 14, color: "#d00" },
});