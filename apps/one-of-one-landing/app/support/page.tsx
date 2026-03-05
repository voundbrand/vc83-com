"use client"

import { useState } from "react"
import { ContentPageLayout } from "@/components/content-page-layout"
import { pagesTranslations } from "@/content/pages-content"
import type { Language } from "@/components/language-switcher"
import { SUPPORT_EMAIL, companyInfo } from "@/lib/constants"
import Link from "next/link"

export default function SupportPage() {
  const [language, setLanguage] = useState<Language>("en")
  const t = pagesTranslations[language].support
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
            className="text-base md:text-lg max-w-2xl mx-auto leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {t.subtitle}
          </p>
        </div>

        {/* Contact Options */}
        <section className="mb-12">
          <h2
            className="text-xl font-semibold mb-4"
            style={{ color: "var(--color-text)" }}
          >
            {t.reachUsTitle}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div
              className="p-5 rounded-lg"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <h3
                className="text-sm font-semibold mb-2"
                style={{ color: "var(--color-text)" }}
              >
                {t.emailTitle}
              </h3>
              <p
                className="text-sm mb-3"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {t.emailDesc}
              </p>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-sm underline"
                style={{ color: "var(--color-accent)" }}
              >
                {SUPPORT_EMAIL}
              </a>
            </div>
            <div
              className="p-5 rounded-lg"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <h3
                className="text-sm font-semibold mb-2"
                style={{ color: "var(--color-text)" }}
              >
                {t.bookCallTitle}
              </h3>
              <p
                className="text-sm mb-3"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {t.bookCallDesc}
              </p>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="btn-accent text-xs h-8 px-3 rounded-md inline-flex items-center"
              >
                {tc.contactUs}
              </a>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2
            className="text-xl font-semibold mb-6"
            style={{ color: "var(--color-text)" }}
          >
            {t.faqTitle}
          </h2>
          <div className="space-y-6">
            {t.faqs.map((faq) => (
              <div key={faq.q}>
                <h3
                  className="text-sm font-semibold mb-2"
                  style={{ color: "var(--color-text)" }}
                >
                  {faq.q}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Company Info */}
        <section className="mb-12">
          <h2
            className="text-xl font-semibold mb-4"
            style={{ color: "var(--color-text)" }}
          >
            {t.companyInfoTitle}
          </h2>
          <div
            className="p-5 rounded-lg text-sm"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-secondary)",
            }}
          >
            <p className="font-semibold" style={{ color: "var(--color-text)" }}>
              {companyInfo.name}
            </p>
            <p>{companyInfo.street}</p>
            <p>
              {companyInfo.zip} {companyInfo.city}
            </p>
            <p>{companyInfo.country}</p>
            <p className="mt-3">{t.vatIdLabel}: {companyInfo.vatId}</p>
            <p>{t.emailLabel}: {companyInfo.email}</p>
          </div>
        </section>

        {/* Related */}
        <div
          className="p-6 rounded-xl"
          style={{
            backgroundColor: "var(--color-accent-subtle)",
            border: "1px solid var(--color-border)",
          }}
        >
          <h3
            className="text-sm font-semibold mb-3"
            style={{ color: "var(--color-text)" }}
          >
            {tc.resources}
          </h3>
          <div className="flex flex-wrap gap-4">
            <Link href="/docs" className="text-sm underline" style={{ color: "var(--color-text-secondary)" }}>
              {t.documentationLink}
            </Link>
            <Link href="/privacy" className="text-sm underline" style={{ color: "var(--color-text-secondary)" }}>
              {t.privacyPolicyLink}
            </Link>
            <Link href="/terms" className="text-sm underline" style={{ color: "var(--color-text-secondary)" }}>
              {t.termsLink}
            </Link>
            <Link href="/eula" className="text-sm underline" style={{ color: "var(--color-text-secondary)" }}>
              {t.eulaLink}
            </Link>
          </div>
        </div>
      </article>
    </ContentPageLayout>
  )
}
