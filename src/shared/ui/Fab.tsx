import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export const Fab = ({ className, ...props }: Props) => {
  return (
    <button
      {...props}
      className={cn(
        "fixed bottom-6 right-6 size-14 rounded-full shadow-lg",
        "inline-flex items-center justify-center",
        "bg-primary text-primary-foreground",
        "hover:bg-primary/90 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
    />
  );
};
