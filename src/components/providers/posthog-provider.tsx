"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, useState } from "react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !isInitialized) {
      posthog.init("phc_jwqoOV8cMTeNZU4AMBBFs5Ss8d80ofM1C8soOAYfPit", {
        api_host: "https://eu.i.posthog.com",
        person_profiles: "identified_only",
        capture_pageview: false, // We'll track pageviews manually
        capture_pageleave: true,
      });
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // If you want to temporarily bypass PostHog to debug, uncomment the next line:
  // return <>{children}</>;

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
