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
  const baseClasses = "desktop-shell-button font-pixel"

  const variantClasses = {
    primary: "desktop-shell-button-primary",
    secondary: "",
    outline: "bg-transparent border-2",
  }

  const sizeClasses = {
    sm: "px-2 py-1",
    md: "px-4 py-2",
    lg: "px-6 py-3",
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
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  )
}
