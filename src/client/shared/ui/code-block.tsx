import type { ComponentProps } from "react";
import { cn } from "./utils.ts";

export function CodeBlock({ className, ...props }: ComponentProps<"pre">) {
  return (
    <pre
      className={cn(
        "mt-3 max-h-96 overflow-auto rounded-md bg-muted p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words text-foreground",
        className,
      )}
      {...props}
    />
  );
}
