"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      posthog.init("phc_jwqoOV8cMTeNZU4AMBBFs5Ss8d80ofM1C8soOAYfPit", {
        api_host: "https://eu.i.posthog.com",
        person_profiles: "identified_only",
        capture_pageview: false, // We'll track pageviews manually
        capture_pageleave: true,
      });
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
