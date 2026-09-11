// Adapted from shadcn/ui (MIT); see THIRD_PARTY_NOTICES.md.
import type { ComponentProps } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "./utils.ts";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:transition-none aria-invalid:outline-destructive text-sm",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline:
          "border border-border bg-background text-primary hover:bg-accent",
        ghost: "bg-transparent text-primary hover:bg-accent",
        toggle:
          "rounded-none border-b-2 border-transparent bg-transparent text-muted-foreground hover:bg-accent aria-pressed:border-primary aria-pressed:bg-card aria-pressed:text-primary",
      },
      size: {
        default: "min-h-11 px-4 py-2",
        sm: "min-h-11 px-3 py-2",
        lg: "min-h-14 px-6 py-4",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  type = "button",
  ...props
}: ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      data-slot="button"
      {...(!asChild ? { type } : {})}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
