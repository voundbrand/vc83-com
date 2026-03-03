"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import { AuditChatSurface } from "@/components/audit-chat-surface"
import { HandoffCta, type HandoffTranslations } from "@/components/handoff-cta"
import { LandingAnalyticsEntrypoint } from "@/components/landing-analytics-entrypoint"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSwitcher, type Language } from "@/components/language-switcher"
import { Button } from "@/components/ui/button"
import { landingTranslations } from "@/content/landing-content"
import { resolveLegacyPublicCutoverMode } from "@/lib/commercial-cutover"
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
} from "lucide-react"

export default function LandingPage() {
  const [language, setLanguage] = useState<Language>("en")
  const t = landingTranslations[language]
  const legacyPublicCutoverMode = resolveLegacyPublicCutoverMode()

  const handleLanguageChange = useCallback((lang: Language) => {
    setLanguage(lang)
  }, [])

  const handoffTranslations: HandoffTranslations = {
    startFree: t.startFree ?? "Free Diagnostic",
    startFreeDesc:
      t.startFreeDesc
      ?? "Run a free diagnostic audit to qualify your highest-leverage workflow before any paid scope.",
    doneWithYou: t.doneWithYou ?? "Consulting Sprint",
    doneWithYouPrice: t.doneWithYouPrice ?? "€3,500 scope-only",
    doneWithYouDesc:
      t.doneWithYouDesc
      ?? "Strategy and implementation roadmap only. No production build is included in this sprint.",
    fullBuild: t.fullBuild ?? "Implementation Start",
    fullBuildPrice: t.fullBuildPrice ?? "€7,000+",
    fullBuildDesc:
      t.fullBuildDesc
      ?? "Production implementation starts here, beginning with layer-one foundation and delivery.",
    startConversation: t.startConversation,
  }

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
              <div className="text-[14px] tracking-[0.7em] logo-text-layers">LAYERS</div>
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher onChange={handleLanguageChange} />
            <ThemeToggle />
            <Button className="btn-accent text-xs h-8 px-4 hidden sm:inline-flex">
              {t.ctaButton}
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
                      Painting &middot; Stuttgart &middot; &euro;2.4M
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
              </div>

              {/* Rachel */}
              <div className="proof-block">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold" style={{ color: "var(--color-text)" }}>Rachel</p>
                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      Consulting &middot; Dublin &middot; &euro;1.8M
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
              </div>

              {/* Jess */}
              <div className="proof-block">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold" style={{ color: "var(--color-text)" }}>Jess</p>
                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      Skincare &middot; Amsterdam &middot; &euro;3.1M
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
              </div>

              {/* Lena */}
              <div className="proof-block">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold" style={{ color: "var(--color-text)" }}>Lena</p>
                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      E-commerce &middot; Berlin &middot; &euro;4.7M
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

      {/* Footer */}
      <footer
        className="border-t py-8 px-4 md:px-8"
        style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/images/sevenlayers-logo.png" alt="sevenlayers" width={24} height={24} className="w-6 h-6" />
            <div className="logo-text leading-[1.1]" style={{ color: "var(--color-text-secondary)" }}>
              <div className="text-[14px] tracking-[0.45em] logo-text-seven">SEVEN</div>
              <div className="text-[11px] tracking-[0.7em] logo-text-layers">LAYERS</div>
            </div>
          </div>
          <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>{t.footerTagline}</p>
        </div>
      </footer>
    </div>
  )
}
