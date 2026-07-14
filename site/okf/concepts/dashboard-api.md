---
type: concept
title: "Dashboard API Mapping"
source: "https://docs.semaphorepay.tech/dashboard/api/"
path: /dashboard/api/
updated: 2026-07-14
okf:
  generated_by: "@docmd/plugin-okf"
  generated_at: "2026-07-14T15:56:13.462Z"
---
---
title: Dashboard API Mapping
---

# Dashboard API Mapping

The dashboard calls the backend at `/api/v1/billing/*`. Here's how each dashboard section maps to API endpoints.

## Collections

| Dashboard Action | API Call |
|---|---|
| List collections | `GET /collections` |
| Create collection | `POST /collections` |
| Update collection | `PUT /collections/:id` |
| Delete collection | `DELETE /collections/:id` |
| View analytics | `GET /collections/:id/analytics` |

## API Keys

| Dashboard Action | API Call |
|---|---|
| List keys | `GET /collections/:id/api-keys` |
| Generate key | `POST /collections/:id/api-keys` |
| Revoke key | `DELETE /collections/:id/api-keys/:key` |

## Plans

| Dashboard Action | API Call |
|---|---|
| List plans | `GET /collections/:id/plans` |
| Create plan | `POST /collections/:id/plans` |
| Deactivate plan | `POST /collections/:id/plans/:planId/deactivate` |
| Reactivate plan | `POST /collections/:id/plans/:planId/reactivate` |
| Delete plan | `DELETE /collections/:id/plans/:planId` |

## Products

| Dashboard Action | API Call |
|---|---|
| List products | `GET /collections/:id/products` |
| Create product | `POST /collections/:id/products` |
| Update product | `PUT /collections/:id/products/:productId` |
| Delete product | `DELETE /collections/:id/products/:productId` |

## Customers

| Dashboard Action | API Call |
|---|---|
| List customers | `GET /collections/:id/customers` |
| Get customer | `GET /collections/:id/customers/:customerId` |
| Upsert customer | `POST /collections/:id/customers` |

## Subscriptions

| Dashboard Action | API Call |
|---|---|
| List subscriptions | `GET /collections/:id/subscriptions` |
| Get subscription | `GET /collections/:id/subscriptions/:subId` |
| Subscribe | `POST /collections/:id/subscriptions/subscribe` |
| Cancel | `POST /collections/:id/subscriptions/:subId/cancel` |
| Pause | `POST /collections/:id/subscriptions/:subId/pause` |
| Resume | `POST /collections/:id/subscriptions/:subId/resume` |
| Reactivate | `POST /collections/:id/subscriptions/:subId/reactivate` |

## Features & Entitlements

| Dashboard Action | API Call |
|---|---|
| List features | `GET /collections/:id/features` |
| Create feature | `POST /collections/:id/features` |
| Delete feature | `DELETE /collections/:id/features/:featureId` |
| Attach to plan | `POST /collections/:id/features/attach-plan` |
| Detach from plan | `POST /collections/:id/features/detach-plan` |
| Attach to product | `POST /collections/:id/features/attach-product` |
| Detach from product | `POST /collections/:id/features/detach-product` |
| Check entitlement | `POST /collections/:id/entitlements/check` |
| Report usage | `POST /collections/:id/entitlements/report` |

## Analytics & Balance

| Dashboard Action | API Call |
|---|---|
| Metric trend | `GET /collections/:id/metrics/trend` |
| Metric history | `GET /collections/:id/metrics/history` |
| Refresh metrics | `POST /collections/:id/metrics/refresh` |
| Get balance | `GET /collections/:id/balance` |

## Authentication

| Dashboard Action | API Call |
|---|---|
| Request magic link | `POST /api/auth/magic-link/request` |
| Verify magic link | `GET /api/auth/magic-link/verify` |
| Get session | `GET /api/auth/get-session` |
| Sign out | `POST /api/auth/sign-out` |
