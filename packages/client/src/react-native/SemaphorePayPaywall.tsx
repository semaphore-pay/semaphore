import React, { useRef, useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Modal,
  Pressable,
} from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";

/**
 * Callbacks delivered by the paywall component.
 */
export interface SemaphorePayPaywallCallbacks {
  /**
   * Called when payment succeeds (the webview navigates to the callback URL
   * or the user dismisses the modal after Nomba's success redirect).
   */
  onSuccess: () => void;
  /**
   * Called when the webview fails to load or the user manually cancels.
   */
  onCancel?: () => void;
  /** Called if the webview encounters an error (invalid URL, network issue). */
  onError?: (error: string) => void;
}

export interface SemaphorePayPaywallProps {
  /**
   * The checkoutLink returned by {@link SemaphorePayClient.subscribe} when
   * subscribing to a paid product.
   *
   * @example
   * const sub = await semaphore-pay.subscribe({ customerId, productInternalId });
   * <SemaphorePayPaywall checkoutLink={sub.checkout.checkoutLink} />
   */
  checkoutLink: string;
  /** The API's callback URL (set in Nomba dashboard). Payment success is
   * detected when the webview navigates to a URL starting with this value. */
  callbackUrl?: string;
  /** Override the detection URL prefix; defaults to callbackUrl. */
  successUrlPrefix?: string;
  /** Whether the modal is visible (controlled externally). */
  visible: boolean;
  /** Callbacks for success / cancel / error. */
  callbacks: SemaphorePayPaywallCallbacks;
}

/**
 * SemaphorePayPaywall — a React Native modal that hosts a WebView pointing to
 * the Nomba-hosted checkout page. Similar to Paystack's React Native
 * checkout modal.
 *
 * Basic usage:
 *
 * ```tsx
 * import { SemaphorePayClient } from "@semaphore-pay/client";
 * import { SemaphorePayPaywall } from "@semaphore-pay/client/react-native";
 *
 * function BuyButton() {
 *   const [link, setLink] = useState<string | null>(null);
 *
 *   const handleBuy = async () => {
 *     const sub = await client.subscribe({ customerId, productInternalId });
 *     setLink(sub.checkout.checkoutLink);
 *   };
 *
 *   return (
 *     <>
 *       <Button title="Buy Premium" onPress={handleBuy} />
 *       {link && (
 *         <SemaphorePayPaywall
 *           visible={true}
 *           checkoutLink={link}
 *           callbackUrl="https://example.com/callback"
 *           callbacks={{
 *             onSuccess: () => { setLink(null); console.log("paid!"); },
 *             onCancel:  () => setLink(null),
 *           }}
 *         />
 *       )}
 *     </>
 *   );
 * }
 * ```
 */
export function SemaphorePayPaywall({
  checkoutLink,
  callbackUrl,
  successUrlPrefix,
  visible,
  callbacks,
}: SemaphorePayPaywallProps) {
  const [loading, setLoading] = useState(true);
  const [, setBrowserVisible] = useState(true);
  const hasDetectedSuccess = useRef(false);

  /**
   * Determine whether the webview has navigated to a success URL. Nomba's
   * checkout redirects the browser to `callbackUrl` after payment. We treat
   * any URL starting with `successUrlPrefix` (or `callbackUrl`) as a
   * successful payment.
   */
  const detectSuccess = useRef(
    (prefix: string | undefined): boolean => {
      if (!prefix) return false;
      try {
        const url = new URL(prefix);
        return url.origin.length > 0;
      } catch {
        return false;
      }
    }
  );

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      if (hasDetectedSuccess.current) return;

      const prefix = successUrlPrefix ?? callbackUrl;
      if (!prefix) return;

      // Nomba redirects to callbackUrl?status=success&orderReference=...
      // We consider that a success signal.
      if (
        navState.url.startsWith(prefix) ||
        navState.url.includes("status=success")
      ) {
        hasDetectedSuccess.current = true;
      }
    },
    [successUrlPrefix, callbackUrl]
  );

  const handleLoadEnd = useCallback(() => {
    setLoading(false);

    if (hasDetectedSuccess.current) {
      // Give a tiny delay so the success screen can render briefly.
      setTimeout(() => {
        callbacks.onSuccess();
      }, 400);
    }
  }, [callbacks]);

  const handleShouldStartLoadWithRequest = useCallback(
    (request: WebViewNavigation): boolean => {
      const prefix = successUrlPrefix ?? callbackUrl;
      if (!prefix) return true;

      if (
        request.url.startsWith(prefix) ||
        request.url.includes("status=success")
      ) {
        if (!hasDetectedSuccess.current) {
          hasDetectedSuccess.current = true;
          // Let the redirect render for a moment, then signal success
          setTimeout(() => {
            callbacks.onSuccess();
            setBrowserVisible(false);
          }, 600);
        }
        return false; // stop loading the actual callback page
      }

      return true;
    },
    [successUrlPrefix, callbackUrl, callbacks]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        if (!hasDetectedSuccess.current) {
          callbacks.onCancel?.();
        }
      }}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              if (!hasDetectedSuccess.current) {
                callbacks.onCancel?.();
              }
            }}
            hitSlop={8}
          >
            <Text style={styles.closeText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Complete Payment</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Spinner overlay */}
        {loading && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#555" />
            <Text style={styles.loaderText}>Loading checkout…</Text>
          </View>
        )}

        {/* WebView */}
        <WebView
          source={{ uri: checkoutLink }}
          style={styles.webview}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={handleLoadEnd}
          onNavigationStateChange={handleNavigationStateChange}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
          startInLoadingState={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          renderLoading={() => (
            <View style={styles.webviewLoader}>
              <ActivityIndicator size="large" color="#555" />
            </View>
          )}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            callbacks.onError?.(
              nativeEvent.description ?? "Failed to load checkout page."
            );
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            callbacks.onError?.(
              `${nativeEvent.statusCode}: ${nativeEvent.description ?? "HTTP error while loading checkout."}`
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  closeText: { fontSize: 16, color: "#007AFF" },
  headerTitle: { fontSize: 16, fontWeight: "600" },
  headerSpacer: { width: 60 },
  webview: { flex: 1 },
  loader: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    zIndex: 2,
  },
  loaderText: { marginTop: 8, fontSize: 14, color: "#666" },
  webviewLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});