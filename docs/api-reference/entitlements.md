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
