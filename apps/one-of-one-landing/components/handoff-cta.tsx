"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LANDING_AUDIT_STATE_EVENT } from "../lib/audit-chat-client";
import {
  resolveLandingEntrypointLatencyMs,
  toTelemetryDestination,
  trackLandingEvent,
} from "../lib/analytics";
import {
  buildLandingHandoffLinks,
  getEmptyLandingAuditHandoffState,
  readLandingCampaignAttribution,
  readLandingAuditHandoffState,
  type LandingAuditHandoffState,
} from "../lib/handoff";

export interface HandoffTranslations {
  startFree: string;
  startFreeDesc: string;
  doneWithYou: string;
  doneWithYouPrice: string;
  doneWithYouDesc: string;
  fullBuild: string;
  fullBuildPrice: string;
  fullBuildDesc: string;
  startCheckout: string;
  createAccountCarryContext: string;
}

const DEFAULT_TRANSLATIONS: HandoffTranslations = {
  startFree: "Free Diagnostic",
  startFreeDesc:
    "Run a free diagnostic audit to qualify your highest-leverage workflow before any paid scope.",
  doneWithYou: "Consulting Sprint",
  doneWithYouPrice: "€3,500 excl. VAT (scope-only)",
  doneWithYouDesc:
    "Strategy and implementation roadmap only. No production build is included in this sprint.",
  fullBuild: "Implementation Start",
  fullBuildPrice: "from €7,000 excl. VAT",
  fullBuildDesc:
    "Production implementation starts here, beginning with layer-one foundation and delivery.",
  startCheckout: "Checkout",
  createAccountCarryContext: "Create account and keep your audit progress",
};

