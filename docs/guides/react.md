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
import { SemaphorePayProvider, useSemaphorePay } from '@semaphore-pay/client/react';

function App() {
  return (
    <SemaphorePayProvider
      config={{
        baseUrl: 'https://your-api.example.com',
        apiKey: 'pk_your_key',
        collectionId: 'col_abc123',
      }}
    >
      <Dashboard />
    </SemaphorePayProvider>
  );
}
```

## Using the Hook

```tsx
function Dashboard() {
  const {
    customer,
    subscriptions,
    entitlements,
    isLoading,
    error,
    subscribe,
    cancelSubscription,
    checkEntitlement,
  } = useSemaphorePay();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Subscriptions</h2>
      {subscriptions.map((sub) => (
        <div key={sub.productId}>
          {sub.productInternalId} — {sub.status}
          {sub.cancelAtPeriodEnd && ' (cancels at period end)'}
        </div>
      ))}

      <h2>Features</h2>
      <button
        onClick={() => checkEntitlement('api_access')}
        disabled={!entitlements?.api_access}
      >
        {entitlements?.api_access ? 'Access Granted' : 'Upgrade Required'}
      </button>
    </div>
  );
}
```

## Available State

| Property | Type | Description |
|---|---|---|
| `customer` | `Customer \| null` | Current customer data |
| `subscriptions` | `CustomerSubscription[]` | Active subscriptions |
| `entitlements` | `Record<string, boolean>` | Feature access map |
| `isLoading` | `boolean` | Loading state |
| `error` | `Error \| null` | Last error |
