"use client"

import { useState } from "react"
import { ContentPageLayout } from "@/components/content-page-layout"
import { pagesTranslations } from "@/content/pages-content"
import type { Language } from "@/components/language-switcher"
import { companyInfo, SUPPORT_EMAIL } from "@/lib/constants"
import Link from "next/link"

export default function DataDeletionPage() {
  const [language, setLanguage] = useState<Language>("en")
  const t = pagesTranslations[language].dataDeletion
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
          {/* 1. Overview */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s1Title}
            </h2>
            <p>{t.s1Text}</p>
          </section>

          {/* 2. Data Collected */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s2Title}
            </h2>
            <p>{t.s2Intro}</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-3">
              {t.s2Items.map((item) => (
                <li key={item.label}><strong style={{ color: "var(--color-text)" }}>{item.label}</strong>: {item.desc}</li>
              ))}
            </ul>
          </section>

          {/* 3. How to Request */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s3Title}
            </h2>
            <p>{t.s3Intro}</p>
            <div
              className="p-5 rounded-lg mt-3 space-y-4"
              style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <div>
                <p className="font-semibold" style={{ color: "var(--color-text)" }}>{t.s3EmailTitle}</p>
                <p className="mt-1">
                  {t.s3EmailTextPre}
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="underline" style={{ color: "var(--color-accent)" }}>{SUPPORT_EMAIL}</a>
                  {t.s3EmailTextPost}
                </p>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  {t.s3EmailItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold" style={{ color: "var(--color-text)" }}>{t.s3SupportTitle}</p>
                <p className="mt-1">
                  {t.s3SupportTextPre}
                  <Link href="/support" className="underline" style={{ color: "var(--color-accent)" }}>{t.s3SupportLink}</Link>
                  {t.s3SupportTextPost}
                </p>
              </div>
            </div>
          </section>

          {/* 4. What We Delete */}
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
            <p className="mt-3">
              <strong style={{ color: "var(--color-text)" }}>{t.s4Exceptions}</strong> {t.s4ExceptionsText}
            </p>
          </section>

          {/* 5. Processing Timeline */}
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

          {/* 6. Status Check */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s6Title}
            </h2>
            <p>
              {t.s6TextPre}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="underline" style={{ color: "var(--color-accent)" }}>{SUPPORT_EMAIL}</a>
              {t.s6TextPost}
            </p>
          </section>

          {/* 7. Legal Basis */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s7Title}
            </h2>
            <p>{t.s7Intro}</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-3">
              {t.s7Items.map((item) => (
                <li key={item.label}><strong style={{ color: "var(--color-text)" }}>{item.label}</strong> — {item.desc}</li>
              ))}
            </ul>
          </section>

          {/* 8. Contact */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s8Title}
            </h2>
            <p>{t.s8Text}</p>
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

        {/* Related */}
        <div
          className="mt-12 p-6 rounded-xl"
          style={{
            backgroundColor: "var(--color-accent-subtle)",
            border: "1px solid var(--color-border)",
          }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text)" }}>
            {tc.relatedDocuments}
          </h3>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="text-sm underline" style={{ color: "var(--color-text-secondary)" }}>{t.seeAlsoPrivacy}</Link>
            <Link href="/terms" className="text-sm underline" style={{ color: "var(--color-text-secondary)" }}>{t.seeAlsoTerms}</Link>
            <Link href="/support" className="text-sm underline" style={{ color: "var(--color-text-secondary)" }}>{t.seeAlsoSupport}</Link>
          </div>
        </div>
      </article>
    </ContentPageLayout>
  )
}
