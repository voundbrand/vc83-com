"use client"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Globe } from "lucide-react"
import type { Language } from "@/lib/translations"
import { languageNames } from "@/lib/translations"

interface LanguageSwitcherProps {
  currentLanguage: Language
  onLanguageChange: (lang: Language) => void
  isScrolled?: boolean
}

export function LanguageSwitcher({ currentLanguage, onLanguageChange, isScrolled = true }: LanguageSwitcherProps) {
  const currentLanguageNames = languageNames[currentLanguage]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`gap-2 font-sans ${!isScrolled ? "text-white hover:text-white hover:bg-white/20" : ""}`}
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLanguageNames[currentLanguage]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.keys(languageNames[currentLanguage]) as Language[]).map((code) => (
          <DropdownMenuItem
            key={code}
            onClick={() => onLanguageChange(code)}
            className={`font-sans ${currentLanguage === code ? "bg-accent" : ""}`}
          >
            {currentLanguageNames[code]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
