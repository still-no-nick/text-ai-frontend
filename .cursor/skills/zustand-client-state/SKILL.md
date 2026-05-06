---
name: zustand-client-state
description: Guides Zustand usage for client-side data/state in React 19 + TypeScript: store structure, typing, selectors, performance, and module boundaries. Use when implementing client state, global UI state, cached client data, or Zustand stores.
disable-model-invocation: true
---

# Zustand for client-side data (React 19 + TypeScript)

## Hard rules
- Use **TypeScript** and **named exports only** (no `export default`).
- Prefer **module-owned** stores under `src/modules/<domain>/` instead of one giant global store.
- Keep **business logic** in hooks/use-cases; store is a state container + small pure actions.
- Avoid putting server state fetching logic directly in the store unless the project standard says so.

## When to use Zustand
- Cross-component **client state**: filters, UI preferences, temporary draft data, wizard steps, selection, optimistic client cache.
- Shared derived state that’s awkward to lift.
- Not for: trivial local UI state (use `useState`), or canonical server cache (prefer a dedicated server-state lib if present).

## Store placement & naming
- One store per concern (often per module):
  - `src/modules/auth/auth.store.ts`
  - `src/modules/user-profile/userProfile.store.ts`
- Hook name: `use<Thing>Store` (Zustand hook), e.g. `useAuthStore`.
- Keep module boundaries: other modules should not “reach in” unless explicitly shared.

## Recommended store shape
- Keep state flat and serializable when possible.
- Actions are pure-ish and synchronous when possible; async orchestration belongs in hooks.

### Minimal template (typed, named export, arrow functions)
```ts
import { create } from "zustand";

export type AuthState = {
  accessToken: string | null;
  isAuthenticated: boolean;
  setAccessToken: (token: string | null) => void;
  reset: () => void;
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  accessToken: null,
  isAuthenticated: false,
  setAccessToken: (token) =>
    set({
      accessToken: token,
      isAuthenticated: Boolean(token),
    }),
  reset: () => set({ accessToken: null, isAuthenticated: false }),
}));
```

## Selectors & performance
- Always prefer **selectors** over reading the whole store.
- Select the minimal slice to avoid re-renders.

```ts
export const useAccessToken = () => useAuthStore((s) => s.accessToken);
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated);
```

- If selecting an object/tuple, ensure stable comparisons (use shallow compare if installed in the codebase).
- Avoid selectors that allocate new objects each render unless you have an equality function.

## Derived data
- Prefer derived data in:
  - selectors (cheap derived values), or
  - hooks (non-trivial derivations / domain rules)
- Avoid “computed state” stored redundantly unless it’s a perf necessity and maintained by a single action.

## Side effects & async flows (recommended)
- Async flows live in module hooks that call store actions.

```ts
export const useAuthActions = () => {
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const reset = useAuthStore((s) => s.reset);

  const login = async (credentials: unknown) => {
    // call auth.api.ts here, validate/parse, then setAccessToken(...)
  };

  const logout = async () => {
    reset();
  };

  return { login, logout };
};
```

## Persistence (only if needed)
- Prefer persisting only small, safe slices (never persist secrets unless explicitly required).
- If using Zustand middleware `persist`, ensure:
  - explicit whitelist/partialize
  - versioned migrations if shape changes

## What not to do
- Don’t create a “god store” for the whole app by default.
- Don’t export untyped stores or use `any`.
- Don’t read the entire store in a component (`useStore()` without selector).
- Don’t mix complex orchestration into store actions if a hook can own it.
