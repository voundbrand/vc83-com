"use client";

import Link from "next/link";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { ChevronRight, Cookie, FileText, Scale, Settings2, ShieldCheck, X } from "lucide-react";
import {
  COOKIE_POLICY_VERSION,
  type CookieConsentDecision,
  type CookieConsentState,
  getStoredCookieConsentForPolicyVersion,
  getStoredCookieConsentSnapshot,
  setCookieConsent,
} from "@/lib/cookie-consent";
import { useAuth } from "@/hooks/use-auth";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { api: apiAny } = require("../../convex/_generated/api") as { api: any };

type ConsentEventSource = "cookie_banner" | "settings";
type Locale = "en" | "de";

type RecordConsentMutationArgs = {
  sessionId: string;
  consentType: "cookie_analytics";
  granted: boolean;
  policyVersion: string;
  source: ConsentEventSource;
  policyLocale?: string;
  policyUrl?: string;
};

type RecordConsentMutation = (args: RecordConsentMutationArgs) => Promise<unknown>;

const BANNER_DISMISSED_STORAGE_KEY = "vc83_cookie_banner_dismissed";

const COPY = {
  en: {
    openPanel: "Legal & Cookies",
    pending: "Set consent",
    panelTitle: "Legal Access",
    panelSubtitle:
      "Legal notice, privacy information, and cookie controls stay available here at all times.",
    legalNavAriaLabel: "Legal links",
    closePanel: "Close legal panel",
    impressum: "Impressum",
    privacy: "Privacy",
    terms: "Terms",
    cookies: "Cookie Policy",
    cookieSettingsTitle: "Cookie settings",
    cookieStatusPending: "Preference not set yet. Optional analytics remains disabled by default.",
    cookieStatusOutdated:
      "Your previous consent was recorded for an older policy version. Please review and confirm your current preference.",
    cookieStatusAccepted: "Optional analytics cookies are currently enabled.",
    cookieStatusDeclined: "Only essential cookies are enabled.",
    accept: "Accept",
    decline: "Decline",
    bannerTitle: "Cookie notice",
    bannerBody:
      "We only activate optional analytics cookies after explicit approval. You can withdraw or change consent at any time.",
    bannerBodyUpdated:
      "Our cookie policy version has been updated. Please review and set your preference again.",
    bannerReadPolicy: "Read cookie policy",
    bannerManage: "Manage settings",
    bannerClose: "Dismiss cookie notice",
  },
  de: {
    openPanel: "Recht & Cookies",
    pending: "Einwilligung setzen",
    panelTitle: "Rechtlicher Zugang",
    panelSubtitle:
      "Impressum, Datenschutzinformationen und Cookie-Steuerung sind hier jederzeit erreichbar.",
    legalNavAriaLabel: "Rechtliche Links",
    closePanel: "Rechtliches Panel schließen",
    impressum: "Impressum",
    privacy: "Datenschutz",
    terms: "AGB",
    cookies: "Cookie-Richtlinie",
    cookieSettingsTitle: "Cookie-Einstellungen",
    cookieStatusPending:
      "Noch keine Präferenz gesetzt. Optionale Analytics bleiben standardmäßig deaktiviert.",
    cookieStatusOutdated:
      "Ihre vorige Einwilligung wurde für eine ältere Richtlinienversion gespeichert. Bitte überprüfen Sie die aktuelle Version und bestätigen Sie erneut.",
    cookieStatusAccepted: "Optionale Analytics-Cookies sind aktuell aktiviert.",
    cookieStatusDeclined: "Es sind nur essenzielle Cookies aktiviert.",
    accept: "Akzeptieren",
    decline: "Ablehnen",
    bannerTitle: "Cookie-Hinweis",
    bannerBody:
      "Optionale Analytics-Cookies werden erst nach ausdrücklicher Zustimmung aktiviert. Sie können die Einwilligung jederzeit widerrufen oder ändern.",
    bannerBodyUpdated:
      "Die Version unserer Cookie-Richtlinie wurde aktualisiert. Bitte setzen Sie Ihre Präferenz erneut.",
    bannerReadPolicy: "Cookie-Richtlinie lesen",
    bannerManage: "Einstellungen öffnen",
    bannerClose: "Cookie-Hinweis schließen",
  },
} as const;

function detectLocale(): Locale {
  if (typeof window === "undefined") {
    return "en";
  }
  const browserLanguage = window.navigator.language.toLowerCase();
  return browserLanguage.startsWith("de") ? "de" : "en";
}

function readBannerDismissed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(BANNER_DISMISSED_STORAGE_KEY) === "1";
}

function setBannerDismissedStorage(value: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  if (value) {
    window.localStorage.setItem(BANNER_DISMISSED_STORAGE_KEY, "1");
    return;
  }
  window.localStorage.removeItem(BANNER_DISMISSED_STORAGE_KEY);
}

