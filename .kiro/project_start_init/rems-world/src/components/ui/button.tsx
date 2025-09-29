import type * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
type ButtonSize = "default" | "sm" | "lg" | "icon";

function variantClass(variant: ButtonVariant | undefined) {
  switch (variant) {
    case "destructive":
      return "bg-destructive text-white border-2 border-outset hover:bg-destructive/90 active:border-inset shadow-sm";
    case "outline":
      return "border-2 border-black bg-background hover:bg-accent hover:text-accent-foreground shadow-sm";
    case "secondary":
      return "bg-muted text-muted-foreground border-2 border-outset hover:bg-muted/80 active:border-inset shadow-sm";
    case "ghost":
      return "border-2 border-transparent hover:bg-accent hover:text-accent-foreground hover:border-black";
    case "link":
      return "text-primary underline-offset-4 hover:underline border-none";
    default:
      return "bg-secondary text-secondary-foreground border-2 border-outset hover:bg-muted active:border-inset shadow-sm";
  }
}

function sizeClass(size: ButtonSize | undefined) {
  switch (size) {
    case "sm":
      return "h-8 gap-1.5 px-3 has-[>svg]:px-2.5";
    case "lg":
      return "h-10 px-6 has-[>svg]:px-4";
    case "icon":
      return "size-9";
    default:
      return "h-9 px-4 py-2 has-[>svg]:px-3";
  }
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot : "button";

  const classes = cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive font-retro border-2 border-black",
    variantClass(variant),
    sizeClass(size),
    className,
  );

  return <Comp data-slot="button" className={classes} {...props} />;
}

export { Button };
