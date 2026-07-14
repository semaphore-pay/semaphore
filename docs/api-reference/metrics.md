---
title: Metrics API
---

# Metrics API

Track MRR, ARR, subscriber counts, and historical trends for a collection.

## Get Metric Trend

Returns current period metrics compared to the previous period.

```http
GET /api/v1/billing/collections/:collectionId/metrics/trend
Cookie: semaphore.session=...
```

### Response

```json
{
  "mrr": { "current": 299900, "previous": 249900, "change": 50000 },
  "arr": { "current": 3598800, "previous": 2998800, "change": 600000 },
  "activeSubscribers": { "current": 89, "previous": 72, "change": 17 },
  "trialing": { "current": 12, "previous": 8, "change": 4 },
  "churnRate": { "current": 0.05, "previous": 0.08, "change": -0.03 }
}
```

## Get Metric History

Returns historical metric snapshots.

```http
GET /api/v1/billing/collections/:collectionId/metrics/history?limit=30
Cookie: semaphore.session=...
```

### Query Parameters

| Param | Type | Description |
|---|---|---|
| `limit` | number | Number of snapshots (default: 30) |

## Refresh Metric Snapshot

Manually trigger a metric snapshot refresh.

```http
POST /api/v1/billing/collections/:collectionId/metrics/refresh
Cookie: semaphore.session=...
```

### Response

```json
{
  "success": true,
  "snapshot": {
    "mrr": 299900,
    "arr": 3598800,
    "activeSubscribers": 89,
    "trialing": 12,
    "canceled": 45,
    "pastDue": 3,
    "collectedAt": "2026-07-14T12:00:00Z"
  }
}
```
