---
name: react19-typescript
description: Enforces React 19 + TypeScript conventions: functional components only, named exports, business logic extracted into custom hooks. Use when creating or editing React components, hooks, TSX, or frontend UI code.
disable-model-invocation: true
---

# React 19 + TypeScript (project conventions)

## Hard rules
- Use **functional components only** (no class components).
- Use **named exports only** for components/hooks/utils. No `export default`.
- Use **TypeScript** for React code (`.ts/.tsx`). Avoid `any`; prefer `unknown` + narrowing.
- Keep UI and behavior separate: **business logic goes into custom hooks** (`use*`), components focus on rendering and wiring.

## Foldering & naming
- **Components**: `PascalCase` files/components, colocate styling/assets with the component when reasonable.
- **Hooks**: `useSomething.ts` (or `.tsx` only if the hook returns JSX, which is rare).
- **Types**: prefer local types near usage; export types only when shared.

## Component authoring checklist
- Props are typed with an interface or type alias: `type Props = { ... }`
- Prefer `React.ReactNode` for children; prefer explicit unions for variants.
- Keep components small; if it has non-trivial state/side-effects/IO, extract into a hook.
- Avoid inline “smart” logic in JSX; precompute values above the return.

## Hooks: business logic extraction
When a component contains domain decisions (validation, orchestration, mapping DTO→view model, feature rules):
- Extract it into a hook: `use<DomainThing>()`
- Hook responsibilities:
  - state management + derived values
  - side effects / data fetching orchestration
  - submit / mutate functions
  - minimal UI knowledge (no DOM assumptions; return data + callbacks)
- Component responsibilities:
  - layout and composition
  - binding event handlers
  - rendering loading/empty/error states using hook outputs

## Named export patterns
Prefer this structure:
- `export const ComponentName = (props: Props) => { ... }`
- `export const useThing = (...) => { ... }`
- `export type ...` / `export interface ...` only if shared

## Minimal templates

### Component (named export, thin UI)
```tsx
type Props = {
  userId: string;
};

export const UserCard = (props: Props) => {
  const vm = useUserCard(props.userId);

  if (vm.isLoading) return <div>Loading…</div>;
  if (vm.error) return <div>Failed to load</div>;

  return (
    <section>
      <h2>{vm.userName}</h2>
      <button type="button" onClick={vm.onRefresh}>
        Refresh
      </button>
    </section>
  );
};
```

### Hook (business logic)
```ts
type UserCardVm = {
  isLoading: boolean;
  error: unknown;
  userName: string;
  onRefresh: () => void;
};

export const useUserCard = (userId: string): UserCardVm => {
  // Keep IO/state here; return a stable VM for the component.
  // (Implementation depends on the project’s data layer.)
  return {
    isLoading: false,
    error: null,
    userName: userId,
    onRefresh: () => {},
  };
};
```

## TypeScript guidelines
- Prefer `satisfies` for config objects when helpful.
- Narrow `unknown` errors before reading properties.
- Prefer exhaustive checks for discriminated unions.

## React 19 guidelines (high signal)
- Keep side effects inside hooks; avoid effect chains in components.
- Prefer controlled boundaries: pass callbacks down, keep state up, split complex state into dedicated hooks.

## What not to do
- Do not introduce `export default`.
- Do not mix fetching/mutations deeply inside presentational components.
- Do not add large refactors “because it’s cleaner” unless required for the task.
