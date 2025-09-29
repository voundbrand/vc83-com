import type * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive font-retro border-2 border-black",
  {
    variants: {
      variant: {
        default:
          "bg-secondary text-secondary-foreground border-2 border-outset hover:bg-muted active:border-inset shadow-sm",
        destructive:
          "bg-destructive text-white border-2 border-outset hover:bg-destructive/90 active:border-inset shadow-sm",
        outline:
          "border-2 border-black bg-background hover:bg-accent hover:text-accent-foreground shadow-sm",
        secondary:
          "bg-muted text-muted-foreground border-2 border-outset hover:bg-muted/80 active:border-inset shadow-sm",
        ghost:
          "border-2 border-transparent hover:bg-accent hover:text-accent-foreground hover:border-black",
        link: "text-primary underline-offset-4 hover:underline border-none",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
