"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface RetroButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: "primary" | "secondary" | "outline"
  size?: "sm" | "md" | "lg"
  className?: string
}

export function RetroButton({ children, onClick, variant = "primary", size = "md", className }: RetroButtonProps) {
  const baseClasses = "retro-button font-pixel text-xs"

  const variantClasses = {
    primary: "bg-purple-600 text-gray-800 border-purple-700",
    secondary: "bg-gray-300 text-black border-gray-400",
    outline: "bg-transparent text-purple-600 border-purple-600",
  }

  const sizeClasses = {
    sm: "px-2 py-1",
    md: "px-4 py-2",
    lg: "px-6 py-3",
  }

  return (
    <button onClick={onClick} className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}>
      {children}
    </button>
  )
}