"use client"

import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

type InteriorButtonVariant = "primary" | "secondary" | "outline"
type InteriorButtonSize = "sm" | "md" | "lg"

interface InteriorButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: InteriorButtonVariant
  size?: InteriorButtonSize
}

export function InteriorButton({
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}: InteriorButtonProps) {
  const variantClasses: Record<InteriorButtonVariant, string> = {
    primary: "desktop-interior-button-primary",
    secondary: "desktop-interior-button-subtle",
    outline: "desktop-interior-button-ghost",
  }

  const sizeClasses: Record<InteriorButtonSize, string> = {
    sm: "h-7 px-2.5 text-xs font-medium",
    md: "h-8 px-3 text-xs font-medium",
    lg: "h-9 px-4 text-sm font-medium",
  }

  return (
    <button
      className={cn(
        "desktop-interior-button",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
