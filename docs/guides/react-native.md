---
title: React Native
---

# React Native

Use the React Native hook for mobile apps.

## Installation

```bash
npm install @semaphore-pay/client
```

## Setup

```tsx
import { useSemaphorePay } from '@semaphore-pay/client/react-native';

function App() {
  const {
    customer,
    subscriptions,
    isLoading,
    error,
    subscribe,
    cancelSubscription,
    checkEntitlement,
  } = useSemaphorePay({
    baseUrl: 'https://your-api.example.com',
    apiKey: 'pk_your_key',
    collectionId: 'col_abc123',
  });

  return (
    <View>
      {isLoading ? (
        <ActivityIndicator />
      ) : error ? (
        <Text>Error: {error.message}</Text>
      ) : (
        <>
          <Text>Subscriptions: {subscriptions.length}</Text>
          {subscriptions.map((sub) => (
            <View key={sub.productId}>
              <Text>{sub.status}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}
```

## Deep Links

The client SDK supports Expo deep links. If a token appears in the URL, it's used for authentication (tokens expire but are safe for short-lived sessions).

## Configuration

| Option | Type | Required | Description |
|---|---|---|---|
| `baseUrl` | string | yes | API base URL |
| `apiKey` | string | yes | Public API key |
| `collectionId` | string | yes | Collection ID |
