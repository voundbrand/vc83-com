import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  normalizeUniversalOnboardingChannel,
  ONBOARDING_TELEGRAM_ALIAS_DEPRECATION_PLAN,
  resolveCompletionContactIdentifier,
  resolveExistingWorkspaceAction,
  resolveWorkspaceProfileFromExtractedData,
  requiresClaimedAccountForOnboardingCompletion,
  withLegacyWorkspaceCompatibilityFields,
} from "../../../convex/onboarding/universalOnboardingPolicy";
import { isUniversalOnboardingAgent } from "../../../convex/onboarding/universalOnboardingRuntime";

describe("universal onboarding channel policy", () => {
  it("normalizes unknown channels to webchat", () => {
    expect(normalizeUniversalOnboardingChannel("email")).toBe("webchat");
  });

  it("requires claimed account for guest channels only", () => {
    expect(requiresClaimedAccountForOnboardingCompletion("telegram")).toBe(false);
    expect(requiresClaimedAccountForOnboardingCompletion("webchat")).toBe(true);
    expect(requiresClaimedAccountForOnboardingCompletion("native_guest")).toBe(true);
  });
});

describe("existing workspace mutation policy", () => {
  const existingOrgId = "org_123" as Id<"organizations">;

  it("preserves existing workspace by default", () => {
    expect(
      resolveExistingWorkspaceAction({
        extractedData: {},
        existingOrganizationId: existingOrgId,
      })
    ).toBe("preserve");
  });

  it("requires explicit confirmation for rename", () => {
    expect(
      resolveExistingWorkspaceAction({
        extractedData: {
          workspaceMutationAction: "rename",
        },
        existingOrganizationId: existingOrgId,
      })
    ).toBe("preserve");

    expect(
      resolveExistingWorkspaceAction({
        extractedData: {
          workspaceMutationAction: "rename",
          confirmRenameWorkspace: "yes",
        },
        existingOrganizationId: existingOrgId,
      })
    ).toBe("rename");
  });

  it("requires explicit confirmation for recreate", () => {
    expect(
      resolveExistingWorkspaceAction({
        extractedData: {
          workspaceMutationAction: "recreate",
        },
        existingOrganizationId: existingOrgId,
      })
    ).toBe("preserve");

    expect(
      resolveExistingWorkspaceAction({
        extractedData: {
          workspaceMutationAction: "recreate",
          confirmRecreateWorkspace: true,
        },
        existingOrganizationId: existingOrgId,
      })
    ).toBe("recreate");
  });

  it("creates when no existing org is available", () => {
    expect(
      resolveExistingWorkspaceAction({
        extractedData: {},
        existingOrganizationId: null,
      })
    ).toBe("recreate");
  });
});

describe("workspace schema compatibility policy", () => {
  it("resolves canonical workspace profile from legacy extracted fields", () => {
    expect(
      resolveWorkspaceProfileFromExtractedData({
        businessName: "Acme Legacy",
        industry: "Operations",
        target_audience: "Founders",
      })
    ).toEqual({
      workspaceName: "Acme Legacy",
      workspaceContext: "Operations",
      primaryAudience: "Founders",
    });
  });

  it("hydrates both canonical and legacy aliases from extracted data", () => {
    const hydrated = withLegacyWorkspaceCompatibilityFields({
      workspaceName: "Workspace Canonical",
      workspaceContext: "Canonical Context",
    });

    expect(hydrated.workspaceName).toBe("Workspace Canonical");
    expect(hydrated.businessName).toBe("Workspace Canonical");
    expect(hydrated.workspaceContext).toBe("Canonical Context");
    expect(hydrated.industry).toBe("Canonical Context");
  });
});

describe("contact identifier compatibility policy", () => {
  it("accepts new and legacy completion identifiers", () => {
    expect(
      resolveCompletionContactIdentifier({
        channelContactIdentifier: "channel_123",
      })
    ).toBe("channel_123");

    expect(
      resolveCompletionContactIdentifier({
        telegramChatId: "tg_legacy_123",
      })
    ).toBe("tg_legacy_123");
  });
});

describe("legacy telegram alias deprecation policy", () => {
  it("tracks onboarding alias surfaces with owners and checkpoints", () => {
    expect(ONBOARDING_TELEGRAM_ALIAS_DEPRECATION_PLAN.length).toBeGreaterThan(0);
    for (const entry of ONBOARDING_TELEGRAM_ALIAS_DEPRECATION_PLAN) {
      expect(entry.alias).toBe("telegramChatId");
      expect(entry.scope).toBe("onboarding");
      expect(entry.owner.length).toBeGreaterThan(0);
      expect(entry.checkpoint.length).toBeGreaterThan(0);
      expect(entry.status).toBe("deferred");
    }
  });
});

describe("universal onboarding agent detection", () => {
  it("accepts explicit platform template role", () => {
    expect(
      isUniversalOnboardingAgent({
        subtype: "system",
        customProperties: {
          templateRole: "platform_system_bot_template",
        },
      })
    ).toBe(true);
  });

  it("accepts onboarding workers", () => {
    expect(
      isUniversalOnboardingAgent({
        subtype: "system",
        customProperties: {
          workerPoolRole: "onboarding_worker",
        },
      })
    ).toBe(true);
  });

  it("requires onboarding tool pair for fallback system detection", () => {
    expect(
      isUniversalOnboardingAgent({
        subtype: "system",
        customProperties: {
          enabledTools: ["complete_onboarding", "start_account_creation_handoff"],
        },
      })
    ).toBe(true);

    expect(
      isUniversalOnboardingAgent({
        subtype: "system",
        customProperties: {
          enabledTools: ["complete_onboarding"],
        },
      })
    ).toBe(false);
  });
});
