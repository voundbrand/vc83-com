/* @vitest-environment jsdom */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
import { AgentControlCenterTab } from "../../../src/components/window-content/super-admin-organizations-window/agent-control-center-tab";

const useAuthMock = vi.mocked(useAuth);
const useQueryMock = vi.mocked(useQuery as any);
const useMutationMock = vi.mocked(useMutation as any);

const OVERVIEW_RESPONSE = {
  datasetVersion: "agp_v1",
  datasetVersions: ["agp_v1"],
  expectedAgentCount: 1,
  summary: {
    totalAgents: 1,
    catalogDone: 1,
    seedsFull: 1,
    runtimeLive: 1,
    toolsMissing: 0,
    published: 1,
    blockedAgents: 0,
  },
  drift: {
    status: "in_sync" as const,
    docsOutOfSync: false,
    registryOutOfSync: false,
    codeOutOfSync: false,
    reasons: [],
  },
  filterMetadata: {
    implementationPhases: [2],
  },
};

const LIST_AGENTS_RESPONSE = {
  total: 1,
  nextCursor: null,
  agents: [
    {
      _id: "agent_7",
      catalogAgentNumber: 7,
      name: "Revenue Strategist",
      category: "core",
      toolProfile: "sales",
      seedStatus: "full",
      runtimeStatus: "live",
      published: true,
      specialistAccessModes: ["invisible"],
      implementationPhase: 2,
      blockersCount: 0,
      blockers: [],
      toolCoverageCounts: {
        required: 2,
        implemented: 2,
        missing: 0,
      },
      sourceRefs: {
        catalogDocPath: "docs/prd/souls/AGENT_PRODUCT_CATALOG.md",
        matrixDocPath: "docs/prd/souls/TOOL_REQUIREMENT_MATRIX.md",
        seedDocPath: "docs/prd/souls/SOUL_SEED_LIBRARY.md",
        roadmapDocPath: "docs/prd/souls/IMPLEMENTATION_ROADMAP.md",
      },
    },
  ],
};

const SYNC_RUNS_RESPONSE = {
  runs: [
    {
      _id: "run_1",
      mode: "read_only_audit" as const,
      status: "success" as const,
      startedAt: 1_700_000_000_000,
      completedAt: 1_700_000_000_200,
      summary: {
        totalAgents: 1,
        catalogDone: 1,
        seedsFull: 1,
        runtimeLive: 1,
        toolsMissing: 0,
      },
      drift: {
        docsOutOfSync: false,
        registryOutOfSync: false,
        codeOutOfSync: false,
        reasons: [],
      },
    },
  ],
};

const CLONE_INVENTORY_RESPONSE = {
  generatedAt: 1_700_100_000_000,
  total: 1,
  summary: {
    byPolicyState: {
      in_sync: 1,
      overridden: 0,
      stale: 0,
      blocked: 0,
    },
    byRisk: {
      low: 1,
      medium: 0,
      high: 0,
    },
  },
  filterMetadata: {
    organizations: [{ id: "organizations_1", name: "Alpha Org", count: 1 }],
    templates: [{ id: "objects_template_1", name: "Revenue Template", count: 1 }],
  },
  rows: [
    {
      organizationId: "organizations_1",
      organizationName: "Alpha Org",
      templateId: "objects_template_1",
      templateName: "Revenue Template",
      templateVersion: "v1",
      cloneAgentId: "objects_clone_1",
      cloneAgentName: "Revenue Clone 1",
      cloneLifecycleState: "managed_in_sync",
      policyState: "in_sync" as const,
      riskLevel: "low" as const,
      stale: false,
      blocked: false,
      blockedFields: [],
      overriddenFields: [],
      diffCount: 0,
    },
  ],
};

const TOOL_FOUNDRY_PENDING_PROPOSALS: any[] = [];

let templateRolloutOptionsResponse: any;