export function HandoffCta({
  cardsOnly = false,
  translations,
}: {
  cardsOnly?: boolean;
  translations?: HandoffTranslations;
}) {
  const t = translations ?? DEFAULT_TRANSLATIONS;

  const [handoffState, setHandoffState] = useState<LandingAuditHandoffState>(
    getEmptyLandingAuditHandoffState()
  );
  const [attribution, setAttribution] = useState<ReturnType<typeof readLandingCampaignAttribution>>(
    undefined
  );

  useEffect(() => {
    const refresh = () => setHandoffState(readLandingAuditHandoffState());

    refresh();
    setAttribution(readLandingCampaignAttribution());
    window.addEventListener(LANDING_AUDIT_STATE_EVENT, refresh as EventListener);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener(LANDING_AUDIT_STATE_EVENT, refresh as EventListener);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const links = useMemo(
    () => buildLandingHandoffLinks(handoffState, attribution),
    [attribution, handoffState]
  );
  const continuity = useMemo(
    () => ({
      hasSessionToken: Boolean(handoffState.sessionToken),
      hasClaimToken: Boolean(handoffState.claimToken),
    }),
    [handoffState.claimToken, handoffState.sessionToken]
  );

  useEffect(() => {
    if (!handoffState.isAuditReady) return;

    const entrypointLatencyMs = resolveLandingEntrypointLatencyMs();

    trackLandingEvent({
      eventName: "onboarding.funnel.audit_completed",
      continuity,
      onceKey: "audit_completed",
      metadata: {
        userMessages: handoffState.userMessages,
        assistantMessages: handoffState.assistantMessages,
        handoffReady: true,
        entrypointLatencyMs,
      },
    });

    trackLandingEvent({
      eventName: "onboarding.funnel.audit_handoff_opened",
      continuity,
      onceKey: "audit_handoff_opened",
      metadata: {
        userMessages: handoffState.userMessages,
        assistantMessages: handoffState.assistantMessages,
        handoffSurface: "paths_section",
        entrypointLatencyMs,
      },
    });
  }, [continuity, handoffState.assistantMessages, handoffState.isAuditReady, handoffState.userMessages]);

  const trackCtaClick = (args: {
    eventName: "onboarding.funnel.activation" | "onboarding.funnel.signup" | "onboarding.funnel.upgrade";
    ctaId: string;
    destinationUrl: string;
    ctaGroup: "signup" | "start_free" | "upgrade";
  }) => {
    trackLandingEvent({
      eventName: args.eventName,
      continuity,
      metadata: {
        ctaId: args.ctaId,
        ctaGroup: args.ctaGroup,
        destination: toTelemetryDestination(args.destinationUrl),
        handoffReady: handoffState.isAuditReady,
        userMessages: handoffState.userMessages,
        assistantMessages: handoffState.assistantMessages,
      },
    });
  };

  return (
    <div
      aria-labelledby={cardsOnly ? undefined : "handoff-title"}
      aria-label={cardsOnly ? "Conversion paths" : undefined}
    >
      {!cardsOnly && !handoffState.isAuditReady && (
        <p
          className="text-sm text-center mb-6"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          You can check out directly now. A few audit exchanges simply make the handoff context richer.
        </p>
      )}

      {!cardsOnly && handoffState.claimToken && (
        <div className="text-center mb-8">
          <a
            className="btn-accent inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium"
            href={links.createAccountUrl}
            onClick={() =>
              trackCtaClick({
                eventName: "onboarding.funnel.signup",
                ctaId: "create_account",
                destinationUrl: links.createAccountUrl,
                ctaGroup: "signup",
              })
            }
          >
            {t.createAccountCarryContext}
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Start Free */}
        <div className="path-card flex flex-col">
          <h3
            className="text-lg font-semibold mb-2"
            style={{ color: "var(--color-text)" }}
          >
            {t.startFree}
          </h3>
          <p
            className="text-sm mb-6 flex-1"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {t.startFreeDesc}
          </p>
          <Button asChild className="btn-secondary text-sm h-9 gap-2">
            <a
              href="#diagnostic"
              onClick={() =>
                trackCtaClick({
                  eventName: "onboarding.funnel.activation",
                  ctaId: "start_free_diagnostic",
                  destinationUrl: "#diagnostic",
                  ctaGroup: "start_free",
                })
              }
            >
              <ArrowRight className="w-4 h-4" />
              {t.startFree}
            </a>
          </Button>
        </div>

        {/* Done With You */}
        <div className="path-card flex flex-col">
          <h3
            className="text-lg font-semibold mb-2"
            style={{ color: "var(--color-text)" }}
          >
            {t.doneWithYou}
          </h3>
          <p
            className="text-xs font-medium mb-2"
            style={{ color: "var(--color-accent)" }}
          >
            {t.doneWithYouPrice}
          </p>
          <p className="motion-contract-note mb-2">Scope-only consulting. No implementation delivery.</p>
          <p
            className="text-sm mb-6 flex-1"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {t.doneWithYouDesc}
          </p>
          <Button asChild className="btn-primary text-sm h-9 gap-2">
            <a
              href={links.doneWithYouCheckoutUrl}
              onClick={() =>
                trackCtaClick({
                  eventName: "onboarding.funnel.upgrade",
                  ctaId: "done_with_you_checkout",
                  destinationUrl: links.doneWithYouCheckoutUrl,
                  ctaGroup: "upgrade",
                })
              }
            >
              <CreditCard className="w-4 h-4" />
              {t.startCheckout}
            </a>
          </Button>
        </div>

        {/* Full Build */}
        <div className="path-card flex flex-col">
          <h3
            className="text-lg font-semibold mb-2"
            style={{ color: "var(--color-text)" }}
          >
            {t.fullBuild}
          </h3>
          <p
            className="text-xs font-medium mb-2"
            style={{ color: "var(--color-accent)" }}
          >
            {t.fullBuildPrice}
          </p>
          <p className="motion-contract-note mb-2">Implementation work starts at this motion.</p>
          <p
            className="text-sm mb-6 flex-1"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {t.fullBuildDesc}
          </p>
          <Button asChild className="btn-accent text-sm h-9 gap-2">
            <a
              href={links.fullBuildCheckoutUrl}
              onClick={() =>
                trackCtaClick({
                  eventName: "onboarding.funnel.upgrade",
                  ctaId: "full_build_checkout",
                  destinationUrl: links.fullBuildCheckoutUrl,
                  ctaGroup: "upgrade",
                })
              }
            >
              <CreditCard className="w-4 h-4" />
              {t.startCheckout}
              <ArrowRight className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
