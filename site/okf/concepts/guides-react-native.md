---
type: guide
title: "React Native"
source: "https://docs.semaphorepay.tech/guides/react-native/"
path: /guides/react-native/
updated: 2026-07-14
okf:
  generated_by: "@docmd/plugin-okf"
  generated_at: "2026-07-14T15:56:13.469Z"
---
---
title: React Native
---

# React Native

Use the React Native hook and components for mobile apps.

## Installation

```bash
npm install @semaphore-pay/client
```

## Setup

```tsx
import { useSemaphorePay } from '@semaphore-pay/client/react-native';

function App() {
  const {
    ready,
    customerId,
    subscribed,
    subscriptionStatus,
    error,
    subscribe,
    check,
    report,
    client,
  } = useSemaphorePay({
    baseUrl: 'https://your-api.example.com',
    apiKey: 'pk_your_key',
    collectionId: 'col_abc123',
    planId: 'plan_pro_monthly',
    userId: 'user_123',
    userEmail: 'user@example.com',
    userName: 'John Doe',
    autoSubscribe: true,
  });

  if (error) return <Text>Error: {error}</Text>;
  if (!ready) return <ActivityIndicator />;

  if (subscribed) return <Dashboard />;

  return (
    <View>
      <Text>Setting up subscription...</Text>
    </View>
  );
}
```

## Hook Options

| Option | Type | Required | Description |
|---|---|---|---|
| `baseUrl` | string | yes | API base URL |
| `apiKey` | string | yes | Public API key |
| `collectionId` | string | yes | Collection ID |
| `planId` | string | no | Plan ID to subscribe to |
| `userId` | string | no | User identifier (auto-generated if not provided) |
| `userEmail` | string | no | Customer email |
| `userName` | string | no | Customer name |
| `autoSubscribe` | boolean | no | Auto-subscribe on mount (default: true) |

## Hook Return Values

| Property | Type | Description |
|---|---|---|
| `client` | `SemaphorePayClient` | The API client instance |
| `ready` | `boolean` | Whether setup is complete |
| `customerId` | `string \| null` | Current customer ID |
| `subscribed` | `boolean` | Whether subscription is active |
| `subscriptionStatus` | `string \| null` | Current subscription status |
| `error` | `string \| null` | Error message |
| `subscribe` | `() => Promise<any>` | Subscribe to plan |
| `check` | `(featureId, required?) => Promise<any>` | Check entitlement |
| `report` | `(featureId, amount?) => Promise<any>` | Report usage |

## Paywall Component

The `SemaphorePayPaywall` component hosts a WebView for Nomba checkout:

```tsx
import { SemaphorePayPaywall } from '@semaphore-pay/client/react-native';

function BuyButton() {
  const [link, setLink] = useState<string | null>(null);

  const handleBuy = async () => {
    const result = await client.subscribeToPlan({ customerId, planId });
    if (result.checkout?.checkoutLink) {
      setLink(result.checkout.checkoutLink);
    }
  };

  return (
    <>
      <Button title="Buy Premium" onPress={handleBuy} />
      {link && (
        <SemaphorePayPaywall
          visible={true}
          checkoutLink={link}
          callbackUrl="https://your-api.example.com/webhook"
          callbacks={{
            onSuccess: () => {
              setLink(null);
              console.log('Payment successful!');
            },
            onCancel: () => setLink(null),
            onError: (err) => console.error(err),
          }}
        />
      )}
    </>
  );
}
```

### Paywall Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `checkoutLink` | string | yes | Nomba checkout URL |
| `visible` | boolean | yes | Whether modal is visible |
| `callbacks` | object | yes | `{ onSuccess, onCancel?, onError? }` |
| `callbackUrl` | string | no | Success detection URL |
| `successUrlPrefix` | string | no | Override success detection |

## Entitlement Guard

The `SemaphorePayEntitlementGuard` component gates content behind an entitlement:

```tsx
import { SemaphorePayEntitlementGuard } from '@semaphore-pay/client/react-native';

function ProDashboard() {
  return (
    <SemaphorePayEntitlementGuard
      client={client}
      featureId="pro_mode"
      customerId={customerId}
      denied={
        <View>
          <Text>Upgrade to Pro to access this dashboard.</Text>
          <Button title="Upgrade" onPress={openPaywall} />
        </View>
      }
    >
      <ProFeaturesScreen />
    </SemaphorePayEntitlementGuard>
  );
}
```

### Guard Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `client` | SemaphorePayClient | yes | API client instance |
| `featureId` | string | yes | Feature to check |
| `customerId` | string | no | Customer ID (falls back to client) |
| `required` | number | no | Units required (default: 1) |
| `fallback` | ReactNode | no | Loading state content |
| `denied` | ReactNode | no | Denied state content |
| `children` | ReactNode | yes | Content to render when allowed |
| `onChecked` | `(allowed: boolean) => void` | no | Callback after check |
