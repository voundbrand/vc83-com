"use client"

import { useState } from "react"
import { ContentPageLayout } from "@/components/content-page-layout"
import { pagesTranslations } from "@/content/pages-content"
import type { Language } from "@/components/language-switcher"
import Link from "next/link"
import { Zap, HelpCircle, BookOpen, Shield } from "lucide-react"

export default function DocsPage() {
  const [language, setLanguage] = useState<Language>("en")
  const t = pagesTranslations[language].docs

  const quickLinks = [
    {
      href: "#about",
      icon: BookOpen,
      title: t.qlAboutTitle,
      description: t.qlAboutDesc,
    },
    {
      href: "#features",
      icon: Zap,
      title: t.qlFeaturesTitle,
      description: t.qlFeaturesDesc,
    },
    {
      href: "/privacy",
      icon: Shield,
      title: t.qlPrivacyTitle,
      description: t.qlPrivacyDesc,
    },
    {
      href: "/support",
      icon: HelpCircle,
      title: t.qlSupportTitle,
      description: t.qlSupportDesc,
    },
  ]

  return (
    <ContentPageLayout language={language} onLanguageChange={setLanguage}>
      <article>
        {/* Title */}
        <div className="mb-12">
          <h1
            className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
            style={{ color: "var(--color-text)" }}
          >
            {t.title}
          </h1>
          <p
            className="text-base md:text-lg leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {t.subtitle}
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid gap-4 sm:grid-cols-2 mb-12">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group p-5 rounded-lg border transition-colors"
              style={{
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-border)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border-hover)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border)"
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: "var(--color-accent-subtle)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <link.icon
                    className="w-4 h-4"
                    style={{ color: "var(--color-accent)" }}
                  />
                </div>
                <div>
                  <h3
                    className="text-sm font-semibold mb-1 group-hover:underline"
                    style={{ color: "var(--color-text)" }}
                  >
                    {link.title}
                  </h3>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {link.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* About Section */}
        <section id="about" className="mb-12 scroll-mt-20">
          <h2
            className="text-xl md:text-2xl font-semibold mb-4"
            style={{ color: "var(--color-text)" }}
          >
            {t.aboutTitle}
          </h2>
          <p
            className="text-base leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {t.aboutText}
          </p>
        </section>

        {/* Features */}
        <section id="features" className="mb-12 scroll-mt-20">
          <h2
            className="text-xl md:text-2xl font-semibold mb-6"
            style={{ color: "var(--color-text)" }}
          >
            {t.featuresTitle}
          </h2>
          <div className="space-y-4">
            {t.features.map((feature) => (
              <div
                key={feature.title}
                className="p-4 rounded-lg"
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <h3
                  className="text-sm font-semibold mb-2"
                  style={{ color: "var(--color-text)" }}
                >
                  {feature.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Next Steps */}
        <section>
          <h2
            className="text-xl md:text-2xl font-semibold mb-4"
            style={{ color: "var(--color-text)" }}
          >
            {t.nextStepsTitle}
          </h2>
          <div
            className="p-6 rounded-xl"
            style={{
              backgroundColor: "var(--color-accent-subtle)",
              border: "1px solid var(--color-border)",
            }}
          >
            <p
              className="text-sm mb-4"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t.nextStepsText}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/#diagnostic" className="btn-accent text-xs h-9 px-4 rounded-md inline-flex items-center">
                {t.runDiagnostic}
              </Link>
              <Link href="/support" className="btn-secondary text-xs h-9 px-4 rounded-md inline-flex items-center">
                {t.getSupport}
              </Link>
            </div>
          </div>
        </section>
      </article>
    </ContentPageLayout>
  )
}
