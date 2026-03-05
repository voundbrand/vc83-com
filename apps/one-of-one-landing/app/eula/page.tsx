"use client"

import { useState } from "react"
import { ContentPageLayout } from "@/components/content-page-layout"
import { pagesTranslations } from "@/content/pages-content"
import type { Language } from "@/components/language-switcher"
import { companyInfo } from "@/lib/constants"
import Link from "next/link"

export default function EULAPage() {
  const [language, setLanguage] = useState<Language>("en")
  const t = pagesTranslations[language].eula
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
          {/* 1. Agreement */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s1Title}
            </h2>
            <p>{t.s1Text1}</p>
            <p className="mt-3">{t.s1Text2}</p>
          </section>

          {/* 2. License Grant */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s2Title}
            </h2>
            <p>{t.s2Intro}</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-3">
              {t.s2Items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          {/* 3. Restrictions */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s3Title}
            </h2>
            <p>{t.s3Intro}</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-3">
              {t.s3Items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          {/* 4. Third-Party Integrations */}
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
            <p className="mt-3">{t.s4Disclaimer}</p>
          </section>

          {/* 5. Intellectual Property */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s5Title}
            </h2>
            <p>{t.s5Text}</p>
            <p className="mt-3">
              <strong style={{ color: "var(--color-text)" }}>{t.s5YourContent}</strong> {t.s5YourContentText}
            </p>
          </section>

          {/* 6. Privacy and Data */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s6Title}
            </h2>
            <p>
              {t.s6TextPre}<Link href="/privacy" className="underline" style={{ color: "var(--color-accent)" }}>{t.s6PrivacyLink}</Link>{t.s6TextPost}
            </p>
            <div
              className="p-4 rounded-lg mt-3"
              style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <p className="font-semibold" style={{ color: "var(--color-text)" }}>{t.s6DataSharedTitle}</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                {t.s6DataSharedItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          {/* 7. Disclaimer */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s7Title}
            </h2>
            <p>{t.s7Text1}</p>
            <p className="mt-3">{t.s7Text2}</p>
          </section>

          {/* 8. Limitation of Liability */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s8Title}
            </h2>
            <p>{t.s8Text}</p>
            <p className="mt-3">{t.s8GermanLaw}</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-3">
              {t.s8Items.map((item) => (
                <li key={item.label}><strong style={{ color: "var(--color-text)" }}>{item.label}</strong> {item.desc}</li>
              ))}
            </ul>
          </section>

          {/* 9. Termination */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s9Title}
            </h2>
            <p>{t.s9Text1}</p>
            <p className="mt-3">{t.s9Text2}</p>
          </section>

          {/* 10. Governing Law */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s10Title}
            </h2>
            <p>{t.s10Text1}</p>
            <p className="mt-3">{t.s10Text2}</p>
          </section>

          {/* 11. Contact */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.s11Title}
            </h2>
            <p>{t.s11Text}</p>
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
            {tc.relatedLegalDocuments}
          </h3>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="text-sm underline" style={{ color: "var(--color-text-secondary)" }}>{t.seeAlsoPrivacy}</Link>
            <Link href="/terms" className="text-sm underline" style={{ color: "var(--color-text-secondary)" }}>{t.seeAlsoTerms}</Link>
            <Link href="/docs" className="text-sm underline" style={{ color: "var(--color-text-secondary)" }}>{t.seeAlsoDocs}</Link>
          </div>
        </div>
      </article>
    </ContentPageLayout>
  )
}
