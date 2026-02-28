"use client";

import { useEffect } from "react";
import { readLandingAuditState } from "../lib/audit-chat-client";
import { trackLandingPageView } from "../lib/analytics";

export function LandingAnalyticsEntrypoint() {
  useEffect(() => {
    const snapshot = readLandingAuditState();
    trackLandingPageView({
      hasSessionToken: Boolean(snapshot.sessionToken),
      hasClaimToken: Boolean(snapshot.claimToken),
    });
  }, []);

  return null;
}

