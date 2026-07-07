---
type: guide
title: "React Integration"
source: "https://docs.semaphorepay.tech/guides/react/"
path: /guides/react/
updated: 2026-07-07
okf:
  generated_by: "@docmd/plugin-okf"
  generated_at: "2026-07-07T20:01:08.644Z"
---
---
title: React Integration
---

# React Integration

Use the zustand-powered React hook for state management.

## Installation

```bash
npm install @semaphore-pay/client zustand
```

## Setup

```tsx
import { useSemaphorePayStore } from '@semaphore-pay/client/react';

// Initialize once (e.g. in App.tsx)
useSemaphorePayStore.getState().initialize({
  baseUrl: 'https://your-api.example.com',
  apiKey: 'pk_your_key',
  collectionId: 'col_abc123',
});
```

## Using the Store

```tsx
import { useSemaphorePayStore } from '@semaphore-pay/client/react';

function Dashboard() {
  const { customerId, subscribed, subscriptionStatus, error } = useSemaphorePayStore();

  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Subscription Status</h2>
      <p>Customer: {customerId}</p>
      <p>Subscribed: {subscribed ? 'Yes' : 'No'}</p>
      <p>Status: {subscriptionStatus}</p>
    </div>
  );
}
```

## Setting Customer ID

After creating a customer, set the ID in the store:

```tsx
import { useSemaphorePayStore } from '@semaphore-pay/client/react';

function LoginButton() {
  const { initialize, setCustomerId } = useSemaphorePayStore();

  const handleLogin = async () => {
    // Initialize client
    initialize({
      baseUrl: 'https://your-api.example.com',
      apiKey: 'pk_your_key',
      collectionId: 'col_abc123',
    });

    // Create or get customer
    const client = useSemaphorePayStore.getState().client;
    const customer = await client.createCustomer({
      userId: 'user_123',
      email: 'user@example.com',
    });

    setCustomerId(customer.id);
  };

  return <button onClick={handleLogin}>Login</button>;
}
```

## Available State

| Property | Type | Description |
|---|---|---|
| `client` | `SemaphorePayClient \| null` | The API client instance |
| `ready` | `boolean` | Whether the client is initialized |
| `customerId` | `string \| null` | Current customer ID |
| `subscriptionStatus` | `string \| null` | Current subscription status |
| `subscribed` | `boolean` | Whether user has active subscription |
| `error` | `string \| null` | Last error message |

## Available Actions

| Action | Parameters | Description |
|---|---|---|
| `initialize` | `{ baseUrl, apiKey, collectionId }` | Initialize the client |
| `setCustomerId` | `id: string` | Set the current customer ID |
| `setSubscriptionStatus` | `status: string \| null` | Set subscription status |
| `setError` | `error: string \| null` | Set error message |
| `reset` | — | Reset the store |
