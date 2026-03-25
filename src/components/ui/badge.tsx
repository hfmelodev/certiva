import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";
import type * as React from "react";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
  {
    variants: {
      variant: {
        default: "border-primary/10 bg-primary/8 text-primary",
        secondary: "border-accent/10 bg-accent/8 text-accent",
        neutral: "border-border bg-white/80 text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
