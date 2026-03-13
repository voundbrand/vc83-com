"use client"

import Link from "next/link"
import Image from "next/image"
import { socialLinks } from "@/lib/constants"
import { pagesTranslations } from "@/content/pages-content"
import type { Language } from "@/components/language-switcher"
import {
  Linkedin,
  Instagram,
  Youtube,
  Github,
} from "lucide-react"

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

const productLinkKeys = [
  { href: "/", key: "linkHome" },
  { href: "/docs", key: "linkDocs" },
  { href: "/support", key: "linkSupport" },
] as const

const legalLinkKeys = [
  { href: "/privacy", key: "linkPrivacy" },
  { href: "/cookies", key: "linkCookies" },
  { href: "/terms", key: "linkTerms" },
  { href: "/eula", key: "linkEula" },
  { href: "/data-deletion", key: "linkDataDeletion" },
] as const

const socials = [
  { href: socialLinks.linkedin, icon: Linkedin, label: "LinkedIn" },
  { href: socialLinks.x, icon: XIcon, label: "X (Twitter)" },
  { href: socialLinks.instagram, icon: Instagram, label: "Instagram" },
  { href: socialLinks.youtube, icon: Youtube, label: "YouTube" },
  { href: socialLinks.github, icon: Github, label: "GitHub" },
]

interface FooterProps {
  language?: Language
}

export function Footer({ language = "en" }: FooterProps) {
  const t = pagesTranslations[language].footer

  return (
    <footer
      className="border-t py-10 md:py-14 px-4 md:px-8"
      style={{
        backgroundColor: "var(--color-bg)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Grid columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-3">
              <Image
                src="/images/sevenlayers-logo.png"
                alt="sevenlayers"
                width={28}
                height={28}
                className="w-7 h-7"
              />
              <div
                className="logo-text leading-[1.1]"
                style={{ color: "var(--color-text)" }}
              >
                <div className="text-[16px] tracking-[0.45em] logo-text-seven">SEVEN</div>
                <div className="text-[12px] tracking-[0.653em] logo-text-layers">LAYERS</div>
              </div>
            </Link>
            <p
              className="mt-3 text-xs leading-relaxed max-w-[200px]"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {t.brandTagline}
            </p>
          </div>

          {/* Product */}
          <div>
            <h4
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t.product}
            </h4>
            <nav className="flex flex-col gap-0.5">
              {productLinkKeys.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs transition-colors hover:underline py-1"
                  style={{ color: "var(--color-text-tertiary)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--color-text)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--color-text-tertiary)"
                  }}
                >
                  {t[link.key]}
                </Link>
              ))}
            </nav>
          </div>

          {/* Legal */}
          <div>
            <h4
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t.legal}
            </h4>
            <nav className="flex flex-col gap-0.5">
              {legalLinkKeys.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs transition-colors hover:underline py-1"
                  style={{ color: "var(--color-text-tertiary)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--color-text)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--color-text-tertiary)"
                  }}
                >
                  {t[link.key]}
                </Link>
              ))}
            </nav>
          </div>

          {/* Social */}
          <div>
            <h4
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t.social}
            </h4>
            <div className="flex flex-wrap gap-2">
              {socials.map((social) => (
                <a
                  key={social.href}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                  className="p-2.5 rounded-lg transition-colors"
                  style={{
                    backgroundColor: "var(--color-surface-hover)",
                    color: "var(--color-text-secondary)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--color-surface-active)"
                    e.currentTarget.style.color = "var(--color-text)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--color-surface-hover)"
                    e.currentTarget.style.color = "var(--color-text-secondary)"
                  }}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-8 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
            {t.tagline}
          </p>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] uppercase tracking-wider font-medium"
              style={{
                color: "var(--color-text-secondary)",
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <svg width="16" height="10" viewBox="0 0 16 10" aria-hidden="true" className="shrink-0 rounded-[1px]">
                <rect width="16" height="3.33" fill="#000" />
                <rect y="3.33" width="16" height="3.34" fill="#DD0000" />
                <rect y="6.67" width="16" height="3.33" fill="#FFCC00" />
              </svg>
              {t.madeInGermany}
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] uppercase tracking-wider font-medium"
              style={{
                color: "var(--color-text-secondary)",
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <svg width="16" height="10" viewBox="0 0 16 10" aria-hidden="true" className="shrink-0 rounded-[1px]">
                <rect width="16" height="10" fill="#003399" />
                <g transform="translate(8,5)">
                  {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
                    <polygon
                      key={angle}
                      points="0,-3.2 0.4,-1 0,-1.4 -0.4,-1"
                      fill="#FFCC00"
                      transform={`rotate(${angle})`}
                    />
                  ))}
                </g>
              </svg>
              {t.gdprCompliant}
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
            &copy; {new Date().getFullYear()} {t.copyright}
          </p>
        </div>
      </div>
    </footer>
  )
}
