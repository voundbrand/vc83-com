"use client";

import { useEffect, useState } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export const SHELL_MOTION = {
  durationMs: {
    instant: 0,
    fast: 120,
    base: 180,
    slow: 260,
  },
  easing: {
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    emphasized: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  },
} as const;

export function useReducedMotionPreference(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    setPrefersReducedMotion(mediaQuery.matches);

    const handleMotionPreferenceChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handleMotionPreferenceChange);
    return () => {
      mediaQuery.removeEventListener("change", handleMotionPreferenceChange);
    };
  }, []);

  return prefersReducedMotion;
}

export function buildShellTransition(
  property: string,
  durationMs: number,
  prefersReducedMotion: boolean,
  easing: string = SHELL_MOTION.easing.standard,
): string {
  if (prefersReducedMotion || durationMs <= 0) {
    return "none";
  }

  return `${property} ${durationMs}ms ${easing}`;
}
