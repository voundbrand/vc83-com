"use client"

import Link from "next/link"

interface LogoProps {
  isScrolled?: boolean
  size?: "sm" | "md" | "lg"
}

export function Logo({ isScrolled = true, size = "md" }: LogoProps) {
  const sizes = {
    sm: { svg: "h-8 w-8", text: "text-base" },
    md: { svg: "h-10 w-10", text: "text-lg" },
    lg: { svg: "h-16 w-16", text: "text-2xl" },
  }

  const color = isScrolled ? "#1e3a5f" : "#ffffff"

  return (
    <Link href="/" className="flex items-center gap-3 group">
      <div className="relative transition-transform duration-300 compass-spin-on-hover group-hover:animate-compass-spin">
        <svg viewBox="0 0 100 100" className={`${sizes[size].svg}`} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Outer compass circle */}
          <circle cx="50" cy="50" r="46" stroke={color} strokeWidth="1.5" opacity="0.2" />

          {/* Cardinal direction markers (N, E, S, W) */}
          <circle cx="50" cy="8" r="2.5" fill={color} opacity="0.6" />
          <circle cx="92" cy="50" r="2.5" fill={color} opacity="0.6" />
          <circle cx="50" cy="92" r="2.5" fill={color} opacity="0.6" />
          <circle cx="8" cy="50" r="2.5" fill={color} opacity="0.6" />

          {/* Nautical Star - 8 pointed star */}
          <g transform="translate(50, 50)">
            {/* Main 4 points (N, E, S, W) - longer */}
            <path d="M 0,-35 L -4,-12 L 0,-15 L 4,-12 Z" fill={color} opacity="0.9" />
            <path d="M 35,0 L 12,4 L 15,0 L 12,-4 Z" fill={color} opacity="0.9" />
            <path d="M 0,35 L 4,12 L 0,15 L -4,12 Z" fill={color} opacity="0.9" />
            <path d="M -35,0 L -12,-4 L -15,0 L -12,4 Z" fill={color} opacity="0.9" />

            {/* Diagonal 4 points (NE, SE, SW, NW) - shorter */}
            <path d="M 25,-25 L 8,-15 L 12,-12 L 15,-8 Z" fill={color} opacity="0.7" />
            <path d="M 25,25 L 15,8 L 12,12 L 8,15 Z" fill={color} opacity="0.7" />
            <path d="M -25,25 L -8,15 L -12,12 L -15,8 Z" fill={color} opacity="0.7" />
            <path d="M -25,-25 L -15,-8 L -12,-12 L -8,-15 Z" fill={color} opacity="0.7" />

            {/* Center circle */}
            <circle cx="0" cy="0" r="8" fill={color} opacity="0.9" />
            <circle cx="0" cy="0" r="5" fill={isScrolled ? "#ffffff" : "#1e3a5f"} />

            {/* Center dot */}
            <circle cx="0" cy="0" r="2" fill={color} />
          </g>
        </svg>
      </div>

      <div className="flex flex-col">
        <span
          className={`${sizes[size].text} font-serif font-bold leading-tight ${
            isScrolled ? "text-primary" : "text-white"
          } transition-colors`}
        >
          Segelschule
        </span>
        <span
          className={`text-sm font-serif ${isScrolled ? "text-primary/70" : "text-white/80"} transition-colors -mt-1`}
        >
          Altwarp
        </span>
      </div>
    </Link>
  )
}
