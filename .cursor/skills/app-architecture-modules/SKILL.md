- Use named exports; prefer arrow functions for exported hooks: `export const useX = (...) => ...`

### API (`*.api.ts`)
- Contains module-scoped API calls only (no UI)
- Prefer typed request/response shapes; parse/validate responses if schemas exist
- Do not leak low-level transport details into components; components call hooks, hooks call API

### Types (`*.types.ts`)
- Stable TypeScript contracts for the module (DTOs, VMs, props types when shared)
- Prefer local types inline unless reused across multiple files

### Schemas (`*.schema.ts`)
- Runtime validation/parsing for external inputs (API responses, forms if needed)
- Export schema + inferred types when helpful (e.g., `type User = z.infer<typeof UserSchema>`)

### Utils (`*.utils.ts`)
- Pure helpers only (no React hooks, no IO)
- Keep functions small; if a helper becomes module-wide “policy”, consider moving to a hook or schema

## Dependency rules (strict)
- Prefer importing **within the same module**.
- Cross-module imports are allowed only for:
  - **types** (if truly shared) or
  - **generic shared utilities** (should live outside modules if you introduce them later).
- Do not import **UI components** across modules (compose at page/route level instead).
- Avoid circular dependencies; if it appears, extract shared contracts to `*.types.ts` or a dedicated shared layer.

## Naming conventions
- Modules: `kebab-case` folders (e.g., `user-profile`)
- Components: `PascalCase.tsx` (e.g., `ProfileCard.tsx`)
- Hooks: `usePascalCase.ts` (e.g., `useAuth.ts`)
- API: `<module>.api.ts` or `<action>.api.ts` (e.g., `auth.api.ts`, `update-user.api.ts`)
- Types: `<module>.types.ts` (e.g., `auth.types.ts`)
- Schemas: `<entity>.schema.ts` (e.g., `user.schema.ts`)
- Utils: `<module>.utils.ts` (e.g., `auth.utils.ts`)

## Default export policy
- No `export default` anywhere in modules.
- Prefer `export const X = ...` for components/hooks and `export type` for types.

## When adding a new feature
1. Decide the owning module (`src/modules/<domain>/`).
2. Add/extend UI component(s) in `*.tsx`.
3. Put behavior into `use*.ts` (hook returns VM).
4. Add API calls in `*.api.ts` and types/schemas as needed.