"use client"

import { useState } from "react"
import { ContentPageLayout } from "@/components/content-page-layout"
import { pagesTranslations } from "@/content/pages-content"
import type { Language } from "@/components/language-switcher"
import { companyInfo } from "@/lib/constants"
import Link from "next/link"

export default function PrivacyPage() {
  const [language, setLanguage] = useState<Language>("en")
  const t = pagesTranslations[language].privacy
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
            <p>
              <strong style={{ color: "var(--color-text)" }}>{companyInfo.name}</strong> {t.s1Text}
            </p>
          </section>

          {/* 2. Controller */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s2Title}
            </h2>
            <p>{t.s2Text}</p>
            <div
              className="p-4 rounded-lg mt-3 text-sm"
              style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <p className="font-semibold" style={{ color: "var(--color-text)" }}>{companyInfo.name}</p>
              <p>{companyInfo.street}</p>
              <p>{companyInfo.zip} {companyInfo.city}</p>
              <p>{companyInfo.country}</p>
              <p>Email: {companyInfo.email}</p>
              <p>UST-ID: {companyInfo.vatId}</p>
            </div>
            <p className="mt-3">
              <strong style={{ color: "var(--color-text)" }}>{t.s2DpoLabel}</strong> {t.s2DpoText}
            </p>
          </section>

          {/* 3. Data We Collect */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s3Title}
            </h2>
            <p>{t.s3Intro}</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-3">
              {t.s3Items.map((item) => (
                <li key={item.label}><strong style={{ color: "var(--color-text)" }}>{item.label}</strong>: {item.desc}</li>
              ))}
            </ul>
          </section>

          {/* 4. Purpose of Processing */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s4Title}
            </h2>
            <p>{t.s4Intro}</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-3">
              {t.s4Items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          {/* 5. Legal Basis */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s5Title}
            </h2>
            <p>{t.s5Intro}</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-3">
              {t.s5Items.map((item) => (
                <li key={item.label}><strong style={{ color: "var(--color-text)" }}>{item.label}</strong>: {item.desc}</li>
              ))}
            </ul>
          </section>

          {/* 6. Data Sharing */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s6Title}
            </h2>
            <p>{t.s6Intro}</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-3">
              {t.s6Items.map((item) => (
                <li key={item.label}><strong style={{ color: "var(--color-text)" }}>{item.label}</strong>: {item.desc}</li>
              ))}
            </ul>
          </section>

          {/* 7. International Transfers */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s7Title}
            </h2>
            <p>{t.s7Text}</p>
          </section>

          {/* 8. Data Retention */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s8Title}
            </h2>
            <p>{t.s8Intro}</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-3">
              {t.s8Items.map((item) => (
                <li key={item.label}><strong style={{ color: "var(--color-text)" }}>{item.label}</strong>: {item.desc}</li>
              ))}
            </ul>
          </section>

          {/* 9. Your Rights */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s9Title}
            </h2>
            <p>{t.s9Intro}</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-3">
              {t.s9Items.map((item) => (
                <li key={item.label}><strong style={{ color: "var(--color-text)" }}>{item.label}</strong>: {item.desc}</li>
              ))}
            </ul>
            <div
              className="p-4 rounded-lg mt-3"
              style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <p className="font-semibold" style={{ color: "var(--color-text)" }}>{t.s9AuthorityTitle}</p>
              <p>{t.s9AuthorityName}</p>
              <p>{t.s9AuthorityAddress}</p>
            </div>
          </section>

          {/* 10. Security */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s10Title}
            </h2>
            <p>{t.s10Text}</p>
          </section>

          {/* 11. Changes */}
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
            <Link href="/cookies" className="text-sm underline" style={{ color: "var(--color-text-secondary)" }}>{t.seeAlsoCookies}</Link>
            <Link href="/terms" className="text-sm underline" style={{ color: "var(--color-text-secondary)" }}>{t.seeAlsoTerms}</Link>
            <Link href="/data-deletion" className="text-sm underline" style={{ color: "var(--color-text-secondary)" }}>{t.seeAlsoDataDeletion}</Link>
          </div>
        </div>
      </article>
    </ContentPageLayout>
  )
}
