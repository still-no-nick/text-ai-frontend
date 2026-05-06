import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";

type Props = {
  size?: "sm" | "md";
} & ButtonHTMLAttributes<HTMLButtonElement>;

const sizeClasses = {
  sm: "size-8",
  md: "size-10",
};

export const IconButton = ({ size = "md", className, ...props }: Props) => {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center rounded-lg transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        sizeClasses[size],
        className
      )}
    />
  );
};
