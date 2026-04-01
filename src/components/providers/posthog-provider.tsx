"use client";

import React from "react";
import {
  buildShellTelemetryPayload,
  type ShellTelemetryEventName,
} from "@/lib/shell/telemetry";
import { isAnalyticsConsentGranted } from "@/lib/cookie-consent";

export { buildShellTelemetryPayload, type ShellTelemetryEventName } from "@/lib/shell/telemetry";

type AnalyticsClient = {
  capture: (event: string, payload?: Record<string, unknown>) => void;
  identify: (distinctId: string, payload?: Record<string, unknown>) => void;
} | null;

/**
 * PostHog has been removed from runtime telemetry.
 * Keep this hook to avoid touching every callsite in one sweep.
 */
export function usePostHog(): AnalyticsClient {
  return null;
}

export function captureShellTelemetry(
  event: ShellTelemetryEventName,
  payload: Record<string, unknown>
): void {
  if (typeof window === "undefined" || !isAnalyticsConsentGranted()) {
    return;
  }

  // Analytics runtime intentionally removed (GDPR fail-closed posture).
  // Keep payload construction as a stable contract for future providers.
  void event;
  void payload;
  buildShellTelemetryPayload(event, payload);
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
