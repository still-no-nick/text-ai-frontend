---
name: tanstack-query-api-zustand
description: Guides TanStack Query usage for API requests in React 19 + TypeScript and how to integrate with Zustand client state. Use when implementing data fetching, mutations, cache invalidation, optimistic updates, or wiring auth/session state into API calls.
disable-model-invocation: true
---

# TanStack Query for API + integration with Zustand

## Hard rules
- TypeScript only (`.ts/.tsx`), **named exports only** (no `export default`).
- **Server state** (API data, cache, loading/error states) lives in **TanStack Query**.
- **Client state** (UI preferences, drafts, selections, auth/session token, feature flags) lives in **Zustand**.
- Do not duplicate the same data in both places unless there is a clear reason.

## Responsibilities split (default)
- **TanStack Query**:
  - caching, deduping, retries
  - query invalidation + refetch
  - background refresh
  - optimistic updates (prefer updating Query cache)
- **Zustand**:
  - auth/session data (e.g., access token)
  - UI-only state (filters, tabs, modal state)
  - form drafts that must persist across routes/components

## Where code lives (with `src/modules/*`)
In a module:
- `*.api.ts`: low-level request functions (typed)
- `use*.ts`: hooks that call query/mutation using the API functions
- `*.schema.ts`: runtime parsing/validation (optional but preferred for external data)
- `*.types.ts`: shared TS types

Example:
```
src/modules/user-profile/
  update-user.api.ts
  user.schema.ts
  useUserProfile.ts
```

## Query keys
- Use stable, hierarchical query keys.
- Prefer a small key factory per module:

```ts
export const userProfileKeys = {
  all: ["user-profile"] as const,
  byId: (id: string) => ["user-profile", "by-id", id] as const,
};
```

## API layer pattern
- `*.api.ts` should be framework-agnostic (no React, no hooks).
- Return typed results. If schemas exist, parse before returning.
- Keep auth header injection inside a shared fetcher that reads token from Zustand.

### Auth token from Zustand → fetcher
```ts
import { useAuthStore } from "../auth/auth.store";

export const getAccessToken = () => useAuthStore.getState().accessToken;

export const apiFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const token = getAccessToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");

  const res = await fetch(input, { ...init, headers });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res;
};
```

Notes:
- Use `useAuthStore.getState()` (not the hook) in non-React code.
- Keep token in Zustand (client state); do not store it in query cache.

## `useQuery` (server state)
- Wrap queries in module hooks and return a view-model.
- Select only needed fields (via `select`) for performance and stable types.

```ts
import { useQuery } from "@tanstack/react-query";
import { userProfileKeys } from "./userProfile.keys";
import { getUserProfile } from "./userProfile.api";

export const useUserProfile = (userId: string) => {
  return useQuery({
    queryKey: userProfileKeys.byId(userId),
    queryFn: () => getUserProfile(userId),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
};
```

## `useMutation` + invalidation
- Mutations live in hooks; invalidate or update cache on success.
- Default preference:
  1) update query cache via `queryClient.setQueryData` if you know the result shape
  2) otherwise invalidate relevant keys

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userProfileKeys } from "./userProfile.keys";
import { updateUser } from "./update-user.api";

export const useUpdateUser = (userId: string) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: unknown) => updateUser(userId, payload),
    onSuccess: (updated) => {
      qc.setQueryData(userProfileKeys.byId(userId), updated);
    },
  });
};
```

## Optimistic updates (when needed)
- Prefer optimistic updates in **Query cache**, not in Zustand.
- Use `onMutate` + rollback:
  - snapshot previous cache
  - update cache optimistically
  - rollback on error
  - refetch/invalidate on settled

## Linking Query with Zustand (approved patterns)

### 1) Zustand → Query (inputs)
Use Zustand values as **inputs** to queries (e.g., filters), but keep fetched data in Query:
- read slice with selector: `const filters = useSomeStore((s) => s.filters)`
- use it in `queryKey` and `queryFn`

### 2) Auth/session changes
- On logout: clear Zustand auth + optionally clear Query cache.
- Pattern: expose a `logout()` hook action that calls `queryClient.clear()` after resetting auth store.

### 3) Zustand as UI state for server lists
- Store selected IDs / current page / sort in Zustand
- Fetch list in Query using those params
- Do not store the list items themselves in Zustand

## Error handling
- Errors from `queryFn`/`mutationFn` should be `unknown` externally; narrow before reading fields.
- Prefer typed error objects only if the API layer standardizes them.

## What not to do
- Don’t mirror API responses into Zustand “just in case”.
- Don’t call React hooks inside `*.api.ts`.
- Don’t build query keys from unstable objects (use primitives or stable serialization).
- Don’t invalidate “everything” unless necessary; target specific key scopes.
