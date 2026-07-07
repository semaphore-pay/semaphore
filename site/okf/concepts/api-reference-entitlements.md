---
type: concept
title: "Entitlements API"
source: "https://docs.semaphorepay.tech/api-reference/entitlements/"
path: /api-reference/entitlements/
updated: 2026-07-07
okf:
  generated_by: "@docmd/plugin-okf"
  generated_at: "2026-07-07T20:01:08.630Z"
---
---
title: Entitlements API
---

# Entitlements API

## Check Entitlement

```http
POST /api/v1/billing/collections/:collectionId/entitlements/check
Content-Type: application/json
Cookie: semaphore.session=...
```

```json
{
  "customerId": "cust_abc123",
  "featureId": "api_calls",
  "required": 1
}
```

### Parameters

| Field | Type | Required | Description |
|---|---|---|---|
| `customerId` | string | yes | Customer ID |
| `featureId` | string | yes | Feature identifier (e.g. `"api_calls"`) |
| `required` | number | no | Units required (default: 1) |

### Response

```json
{
  "allowed": true,
  "balance": {
    "limit": 10000,
    "remaining": 9500,
    "resetAt": "2026-08-01T00:00:00Z",
    "unlimited": false
  }
}
```

::: info
For boolean features, `balance` is null. For limit features, `balance` shows remaining units.
:::

## Report Usage

```http
POST /api/v1/billing/collections/:collectionId/entitlements/report
Content-Type: application/json
Cookie: semaphore.session=...
```

```json
{
  "customerId": "cust_abc123",
  "featureId": "api_calls",
  "amount": 150
}
```

### Parameters

| Field | Type | Required | Description |
|---|---|---|---|
| `customerId` | string | yes | Customer ID |
| `featureId` | string | yes | Feature identifier |
| `amount` | number | no | Units consumed (default: 1) |

### Response

```json
{
  "success": true,
  "balance": {
    "limit": 10000,
    "remaining": 9350,
    "resetAt": "2026-08-01T00:00:00Z",
    "unlimited": false
  }
}
```

## Check Entitlement (Client SDK)

```http
POST /client/entitlements/check
Content-Type: application/json
x-api-key: pk_...
```

```json
{
  "customerId": "cust_abc123",
  "featureId": "api_calls",
  "required": 1
}
```

## Report Usage (Client SDK)

```http
POST /client/entitlements/report
Content-Type: application/json
x-api-key: pk_...
```

```json
{
  "customerId": "cust_abc123",
  "featureId": "api_calls",
  "amount": 1
}
```