let triggerCatalogSyncMock: ReturnType<typeof vi.fn>;
let setAgentBlockerMock: ReturnType<typeof vi.fn>;
let setSeedStatusOverrideMock: ReturnType<typeof vi.fn>;
let setSeedTemplateBindingMock: ReturnType<typeof vi.fn>;
let setCatalogPublishedStatusMock: ReturnType<typeof vi.fn>;
let backfillCatalogPublishedFlagsMock: ReturnType<typeof vi.fn>;
let distributeTemplateToOrganizationsMock: ReturnType<typeof vi.fn>;
let submitToolFoundryPromotionDecisionMock: ReturnType<typeof vi.fn>;
let createAgentTemplateVersionSnapshotMock: ReturnType<typeof vi.fn>;
let publishAgentTemplateVersionMock: ReturnType<typeof vi.fn>;
let deprecateAgentTemplateLifecycleMock: ReturnType<typeof vi.fn>;

function resolveUseQueryResult(args: any) {
  if (args === "skip") {
    return undefined;
  }
  if (args && typeof args === "object" && "templateId" in args && "targetOrganizationIds" in args) {
    return {
      templateId: "objects_template_1",
      templateVersion: "v1",
      precedenceOrder: [],
      fields: [],
      targets: [],
    };
  }
  if (
    args &&
    typeof args === "object" &&
    "sessionId" in args &&
    Object.keys(args).every((key) => key === "sessionId" || key === "refreshNonce")
  ) {
    return templateRolloutOptionsResponse;
  }
  if (args && typeof args === "object" && "templateId" in args && "limit" in args) {
    return {
      generatedAt: 1_700_100_000_300,
      summary: {
        totalJobs: 0,
        byStatus: { planned: 0, completed: 0, completedWithErrors: 0 },
        byOperationKind: { rolloutApply: 0, rolloutRollback: 0 },
        totalAffectedOrgs: { requested: 0, staged: 0, mutated: 0, blocked: 0 },
      },
      rows: [],
    };
  }
  if (args && typeof args === "object" && "filters" in args && !("datasetVersion" in args)) {
    return CLONE_INVENTORY_RESPONSE;
  }
  if (args && typeof args === "object" && "limit" in args && !("datasetVersion" in args)) {
    return TOOL_FOUNDRY_PENDING_PROPOSALS;
  }
  if (args && typeof args === "object" && "catalogAgentNumber" in args) {
    return {
      agent: {
        ...LIST_AGENTS_RESPONSE.agents[0],
        subtype: "operator",
        tier: "t2",
        soulBlend: "analyst",
        soulStatus: "ready",
        autonomyDefault: "supervised",
        requiredIntegrations: [],
        channelAffinity: ["chat"],
      },
      tools: [],
      seed: null,
      recentSyncRuns: SYNC_RUNS_RESPONSE.runs,
    };
  }
  if (args && typeof args === "object" && "limit" in args) {
    return SYNC_RUNS_RESPONSE;
  }
  if (args && typeof args === "object" && "filters" in args) {
    return LIST_AGENTS_RESPONSE;
  }
  return OVERVIEW_RESPONSE;
}

beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as any).React = React;

  templateRolloutOptionsResponse = {
    generatedAt: 1_700_100_000_100,
    templates: [
      {
        templateId: "objects_template_1",
        templateName: "Revenue Template",
        lifecycleStatus: "published" as const,
        publishedVersionId: "objects_template_version_v2",
        publishedVersionTag: "v2",
        versions: [
          {
            templateVersionId: "objects_template_version_v2",
            versionTag: "v2",
            lifecycleStatus: "published" as const,
            createdAt: 1_700_090_000_000,
            updatedAt: 1_700_100_000_000,
          },
          {
            templateVersionId: "objects_template_version_v1",
            versionTag: "v1",
            lifecycleStatus: "draft" as const,
            createdAt: 1_700_080_000_000,
            updatedAt: 1_700_080_000_100,
          },
        ],
      },
    ],
  };

  triggerCatalogSyncMock = vi.fn().mockResolvedValue({ status: "in_sync" });
  setAgentBlockerMock = vi.fn().mockResolvedValue({ success: true });
  setSeedStatusOverrideMock = vi.fn().mockResolvedValue({ success: true });
  setSeedTemplateBindingMock = vi.fn().mockResolvedValue({ success: true });
  setCatalogPublishedStatusMock = vi.fn().mockResolvedValue({ success: true });
  backfillCatalogPublishedFlagsMock = vi.fn().mockResolvedValue({ success: true, updatedCount: 0 });
  distributeTemplateToOrganizationsMock = vi.fn().mockResolvedValue({
    distributionJobId: "ath_dist_preview_1",
    templateId: "objects_template_1",
    templateVersion: "v2",
    operationKind: "rollout_apply",
    dryRun: true,
    requestedTargetOrganizationIds: ["organizations_1"],
    targetOrganizationIds: ["organizations_1"],
    rolloutWindow: {
      stageStartIndex: 0,
      stageSize: 1,
      requestedTargetCount: 1,
      stagedTargetCount: 1,
    },
    summary: {
      plan: { creates: 0, updates: 0, skips: 1, blocked: 0 },
      applied: { creates: 0, updates: 0, skips: 0, blocked: 0 },
    },
    plan: [],
    applied: [],
  });
  submitToolFoundryPromotionDecisionMock = vi.fn().mockResolvedValue({ success: true });
  createAgentTemplateVersionSnapshotMock = vi.fn().mockImplementation(async () => {
    const nextVersion = {
      templateVersionId: "objects_template_version_v3",
      versionTag: "v3",
      lifecycleStatus: "draft" as const,
      createdAt: 1_700_110_000_000,
      updatedAt: 1_700_110_000_000,
    };
    templateRolloutOptionsResponse = {
      ...templateRolloutOptionsResponse,
      templates: templateRolloutOptionsResponse.templates.map((template: any) =>
        template.templateId === "objects_template_1"
          ? { ...template, versions: [nextVersion, ...template.versions] }
          : template,
      ),
    };
    return {
      templateVersionId: nextVersion.templateVersionId,
      versionTag: nextVersion.versionTag,
      lifecycleStatus: "draft",
    };
  });
  publishAgentTemplateVersionMock = vi.fn().mockImplementation(async ({ templateVersionId }: any) => {
    templateRolloutOptionsResponse = {
      ...templateRolloutOptionsResponse,
      templates: templateRolloutOptionsResponse.templates.map((template: any) => ({
        ...template,
        lifecycleStatus: "published",
        publishedVersionId: templateVersionId,
        versions: template.versions.map((version: any) => ({
          ...version,
          lifecycleStatus: version.templateVersionId === templateVersionId ? "published" : version.lifecycleStatus,
        })),
      })),
    };
    return {
      templateVersionId,
      publishedVersion: "v1",
      templateLifecycleStatus: "published",
      versionLifecycleStatus: "published",
    };
  });
  deprecateAgentTemplateLifecycleMock = vi.fn().mockImplementation(async ({ templateVersionId }: any) => {
    templateRolloutOptionsResponse = {
      ...templateRolloutOptionsResponse,
      templates: templateRolloutOptionsResponse.templates.map((template: any) => ({
        ...template,
        versions: template.versions.map((version: any) => ({
          ...version,
          lifecycleStatus: version.templateVersionId === templateVersionId ? "deprecated" : version.lifecycleStatus,
        })),
      })),
    };
    return {
      target: "version",
      templateVersionId,
      lifecycleStatus: "deprecated",
    };
  });

  useAuthMock.mockReturnValue({
    sessionId: "sessions_super_admin",
    isSuperAdmin: true,
  } as any);

  useQueryMock.mockImplementation((_queryRef, args) => resolveUseQueryResult(args));

  let mutationCallIndex = 0;
  useMutationMock.mockImplementation(() => {
    const handlers = [
      triggerCatalogSyncMock,
      setAgentBlockerMock,
      setSeedStatusOverrideMock,
      setSeedTemplateBindingMock,
      setCatalogPublishedStatusMock,
      backfillCatalogPublishedFlagsMock,
      distributeTemplateToOrganizationsMock,
      submitToolFoundryPromotionDecisionMock,
      createAgentTemplateVersionSnapshotMock,
      publishAgentTemplateVersionMock,
      deprecateAgentTemplateLifecycleMock,
    ];
    const handler = handlers[mutationCallIndex % handlers.length];
    mutationCallIndex += 1;
    return handler;
  });
});

