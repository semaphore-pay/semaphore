---
type: concept
title: "Collections API"
source: "https://docs.semaphorepay.tech/api-reference/collections/"
path: /api-reference/collections/
updated: 2026-07-05
okf:
  generated_by: "@docmd/plugin-okf"
  generated_at: "2026-07-05T13:54:02.031Z"
---
---
title: Collections API
---

# Collections API

## Create Collection

```http
POST /api/v1/billing/collections
Content-Type: application/json
Cookie: semaphore.session=...
```

```json
{
  "name": "My App",
  "description": "Production"
}
```

### Response

```json
{
  "id": "col_abc123",
  "name": "My App",
  "description": "Production",
  "publicKey": "pk_col_abc123_xyz",
  "secretKey": "sk_col_abc123_def",
  "createdAt": "2026-07-05T12:00:00Z"
}
```

## List Collections

```http
GET /api/v1/billing/collections
Cookie: semaphore.session=...
```

### Response

```json
[
  {
    "id": "col_abc123",
    "name": "My App",
    "createdAt": "2026-07-05T12:00:00Z"
  }
]
```

## Get Collection

```http
GET /api/v1/billing/collections/:id
Cookie: semaphore.session=...
```

## Delete Collection

```http
DELETE /api/v1/billing/collections/:id
Cookie: semaphore.session=...
```

::: danger
This permanently deletes the collection and all its data.
:::
