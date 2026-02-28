"use client";

import { useEffect, useMemo, useState } from "react";
import { Apple, Monitor, Globe, MessageCircle, ArrowRight } from "lucide-react";
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
  startConversation: string;
}

const DEFAULT_TRANSLATIONS: HandoffTranslations = {
  startFree: "Start Free",
  startFreeDesc:
    "Download the app. Your operator begins learning you today. Free tier includes core interactions. Upgrade when you're ready.",
  doneWithYou: "Done With You",
  doneWithYouPrice: "€2,500 to start",
  doneWithYouDesc:
    "I personally build your operator around the workflow we identified in your audit. Live in 7 days. We build out from there.",
  fullBuild: "Full Build",
  fullBuildPrice: "Projects from €5,000",
  fullBuildDesc:
    "Custom operator deployment across your entire operation. Calendar, CRM, finance, client comms — all connected through one operator.",
  startConversation: "Start a conversation",
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
          These paths activate after a few audit exchanges so the handoff carries useful context.
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
            Create account and carry audit context
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
          <div className="flex flex-wrap gap-2">
            {links.iphoneDownloadUrl ? (
              <Button
                asChild
                className="btn-secondary text-xs h-8 px-3 gap-1.5"
              >
                <a
                  href={links.iphoneDownloadUrl}
                  onClick={() =>
                    trackCtaClick({
                      eventName: "onboarding.funnel.activation",
                      ctaId: "start_free_iphone",
                      destinationUrl: links.iphoneDownloadUrl || "",
                      ctaGroup: "start_free",
                    })
                  }
                >
                  <Apple className="w-3.5 h-3.5" />
                  iPhone
                </a>
              </Button>
            ) : (
              <Button className="btn-secondary text-xs h-8 px-3 gap-1.5" disabled>
                <Apple className="w-3.5 h-3.5" />
                iPhone
              </Button>
            )}
            {links.macosDownloadUrl ? (
              <Button
                asChild
                className="btn-secondary text-xs h-8 px-3 gap-1.5"
              >
                <a
                  href={links.macosDownloadUrl}
                  onClick={() =>
                    trackCtaClick({
                      eventName: "onboarding.funnel.activation",
                      ctaId: "start_free_macos",
                      destinationUrl: links.macosDownloadUrl || "",
                      ctaGroup: "start_free",
                    })
                  }
                >
                  <Monitor className="w-3.5 h-3.5" />
                  macOS
                </a>
              </Button>
            ) : (
              <Button className="btn-secondary text-xs h-8 px-3 gap-1.5" disabled>
                <Monitor className="w-3.5 h-3.5" />
                macOS
              </Button>
            )}
            <Button
              asChild
              className="btn-secondary text-xs h-8 px-3 gap-1.5"
            >
              <a
                href={links.webAppUrl}
                onClick={() =>
                  trackCtaClick({
                    eventName: "onboarding.funnel.activation",
                    ctaId: "start_free_web",
                    destinationUrl: links.webAppUrl,
                    ctaGroup: "start_free",
                  })
                }
              >
                <Globe className="w-3.5 h-3.5" />
                Web
              </a>
            </Button>
          </div>
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
          <p
            className="text-sm mb-6 flex-1"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {t.doneWithYouDesc}
          </p>
          {handoffState.isAuditReady ? (
            <Button asChild className="btn-primary text-sm h-9 gap-2">
              <a
                href={links.doneWithYouUrl}
                onClick={() =>
                  trackCtaClick({
                    eventName: "onboarding.funnel.upgrade",
                    ctaId: "done_with_you",
                    destinationUrl: links.doneWithYouUrl,
                    ctaGroup: "upgrade",
                  })
                }
              >
                <MessageCircle className="w-4 h-4" />
                {t.startConversation}
              </a>
            </Button>
          ) : (
            <Button className="btn-primary text-sm h-9 gap-2" disabled>
              <MessageCircle className="w-4 h-4" />
              {t.startConversation}
            </Button>
          )}
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
          <p
            className="text-sm mb-6 flex-1"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {t.fullBuildDesc}
          </p>
          {handoffState.isAuditReady ? (
            <Button asChild className="btn-accent text-sm h-9 gap-2">
              <a
                href={links.fullBuildUrl}
                onClick={() =>
                  trackCtaClick({
                    eventName: "onboarding.funnel.upgrade",
                    ctaId: "full_build",
                    destinationUrl: links.fullBuildUrl,
                    ctaGroup: "upgrade",
                  })
                }
              >
                <MessageCircle className="w-4 h-4" />
                {t.startConversation}
                <ArrowRight className="w-4 h-4" />
              </a>
            </Button>
          ) : (
            <Button className="btn-accent text-sm h-9 gap-2" disabled>
              <MessageCircle className="w-4 h-4" />
              {t.startConversation}
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
