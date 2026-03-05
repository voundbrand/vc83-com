"use client"

import Image from "next/image"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSwitcher, type Language } from "@/components/language-switcher"
import { Footer } from "@/components/footer"
import { pagesTranslations } from "@/content/pages-content"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ContentPageLayoutProps {
  children: React.ReactNode
  language: Language
  onLanguageChange: (lang: Language) => void
}

export function ContentPageLayout({ children, language, onLanguageChange }: ContentPageLayoutProps) {
  const t = pagesTranslations[language]

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--color-bg)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          backgroundColor: "var(--titlebar-bg)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/images/sevenlayers-logo.png"
                alt="sevenlayers"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <div
                className="logo-text leading-[1.1]"
                style={{ color: "var(--color-text)" }}
              >
                <div className="text-[19px] tracking-[0.45em] logo-text-seven">SEVEN</div>
                <div className="text-[14px] tracking-[0.653em] logo-text-layers">LAYERS</div>
              </div>
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher onChange={onLanguageChange} />
            <ThemeToggle />
            <Button asChild className="btn-secondary text-xs h-8 px-3 gap-1.5">
              <Link href="/">
                <ArrowLeft className="w-3.5 h-3.5" />
                {t.common.back}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 py-16 md:py-24 px-4 md:px-8">
        <div className="max-w-3xl mx-auto">
          {children}
        </div>
      </main>

      {/* Footer */}
      <Footer language={language} />
    </div>
  )
}
