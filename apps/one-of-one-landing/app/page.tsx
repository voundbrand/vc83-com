"use client"

import { useState, useCallback, useEffect } from "react"
import Image from "next/image"
import { AuditChatSurface } from "@/components/audit-chat-surface"
import { HandoffCta, type HandoffTranslations } from "@/components/handoff-cta"
import { LandingAnalyticsEntrypoint } from "@/components/landing-analytics-entrypoint"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSwitcher, type Language } from "@/components/language-switcher"
import { Button } from "@/components/ui/button"
import { landingTranslations } from "@/content/landing-content"
import {
  landingPricingSheets,
  type LandingPricingCheckoutKey,
  type LandingPricingRow,
} from "@/content/pricing-sheet"
import { trackLandingEvent } from "@/lib/analytics"
import { resolveLegacyPublicCutoverMode } from "@/lib/commercial-cutover"
import { Footer } from "@/components/footer"
import {
  Apple,
  Monitor,
  Globe,
  Clock,
  TrendingUp,
  Target,
  Percent,
  MessageSquare,
  Mail,
  Zap,
  Sparkles,
  Shield,
  Cloud,
  Server,
  Cpu,
  Lock,
  CalendarDays,
  ArrowRight,
  CreditCard,
  User,
} from "lucide-react"

const FOUNDER_DEMO_URLS: Record<Language, string> = {
  en: "https://cal.com/voundbrand/sevenlayers-demo-en",
  de: "https://cal.com/voundbrand/sevenlayers-demo-de",
}
const DIAGNOSTIC_SECTION_ID = "diagnostic"
const REMINGTON_EMAIL = "remington@sevenlayers.io"

const PRICING_EMAIL_TEMPLATES: Record<Language, {
  subjectPrefix: string;
  greeting: string;
  intro: string;
  productLabel: string;
  setupLabel: string;
  recurringLabel: string;
  sourceLabel: string;
  timestampLabel: string;
  requestLabel: string;
  closeLine: string;
  signoff: string;
}> = {
  en: {
    subjectPrefix: "One-of-One Offer Request",
    greeting: "Hi Remington,",
    intro: "I would like to proceed with the following offer from the One-of-One pricing overview:",
    productLabel: "Product",
    setupLabel: "Setup price",
    recurringLabel: "Recurring price",
    sourceLabel: "Source",
    timestampLabel: "Timestamp",
    requestLabel: "Request",
    closeLine: "Please share the next steps and preferred checkout path.",
    signoff: "Best regards,",
  },
  de: {
    subjectPrefix: "One-of-One Angebotsanfrage",
    greeting: "Hallo Remington,",
    intro: "ich möchte mit folgendem Angebot aus der One-of-One Preisübersicht fortfahren:",
    productLabel: "Produkt",
    setupLabel: "Setup-Preis",
    recurringLabel: "Laufender Preis",
    sourceLabel: "Quelle",
    timestampLabel: "Zeitstempel",
    requestLabel: "Anfrage",
    closeLine: "Bitte senden Sie mir die nächsten Schritte und den bevorzugten Checkout-Pfad.",
    signoff: "Viele Grüße,",
  },
}

function resolveLandingStoreBaseUrl(): string {
  const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "")
  return appBaseUrl ? `${appBaseUrl}/store` : "/store"
}

