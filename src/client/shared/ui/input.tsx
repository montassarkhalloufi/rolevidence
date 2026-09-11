import type { ComponentProps } from "react";
import { cn } from "./utils.ts";
import { fieldStyles } from "./field.ts";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(fieldStyles, "min-h-11", className)}
      {...props}
    />
  );
}
