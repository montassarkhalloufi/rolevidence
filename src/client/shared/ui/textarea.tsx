import type { ComponentProps } from "react";
import { cn } from "./utils.ts";
import { fieldStyles } from "./field.ts";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(fieldStyles, "min-h-32 resize-y", className)}
      {...props}
    />
  );
}
