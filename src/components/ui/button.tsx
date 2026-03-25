import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_12px_24px_rgba(11,61,145,0.14)] hover:bg-[#0a347b]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-[#dfeaf9]",
        outline: "border bg-white/90 text-foreground hover:bg-white",
        accent:
          "bg-accent text-accent-foreground shadow-[0_12px_24px_rgba(196,36,48,0.14)] hover:bg-[#ab1f2a]",
      },
      size: {
        default: "h-9 px-4 text-sm",
        sm: "h-9 px-4 text-sm",
        lg: "h-10 px-5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
