---
type: concept
title: "Dashboard Authentication"
source: "https://docs.semaphorepay.tech/dashboard/auth/"
path: /dashboard/auth/
updated: 2026-07-14
okf:
  generated_by: "@docmd/plugin-okf"
  generated_at: "2026-07-14T15:56:13.463Z"
---
---
title: Dashboard Authentication
---

# Dashboard Authentication

The dashboard uses **Better Auth** with magic link (email-based passwordless) authentication.

## Flow

```
1. User enters email → POST /api/auth/magic-link/request
2. User clicks link in email → redirected to dashboard
3. Session cookie set → all API requests authenticated
```

## Configuration

```typescript
// src/lib/auth-client.ts
import { createAuthClient } from 'better-auth/client';
import { magicLinkClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_AUTH_BASE_URL,
  plugins: [magicLinkClient()],
});
```

## Protected Routes

All dashboard routes require authentication. The `ProtectedRoute` component checks the session:

```typescript
// src/App.tsx
function ProtectedRoute({ children }) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <Spinner />;
  if (!session) return <Navigate to="/login" />;

  return children;
}
```

## API Requests

All dashboard API calls use `credentials: "include"` to send the session cookie:

```typescript
// src/lib/api.ts
async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}/api/v1/billing${path}`, {
    credentials: 'include',
    ...options,
  });
  return res.json();
}
```

## Sign Out

```typescript
await authClient.signOut();
window.location.href = '/';
```
