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
    sm: "px-2 py-1",
    md: "px-4 py-2",
    lg: "px-6 py-3",
  }

  return (
    <button
      className={cn(
        "desktop-interior-button font-pixel",
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
