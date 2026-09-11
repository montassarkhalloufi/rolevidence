import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils.ts";

const badgeVariants = cva(
  "inline-flex items-center gap-2 rounded-sm px-2 py-1 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-neutral-background text-neutral",
        success: "bg-success-background text-success",
        warning: "bg-warning-background text-warning",
        outline: "border border-border bg-card text-muted-foreground",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export function Badge({
  className,
  tone,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ tone }), className)}
      {...props}
    />
  );
}