export function CookieConsentBanner() {
  const { sessionId } = useAuth();
  const unsafeUseMutation = useMutation as unknown as (
    mutationRef: unknown
  ) => RecordConsentMutation;
  const recordConsent = unsafeUseMutation(apiAny.consent.recordConsent);
  const lastSyncedDecisionRef = useRef<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);

  const [locale, setLocale] = useState<Locale>("en");
  const [isOpen, setIsOpen] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [decision, setDecision] = useState<CookieConsentState>(null);
  const [requiresPolicyRefresh, setRequiresPolicyRefresh] = useState(false);

  const persistConsent = useCallback(
    async (granted: boolean, source: ConsentEventSource) => {
      if (!sessionId) {
        return;
      }

      try {
        await recordConsent({
          sessionId,
          consentType: "cookie_analytics",
          granted,
          policyVersion: COOKIE_POLICY_VERSION,
          source,
          policyLocale: locale,
          policyUrl: "/cookies",
        });
      } catch (error) {
        console.error("[CookieConsent] Failed to persist consent record:", error);
      }
    },
    [locale, recordConsent, sessionId]
  );

  useEffect(() => {
    setLocale(detectLocale());
    const snapshot = getStoredCookieConsentSnapshot();
    const stored = getStoredCookieConsentForPolicyVersion(COOKIE_POLICY_VERSION);
    const dismissed = readBannerDismissed();
    const needsRefresh = Boolean(snapshot && snapshot.policyVersion !== COOKIE_POLICY_VERSION);
    setRequiresPolicyRefresh(needsRefresh);
    setDecision(stored);

    if (stored === null && (!dismissed || needsRefresh)) {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!isPanelOpen) {
      return;
    }

    const pointerHandler = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      const clickedPanel = panelRef.current?.contains(target);
      const clickedTrigger = triggerRef.current?.contains(target);
      if (!clickedPanel && !clickedTrigger) {
        setIsPanelOpen(false);
      }
    };

    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPanelOpen(false);
      }
    };

    window.addEventListener("pointerdown", pointerHandler);
    window.addEventListener("keydown", keyHandler);
    return () => {
      window.removeEventListener("pointerdown", pointerHandler);
      window.removeEventListener("keydown", keyHandler);
    };
  }, [isPanelOpen]);

  useEffect(() => {
    if (isPanelOpen) {
      firstLinkRef.current?.focus();
    }
  }, [isPanelOpen]);

  useEffect(() => {
    if (!sessionId || decision === null) {
      return;
    }

    const syncKey = `${sessionId}:${decision}`;
    if (lastSyncedDecisionRef.current === syncKey) {
      return;
    }

    lastSyncedDecisionRef.current = syncKey;
    void persistConsent(decision === "accepted", "settings");
  }, [decision, persistConsent, sessionId]);

  const applyDecision = useCallback(
    (nextDecision: CookieConsentDecision, source: ConsentEventSource) => {
      setCookieConsent(nextDecision, COOKIE_POLICY_VERSION);
      setDecision(nextDecision);
      setIsOpen(false);
      setIsPanelOpen(false);
      setBannerDismissedStorage(false);
      void persistConsent(nextDecision === "accepted", source);
    },
    [persistConsent]
  );

  const dismissBanner = useCallback(() => {
    setIsOpen(false);
    setBannerDismissedStorage(true);
  }, []);

  const openSettingsPanel = useCallback(() => {
    setIsOpen(false);
    setIsPanelOpen(true);
  }, []);

  const togglePanel = useCallback(() => {
    setIsPanelOpen((current) => !current);
  }, []);

  function handleAccept(source: ConsentEventSource) {
    applyDecision("accepted", source);
  }

  function handleDecline(source: ConsentEventSource) {
    applyDecision("declined", source);
  }

  const t = COPY[locale];
  const consentNeedsAction = decision === null;
  const consentStatus =
    decision === "accepted"
      ? t.cookieStatusAccepted
      : decision === "declined"
        ? t.cookieStatusDeclined
        : requiresPolicyRefresh
          ? t.cookieStatusOutdated
          : t.cookieStatusPending;

  const legalLinks = [
    { href: "/impressum", label: t.impressum, icon: Scale },
    { href: "/privacy", label: t.privacy, icon: ShieldCheck },
    { href: "/terms", label: t.terms, icon: FileText },
    { href: "/cookies", label: t.cookies, icon: Cookie },
  ] as const;

  const floatingBottomClass =
    "bottom-[calc(var(--taskbar-height,48px)+env(safe-area-inset-bottom,0px)+12px)] md:bottom-4";
  const panelBottomClass =
    "bottom-[calc(var(--taskbar-height,48px)+env(safe-area-inset-bottom,0px)+64px)] md:bottom-[68px]";
  const bannerBottomClass =
    "bottom-[calc(var(--taskbar-height,48px)+env(safe-area-inset-bottom,0px)+120px)] md:bottom-24";

  return (
    <>
      {isOpen && (
        <section
          className={`fixed right-4 z-[9998] w-[min(92vw,360px)] rounded-lg border p-4 shadow-2xl ${bannerBottomClass}`}
          style={{
            backgroundColor: "var(--window-shell-bg)",
            borderColor: "var(--window-shell-border)",
          }}
          role="dialog"
          aria-label={t.bannerTitle}
          aria-live="polite"
        >
          <button
            onClick={dismissBanner}
            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2"
            style={{
              color: "var(--window-document-text-muted)",
            }}
            aria-label={t.bannerClose}
          >
            <X size={16} />
          </button>
          <h2 className="pr-8 text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
            {t.bannerTitle}
          </h2>
          <p className="mt-2 text-xs leading-5" style={{ color: "var(--window-document-text-muted)" }}>
            {requiresPolicyRefresh ? t.bannerBodyUpdated : t.bannerBody}
          </p>
          <Link
            href="/cookies"
            className="mt-2 inline-flex text-xs underline underline-offset-2"
            style={{ color: "var(--shell-accent)" }}
          >
            {t.bannerReadPolicy}
          </Link>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => handleDecline("cookie_banner")}
              className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2"
              style={{
                borderColor: "var(--window-shell-border)",
                color: "var(--window-document-text)",
                backgroundColor: "var(--window-document-bg-elevated)",
              }}
            >
              {t.decline}
            </button>
            <button
              onClick={() => handleAccept("cookie_banner")}
              className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2"
              style={{
                borderColor: "var(--shell-accent)",
                color: "var(--shell-on-accent)",
                backgroundColor: "var(--shell-accent)",
              }}
            >
              {t.accept}
            </button>
            <button
              onClick={openSettingsPanel}
              className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2"
              style={{
                borderColor: "var(--window-shell-border)",
                color: "var(--window-document-text-muted)",
                backgroundColor: "transparent",
              }}
            >
              {t.bannerManage}
            </button>
          </div>
        </section>
      )}

      <button
        ref={triggerRef}
        onClick={togglePanel}
        className={`fixed right-4 z-[9998] inline-flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-2 ${floatingBottomClass}`}
        style={{
          backgroundColor: "var(--window-shell-bg)",
          borderColor: "var(--window-shell-border)",
          color: "var(--window-document-text)",
        }}
        aria-haspopup="dialog"
        aria-expanded={isPanelOpen}
        aria-controls="legal-cookie-panel"
      >
        <Scale size={14} />
        <span>{t.openPanel}</span>
        {consentNeedsAction && (
          <span
            className="rounded-full border px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.02em]"
            style={{
              borderColor: "var(--shell-accent)",
              color: "var(--shell-accent)",
              backgroundColor: "var(--shell-accent-soft)",
            }}
          >
            {t.pending}
          </span>
        )}
      </button>

      {isPanelOpen && (
        <section
          ref={panelRef}
          id="legal-cookie-panel"
          role="dialog"
          aria-modal="false"
          aria-label={t.panelTitle}
          className={`fixed right-4 z-[9998] w-[min(92vw,380px)] rounded-lg border p-4 shadow-2xl ${panelBottomClass}`}
          style={{
            backgroundColor: "var(--window-shell-bg)",
            borderColor: "var(--window-shell-border)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                {t.panelTitle}
              </h2>
              <p className="mt-1 text-xs leading-5" style={{ color: "var(--window-document-text-muted)" }}>
                {t.panelSubtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPanelOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2"
              style={{
                borderColor: "var(--window-shell-border)",
                color: "var(--window-document-text-muted)",
                backgroundColor: "var(--window-document-bg-elevated)",
              }}
              aria-label={t.closePanel}
            >
              <X size={14} />
            </button>
          </div>

          <nav className="mt-4 space-y-2" aria-label={t.legalNavAriaLabel}>
            {legalLinks.map((link, index) => (
              <Link
                key={link.href}
                href={link.href}
                ref={index === 0 ? firstLinkRef : undefined}
                onClick={() => setIsPanelOpen(false)}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2"
                style={{
                  borderColor: "var(--window-shell-border)",
                  color: "var(--window-document-text)",
                  backgroundColor: "var(--window-document-bg-elevated)",
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <link.icon size={14} />
                  {link.label}
                </span>
                <ChevronRight size={14} style={{ color: "var(--window-document-text-muted)" }} />
              </Link>
            ))}
          </nav>

          <div
            className="mt-4 rounded-md border p-3"
            style={{
              borderColor: "var(--window-shell-border)",
              backgroundColor: "var(--window-document-bg-elevated)",
            }}
          >
            <h3 className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--window-document-text)" }}>
              <Settings2 size={14} />
              {t.cookieSettingsTitle}
            </h3>
            <p className="mt-2 text-xs leading-5" style={{ color: "var(--window-document-text-muted)" }}>
              {consentStatus}
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                onClick={() => handleDecline("settings")}
                className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2"
                style={{
                  borderColor: "var(--window-shell-border)",
                  color: "var(--window-document-text)",
                  backgroundColor: "var(--window-shell-bg)",
                }}
              >
                {t.decline}
              </button>
              <button
                onClick={() => handleAccept("settings")}
                className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2"
                style={{
                  borderColor: "var(--shell-accent)",
                  color: "var(--shell-on-accent)",
                  backgroundColor: "var(--shell-accent)",
                }}
              >
                {t.accept}
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
