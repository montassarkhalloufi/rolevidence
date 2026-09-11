import type { ComponentProps } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "./utils.ts";

export function Alert({
  asChild = false,
  className,
  ...props
}: ComponentProps<"div"> & { asChild?: boolean }) {
  const Component = asChild ? Slot : "div";

  return (
    <Component
      role="alert"
      data-slot="alert"
      className={cn(
        "my-3 space-y-3 rounded-md border border-destructive bg-destructive-background p-4 text-sm leading-relaxed text-destructive",
        className,
      )}
      {...props}
    />
  );
}