function buildPricingCheckoutUrl(checkoutKey: LandingPricingCheckoutKey): string | null {
  const storeBaseUrl = resolveLandingStoreBaseUrl()

  if (checkoutKey === "plan_pro_monthly") {
    return `${storeBaseUrl}?tier=pro&period=monthly&source=one_of_one_landing`
  }
  if (checkoutKey === "plan_pro_annual") {
    return `${storeBaseUrl}?tier=pro&period=annual&source=one_of_one_landing`
  }
  if (checkoutKey === "plan_scale_monthly") {
    return `${storeBaseUrl}?tier=scale&period=monthly&source=one_of_one_landing`
  }
  if (checkoutKey === "plan_scale_annual") {
    return `${storeBaseUrl}?tier=scale&period=annual&source=one_of_one_landing`
  }
  if (checkoutKey === "consult_done_with_you") {
    return `${storeBaseUrl}?autostartCommercial=1&offer_code=consult_done_with_you&intent_code=consulting_sprint_scope_only&routing_hint=samantha_lead_capture&source=one_of_one_landing`
  }
  if (checkoutKey === "layer1_foundation") {
    return `${storeBaseUrl}?autostartCommercial=1&offer_code=layer1_foundation&intent_code=implementation_start_layer1&routing_hint=founder_bridge&source=one_of_one_landing`
  }
  if (
    checkoutKey === "credits"
    || checkoutKey === "sub_org_monthly"
    || checkoutKey === "sub_org_annual"
  ) {
    return `${storeBaseUrl}?source=one_of_one_landing`
  }

  return null
}

function buildPricingInquiryMailtoUrl(language: Language, row: LandingPricingRow): string {
  const template = PRICING_EMAIL_TEMPLATES[language]
  const timestampDate = new Date()
  const localizedTimestamp = timestampDate.toLocaleString(language === "de" ? "de-DE" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })
  const timestamp = `${localizedTimestamp} (${timestampDate.toISOString()})`
  const subject = `${template.subjectPrefix}: ${row.item}`
  const body = [
    template.greeting,
    "",
    template.intro,
    "",
    `${template.productLabel}: ${row.item}`,
    `${template.setupLabel}: ${row.setup}`,
    `${template.recurringLabel}: ${row.recurring}`,
    `${template.sourceLabel}: one_of_one_landing`,
    `${template.timestampLabel}: ${timestamp}`,
    `${template.requestLabel}: ${template.closeLine}`,
    "",
    template.signoff,
  ].join("\r\n")

  const encodedSubject = encodeURIComponent(subject)
  const encodedBody = encodeURIComponent(body)
  return `mailto:${REMINGTON_EMAIL}?subject=${encodedSubject}&body=${encodedBody}`
}

