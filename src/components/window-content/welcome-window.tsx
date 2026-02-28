"use client";

import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

/**
 * Welcome Window - First impression for visitors
 *
 * Business-owner-focused landing experience explaining the AI employee platform.
 * Uses Playfair Display italic for the l4yercak3 brand name.
 */
export function WelcomeWindow() {
  const { tWithFallback } = useNamespaceTranslations("ui.welcome");

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
          {tWithFallback(
            "ui.welcome.v2.tagline",
            "Voice-first agent setup with deploy handoff in about 15 minutes.",
          )}
        </p>
      </div>

      {/* Body */}
      <div className="space-y-3 text-sm leading-relaxed border-2 p-4 shadow-inner" style={{
        color: 'var(--win95-text)',
        background: 'var(--win95-bg-light)',
        borderColor: 'var(--win95-border)'
      }}>
        <p>
          {tWithFallback(
            "ui.welcome.v2.description_para1",
            "Start in Talk mode for voice-first setup, or switch to Type mode at any step. The first-run flow keeps both paths in sync.",
          )}
        </p>
        <p>
          {tWithFallback(
            "ui.welcome.v2.description_para2",
            "Capture your agent mission, trust checkpoints, and channel guardrails in one guided pass without opening separate configuration tools.",
          )}
        </p>
        <p>
          {tWithFallback(
            "ui.welcome.v2.description_para3",
            "After calibration, deployment handoff appears immediately with choices for Webchat, Telegram, or Both so launch momentum is not lost.",
          )}
        </p>
        <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
          {tWithFallback(
            "ui.welcome.first_run_path",
            "First-run path: Talk or Type -> Soul-binding completion -> Deploy to Webchat / Telegram / Both.",
          )}
        </p>
        <p className="text-center font-semibold pt-2 border-t" style={{
          color: 'var(--win95-text)',
          borderColor: 'var(--win95-border)'
        }}>
          {tWithFallback("ui.welcome.v2.cta", "Create my agent now")}
        </p>
      </div>

      {/* Footer */}
      <div className="text-xs text-center border-t-2 pt-3 mt-4 space-y-1" style={{
        color: 'var(--neutral-gray)',
        borderColor: 'var(--win95-border)'
      }}>
        <div>{tWithFallback("ui.welcome.footer", "Built for business. Voice-first onboarding with explicit deployment handoff.")}</div>
        <div>
          {tWithFallback("ui.welcome.footer_startup", "l4yercak3 is a vc83-W26 startup").split(/(l4yercak3)/i).map((part, index) =>
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
