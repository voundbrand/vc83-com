"use client"

import { useState, type ImgHTMLAttributes, type HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

function Avatar({ className, children, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

function AvatarImage({
  className,
  src,
  alt,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const [hasError, setHasError] = useState(false)

  if (!src || hasError) return null

  return (
    <img
      src={src}
      alt={alt}
      className={cn("aspect-square h-full w-full object-cover", className)}
      onError={() => setHasError(true)}
      {...props}
    />
  )
}

function AvatarFallback({ className, children, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export { Avatar, AvatarImage, AvatarFallback }
