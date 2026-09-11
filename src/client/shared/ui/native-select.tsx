import type { ComponentProps } from "react";
import { cn } from "./utils.ts";
import { fieldStyles } from "./field.ts";

export function NativeSelect({
  className,
  ...props
}: ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(fieldStyles, "min-h-11", className)}
      {...props}
    />
  );
}
