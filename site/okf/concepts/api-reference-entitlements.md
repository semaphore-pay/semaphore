---
type: concept
title: "Entitlements API"
source: "https://docs.semaphorepay.tech/api-reference/entitlements/"
path: /api-reference/entitlements/
updated: 2026-07-05
okf:
  generated_by: "@docmd/plugin-okf"
  generated_at: "2026-07-05T13:54:02.033Z"
---
---
title: Entitlements API
---

# Entitlements API

## Check Entitlement

```http
POST /api/v1/billing/collections/:id/entitlements/check
Content-Type: application/json
x-api-key: pk_...
```

```json
{
  "customerId": "cust_abc123",
  "feature": "api_access"
}
```

### Response

```json
{
  "entitled": true,
  "customerId": "cust_abc123",
  "feature": "api_access"
}
```

## Report Usage

```http
POST /api/v1/billing/collections/:id/entitlements/report
Content-Type: application/json
x-api-key: pk_...
```

```json
{
  "customerId": "cust_abc123",
  "feature": "api_calls",
  "quantity": 150
}
```

### Parameters

| Field | Type | Required | Description |
|---|---|---|---|
| `customerId` | string | yes | Customer ID |
| `feature` | string | yes | Feature identifier |
| `quantity` | number | yes | Usage amount |
