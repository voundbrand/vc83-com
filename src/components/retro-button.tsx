"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface RetroButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: "primary" | "secondary" | "outline"
  size?: "sm" | "md" | "lg"
  className?: string
  disabled?: boolean
  title?: string
}

export function RetroButton({ children, onClick, variant = "primary", size = "md", className, disabled = false, title }: RetroButtonProps) {
  const baseClasses = "desktop-shell-button"

  const variantClasses = {
    primary: "desktop-shell-button-primary",
    secondary: "",
    outline: "bg-transparent",
  }

  const sizeClasses = {
    sm: "h-7 px-2.5 text-xs font-medium",
    md: "h-8 px-3 text-xs font-medium",
    lg: "h-9 px-4 text-sm font-medium",
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        disabled && "opacity-45 cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  )
}
