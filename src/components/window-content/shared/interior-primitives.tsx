"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type InteriorButtonVariant = "neutral" | "primary" | "subtle" | "danger" | "ghost";
type InteriorButtonSize = "sm" | "md" | "lg";

const INTERIOR_BUTTON_VARIANT_CLASS: Record<InteriorButtonVariant, string> = {
  neutral: "",
  primary: "desktop-interior-button-primary",
  subtle: "desktop-interior-button-subtle",
  danger: "desktop-interior-button-danger",
  ghost: "desktop-interior-button-ghost",
};

const INTERIOR_BUTTON_SIZE_CLASS: Record<InteriorButtonSize, string> = {
  sm: "h-8 px-2.5 text-[11px]",
  md: "h-9 px-3 text-xs",
  lg: "h-10 px-4 text-sm",
};

export function InteriorRoot({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("desktop-interior-root", className)} {...props} />;
}

export function InteriorHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("desktop-interior-header", className)} {...props} />;
}

export function InteriorTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("desktop-interior-title", className)} {...props} />;
}

export function InteriorSubtitle({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("desktop-interior-subtitle", className)} {...props} />;
}

export function InteriorPanel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("desktop-interior-panel", className)} {...props} />;
}

export function InteriorSectionHeader({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("desktop-interior-section-title", className)} {...props} />;
}

export function InteriorHelperText({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("desktop-interior-helper-text", className)} {...props} />;
}

export function InteriorTabRow({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("desktop-interior-tab-row", className)} {...props} />;
}

interface InteriorTabButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export const InteriorTabButton = React.forwardRef<HTMLButtonElement, InteriorTabButtonProps>(
  ({ className, active = false, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn("desktop-interior-tab", active && "desktop-interior-tab-active", className)}
        {...props}
      />
    );
  },
);
InteriorTabButton.displayName = "InteriorTabButton";

interface InteriorButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: InteriorButtonVariant;
  size?: InteriorButtonSize;
}

export const InteriorButton = React.forwardRef<HTMLButtonElement, InteriorButtonProps>(
  ({ className, variant = "neutral", size = "md", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "desktop-interior-button",
          INTERIOR_BUTTON_SIZE_CLASS[size],
          INTERIOR_BUTTON_VARIANT_CLASS[variant],
          className,
        )}
        {...props}
      />
    );
  },
);
InteriorButton.displayName = "InteriorButton";

export const InteriorInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return <input ref={ref} className={cn("desktop-interior-input", className)} {...props} />;
  },
);
InteriorInput.displayName = "InteriorInput";

export const InteriorTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return <textarea ref={ref} className={cn("desktop-interior-textarea", className)} {...props} />;
});
InteriorTextarea.displayName = "InteriorTextarea";

export const InteriorSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => {
    return <select ref={ref} className={cn("desktop-interior-select", className)} {...props} />;
  },
);
InteriorSelect.displayName = "InteriorSelect";

export const InteriorTileButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, type = "button", ...props }, ref) => {
    return <button ref={ref} type={type} className={cn("desktop-interior-tile", className)} {...props} />;
  },
);
InteriorTileButton.displayName = "InteriorTileButton";

