"use client";

/**
 * CHAT PAGE - Full-screen AI assistant
 *
 * Renders the AIChatWindow component in full-screen mode.
 * Same component is used in the desktop window manager.
 */

import { Suspense, useEffect } from "react";
import { AIChatWindow } from "@/components/window-content/ai-chat-window";
import { setNativeGuestClaimToken } from "@/hooks/use-ai-chat";

type CommercialRoutingHint = "samantha_lead_capture" | "founder_bridge" | "enterprise_sales";
type CommercialAudienceTemperature = "warm" | "cold";

function resolveLegacyLandingCommercialIntent(params: URLSearchParams): {
  offerCode?: string;
  intentCode?: string;
  surface?: string;
  routingHint?: CommercialRoutingHint;
} {
  const handoff = params.get("handoff");
  const intent = params.get("intent");
  if (handoff !== "one-of-one" || !intent) {
    return {};
  }

  if (intent === "resume") {
    return {
      offerCode: "consult_full_build_scoping",
      intentCode: "diagnostic_qualification",
      surface: "one_of_one_landing",
      routingHint: "samantha_lead_capture",
    };
  }

  if (intent === "done-with-you") {
    return {
      offerCode: "consult_done_with_you",
      intentCode: "consulting_sprint_scope_only",
      surface: "one_of_one_landing",
      routingHint: "samantha_lead_capture",
    };
  }

  if (intent === "full-build") {
    return {
      offerCode: "layer1_foundation",
      intentCode: "implementation_start_layer1",
      surface: "one_of_one_landing",
      routingHint: "founder_bridge",
    };
  }

  return {};
}

export default function ChatPage() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const identityClaimToken = params.get("identityClaimToken");
    const onboardingChannel = params.get("onboardingChannel");
    const legacyIntent = resolveLegacyLandingCommercialIntent(params);
    const commercialIntent = {
      offerCode: params.get("offer_code") || params.get("offerCode") || legacyIntent.offerCode || undefined,
      intentCode: params.get("intent_code") || params.get("intentCode") || legacyIntent.intentCode || undefined,
      surface: params.get("surface") || legacyIntent.surface || undefined,
      audienceTemperature:
        (params.get("audience_temperature") || params.get("audienceTemperature") || undefined) as
          | CommercialAudienceTemperature
          | undefined,
      routingHint:
        (params.get("routing_hint") || params.get("routingHint") || legacyIntent.routingHint || undefined) as
          | CommercialRoutingHint
          | undefined,
    };
    const onboardingCampaign = {
      source: params.get("source") || params.get("utm_source") || params.get("utmSource") || undefined,
      medium: params.get("medium") || params.get("utm_medium") || params.get("utmMedium") || undefined,
      campaign: params.get("campaign") || params.get("utm_campaign") || params.get("utmCampaign") || undefined,
      content: params.get("content") || params.get("utm_content") || params.get("utmContent") || undefined,
      term: params.get("term") || params.get("utm_term") || params.get("utmTerm") || undefined,
      referrer: params.get("referrer") || undefined,
      landingPath: params.get("landingPath") || undefined,
    };

    const hasOnboardingCampaign = Object.values(onboardingCampaign).some(
      (value) => typeof value === "string" && value.length > 0
    );
    const hasCommercialIntent = Object.values(commercialIntent).some(
      (value) => typeof value === "string" && value.length > 0
    );

    if (onboardingChannel || hasOnboardingCampaign || hasCommercialIntent) {
      localStorage.setItem(
        "l4yercak3_onboarding_attribution",
        JSON.stringify({
          channel: onboardingChannel || "native_guest",
          campaign: hasOnboardingCampaign ? onboardingCampaign : undefined,
          commercialIntent: hasCommercialIntent ? commercialIntent : undefined,
          capturedAt: Date.now(),
        })
      );
    }

    if (identityClaimToken) {
      setNativeGuestClaimToken(identityClaimToken);
    }
  }, []);

  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-900" />}>
      <div className="min-h-screen bg-zinc-900">
        <AIChatWindow fullScreen />
      </div>
    </Suspense>
  );
}
