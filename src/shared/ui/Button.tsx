import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";

type Props = {
  variant?: "primary" | "ghost" | "outline";
  size?: "sm" | "md";
} & ButtonHTMLAttributes<HTMLButtonElement>;

const variantClasses = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  outline: "border border-border bg-background hover:bg-accent hover:text-accent-foreground",
};

const sizeClasses = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-base",
};

export const Button = ({ variant = "primary", size = "md", className, ...props }: Props) => {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    />
  );
};
