import type { ComponentProps } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "./utils.ts";

export function Card({
  asChild = false,
  className,
  ...props
}: ComponentProps<"div"> & { asChild?: boolean }) {
  const Component = asChild ? Slot : "div";

  return (
    <Component
      data-slot="card"
      className={cn(
        "min-w-0 rounded-lg border border-border bg-card p-5 sm:p-6",
        className,
      )}
      {...props}
    />
  );
}
