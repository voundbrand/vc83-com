"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { useState, useCallback, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSwitcher, type Language } from "@/components/language-switcher"
import { Footer } from "@/components/footer"
import {
  caseStudyTranslations,
  CASE_STUDY_SLUGS,
  type CaseStudySlug,
} from "@/content/case-studies"
import { landingTranslations } from "@/content/landing-content"
import {
  ArrowLeft,
  Star,
  CalendarDays,
  Phone,
  Shield,
  CalendarDays as CalendarIcon,
  TrendingUp,
  User,
} from "lucide-react"
import { trackLandingEvent } from "@/lib/analytics"

const FOUNDER_DEMO_URLS: Record<Language, string> = {
  en: "https://cal.com/voundbrand/sevenlayers-demo-en",
  de: "https://cal.com/voundbrand/sevenlayers-demo-de",
}

const CASE_STUDY_ICONS: Record<CaseStudySlug, typeof Phone> = {
  "marcus-engel": Phone,
  "lutz-splettstosser": Shield,
  "franziska-splettstosser": CalendarIcon,
  "dirk-linke": TrendingUp,
}


export default function CaseStudyPage() {
  const params = useParams()
  const slug = params?.slug as string
  const [language, setLanguage] = useState<Language>("en")
  const t = caseStudyTranslations[language]
  const lt = landingTranslations[language]
  const caseStudy = t.caseStudies[slug]
  const founderDemoUrl = FOUNDER_DEMO_URLS[language]
  const avatarStorageId = process.env.NEXT_PUBLIC_REM_AVATAR_STORAGE_ID
  const [founderAvatarUrl, setFounderAvatarUrl] = useState<string | null>(null)

  const handleLanguageChange = useCallback((lang: Language) => {
    setLanguage(lang)
  }, [])

  useEffect(() => {
    let cancelled = false
    const resolveAvatar = async () => {
      if (!avatarStorageId) return
      try {
        const response = await fetch(
          `/api/files/url?storageId=${encodeURIComponent(avatarStorageId)}`
        )
        if (!response.ok) return
        const payload = (await response.json()) as { url?: string | null }
        if (!cancelled) setFounderAvatarUrl(payload.url || null)
      } catch {
        if (!cancelled) setFounderAvatarUrl(null)
      }
    }
    void resolveAvatar()
    return () => {
      cancelled = true
    }
  }, [avatarStorageId])

  if (!caseStudy || !CASE_STUDY_SLUGS.includes(slug as CaseStudySlug)) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        <div className="text-center">
          <p
            className="text-lg font-semibold"
            style={{ color: "var(--color-text)" }}
          >
            Case study not found.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-2 text-sm"
            style={{ color: "var(--color-accent)" }}
          >
            <ArrowLeft className="w-4 h-4" />
            {t.backToHome}
          </Link>
        </div>
      </div>
    )
  }

  const Icon = CASE_STUDY_ICONS[slug as CaseStudySlug] ?? Phone

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          backgroundColor: "var(--titlebar-bg)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
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
              <div className="text-[19px] tracking-[0.45em] logo-text-seven">
                SEVEN
              </div>
              <div className="text-[14px] tracking-[0.653em] logo-text-layers">
                LAYERS
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher onChange={handleLanguageChange} />
            <ThemeToggle />
            <Button asChild className="btn-primary text-xs h-8 px-4 hidden sm:inline-flex">
              <Link href="/#diagnostic">
                {lt.ctaButton}
              </Link>
            </Button>
            <Button asChild className="btn-accent text-xs h-8 w-8 sm:w-auto sm:px-3">
              <a
                href={founderDemoUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() =>
                  trackLandingEvent({
                    eventName: "onboarding.funnel.activation",
                    metadata: {
                      ctaId: "book_demo_case_study_header",
                      ctaGroup: "book_demo",
                      ctaPlacement: `case_study_${slug}_header`,
                      ctaIntent: "founder_demo",
                      destination: founderDemoUrl,
                    },
                  })
                }
                aria-label={lt.bookDemo}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{lt.bookDemoShort}</span>
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Back link */}
        <div className="max-w-3xl mx-auto px-4 md:px-8 pt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm transition-opacity hover:opacity-80"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <ArrowLeft className="w-4 h-4" />
            {t.backToHome}
          </Link>
        </div>

        {/* Hero */}
        <section className="py-12 md:py-16 px-4 md:px-8">
          <div className="max-w-3xl mx-auto text-center">
            {/* Avatar */}
            <div
              className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center text-xl font-bold"
              style={{
                backgroundColor: "var(--color-accent-subtle)",
                border: "2px solid var(--color-accent)",
                color: "var(--color-accent)",
              }}
            >
              {caseStudy.initials}
            </div>
            {/* Tagline badge */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <Icon
                className="w-4 h-4"
                style={{ color: "var(--color-accent)" }}
              />
              <span
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--color-accent)" }}
              >
                {caseStudy.tagline}
              </span>
            </div>
            <h1
              className="text-3xl md:text-4xl font-bold tracking-tight text-balance leading-tight"
              style={{ color: "var(--color-text)" }}
            >
              {caseStudy.headline}
            </h1>
            <p
              className="mt-4 text-base"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {caseStudy.name} &middot; {caseStudy.role} &middot;{" "}
              {caseStudy.location}
            </p>
          </div>
        </section>

        {/* The Problem */}
        <section
          className="py-12 md:py-16 px-4 md:px-8"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="max-w-3xl mx-auto">
            <h2
              className="text-xl md:text-2xl font-semibold mb-8"
              style={{ color: "var(--color-text)" }}
            >
              {t.theProblem}
            </h2>
            <div className="space-y-6">
              {caseStudy.problem.map((paragraph, i) => (
                <p
                  key={i}
                  className="text-base leading-relaxed"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </section>

        {/* The Solution */}
        <section className="py-12 md:py-16 px-4 md:px-8">
          <div className="max-w-3xl mx-auto">
            <h2
              className="text-xl md:text-2xl font-semibold mb-8"
              style={{ color: "var(--color-text)" }}
            >
              {t.theSolution}
            </h2>
            <div className="space-y-6">
              {caseStudy.solution.map((paragraph, i) => (
                <p
                  key={i}
                  className="text-base leading-relaxed"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Escalation Rules (Franziska) */}
            {caseStudy.escalationRules && (
              <div className="mt-10">
                <h3
                  className="text-lg font-semibold mb-4"
                  style={{ color: "var(--color-text)" }}
                >
                  {t.customEscalationRules}
                </h3>
                <div className="space-y-3">
                  {caseStudy.escalationRules.map((rule, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-lg text-sm"
                      style={{
                        backgroundColor: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold"
                        style={{
                          backgroundColor: "var(--color-accent-subtle)",
                          color: "var(--color-accent)",
                        }}
                      >
                        {i + 1}
                      </div>
                      <p style={{ color: "var(--color-text-secondary)" }}>
                        {rule}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Research Pipeline (Dirk) */}
            {caseStudy.researchLoop && (
              <div className="mt-10">
                <h3
                  className="text-lg font-semibold mb-4"
                  style={{ color: "var(--color-text)" }}
                >
                  {t.researchPipeline}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {caseStudy.researchLoop.map((step, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-lg"
                      style={{
                        backgroundColor: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{
                            backgroundColor: "var(--color-accent-subtle)",
                            color: "var(--color-accent)",
                          }}
                        >
                          {i + 1}
                        </div>
                        <h4
                          className="text-sm font-semibold"
                          style={{ color: "var(--color-text)" }}
                        >
                          {step.title}
                        </h4>
                      </div>
                      <p
                        className="text-sm"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {step.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Broader Appeal (Lutz) */}
            {caseStudy.broaderAppeal && (
              <div
                className="mt-10 p-6 rounded-lg"
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <p
                  className="text-sm leading-relaxed italic"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {caseStudy.broaderAppeal}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* The Results */}
        <section
          className="py-12 md:py-16 px-4 md:px-8"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="max-w-3xl mx-auto">
            <h2
              className="text-xl md:text-2xl font-semibold mb-8"
              style={{ color: "var(--color-text)" }}
            >
              {t.theResults}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {caseStudy.metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="p-4 rounded-lg text-center"
                  style={{
                    backgroundColor: "var(--color-bg)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <p
                    className="text-xs uppercase tracking-wide mb-2"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    {metric.label}
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    <span className="line-through">{metric.before}</span>
                  </p>
                  <p
                    className="text-lg font-bold"
                    style={{ color: "var(--color-accent)" }}
                  >
                    {metric.after}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quote + Review */}
        <section className="py-12 md:py-16 px-4 md:px-8">
          <div className="max-w-3xl mx-auto">
            {/* Avatar + 5-star review card */}
            <div
              className="path-card flex flex-col md:flex-row md:items-start gap-6"
            >
              {/* Left: Avatar */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold"
                  style={{
                    backgroundColor: "var(--color-accent-subtle)",
                    border: "2px solid var(--color-accent)",
                    color: "var(--color-accent)",
                  }}
                >
                  {caseStudy.initials}
                </div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-text)" }}
                >
                  {caseStudy.name}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  {t.verifiedClient}
                </p>
              </div>

              {/* Right: Stars + Quote */}
              <div className="flex-1">
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="w-5 h-5"
                      fill="var(--color-accent)"
                      style={{ color: "var(--color-accent)" }}
                    />
                  ))}
                </div>
                <blockquote
                  className="text-base md:text-lg leading-relaxed italic"
                  style={{ color: "var(--color-text)" }}
                >
                  &ldquo;{caseStudy.quote}&rdquo;
                </blockquote>
                <p
                  className="mt-3 text-sm"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  &mdash; {caseStudy.name}, {caseStudy.role}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA: Book demo / Ready to build yours */}
        <section
          className="py-12 md:py-16 px-4 md:px-8"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="max-w-2xl mx-auto">
            <div className="path-card flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              {/* Left: Avatar + CTA text */}
              <div className="flex items-start gap-4 flex-1">
                <div
                  className="w-[72px] h-[72px] rounded-full overflow-hidden border flex items-center justify-center shrink-0"
                  style={{
                    borderColor: "var(--color-border)",
                    backgroundColor: "var(--color-surface-hover)",
                  }}
                >
                  {founderAvatarUrl ? (
                    <Image
                      src={founderAvatarUrl}
                      alt="Remington S."
                      width={72}
                      height={72}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <User
                      className="w-8 h-8"
                      style={{ color: "var(--color-text-tertiary)" }}
                    />
                  )}
                </div>
                <div>
                  <h3
                    className="text-base md:text-lg font-semibold"
                    style={{ color: "var(--color-text)" }}
                  >
                    {t.reviewCta.headline}
                  </h3>
                  <p
                    className="mt-1 text-sm"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {t.reviewCta.text}
                  </p>
                </div>
              </div>

              {/* Right: 5-star + button */}
              <div className="flex flex-col items-center gap-3 shrink-0">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="w-4 h-4"
                      fill="var(--color-accent)"
                      style={{ color: "var(--color-accent)" }}
                    />
                  ))}
                </div>
                <Button asChild className="btn-accent text-sm h-9 px-4 gap-2">
                  <a
                    href={founderDemoUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() =>
                      trackLandingEvent({
                        eventName: "onboarding.funnel.activation",
                        metadata: {
                          ctaId: "book_demo_case_study",
                          ctaGroup: "book_demo",
                          ctaPlacement: `case_study_${slug}`,
                          ctaIntent: "founder_demo",
                          destination: founderDemoUrl,
                        },
                      })
                    }
                  >
                    <CalendarDays className="w-4 h-4" />
                    {language === "de" ? "Demo buchen" : "Book Demo"}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
