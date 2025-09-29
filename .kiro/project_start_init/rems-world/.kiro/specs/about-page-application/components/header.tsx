"use client";

import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLanguage } from "@/contexts/language-context";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useLanguage();
  const pathname = usePathname();

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">🍕</span>
            </div>
            <span className="font-bold text-xl text-foreground">PizzaHog</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {pathname === "/" ? (
              <button
                onClick={() => scrollToSection("bio")}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                {t("header.about")}
              </button>
            ) : (
              <Link
                href="/#bio"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                {t("header.about")}
              </Link>
            )}
            <Link
              href="/pizza-tracker"
              className={`transition-colors ${pathname === "/pizza-tracker" ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
            >
              {t("header.pizzaTracker") || "Pizza Tracker"}
            </Link>
            {pathname === "/" ? (
              <button
                onClick={() => scrollToSection("resume")}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                {t("header.resume")}
              </button>
            ) : (
              <Link
                href="/#resume"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                {t("header.resume")}
              </Link>
            )}
            {pathname === "/" ? (
              <button
                onClick={() => scrollToSection("contact")}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                {t("header.contact")}
              </button>
            ) : (
              <Link
                href="/#contact"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                {t("header.contact")}
              </Link>
            )}
            <LanguageSwitcher />
            {pathname === "/" ? (
              <Button
                onClick={() => scrollToSection("contact")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {t("hero.cta.contact")}
              </Button>
            ) : (
              <Link href="/#contact">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {t("hero.cta.contact")}
                </Button>
              </Link>
            )}
          </nav>

          {/* Mobile menu button */}
          <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col space-y-4">
              {pathname === "/" ? (
                <button
                  onClick={() => scrollToSection("bio")}
                  className="text-left text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("header.about")}
                </button>
              ) : (
                <Link
                  href="/#bio"
                  className="block text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t("header.about")}
                </Link>
              )}
              <Link
                href="/pizza-tracker"
                className={`block transition-colors ${pathname === "/pizza-tracker" ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                onClick={() => setIsMenuOpen(false)}
              >
                {t("header.pizzaTracker") || "Pizza Tracker"}
              </Link>
              {pathname === "/" ? (
                <button
                  onClick={() => scrollToSection("resume")}
                  className="text-left text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("header.resume")}
                </button>
              ) : (
                <Link
                  href="/#resume"
                  className="block text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t("header.resume")}
                </Link>
              )}
              {pathname === "/" ? (
                <button
                  onClick={() => scrollToSection("contact")}
                  className="text-left text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("header.contact")}
                </button>
              ) : (
                <Link
                  href="/#contact"
                  className="block text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t("header.contact")}
                </Link>
              )}
              <div className="pt-2">
                <LanguageSwitcher />
              </div>
              {pathname === "/" ? (
                <Button
                  onClick={() => scrollToSection("contact")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground w-fit"
                >
                  {t("hero.cta.contact")}
                </Button>
              ) : (
                <Link href="/#contact">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground w-fit">
                    {t("hero.cta.contact")}
                  </Button>
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