export default function LandingPage() {
  const [language, setLanguage] = useState<Language>("en")
  const t = landingTranslations[language]
  const pricingSheet = landingPricingSheets[language]
  const founderDemoUrl = FOUNDER_DEMO_URLS[language]
  const avatarStorageId = process.env.NEXT_PUBLIC_REM_AVATAR_STORAGE_ID
  const [founderAvatarUrl, setFounderAvatarUrl] = useState<string | null>(null)
  const [showDetailedPricing, setShowDetailedPricing] = useState(false)
  const [expandedPricingSections, setExpandedPricingSections] = useState<string[]>([])
  const [expandedProofs, setExpandedProofs] = useState<string[]>([])
  const legacyPublicCutoverMode = resolveLegacyPublicCutoverMode()

  const handleLanguageChange = useCallback((lang: Language) => {
    setLanguage(lang)
  }, [])

  const trackDemoCtaClick = useCallback((ctaId: string, ctaPlacement: string, destinationUrl: string) => {
    trackLandingEvent({
      eventName: "onboarding.funnel.activation",
      metadata: {
        ctaId,
        ctaGroup: "book_demo",
        ctaPlacement,
        ctaIntent: "founder_demo",
        destination: destinationUrl,
      },
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    const resolveAvatar = async () => {
      if (!avatarStorageId) return
      try {
        const response = await fetch(`/api/files/url?storageId=${encodeURIComponent(avatarStorageId)}`)
        if (!response.ok) return
        const payload = (await response.json()) as { url?: string | null }
        if (!cancelled) {
          setFounderAvatarUrl(payload.url || null)
        }
      } catch {
        if (!cancelled) {
          setFounderAvatarUrl(null)
        }
      }
    }

    void resolveAvatar()
    return () => {
      cancelled = true
    }
  }, [avatarStorageId])

  useEffect(() => {
    if (!showDetailedPricing) return
    setExpandedPricingSections(pricingSheet.categories.map((category) => category.title))
  }, [language, pricingSheet, showDetailedPricing])

  const handleDetailedPricingToggle = useCallback(() => {
    setShowDetailedPricing((current) => {
      const next = !current
      if (next) {
        setExpandedPricingSections(pricingSheet.categories.map((category) => category.title))
      }
      return next
    })
  }, [pricingSheet])

  const togglePricingCategory = useCallback((categoryTitle: string) => {
    setExpandedPricingSections((current) => (
      current.includes(categoryTitle)
        ? current.filter((title) => title !== categoryTitle)
        : [...current, categoryTitle]
    ))
  }, [])

  const toggleProof = useCallback((name: string) => {
    setExpandedProofs((current) => (
      current.includes(name)
        ? current.filter((n) => n !== name)
        : [...current, name]
    ))
  }, [])

  const handoffTranslations: HandoffTranslations = {
    startFree: t.startFree ?? "Free Diagnostic",
    startFreeDesc:
      t.startFreeDesc
      ?? "Run a free diagnostic audit to qualify your highest-leverage workflow before any paid scope.",
    doneWithYou: t.doneWithYou ?? "Consulting Sprint",
    doneWithYouPrice: t.doneWithYouPrice ?? "€3,500 excl. VAT (scope-only)",
    doneWithYouDesc:
      t.doneWithYouDesc
      ?? "Strategy and implementation roadmap only. No production build is included in this sprint.",
    fullBuild: t.fullBuild ?? "Implementation Start",
    fullBuildPrice: t.fullBuildPrice ?? "from €7,000 excl. VAT",
    fullBuildDesc:
      t.fullBuildDesc
      ?? "Production implementation starts here, beginning with layer-one foundation and delivery.",
    startCheckout: t.startCheckout ?? "Checkout",
    createAccountCarryContext:
      t.createAccountCarryContext ?? "Create account and keep your audit progress",
  }

  const resolvePricingRowAction = useCallback((row: LandingPricingRow) => {
    if (row.checkoutKey) {
      const checkoutUrl = buildPricingCheckoutUrl(row.checkoutKey)
      if (checkoutUrl) {
        return {
          type: "checkout" as const,
          href: checkoutUrl,
          label: t.pricingCheckoutAction ?? "Go to checkout",
        }
      }
    }

    return {
      type: "email" as const,
      href: buildPricingInquiryMailtoUrl(language, row),
      label: t.pricingEmailAction ?? "Email Remington",
    }
  }, [language, t.pricingCheckoutAction, t.pricingEmailAction])

  const trackPricingRowActionClick = useCallback((args: {
    row: LandingPricingRow;
    actionType: "checkout" | "email";
    destinationUrl: string;
  }) => {
    trackLandingEvent({
      eventName: args.actionType === "checkout"
        ? "onboarding.funnel.upgrade"
        : "onboarding.funnel.activation",
      metadata: {
        ctaId: `pricing_row_${args.actionType}`,
        ctaGroup: "pricing_sheet",
        ctaPlacement: "paths_detailed_pricing",
        ctaIntent: args.actionType === "checkout" ? "checkout_first" : "email_inquiry",
        pricingOffer: args.row.item,
        destination: args.destinationUrl,
      },
    })
  }, [])

  return (
    <div
      className="min-h-screen"
      data-legacy-cutover-mode={legacyPublicCutoverMode}
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <LandingAnalyticsEntrypoint />

      {/* Header / Taskbar */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          backgroundColor: "var(--titlebar-bg)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
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
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher onChange={handleLanguageChange} />
            <ThemeToggle />
            <Button asChild className="btn-primary text-xs h-8 px-4 hidden sm:inline-flex">
              <a href={`#${DIAGNOSTIC_SECTION_ID}`}>
                {t.ctaButton}
              </a>
            </Button>
            <Button asChild className="btn-accent text-xs h-8 w-8 sm:w-auto sm:px-3">
                <a
                href={founderDemoUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackDemoCtaClick("book_demo_header", "header", founderDemoUrl)}
                aria-label={t.bookDemo}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.bookDemoShort}</span>
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Section 1: The Hook */}
        <section className="py-20 md:py-32 px-4 md:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance leading-tight"
              style={{ color: "var(--color-text)" }}
            >
              {t.headline}
            </h1>
            <p
              className="mt-6 text-lg md:text-xl leading-relaxed text-pretty max-w-2xl mx-auto"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t.subheadline}
            </p>
            <p
              className="mt-4 text-base md:text-lg font-medium"
              style={{ color: "var(--color-accent)" }}
            >
              {t.action}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild className="btn-primary h-10 px-6 w-full sm:w-auto">
                <a href={`#${DIAGNOSTIC_SECTION_ID}`}>{t.ctaButton}</a>
              </Button>
              <Button asChild className="btn-accent h-10 px-6 w-full sm:w-auto gap-2">
                <a
                  href={founderDemoUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackDemoCtaClick("book_demo_hero", "hero", founderDemoUrl)}
                >
                  <CalendarDays className="w-4 h-4" />
                  {t.bookDemo}
                  <ArrowRight className="w-4 h-4" />
                </a>
              </Button>
            </div>
            <p
              className="mt-3 text-xs md:text-sm max-w-2xl mx-auto"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {t.parallelPathsNote}
            </p>
          </div>
        </section>

        {/* Section 2: The Problem */}
        <section
          className="py-16 md:py-24 px-4 md:px-8"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="max-w-3xl mx-auto space-y-8">
            <p
              className="text-base md:text-lg leading-relaxed"
              style={{ color: "var(--color-text)" }}
            >
              {t.problem1}
            </p>
            <p
              className="text-base md:text-lg leading-relaxed"
              style={{ color: "var(--color-text)" }}
            >
              {t.problem2}{" "}
              <em>{t.problem2emphasis}</em>
            </p>
            <p
              className="text-base md:text-lg leading-relaxed"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t.problem3}
            </p>
          </div>
        </section>

        {/* Section 3: The Shift */}
        <section className="py-16 md:py-24 px-4 md:px-8">
          <div className="max-w-3xl mx-auto space-y-8">
            <p
              className="text-base md:text-lg leading-relaxed"
              style={{ color: "var(--color-text)" }}
            >
              {t.shift1}
            </p>
            <p
              className="text-base md:text-lg leading-relaxed"
              style={{ color: "var(--color-text)" }}
            >
              {t.shift2}
            </p>
          </div>
        </section>

        {/* Section 4: The Embedded Chat */}
        <section
          id={DIAGNOSTIC_SECTION_ID}
          className="py-16 md:py-24 px-4 md:px-8"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2
                className="text-2xl md:text-3xl font-semibold text-balance"
                style={{ color: "var(--color-text)" }}
              >
                {t.chatHeadline}
              </h2>
              <p
                className="mt-4 text-base md:text-lg max-w-xl mx-auto"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {t.chatSubheadline}
              </p>
            </div>
            <AuditChatSurface preferredLanguage={language} />
            <div className="path-card mt-6 max-w-2xl w-full mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-base md:text-lg font-semibold" style={{ color: "var(--color-text)" }}>
                  {t.bookDemoHeadline}
                </h3>
                <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {t.bookDemoText}
                </p>
              </div>
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div
                  className="w-[72px] h-[72px] rounded-full overflow-hidden border flex items-center justify-center"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface-hover)" }}
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
                    <User className="w-8 h-8" style={{ color: "var(--color-text-tertiary)" }} />
                  )}
                </div>
                <p className="text-xs font-medium" style={{ color: "var(--color-text)" }}>
                  Remington S.
                </p>
                <Button asChild className="btn-accent text-sm h-9 px-4 gap-2">
                  <a
                    href={founderDemoUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => trackDemoCtaClick("book_demo_chat_bridge", "chat_bridge", founderDemoUrl)}
                  >
                    <CalendarDays className="w-4 h-4" />
                    {t.bookDemoShort}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: The Proof */}
        <section className="py-16 md:py-24 px-4 md:px-8">
          <div className="max-w-5xl mx-auto">
            <h2
              className="text-2xl md:text-3xl font-semibold text-center mb-12"
              style={{ color: "var(--color-text)" }}
            >
              {t.proofHeadline}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Marcus */}
              <div className="proof-block">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold" style={{ color: "var(--color-text)" }}>Marcus</p>
                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      {t.marcusDesc}
                    </p>
                  </div>
                  <Clock className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>{t.hoursWeek}</p>
                    <p style={{ color: "var(--color-text)" }}>
                      <span className="line-through" style={{ color: "var(--color-text-tertiary)" }}>78</span>{" "}
                      <span className="font-semibold">&rarr; 44</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>{t.closeRate}</p>
                    <p style={{ color: "var(--color-text)" }}>
                      <span className="line-through" style={{ color: "var(--color-text-tertiary)" }}>22%</span>{" "}
                      <span className="font-semibold">&rarr; 41%</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="mt-3 flex items-center gap-1.5 text-xs transition-colors"
                  style={{ color: "var(--color-text-secondary)" }}
                  onClick={() => toggleProof("marcus")}
                >
                  <ArrowRight className={`w-3.5 h-3.5 transition-transform ${expandedProofs.includes("marcus") ? "rotate-90" : ""}`} />
                  {expandedProofs.includes("marcus") ? t.readLess : t.readMore}
                </button>
                {expandedProofs.includes("marcus") && (
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                    {t.marcusDetail}
                  </p>
                )}
              </div>

              {/* Rachel */}
              <div className="proof-block">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold" style={{ color: "var(--color-text)" }}>Rachel</p>
                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      {t.rachelDesc}
                    </p>
                  </div>
                  <TrendingUp className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>{t.websiteConversion}</p>
                  <p style={{ color: "var(--color-text)" }}>
                    <span className="line-through" style={{ color: "var(--color-text-tertiary)" }}>1.2%</span>{" "}
                    <span className="font-semibold">&rarr; 3.8%</span>
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-3 flex items-center gap-1.5 text-xs transition-colors"
                  style={{ color: "var(--color-text-secondary)" }}
                  onClick={() => toggleProof("rachel")}
                >
                  <ArrowRight className={`w-3.5 h-3.5 transition-transform ${expandedProofs.includes("rachel") ? "rotate-90" : ""}`} />
                  {expandedProofs.includes("rachel") ? t.readLess : t.readMore}
                </button>
                {expandedProofs.includes("rachel") && (
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                    {t.rachelDetail}
                  </p>
                )}
              </div>

              {/* Jess */}
              <div className="proof-block">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold" style={{ color: "var(--color-text)" }}>Jess</p>
                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      {t.jessDesc}
                    </p>
                  </div>
                  <Target className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>{t.roas}</p>
                  <p style={{ color: "var(--color-text)" }}>
                    <span className="line-through" style={{ color: "var(--color-text-tertiary)" }}>1.12x</span>{" "}
                    <span className="font-semibold">&rarr; 4.46x</span>
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-3 flex items-center gap-1.5 text-xs transition-colors"
                  style={{ color: "var(--color-text-secondary)" }}
                  onClick={() => toggleProof("jess")}
                >
                  <ArrowRight className={`w-3.5 h-3.5 transition-transform ${expandedProofs.includes("jess") ? "rotate-90" : ""}`} />
                  {expandedProofs.includes("jess") ? t.readLess : t.readMore}
                </button>
                {expandedProofs.includes("jess") && (
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                    {t.jessDetail}
                  </p>
                )}
              </div>

              {/* Lena */}
              <div className="proof-block">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold" style={{ color: "var(--color-text)" }}>Lena</p>
                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      {t.lenaDesc}
                    </p>
                  </div>
                  <Percent className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>{t.cartRecovery}</p>
                    <p style={{ color: "var(--color-text)" }}>
                      <span className="line-through" style={{ color: "var(--color-text-tertiary)" }}>4.2%</span>{" "}
                      <span className="font-semibold">&rarr; 11.8%</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>{t.recoveredMo}</p>
                    <p className="font-semibold" style={{ color: "var(--color-text)" }}>&euro;14.2K</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="mt-3 flex items-center gap-1.5 text-xs transition-colors"
                  style={{ color: "var(--color-text-secondary)" }}
                  onClick={() => toggleProof("lena")}
                >
                  <ArrowRight className={`w-3.5 h-3.5 transition-transform ${expandedProofs.includes("lena") ? "rotate-90" : ""}`} />
                  {expandedProofs.includes("lena") ? t.readLess : t.readMore}
                </button>
                {expandedProofs.includes("lena") && (
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                    {t.lenaDetail}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: The Paths */}
        <section
          className="py-16 md:py-24 px-4 md:px-8"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="max-w-5xl mx-auto">
            <h2
              className="text-2xl md:text-3xl font-semibold text-center mb-12"
              style={{ color: "var(--color-text)" }}
            >
              {t.pathsHeadline}
            </h2>
            <HandoffCta translations={handoffTranslations} />
            <div className="mt-8 text-center">
              <button
                type="button"
                className="text-xs underline underline-offset-4 transition-opacity hover:opacity-80"
                style={{ color: "var(--color-text-secondary)" }}
                onClick={handleDetailedPricingToggle}
              >
                {showDetailedPricing
                  ? (t.detailedPricingHide ?? "Hide detailed Pricing Overview")
                  : (t.detailedPricingShow ?? "See detailed Pricing Overview")}
              </button>
            </div>
            {showDetailedPricing && (
              <div className="mt-6 space-y-4">
                {pricingSheet.categories.map((category) => {
                  const isExpanded = expandedPricingSections.includes(category.title)
                  return (
                    <div key={category.title} className="path-card p-0 overflow-hidden">
                      <button
                        type="button"
                        className="w-full px-5 py-4 border-b text-left flex items-start justify-between gap-4"
                        style={{ borderColor: "var(--color-border)" }}
                        onClick={() => togglePricingCategory(category.title)}
                      >
                        <div>
                          <h3 className="text-base md:text-lg font-semibold" style={{ color: "var(--color-text)" }}>
                            {category.title}
                          </h3>
                          {category.note && (
                            <p className="mt-1 text-xs md:text-sm" style={{ color: "var(--color-text-tertiary)" }}>
                              {category.note}
                            </p>
                          )}
                        </div>
                        <ArrowRight
                          className={`w-4 h-4 mt-1 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                          style={{ color: "var(--color-text-tertiary)" }}
                        />
                      </button>
                      {isExpanded && (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead style={{ backgroundColor: "var(--color-surface-hover)" }}>
                              <tr>
                                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                                  {pricingSheet.offerLabel}
                                </th>
                                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                                  {pricingSheet.setupLabel}
                                </th>
                                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                                  {pricingSheet.recurringLabel}
                                </th>
                                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                                  {pricingSheet.motionLabel}
                                </th>
                                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                                  {t.pricingActionLabel ?? "Action"}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {category.rows.map((row) => {
                                const pricingAction = resolvePricingRowAction(row)
                                const isCheckoutAction = pricingAction.type === "checkout"
                                return (
                                  <tr key={`${category.title}-${row.item}`} style={{ borderTop: "1px solid var(--color-border)" }}>
                                    <td className="px-4 py-3 align-top" style={{ color: row.highlight ? "var(--color-text)" : "var(--color-text-secondary)", fontWeight: row.highlight ? 600 : 500 }}>
                                      {row.item}
                                    </td>
                                    <td className="px-4 py-3 align-top" style={{ color: "var(--color-text)" }}>
                                      {row.setup}
                                    </td>
                                    <td className="px-4 py-3 align-top" style={{ color: "var(--color-text)" }}>
                                      {row.recurring}
                                    </td>
                                    <td className="px-4 py-3 align-top" style={{ color: "var(--color-text-tertiary)" }}>
                                      {row.motion}
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                      <Button asChild className={`${isCheckoutAction ? "btn-primary" : "btn-secondary"} text-xs h-8 px-3 gap-1.5 whitespace-nowrap`}>
                                        <a
                                          href={pricingAction.href}
                                          onClick={(event) => {
                                            trackPricingRowActionClick({
                                              row,
                                              actionType: pricingAction.type,
                                              destinationUrl: pricingAction.href,
                                            })
                                            if (!isCheckoutAction) {
                                              event.preventDefault()
                                              window.location.href = buildPricingInquiryMailtoUrl(language, row)
                                            }
                                          }}
                                        >
                                          {isCheckoutAction ? (
                                            <CreditCard className="w-3.5 h-3.5" />
                                          ) : (
                                            <Mail className="w-3.5 h-3.5" />
                                          )}
                                          {pricingAction.label}
                                        </a>
                                      </Button>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            <p
              className="mt-12 text-center text-sm max-w-2xl mx-auto"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t.personalNote} &mdash;{" "}
              <span style={{ color: "var(--color-text)" }}>Remington</span>
            </p>
          </div>
        </section>

        {/* Why Not a Discovery Call */}
        <section className="py-16 md:py-24 px-4 md:px-8">
          <div className="max-w-3xl mx-auto space-y-12">
            <div>
              <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-text)" }}>{t.whyNotCall}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{t.whyNotCallText}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-text)" }}>{t.whyOneOperator}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{t.whyOneOperatorText}</p>
            </div>
          </div>
        </section>

        {/* The Apps */}
        <section
          className="py-16 md:py-24 px-4 md:px-8"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="max-w-4xl mx-auto">
            <h2
              className="text-2xl md:text-3xl font-semibold text-center mb-12"
              style={{ color: "var(--color-text)" }}
            >
              {t.operatorEverywhereHeadline}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div
                  className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center"
                  style={{ backgroundColor: "var(--color-accent-subtle)", border: "1px solid var(--color-border)" }}
                >
                  <Apple className="w-7 h-7" style={{ color: "var(--color-accent)" }} />
                </div>
                <h4 className="font-semibold mb-2" style={{ color: "var(--color-text)" }}>iPhone</h4>
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{t.iphoneDesc}</p>
              </div>
              <div className="text-center">
                <div
                  className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center"
                  style={{ backgroundColor: "var(--color-accent-subtle)", border: "1px solid var(--color-border)" }}
                >
                  <Monitor className="w-7 h-7" style={{ color: "var(--color-accent)" }} />
                </div>
                <h4 className="font-semibold mb-2" style={{ color: "var(--color-text)" }}>macOS</h4>
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{t.macosDesc}</p>
              </div>
              <div className="text-center">
                <div
                  className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center"
                  style={{ backgroundColor: "var(--color-accent-subtle)", border: "1px solid var(--color-border)" }}
                >
                  <Globe className="w-7 h-7" style={{ color: "var(--color-accent)" }} />
                </div>
                <h4 className="font-semibold mb-2" style={{ color: "var(--color-text)" }}>Web App</h4>
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{t.webAppDesc}</p>
              </div>
            </div>
            <p className="mt-10 text-center text-sm" style={{ color: "var(--color-text-tertiary)" }}>{t.operatorEverywhereTagline}</p>
          </div>
        </section>

        {/* Integrations Section */}
        <section className="py-16 md:py-24 px-4 md:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-semibold text-balance" style={{ color: "var(--color-text)" }}>{t.integrationsHeadline}</h2>
              <p className="mt-4 text-base md:text-lg max-w-xl mx-auto" style={{ color: "var(--color-text-secondary)" }}>{t.integrationsSubheadline}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Communication */}
              <div className="p-5 rounded-lg" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
                  <h4 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>{t.communicationChannels}</h4>
                </div>
                <div className="space-y-2">
                  {["WhatsApp", "Slack", "Telegram", "SMS"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text)" }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--color-accent)" }} />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Workspace */}
              <div className="p-5 rounded-lg" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
                  <h4 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>{t.workspaceTools}</h4>
                </div>
                <div className="space-y-2">
                  {["Microsoft 365", "Google Workspace", "GitHub", "Vercel"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text)" }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--color-accent)" }} />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Automation */}
              <div className="p-5 rounded-lg" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
                  <h4 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>{t.automationPlatforms}</h4>
                </div>
                <div className="space-y-2">
                  {[
                    { name: "Zapier", soon: false },
                    { name: "Make", soon: true },
                    { name: "n8n", soon: true },
                    { name: "ActiveCampaign", soon: false },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text)" }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.soon ? "var(--color-text-tertiary)" : "var(--color-accent)" }} />
                      <span style={{ opacity: item.soon ? 0.6 : 1 }}>{item.name}</span>
                      {item.soon && <span className="text-[10px] uppercase" style={{ color: "var(--color-text-tertiary)" }}>{t.comingSoon}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Models */}
              <div className="p-5 rounded-lg" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
                  <h4 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>{t.aiModels}</h4>
                </div>
                <div className="space-y-2">
                  {["OpenAI", "Anthropic", "OpenRouter", "ElevenLabs"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text)" }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--color-accent)" }} />
                      {item}
                    </div>
                  ))}
                  <div className="text-xs pt-1" style={{ color: "var(--color-text-tertiary)" }}>+ {t.andMore}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section className="py-16 md:py-24 px-4 md:px-8" style={{ backgroundColor: "var(--color-surface)" }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Shield className="w-6 h-6" style={{ color: "var(--color-accent)" }} />
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-accent)" }}>Class 1 Privacy</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold text-balance" style={{ color: "var(--color-text)" }}>{t.privacyHeadline}</h2>
              <p className="mt-4 text-base md:text-lg max-w-2xl mx-auto" style={{ color: "var(--color-text-secondary)" }}>{t.privacySubheadline}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cloud */}
              <div className="p-6 rounded-lg" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--color-accent-subtle)", border: "1px solid var(--color-border)" }}>
                    <Cloud className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2" style={{ color: "var(--color-text)" }}>{t.cloudOption}</h4>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{t.cloudOptionDesc}</p>
                  </div>
                </div>
              </div>

              {/* Local Hardware */}
              <div className="p-6 rounded-lg" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--color-accent-subtle)", border: "1px solid var(--color-border)" }}>
                    <Server className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2" style={{ color: "var(--color-text)" }}>{t.localOption}</h4>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{t.localOptionDesc}</p>
                  </div>
                </div>
              </div>

              {/* Enterprise GPU */}
              <div className="p-6 rounded-lg" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--color-accent-subtle)", border: "1px solid var(--color-border)" }}>
                    <Cpu className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2" style={{ color: "var(--color-text)" }}>{t.enterpriseOption}</h4>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{t.enterpriseOptionDesc}</p>
                  </div>
                </div>
              </div>

              {/* Bring Your Own Model */}
              <div className="p-6 rounded-lg" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--color-accent-subtle)", border: "1px solid var(--color-border)" }}>
                    <Lock className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2" style={{ color: "var(--color-text)" }}>{t.bringYourOwn}</h4>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{t.bringYourOwnDesc}</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-10 text-center text-sm max-w-xl mx-auto" style={{ color: "var(--color-text-tertiary)" }}>{t.privacyTagline}</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
