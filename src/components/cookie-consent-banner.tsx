"use client";

import { useState, useEffect } from "react";
import posthog from "posthog-js";

type ConsentChoice = "accepted" | "declined" | null;

const CONSENT_KEY = "cookie_consent";

function getStoredConsent(): ConsentChoice {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(CONSENT_KEY);
  if (value === "accepted" || value === "declined") return value;
  return null;
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    if (stored === null) {
      setVisible(true);
    } else if (stored === "accepted") {
      posthog.opt_in_capturing();
    }
  }, []);

  function handleAccept() {
    localStorage.setItem(CONSENT_KEY, "accepted");
    posthog.opt_in_capturing();
    setVisible(false);
  }

  function handleDecline() {
    localStorage.setItem(CONSENT_KEY, "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[9999] p-4">
      <div className="max-w-xl mx-auto bg-zinc-900 border border-zinc-700 rounded-lg p-4 flex flex-col sm:flex-row items-center gap-3 shadow-2xl">
        <p className="text-sm text-zinc-300 flex-1">
          We use cookies for analytics to improve the platform.{" "}
          <a href="https://www.l4yercak3.com/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
            Privacy Policy
          </a>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleDecline}
            className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white border border-zinc-600 rounded transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-3 py-1.5 text-sm text-white bg-purple-600 hover:bg-purple-500 rounded transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