describe("Agent Control Center template lifecycle DOM", () => {
  it("creates snapshot and refreshes version list", async () => {
    render(React.createElement(AgentControlCenterTab));

    fireEvent.click(await screen.findByRole("button", { name: /Version History/i }));
    fireEvent.change(screen.getByPlaceholderText("v3"), { target: { value: "v3" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Snapshot" }));

    await waitFor(() => {
      expect(createAgentTemplateVersionSnapshotMock).toHaveBeenCalledWith(
        expect.objectContaining({ versionTag: "v3" }),
      );
    });

    expect(await screen.findByText("Created snapshot v3.")).toBeTruthy();
    expect(await screen.findByText("v3")).toBeTruthy();
  });

  it("publishes a draft version and updates lifecycle status", async () => {
    render(React.createElement(AgentControlCenterTab));

    fireEvent.click(await screen.findByRole("button", { name: /Version History/i }));
    fireEvent.change(screen.getByDisplayValue("v2 (published)"), {
      target: { value: "objects_template_version_v1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    expect(await screen.findByText("Confirm Template Publish")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirm Publish" }));

    await waitFor(() => {
      expect(publishAgentTemplateVersionMock).toHaveBeenCalledWith(
        expect.objectContaining({ templateVersionId: "objects_template_version_v1" }),
      );
    });

    expect(await screen.findByText("Published v1.")).toBeTruthy();
  });

  it("blocks deprecate without reason and allows success with reason", async () => {
    render(React.createElement(AgentControlCenterTab));

    fireEvent.click(await screen.findByRole("button", { name: /Version History/i }));

    const deprecateButton = screen.getByRole("button", { name: "Deprecate" }) as HTMLButtonElement;
    expect(deprecateButton.disabled).toBe(true);
    expect(await screen.findByText(/Deprecate unavailable: Deprecation reason is required\./i)).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("superseded_by_newer_version"), {
      target: { value: "security_issue_in_v2" },
    });

    expect((screen.getByRole("button", { name: "Deprecate" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Deprecate" }));

    expect(await screen.findByText("Confirm Template Deprecation")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirm Deprecation" }));

    await waitFor(() => {
      expect(deprecateAgentTemplateLifecycleMock).toHaveBeenCalledWith(
        expect.objectContaining({
          target: "version",
          templateVersionId: "objects_template_version_v2",
          reason: "security_issue_in_v2",
        }),
      );
    });

    expect(await screen.findByText("Deprecated v2.")).toBeTruthy();
  });

  it("renders empty states when selected template has no versions", async () => {
    templateRolloutOptionsResponse = {
      generatedAt: 1_700_100_000_100,
      templates: [
        {
          templateId: "objects_template_1",
          templateName: "Revenue Template",
          lifecycleStatus: "draft" as const,
          versions: [],
        },
      ],
    };

    render(React.createElement(AgentControlCenterTab));

    fireEvent.click(await screen.findByRole("button", { name: /Version History/i }));
    expect(await screen.findByText("No versions created yet.")).toBeTruthy();
  });

  it("shows deterministic disabled state reasons for publish/deprecate", async () => {
    templateRolloutOptionsResponse = {
      generatedAt: 1_700_100_000_100,
      templates: [
        {
          templateId: "objects_template_1",
          templateName: "Revenue Template",
          lifecycleStatus: "published" as const,
          publishedVersionId: "objects_template_version_v9",
          versions: [
            {
              templateVersionId: "objects_template_version_v9",
              versionTag: "v9",
              lifecycleStatus: "deprecated" as const,
              createdAt: 1_700_090_000_000,
              updatedAt: 1_700_100_000_000,
            },
          ],
        },
      ],
    };

    render(React.createElement(AgentControlCenterTab));

    fireEvent.click(await screen.findByRole("button", { name: /Version History/i }));
    expect(await screen.findByText("No publishable version available.")).toBeTruthy();
    expect(await screen.findByText(/Publish unavailable: Only draft versions are publishable\./i)).toBeTruthy();
    expect(await screen.findByText(/Deprecate unavailable: Only published versions can be deprecated\./i)).toBeTruthy();
  });
});
