import { describe, expect, it } from "vitest";
import {
  isSignedInTransition,
  isWindowAllowedWhenBetaRestricted,
  shouldAutoOpenLeadMagnetChatForGuest,
  shouldAutoOpenChatForSignedInUser,
} from "@/lib/shell/chat-entrypoint-policy";

describe("chat entrypoint policy", () => {
  it("treats login completion as a transition that should re-open initial chat flow", () => {
    expect(
      isSignedInTransition({
        previousSignedIn: false,
        isSignedIn: true,
      })
    ).toBe(true);

    expect(
      isSignedInTransition({
        previousSignedIn: true,
        isSignedIn: true,
      })
    ).toBe(false);
  });

  it("allows Quinn/Mother windows during beta restrictions while blocking non-chat app windows", () => {
    expect(isWindowAllowedWhenBetaRestricted("ai-assistant")).toBe(true);
    expect(isWindowAllowedWhenBetaRestricted("welcome")).toBe(true);
    expect(isWindowAllowedWhenBetaRestricted("crm")).toBe(false);
  });

  it("requires auth + org + tutorial readiness before auto-opening chat entrypoint", () => {
    expect(
      shouldAutoOpenChatForSignedInUser({
        isSignedIn: true,
        hasOrganization: true,
        tutorialProgressLoaded: true,
      })
    ).toBe(true);

    expect(
      shouldAutoOpenChatForSignedInUser({
        isSignedIn: true,
        hasOrganization: false,
        tutorialProgressLoaded: true,
      })
    ).toBe(false);
  });

  it("opens lead-magnet chat for guests unless explicit login is requested", () => {
    expect(
      shouldAutoOpenLeadMagnetChatForGuest({
        isSignedIn: false,
        openLoginRequested: false,
        requestedApp: "store",
      })
    ).toBe(true);

    expect(
      shouldAutoOpenLeadMagnetChatForGuest({
        isSignedIn: false,
        openLoginRequested: true,
        requestedApp: null,
      })
    ).toBe(false);

    expect(
      shouldAutoOpenLeadMagnetChatForGuest({
        isSignedIn: false,
        openLoginRequested: false,
        requestedApp: "login",
      })
    ).toBe(false);
  });
});
