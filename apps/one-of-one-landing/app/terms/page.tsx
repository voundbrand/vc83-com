"use client"

import { useState } from "react"
import { ContentPageLayout } from "@/components/content-page-layout"
import { pagesTranslations } from "@/content/pages-content"
import type { Language } from "@/components/language-switcher"
import { companyInfo } from "@/lib/constants"
import Link from "next/link"

export default function TermsPage() {
  const [language, setLanguage] = useState<Language>("en")
  const t = pagesTranslations[language].terms
  const tc = pagesTranslations[language].common

  return (
    <ContentPageLayout language={language} onLanguageChange={setLanguage}>
      <article>
        {/* Title */}
        <div className="text-center mb-12">
          <h1
            className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
            style={{ color: "var(--color-text)" }}
          >
            {t.title}
          </h1>
          <p
            className="text-base max-w-2xl mx-auto leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {t.subtitle}
          </p>
          <p className="mt-4 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
            {tc.lastUpdated}
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          {/* 1. Introduction */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s1Title}
            </h2>
            <p>{t.s1Text1}</p>
            <p className="mt-3">{t.s1Text2}</p>
          </section>

          {/* 2. Definitions */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s2Title}
            </h2>
            <ul className="list-disc pl-6 space-y-1.5">
              {t.s2Items.map((item) => (
                <li key={item.label}><strong style={{ color: "var(--color-text)" }}>{item.label}</strong>: {item.desc}</li>
              ))}
            </ul>
          </section>

          {/* 3. Account Registration */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s3Title}
            </h2>
            <p><strong style={{ color: "var(--color-text)" }}>{t.s3Eligibility}</strong> {t.s3EligibilityText}</p>
            <p className="mt-3"><strong style={{ color: "var(--color-text)" }}>{t.s3Info}</strong> {t.s3InfoText}</p>
            <p className="mt-3"><strong style={{ color: "var(--color-text)" }}>{t.s3Security}</strong> {t.s3SecurityText}</p>
          </section>

          {/* 4. Usage Rights */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s4Title}
            </h2>
            <p><strong style={{ color: "var(--color-text)" }}>{t.s4License}</strong> {t.s4LicenseText}</p>
            <p className="mt-3"><strong style={{ color: "var(--color-text)" }}>{t.s4Restrictions}</strong> {t.s4RestrictionsIntro}</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              {t.s4RestrictionItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-3"><strong style={{ color: "var(--color-text)" }}>{t.s4Exception}</strong> {t.s4ExceptionText}</p>
          </section>

          {/* 5. Acceptable Use */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s5Title}
            </h2>
            <p>{t.s5Intro}</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-3">
              {t.s5Items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          {/* 6. Intellectual Property */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s6Title}
            </h2>
            <p><strong style={{ color: "var(--color-text)" }}>{t.s6OurRights}</strong> {t.s6OurRightsText}</p>
            <p className="mt-3"><strong style={{ color: "var(--color-text)" }}>{t.s6YourContent}</strong> {t.s6YourContentText}</p>
          </section>

          {/* 7. Disclaimer */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s7Title}
            </h2>
            <p>{t.s7Text}</p>
          </section>

          {/* 8. Limitation of Liability */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s8Title}
            </h2>
            <p><strong style={{ color: "var(--color-text)" }}>{t.s8Unlimited}</strong> {t.s8UnlimitedText}</p>
            <p className="mt-3"><strong style={{ color: "var(--color-text)" }}>{t.s8Limited}</strong> {t.s8LimitedText}</p>
            <p className="mt-3"><strong style={{ color: "var(--color-text)" }}>{t.s8FreeTier}</strong> {t.s8FreeTierText}</p>
          </section>

          {/* 9. Right of Withdrawal */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s9Title}
            </h2>
            <p>{t.s9Intro}</p>
            <div
              className="p-4 rounded-lg mt-3"
              style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <p className="font-semibold" style={{ color: "var(--color-text)" }}>{t.s9BoxTitle}</p>
              <p className="mt-2">{t.s9BoxText}</p>
              <p className="mt-2 font-semibold" style={{ color: "var(--color-text)" }}>{t.s9EffectsTitle}</p>
              <p className="mt-2">{t.s9EffectsText}</p>
            </div>
          </section>

          {/* 10. Dispute Resolution */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s10Title}
            </h2>
            <p>
              <strong style={{ color: "var(--color-text)" }}>{t.s10Odr}</strong> {t.s10OdrTextPre}
              <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--color-accent)" }}>https://ec.europa.eu/consumers/odr/</a>
              {t.s10OdrTextPost}
            </p>
            <p className="mt-3"><strong style={{ color: "var(--color-text)" }}>{t.s10Jurisdiction}</strong> {t.s10JurisdictionText}</p>
          </section>

          {/* 11. Termination */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s11Title}
            </h2>
            <p>{t.s11Text}</p>
          </section>

          {/* 12. Contact */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s12Title}
            </h2>
            <p>{t.s12Text}</p>
            <div
              className="p-4 rounded-lg mt-3"
              style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <p className="font-semibold" style={{ color: "var(--color-text)" }}>{companyInfo.name}</p>
              <p>{companyInfo.street}</p>
              <p>{companyInfo.zip} {companyInfo.city}</p>
              <p>{companyInfo.country}</p>
              <p>Email: {companyInfo.email}</p>
            </div>
          </section>
        </div>

        {/* See also */}
        <div
          className="mt-12 p-6 rounded-xl"
          style={{
            backgroundColor: "var(--color-accent-subtle)",
            border: "1px solid var(--color-border)",
          }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text)" }}>
            {tc.seeAlso}
          </h3>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="text-sm underline" style={{ color: "var(--color-text-secondary)" }}>{t.seeAlsoPrivacy}</Link>
            <Link href="/cookies" className="text-sm underline" style={{ color: "var(--color-text-secondary)" }}>{t.seeAlsoCookies}</Link>
            <Link href="/eula" className="text-sm underline" style={{ color: "var(--color-text-secondary)" }}>{t.seeAlsoEula}</Link>
          </div>
        </div>
      </article>
    </ContentPageLayout>
  )
}
