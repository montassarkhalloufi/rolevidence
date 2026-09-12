import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils.ts";

const iconVariants = cva(
  "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-lg font-semibold",
  {
    variants: {
      tone: {
        neutral: "bg-neutral-background text-neutral",
        success: "bg-success-background text-success",
        warning: "bg-warning-background text-warning",
        destructive: "bg-destructive-background text-destructive",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function StatusIcon({
  className,
  tone,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof iconVariants>) {
  return (
    <span
      aria-hidden="true"
      className={cn(iconVariants({ tone }), className)}
      {...props}
    />
  );
}
