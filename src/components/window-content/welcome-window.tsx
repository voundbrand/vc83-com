"use client";

import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

/**
 * Welcome Window - First impression for visitors
 *
 * Speaks directly to the €1M–€50M business owner ICP.
 * Voice: Ogilvy precision, Hormozi arithmetic, Fisher respect.
 * Uses Codec Pro all-caps for the sevenlayers.io brand name.
 */
export function WelcomeWindow() {
  const { tWithFallback } = useNamespaceTranslations("ui.welcome");

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto" style={{ background: 'var(--win95-bg)' }}>
      {/* Hero */}
      <div className="text-center mb-2">
        <h1
          className="text-4xl md:text-5xl font-bold mb-3 uppercase tracking-wide"
          style={{ color: 'var(--win95-text)', fontFamily: 'var(--font-codec-pro), Arial, Helvetica, sans-serif' }}
        >
          sevenlayers.io
        </h1>
        <p className="text-lg font-semibold leading-snug tracking-wide" style={{ color: 'var(--win95-text)' }}>
          {tWithFallback(
            "ui.welcome.v2.tagline",
            "Private AI. You can Trust.",
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
            "You already know you are the bottleneck. Not because you manage poorly \u2014 because the work that matters most still lives in your head. Context, judgment, the decisions no hire has ever fully absorbed.",
          )}
        </p>
        <p>
          {tWithFallback(
            "ui.welcome.v2.description_para2",
            "One operator. Yours alone. Built on your business, your clients, and your way of working. It starts with a single briefing conversation and goes live within seven days.",
          )}
        </p>
        <p>
          {tWithFallback(
            "ui.welcome.v2.description_para3",
            "Monthly. No lock-in. If it does not earn its seat, cancel. C-suite leverage at a fraction of the payroll.",
          )}
        </p>
        <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
          {tWithFallback(
            "ui.welcome.first_run_path",
            "The first hire that actually compounds.",
          )}
        </p>
        <p className="text-center font-semibold pt-2 border-t" style={{
          color: 'var(--win95-text)',
          borderColor: 'var(--win95-border)'
        }}>
          {tWithFallback("ui.welcome.v2.cta", "Start the briefing")}
        </p>
      </div>

      {/* Footer */}
      <div className="text-xs text-center border-t-2 pt-3 mt-4 space-y-1" style={{
        color: 'var(--neutral-gray)',
        borderColor: 'var(--win95-border)'
      }}>
        <div>{tWithFallback("ui.welcome.footer", "Built for owners running \u20AC1M\u2013\u20AC50M companies.")}</div>
        <div>
          {tWithFallback("ui.welcome.footer_startup", "sevenlayers.io is a vc83-W26 startup").split(/(sevenlayers\.io)/i).map((part, index) =>
            /sevenlayers\.io/i.test(part) ? (
              <span key={index} className="uppercase tracking-wide" style={{ fontFamily: 'var(--font-codec-pro), Arial, Helvetica, sans-serif' }}>{part}</span>
            ) : (
              <span key={index}>{part}</span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
