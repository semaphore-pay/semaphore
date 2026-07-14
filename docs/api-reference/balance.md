---
title: Balance API
---

# Balance API

View collection balance and payout information.

## Get Balance

```http
GET /api/v1/billing/collections/:collectionId/balance
Cookie: semaphore.session=...
```

### Response

```json
{
  "available": 1500000,
  "pending": 250000,
  "totalEarned": 5000000,
  "platformFeeRate": 0.05,
  "currency": "NGN"
}
```

| Field | Description |
|---|---|
| `available` | Balance available for payout (in kobo) |
| `pending` | Amount awaiting settlement (in kobo) |
| `totalEarned` | Total revenue collected (in kobo) |
| `platformFeeRate` | Semaphore fee rate (e.g. `0.05` = 5%) |
| `currency` | ISO 4217 currency code |
