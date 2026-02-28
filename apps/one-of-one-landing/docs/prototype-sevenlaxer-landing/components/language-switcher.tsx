"use client"

import { useEffect, useState } from "react"
import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type Language = "en" | "de"

interface LanguageSwitcherProps {
  onChange?: (lang: Language) => void
}

export function LanguageSwitcher({ onChange }: LanguageSwitcherProps) {
  const [language, setLanguage] = useState<Language>("en")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Detect browser language
    const browserLang = navigator.language.toLowerCase()
    const detectedLang: Language = browserLang.startsWith("de") ? "de" : "en"
    setLanguage(detectedLang)
    onChange?.(detectedLang)
  }, [onChange])

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang)
    onChange?.(lang)
  }

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="btn-ghost h-8 px-2 gap-1.5"
      >
        <Globe className="h-4 w-4" />
        <span className="text-xs font-medium uppercase">EN</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="btn-ghost h-8 px-2 gap-1.5"
        >
          <Globe className="h-4 w-4" />
          <span className="text-xs font-medium uppercase">{language}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[100px]"
        style={{
          backgroundColor: "var(--menu-bg)",
          borderColor: "var(--menu-border)",
        }}
      >
        <DropdownMenuItem
          onClick={() => handleLanguageChange("en")}
          className="cursor-pointer"
          style={{
            color: language === "en" ? "var(--color-accent)" : "var(--color-text)",
          }}
        >
          English
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleLanguageChange("de")}
          className="cursor-pointer"
          style={{
            color: language === "de" ? "var(--color-accent)" : "var(--color-text)",
          }}
        >
          Deutsch
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
