"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type InteriorButtonVariant = "neutral" | "primary" | "subtle" | "danger" | "ghost";
type InteriorButtonSize = "sm" | "md" | "lg";
type InteriorBadgeTone = "default" | "success" | "warn" | "error" | "info";
type InteriorModalSize = "sm" | "md" | "lg";

const INTERIOR_BUTTON_VARIANT_CLASS: Record<InteriorButtonVariant, string> = {
  neutral: "",
  primary: "desktop-interior-button-primary",
  subtle: "desktop-interior-button-subtle",
  danger: "desktop-interior-button-danger",
  ghost: "desktop-interior-button-ghost",
};

const INTERIOR_BUTTON_SIZE_CLASS: Record<InteriorButtonSize, string> = {
  sm: "h-7 px-2.5 text-xs font-medium",
  md: "h-8 px-3 text-xs font-medium",
  lg: "h-9 px-4 text-sm font-medium",
};

const INTERIOR_MODAL_SIZE_CLASS: Record<InteriorModalSize, string> = {
  sm: "desktop-interior-modal-size-sm",
  md: "desktop-interior-modal-size-md",
  lg: "desktop-interior-modal-size-lg",
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

export function InteriorCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("desktop-interior-card", className)} {...props} />;
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

export const InteriorCheckbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "checkbox", ...props }, ref) => {
    return <input ref={ref} type={type} className={cn("desktop-interior-checkbox", className)} {...props} />;
  },
);
InteriorCheckbox.displayName = "InteriorCheckbox";

interface InteriorBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: InteriorBadgeTone;
}

export const InteriorBadge = React.forwardRef<HTMLSpanElement, InteriorBadgeProps>(
  ({ className, tone = "default", ...props }, ref) => {
    return <span ref={ref} data-tone={tone} className={cn("desktop-interior-badge", className)} {...props} />;
  },
);
InteriorBadge.displayName = "InteriorBadge";

export const InteriorTable = React.forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => {
    return <table ref={ref} className={cn("desktop-interior-table", className)} {...props} />;
  },
);
InteriorTable.displayName = "InteriorTable";

export const InteriorModalOverlay = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn("desktop-interior-modal-overlay", className)} {...props} />;
  },
);
InteriorModalOverlay.displayName = "InteriorModalOverlay";

interface InteriorModalProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: InteriorModalSize;
}

export const InteriorModal = React.forwardRef<HTMLDivElement, InteriorModalProps>(
  ({ className, size = "md", ...props }, ref) => {
    return <div ref={ref} className={cn("desktop-interior-modal", INTERIOR_MODAL_SIZE_CLASS[size], className)} {...props} />;
  },
);
InteriorModal.displayName = "InteriorModal";

export const InteriorModalHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn("desktop-interior-modal-header", className)} {...props} />;
  },
);
InteriorModalHeader.displayName = "InteriorModalHeader";

export const InteriorModalBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn("desktop-interior-modal-body", className)} {...props} />;
  },
);
InteriorModalBody.displayName = "InteriorModalBody";

export const InteriorModalActions = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn("desktop-interior-modal-actions", className)} {...props} />;
  },
);
InteriorModalActions.displayName = "InteriorModalActions";

export const InteriorModalClose = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, type = "button", ...props }, ref) => {
    return <button ref={ref} type={type} className={cn("desktop-interior-modal-close", className)} {...props} />;
  },
);
InteriorModalClose.displayName = "InteriorModalClose";

export const InteriorTileButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, type = "button", ...props }, ref) => {
    return <button ref={ref} type={type} className={cn("desktop-interior-tile", className)} {...props} />;
  },
);
InteriorTileButton.displayName = "InteriorTileButton";
