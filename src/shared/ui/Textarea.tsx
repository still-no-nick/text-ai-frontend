import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";
import { cn } from "../lib/cn";

type Props = {
  autoGrow?: boolean;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = ({ autoGrow = false, className, ...props }: Props) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (!autoGrow || !ref.current) return;

    const el = ref.current;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [autoGrow, props.value]);

  return (
    <textarea
      ref={ref}
      {...props}
      className={cn(
        "w-full rounded-lg border border-input bg-background px-3 py-2",
        "text-foreground placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "resize-none",
        className
      )}
    />
  );
};
