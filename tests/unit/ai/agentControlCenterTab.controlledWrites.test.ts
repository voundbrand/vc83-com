import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/use-namespace-translations", () => ({
  useNamespaceTranslations: () => ({
    t: (key: string) => key,
    tWithFallback: (_key: string, fallback: string) => fallback,
    isLoading: false,
    translationsMap: {},
  }),
}));

vi.mock("@/contexts/translation-context", () => ({
  useTranslation: () => ({
    locale: "en",
    setLocale: vi.fn(),
    availableLocales: ["en"],
    formatDate: (date: Date) => date.toISOString(),
    formatNumber: (value: number) => String(value),
  }),
}));

import { useMutation, useQuery } from "convex/react";
import { useAuth } from "@/hooks/use-auth";
import {
  AgentControlCenterTab,
  buildAgentControlConfirmationMessage,
  buildSeedOverrideBadgeTitle,
  canExecuteConfirmedWrite,
  formatDateTime,
  type ConfirmAction,
} from "../../../src/components/window-content/super-admin-organizations-window/agent-control-center-tab";

const useAuthMock = vi.mocked(useAuth);
const useQueryMock = vi.mocked(useQuery as any);
const useMutationMock = vi.mocked(useMutation as any);

beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as any).React = React;
  useQueryMock.mockReturnValue(undefined);
  useMutationMock.mockReturnValue(vi.fn());
});

describe("Agent Control Center tab controlled-write contracts", () => {
  it("requires confirmation state before a high-impact write can execute", () => {
    const pendingAction: ConfirmAction = {
      type: "add_blocker",
      catalogAgentNumber: 42,
      blocker: "Needs compliance sign-off",
    };

    expect(
      canExecuteConfirmedWrite({
        sessionId: "sessions_super",
        pendingConfirmAction: null,
        isSubmittingWrite: false,
      }),
    ).toBe(false);

    expect(
      canExecuteConfirmedWrite({
        sessionId: "sessions_super",
        pendingConfirmAction: pendingAction,
        isSubmittingWrite: false,
      }),
    ).toBe(true);

    expect(
      canExecuteConfirmedWrite({
        sessionId: "sessions_super",
        pendingConfirmAction: pendingAction,
        isSubmittingWrite: true,
      }),
    ).toBe(false);
  });

  it("produces deterministic confirmation modal copy for blocker, seed override, template binding, and publish writes", () => {
    const datasetVersion = "agp_v1";

    expect(
      buildAgentControlConfirmationMessage(
        {
          type: "add_blocker",
          catalogAgentNumber: 7,
          blocker: "Needs legal review",
        },
        datasetVersion,
      ),
    ).toBe(
      "Confirm Agent Control write action.\n\nDataset: agp_v1\nAgent: #7\nOperation: add blocker\nBlocker: Needs legal review\nAudit event: agent_catalog.blocker_add",
    );

    expect(
      buildAgentControlConfirmationMessage(
        {
          type: "remove_blocker",
          catalogAgentNumber: 7,
          blocker: "Needs legal review",
        },
        datasetVersion,
      ),
    ).toBe(
      "Confirm Agent Control write action.\n\nDataset: agp_v1\nAgent: #7\nOperation: remove blocker\nBlocker: Needs legal review\nAudit event: agent_catalog.blocker_remove",
    );

    expect(
      buildAgentControlConfirmationMessage(
        {
          type: "apply_seed_override",
          catalogAgentNumber: 7,
          seedStatus: "full",
          reason: "Manual catalog verification",
        },
        datasetVersion,
      ),
    ).toBe(
      "Confirm Agent Control write action.\n\nDataset: agp_v1\nAgent: #7\nOperation: apply seed override\nOverride status: full\nReason: Manual catalog verification\nAudit event: agent_catalog.seed_override_set\n\nComputed seed status remains read-only.",
    );

    expect(
      buildAgentControlConfirmationMessage(
        {
          type: "set_seed_template_binding",
          catalogAgentNumber: 7,
          templateAgentId: "objects_template_agent_7",
          reason: "Bind seeded template to runtime clone source",
        },
        datasetVersion,
      ),
    ).toBe(
      "Confirm Agent Control write action.\n\nDataset: agp_v1\nAgent: #7\nOperation: set seed template binding\nTemplate agent id: objects_template_agent_7\nReason: Bind seeded template to runtime clone source\nAudit event: agent_catalog.seed_template_binding_set",
    );

    expect(
      buildAgentControlConfirmationMessage(
        {
          type: "set_seed_template_binding",
          catalogAgentNumber: 7,
          templateAgentId: undefined,
          reason: "Unbind deprecated seed mapping",
        },
        datasetVersion,
      ),
    ).toBe(
      "Confirm Agent Control write action.\n\nDataset: agp_v1\nAgent: #7\nOperation: clear seed template binding\nTemplate agent id: <clear>\nReason: Unbind deprecated seed mapping\nAudit event: agent_catalog.seed_template_binding_set",
    );

    expect(
      buildAgentControlConfirmationMessage(
        {
          type: "set_published",
          catalogAgentNumber: 7,
          published: true,
          reason: "Release approved",
        },
        datasetVersion,
      ),
    ).toBe(
      "Confirm Agent Control write action.\n\nDataset: agp_v1\nAgent: #7\nOperation: publish catalog entry\nReason: Release approved\nAudit event: agent_catalog.published_set",
    );
  });

  it("renders fail-closed for non-super-admin users with no write controls visible", () => {
    useAuthMock.mockReturnValue({
      sessionId: "sessions_non_super_admin",
      isSuperAdmin: false,
    } as any);

    const html = renderToStaticMarkup(React.createElement(AgentControlCenterTab));

    expect(html).toContain("Super admin access required");
    expect(html).not.toContain("Add blocker");
    expect(html).not.toContain("Apply seed override");
  });

  it("formats override badge metadata with actor and timestamp", () => {
    const updatedAt = 1_700_200_000_000;
    const expected = `Override by Ada Lovelace at ${formatDateTime(updatedAt)}`;

    expect(
      buildSeedOverrideBadgeTitle({
        seedStatus: "full",
        reason: "Manual override",
        actorUserId: "users_ada",
        actorLabel: "Ada Lovelace",
        updatedAt,
      }),
    ).toBe(expected);

    expect(buildSeedOverrideBadgeTitle(undefined)).toBeNull();
  });
});
