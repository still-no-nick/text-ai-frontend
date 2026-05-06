---
name: tailwind-conventions
description: Tailwind CSS conventions for React 19 + TypeScript: class composition, responsive/variants, reusable components, cn() usage, and maintainable styling patterns. Use when writing or refactoring Tailwind classes in TSX, building UI components, or adjusting design tokens.
disable-model-invocation: true
---

# Tailwind conventions (React 19 + TS)

## Hard rules
- Use **Tailwind utility classes** as the default styling approach.
- Keep components **small and reusable**; extract repeated class sets into components/variants.
- Use **named exports only** (no `export default`).
- Avoid “magic” inline styles; use Tailwind tokens unless there’s a real limitation.

## Class composition
- Prefer a `cn()` helper for conditional classes.
- Do not build long string concatenations manually.

Recommended helper (if the project already has one, reuse it):
```ts
export const cn = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");
```

Usage:
```tsx
export const Button = ({
  variant = "primary",
  className,
  ...props
}: {
  variant?: "primary" | "secondary";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium",
        variant === "primary" && "bg-black text-white hover:bg-black/90",
        variant === "secondary" && "bg-white text-black ring-1 ring-black/10 hover:bg-black/5",
        className
      )}
    />
  );
};
```

## Responsive & state variants
- Mobile-first: base styles + `sm:`, `md:`, `lg:`, `xl:`.
- Prefer explicit states: `hover:`, `focus-visible:`, `disabled:`.
- Accessibility:
  - Use `focus-visible:ring-*` for keyboard focus.
  - Ensure disabled styles include `disabled:opacity-*` and `disabled:pointer-events-none` when appropriate.

## When to extract
Extract to a component (or variant map) when:
- the same class set repeats 2+ times, or
- the class list becomes hard to scan, or
- you need variants (`size`, `intent`, `tone`).

Prefer “variant map” approach:
```ts
const buttonVariants = {
  primary: "bg-black text-white hover:bg-black/90",
  secondary: "bg-white text-black ring-1 ring-black/10 hover:bg-black/5",
} as const;
```

## Avoid these anti-patterns
- Duplicating long class strings across modules.
- Using `!important` (`!` prefix) as a default tool.
- Overusing arbitrary values (`[12px]`) instead of design tokens.
- Storing server data in class names (e.g., `className={\`text-\${status}\`}`) unless strictly constrained and safe.

## Quick checklist
- Classes are readable and consistently ordered.
- Conditional styles use `cn()` (or existing project helper).
- Repetition extracted into a component/variant map.
- `focus-visible` and `disabled` states handled where relevant.
