"use client"

import Link from "next/link"
import Image from "next/image"

interface LogoProps {
  isScrolled?: boolean
  size?: "sm" | "md" | "lg"
  showText?: boolean
}

export function Logo({ isScrolled = true, size = "md", showText = false }: LogoProps) {
  const sizes = {
    sm: { img: "h-12 w-auto", text: "text-base" },
    md: { img: "h-[4.5rem] w-auto", text: "text-lg" },
    lg: { img: "h-24 w-auto", text: "text-2xl" },
  }

  // Use dark logo on cream background (scrolled), colored logo on transparent header (not scrolled)
  const logoSrc = isScrolled ? "/logo-dark.svg" : "/logo.png"

  return (
    <Link href="/" className="flex items-center gap-3 group">
      <div className="relative transition-transform duration-300 group-hover:scale-105">
        <Image
          src={logoSrc}
          alt="Segelschule Altwarp"
          width={200}
          height={200}
          className={`${sizes[size].img} object-contain`}
          priority
        />
      </div>

      {showText && (
        <div className="flex flex-col">
          <span
            className={`${sizes[size].text} font-semibold leading-tight ${
              isScrolled ? "text-primary" : "text-white"
            } transition-colors`}
          >
            Segelschule
          </span>
          <span
            className={`text-sm ${isScrolled ? "text-[#1E3926B3]" : "text-white/80"} transition-colors -mt-1`}
          >
            Altwarp
          </span>
        </div>
      )}
    </Link>
  )
}
