"use client"

import { useState } from "react"
import { ContentPageLayout } from "@/components/content-page-layout"
import { pagesTranslations } from "@/content/pages-content"
import type { Language } from "@/components/language-switcher"
import { companyInfo } from "@/lib/constants"
import Link from "next/link"

export default function CookiesPage() {
  const [language, setLanguage] = useState<Language>("en")
  const t = pagesTranslations[language].cookies
  const tc = pagesTranslations[language].common
  const labels = language === "de"
    ? {
        controllerTitle: "Verantwortlicher und Kontakt",
        managingDirector: "Geschäftsführer",
        registerCourt: "Registergericht",
        vatId: "UST-ID",
      }
    : {
        controllerTitle: "Controller and contact",
        managingDirector: "Managing Director",
        registerCourt: "Register Court",
        vatId: "VAT ID",
      }

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
          {/* What are cookies */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.whatTitle}
            </h2>
            <p>{t.whatText}</p>
          </section>

          {/* Cookie table */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.whichTitle}
            </h2>
            <p className="text-xs mt-1 mb-3" style={{ color: "var(--color-text-tertiary)" }}>
              {t.whichNote}
            </p>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <th className="py-3 pr-4 font-semibold" style={{ color: "var(--color-text)" }}>{t.tableHeaders.cookie}</th>
                    <th className="py-3 pr-4 font-semibold" style={{ color: "var(--color-text)" }}>{t.tableHeaders.type}</th>
                    <th className="py-3 pr-4 font-semibold" style={{ color: "var(--color-text)" }}>{t.tableHeaders.purpose}</th>
                    <th className="py-3 font-semibold" style={{ color: "var(--color-text)" }}>{t.tableHeaders.duration}</th>
                  </tr>
                </thead>
                <tbody>
                  {t.tableRows.map((row, i) => (
                    <tr key={row.name} style={i < t.tableRows.length - 1 ? { borderBottom: "1px solid var(--color-border)" } : undefined}>
                      <td className="py-3 pr-4">{row.name}</td>
                      <td className="py-3 pr-4">{row.type}</td>
                      <td className="py-3 pr-4">{row.purpose}</td>
                      <td className="py-3">{row.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Essential vs optional */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.essentialTitle}
            </h2>
            <p>
              <strong style={{ color: "var(--color-text)" }}>{t.essentialLabel}</strong> {t.essentialText}
            </p>
            <p className="mt-3">
              <strong style={{ color: "var(--color-text)" }}>{t.analyticsLabel}</strong> {t.analyticsText}
            </p>
          </section>

          {/* Accept or decline */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.acceptDeclineTitle}
            </h2>
            <ul className="list-disc pl-6 space-y-1.5 mt-3">
              <li>
                <strong style={{ color: "var(--color-text)" }}>{t.acceptLabel}</strong> {t.acceptText}
              </li>
              <li>
                <strong style={{ color: "var(--color-text)" }}>{t.declineLabel}</strong> {t.declineText}
              </li>
            </ul>
          </section>

          {/* How to manage */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.manageTitle}
            </h2>
            <ul className="list-disc pl-6 space-y-1.5 mt-3">
              {t.manageItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          {/* Third-party */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.thirdPartyTitle}
            </h2>
            <p>{t.thirdPartyText}</p>
          </section>

          {/* Changes */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.changesTitle}
            </h2>
            <p>{t.changesText}</p>
          </section>

          {/* Questions */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {t.questionsTitle}
            </h2>
            <p>
              {t.questionsText}
              <a href={`mailto:${companyInfo.email}`} className="underline" style={{ color: "var(--color-accent)" }}>
                {companyInfo.email}
              </a>
            </p>
          </section>

          {/* Controller and contact */}
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {labels.controllerTitle}
            </h2>
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <p className="font-semibold" style={{ color: "var(--color-text)" }}>{companyInfo.name}</p>
              <p>{companyInfo.street}</p>
              <p>{companyInfo.zip} {companyInfo.city}</p>
              <p>{companyInfo.country}</p>
              <p>{labels.managingDirector}: {companyInfo.managingDirector}</p>
              <p>{labels.registerCourt}: {companyInfo.registerCourt}, {companyInfo.registerNumber}</p>
              <p>{labels.vatId}: {companyInfo.vatId}</p>
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
            <Link href="/terms" className="text-sm underline" style={{ color: "var(--color-text-secondary)" }}>{t.seeAlsoTerms}</Link>
            <Link href="/data-deletion" className="text-sm underline" style={{ color: "var(--color-text-secondary)" }}>{t.seeAlsoDataDeletion}</Link>
          </div>
        </div>
      </article>
    </ContentPageLayout>
  )
}
