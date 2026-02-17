"use client";

import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

/**
 * Welcome Window - First impression for visitors
 *
 * Agency-focused landing experience explaining the AI employee platform.
 * Uses Playfair Display italic for the l4yercak3 brand name.
 */
export function WelcomeWindow() {
  const { t } = useNamespaceTranslations("ui.welcome");

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto" style={{ background: 'var(--win95-bg)' }}>
      {/* Hero */}
      <div className="text-center mb-2">
        <h1
          className="text-4xl md:text-5xl italic font-bold mb-3"
          style={{ color: 'var(--win95-text)', fontFamily: 'var(--font-playfair), Georgia, serif' }}
        >
          l4yercak3
        </h1>
        <p className="text-base font-semibold leading-relaxed" style={{ color: 'var(--win95-text)' }}>
          {t("ui.welcome.tagline")}
        </p>
      </div>

      {/* Body */}
      <div className="space-y-3 text-sm leading-relaxed border-2 p-4 shadow-inner" style={{
        color: 'var(--win95-text)',
        background: 'var(--win95-bg-light)',
        borderColor: 'var(--win95-border)'
      }}>
        <p>{t("ui.welcome.description_para1")}</p>
        <p>{t("ui.welcome.description_para2")}</p>
        <p>{t("ui.welcome.description_para3")}</p>
        <p className="text-center font-semibold pt-2 border-t" style={{
          color: 'var(--win95-text)',
          borderColor: 'var(--win95-border)'
        }}>
          {t("ui.welcome.cta")}
        </p>
      </div>

      {/* Footer */}
      <div className="text-xs text-center border-t-2 pt-3 mt-4 space-y-1" style={{
        color: 'var(--neutral-gray)',
        borderColor: 'var(--win95-border)'
      }}>
        <div>{t("ui.welcome.footer")}</div>
        <div>
          {t("ui.welcome.footer_startup").split(/(l4yercak3)/i).map((part, index) =>
            /l4yercak3/i.test(part) ? (
              <span key={index} className="italic" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>{part}</span>
            ) : (
              <span key={index}>{part}</span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
