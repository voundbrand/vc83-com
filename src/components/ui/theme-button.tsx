"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ThemeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "small";
  children: React.ReactNode;
}

/**
 * Theme-aware button component that respects all theme modes:
 * - Windows 95 style
 * - Mac style
 * - Shadcn modern style
 * - Glass theme
 * - Dark mode
 *
 * Replaces inline styles with proper CSS variable usage.
 */
export const ThemeButton = forwardRef<HTMLButtonElement, ThemeButtonProps>(
  ({ variant = "default", className, children, ...props }, ref) => {
    const baseClasses = "font-pixel transition-all";

    const variantClasses = {
      default: "retro-button",
      primary: "retro-button-primary",
      small: "retro-button-small",
    };

    return (
      <button
        ref={ref}
        className={cn(baseClasses, variantClasses[variant], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

ThemeButton.displayName = "ThemeButton";
