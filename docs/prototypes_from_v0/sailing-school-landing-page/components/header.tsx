"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { LanguageSwitcher } from "./language-switcher"
import { Logo } from "./logo"
import type { Language } from "@/lib/translations"
import Link from "next/link"

interface HeaderProps {
  currentLanguage: Language
  onLanguageChange: (lang: Language) => void
  navLinks: {
    about: string
    courses: string
    team: string
    gallery: string
    contact: string
    booking: string
    pricing: string
  }
  forceScrolledStyle?: boolean
}

export function Header({ currentLanguage, onLanguageChange, navLinks, forceScrolledStyle = false }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const useScrolledStyle = forceScrolledStyle || isScrolled

  const navigation = [
    { name: navLinks.about, href: "/#about" },
    { name: navLinks.courses, href: "/#courses" },
    { name: navLinks.pricing, href: "/pricing" },
    { name: navLinks.team, href: "/#team" },
    { name: navLinks.gallery, href: "/#gallery" },
    { name: navLinks.contact, href: "/contact" },
    { name: navLinks.booking, href: "/booking" },
  ]

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        useScrolledStyle ? "bg-background/95 backdrop-blur-sm shadow-md" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <Logo isScrolled={useScrolledStyle} size="md" />

          <nav className="hidden md:flex items-center gap-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`font-sans font-medium transition-colors hover:text-primary ${
                  useScrolledStyle ? "text-foreground" : "text-white"
                }`}
              >
                {item.name}
              </Link>
            ))}
            <LanguageSwitcher
              currentLanguage={currentLanguage}
              onLanguageChange={onLanguageChange}
              isScrolled={useScrolledStyle}
            />
          </nav>

          <div className="md:hidden flex items-center gap-2">
            <LanguageSwitcher
              currentLanguage={currentLanguage}
              onLanguageChange={onLanguageChange}
              isScrolled={useScrolledStyle}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={useScrolledStyle ? "text-foreground" : "text-white"}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-border">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block py-3 font-sans font-medium text-foreground hover:text-primary transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  )
}
