"use client";

import { useTranslation } from "@/contexts/translation-context";

/**
 * Welcome Window - First impression for visitors
 *
 * This is an engaging landing experience that appears
 * as a moveable window. Explains the Layer Cake concept.
 *
 * ✅ Now fully internationalized with translation support
 */
export function WelcomeWindow() {
  const { t } = useTranslation();

  return (
    <div className="p-6 space-y-4 h-full overflow-y-auto" style={{ background: 'var(--win95-bg)' }}>
      <div className="text-center mb-2">
        <h1 className="text-3xl font-bold mb-2 font-['Press_Start_2P']" style={{ color: 'var(--win95-text)' }}>
          🍰 L4YERCAK3
        </h1>
        <p className="text-base italic leading-relaxed" style={{ color: 'var(--win95-text)' }}>
          {t("ui.welcome.tagline")}
        </p>
      </div>

      <div className="space-y-3 text-sm leading-relaxed border-2 p-4 shadow-inner" style={{
        color: 'var(--win95-text)',
        background: 'var(--win95-bg-light)',
        borderColor: 'var(--win95-border)'
      }}>
        <p>
          {t("ui.welcome.description_para1")}
        </p>
        <p>
          {t("ui.welcome.description_para2")}
        </p>
        <p className="text-center font-semibold pt-2 border-t" style={{
          color: 'var(--win95-text)',
          borderColor: 'var(--win95-border)'
        }}>
          {t("ui.welcome.greeting")}
        </p>
      </div>

      {/* Footer Tease */}
      <div className="text-xs text-center border-t-2 pt-3 mt-4 space-y-1" style={{
        color: 'var(--neutral-gray)',
        borderColor: 'var(--win95-border)'
      }}>
        <div>{t("ui.welcome.footer")}</div>
        <div>{t("ui.welcome.footer_startup")}</div>
      </div>
    </div>
  );
}
