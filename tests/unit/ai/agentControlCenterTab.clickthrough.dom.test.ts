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
  expectedAgentCount: 104,
  summary: {
    totalAgents: 1,
    catalogDone: 1,
    seedsFull: 0,
    runtimeLive: 0,
    toolsMissing: 1,
    published: 0,
    blockedAgents: 1,
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
      seedStatus: "skeleton",
      runtimeStatus: "template_only",
      published: false,
      specialistAccessModes: ["invisible"],
      implementationPhase: 2,
      blockersCount: 1,
      blockers: ["Needs legal review"],
      toolCoverageCounts: {
        required: 2,
        implemented: 1,
        missing: 1,
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
        seedsFull: 0,
        runtimeLive: 0,
        toolsMissing: 1,
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

const AGENT_DETAILS_RESPONSE = {
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
  seed: {
    seedCoverage: "skeleton" as const,
    requiresSoulBuild: true,
    requiresSoulBuildReason: "Needs production prompt tuning",
    systemTemplateAgentId: "objects_template_agent_legacy",
    templateRole: "specialist",
    protectedTemplate: true,
    immutableOriginContractMapped: true,
    sourcePath: "convex/onboarding/seedPlatformAgents.ts",
  },
  recentSyncRuns: SYNC_RUNS_RESPONSE.runs,
};

let triggerCatalogSyncMock: ReturnType<typeof vi.fn>;
let setAgentBlockerMock: ReturnType<typeof vi.fn>;
let setSeedStatusOverrideMock: ReturnType<typeof vi.fn>;
let setSeedTemplateBindingMock: ReturnType<typeof vi.fn>;
let setCatalogPublishedStatusMock: ReturnType<typeof vi.fn>;
let backfillCatalogPublishedFlagsMock: ReturnType<typeof vi.fn>;
let submitToolFoundryPromotionDecisionMock: ReturnType<typeof vi.fn>;

const TOOL_FOUNDRY_PENDING_PROPOSALS = [
  {
    _id: "tf_backlog_1",
    organizationId: "organizations_super_admin",
    proposalKey: "toolspec:issue_refund_transfer:org_1:session_1",
    requestedToolName: "issue_refund_transfer",
    status: "pending_review" as const,
    lastObservedAt: 1_700_000_000_000,
    sourceRequestTraceKey: "trace_1",
    reasonCode: "missing_internal_concept_tool_backend_contract",
  },
];

function resolveUseQueryResult(queryRef: any, args: any) {
  if (args === "skip") {
    return undefined;
  }
  if (args && typeof args === "object" && "limit" in args && !("datasetVersion" in args)) {
    return TOOL_FOUNDRY_PENDING_PROPOSALS;
  }
  if (args && typeof args === "object" && "catalogAgentNumber" in args) {
    return AGENT_DETAILS_RESPONSE;
  }
  if (args && typeof args === "object" && "limit" in args) {
    return SYNC_RUNS_RESPONSE;
  }
  if (args && typeof args === "object" && "filters" in args) {
    return LIST_AGENTS_RESPONSE;
  }
  return OVERVIEW_RESPONSE;
}

async function selectAgentRowAndOpenDependencies() {
  const rowNameCell = screen.getByText("Revenue Strategist");
  const row = rowNameCell.closest("tr");
  expect(row).not.toBeNull();
  fireEvent.click(row as HTMLTableRowElement);

  const dependenciesButton = await screen.findByRole("button", { name: "Dependencies" });
  fireEvent.click(dependenciesButton);
  expect(await screen.findByPlaceholderText("Add blocker note.")).toBeTruthy();
}

beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as any).React = React;

  triggerCatalogSyncMock = vi.fn().mockResolvedValue({ status: "in_sync" });
  setAgentBlockerMock = vi.fn().mockResolvedValue({ success: true });
  setSeedStatusOverrideMock = vi.fn().mockResolvedValue({ success: true });
  setSeedTemplateBindingMock = vi.fn().mockResolvedValue({ success: true });
  setCatalogPublishedStatusMock = vi.fn().mockResolvedValue({ success: true });
  backfillCatalogPublishedFlagsMock = vi.fn().mockResolvedValue({ success: true, updatedCount: 0 });
  submitToolFoundryPromotionDecisionMock = vi.fn().mockResolvedValue({ success: true });

  useAuthMock.mockReturnValue({
    sessionId: "sessions_super_admin",
    isSuperAdmin: true,
  } as any);

  useQueryMock.mockImplementation((queryRef, args) => resolveUseQueryResult(queryRef, args));

  let mutationCallIndex = 0;
  useMutationMock.mockImplementation(() => {
    const handlers = [
      triggerCatalogSyncMock,
      setAgentBlockerMock,
      setSeedStatusOverrideMock,
      setSeedTemplateBindingMock,
      setCatalogPublishedStatusMock,
      backfillCatalogPublishedFlagsMock,
      submitToolFoundryPromotionDecisionMock,
    ];
    const handler = handlers[mutationCallIndex % handlers.length];
    mutationCallIndex += 1;
    return handler;
  });
});

describe("Agent Control Center DOM click-through write flows", () => {
  it("confirms and executes add blocker only after modal confirmation", async () => {
    render(React.createElement(AgentControlCenterTab));

    await selectAgentRowAndOpenDependencies();

    fireEvent.change(screen.getByPlaceholderText("Add blocker note."), {
      target: { value: "Needs compliance sign-off" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add blocker" }));

    expect(setAgentBlockerMock).not.toHaveBeenCalled();
    expect(screen.getByText("Confirm Agent Control Write")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Confirm Write" }));

    await waitFor(() => {
      expect(setAgentBlockerMock).toHaveBeenCalledWith({
        sessionId: "sessions_super_admin",
        datasetVersion: "agp_v1",
        catalogAgentNumber: 7,
        blocker: "Needs compliance sign-off",
        action: "add",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Added blocker for agent #7.")).toBeTruthy();
    });
  });

  it("confirms and executes blocker removal through the danger confirmation path", async () => {
    render(React.createElement(AgentControlCenterTab));

    await selectAgentRowAndOpenDependencies();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(setAgentBlockerMock).not.toHaveBeenCalled();
    expect(
      screen.getByText((content) => content.includes("Operation: remove blocker")),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Confirm Write" }));

    await waitFor(() => {
      expect(setAgentBlockerMock).toHaveBeenCalledWith({
        sessionId: "sessions_super_admin",
        datasetVersion: "agp_v1",
        catalogAgentNumber: 7,
        blocker: "Needs legal review",
        action: "remove",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Removed blocker for agent #7.")).toBeTruthy();
    });
  });

  it("requires a reason before seed override and executes only after confirmation", async () => {
    render(React.createElement(AgentControlCenterTab));

    const rowNameCell = screen.getByText("Revenue Strategist");
    const row = rowNameCell.closest("tr");
    expect(row).not.toBeNull();
    fireEvent.click(row as HTMLTableRowElement);

    fireEvent.click(await screen.findByRole("button", { name: "Seed" }));
    expect(await screen.findByPlaceholderText("Explain why this override is required.")).toBeTruthy();

    const applyButton = screen.getByRole("button", { name: "Apply seed override" }) as HTMLButtonElement;
    expect(applyButton.disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText("Explain why this override is required."), {
      target: { value: "Manual catalog verification" },
    });
    expect(applyButton.disabled).toBe(false);

    fireEvent.click(applyButton);
    expect(setSeedStatusOverrideMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirm Write" }));

    await waitFor(() => {
      expect(setSeedStatusOverrideMock).toHaveBeenCalledWith({
        sessionId: "sessions_super_admin",
        datasetVersion: "agp_v1",
        catalogAgentNumber: 7,
        override: {
          seedStatus: "skeleton",
          reason: "Manual catalog verification",
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Applied seed override for agent #7.")).toBeTruthy();
    });
  });

  it("binds template mapping through confirmation-gated seed write controls", async () => {
    render(React.createElement(AgentControlCenterTab));

    const rowNameCell = screen.getByText("Revenue Strategist");
    const row = rowNameCell.closest("tr");
    expect(row).not.toBeNull();
    fireEvent.click(row as HTMLTableRowElement);

    fireEvent.click(await screen.findByRole("button", { name: "Seed" }));
    expect(await screen.findByPlaceholderText("objects_...")).toBeTruthy();

    const bindButton = screen.getByRole("button", { name: "Bind template mapping" }) as HTMLButtonElement;
    expect(bindButton.disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText("objects_..."), {
      target: { value: "objects_template_agent_7" },
    });
    fireEvent.change(screen.getByPlaceholderText("Explain why this binding change is required."), {
      target: { value: "Wire catalog seed mapping to clone source template" },
    });
    expect(bindButton.disabled).toBe(false);

    fireEvent.click(bindButton);
    expect(setSeedTemplateBindingMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirm Write" }));

    await waitFor(() => {
      expect(setSeedTemplateBindingMock).toHaveBeenCalledWith({
        sessionId: "sessions_super_admin",
        datasetVersion: "agp_v1",
        catalogAgentNumber: 7,
        templateAgentId: "objects_template_agent_7",
        reason: "Wire catalog seed mapping to clone source template",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Set template binding for agent #7.")).toBeTruthy();
    });
  });

  it("routes Tool Foundry approve action through submitProposalPromotionDecision", async () => {
    render(React.createElement(AgentControlCenterTab));

    const rowNameCell = screen.getByText("Revenue Strategist");
    const row = rowNameCell.closest("tr");
    expect(row).not.toBeNull();
    fireEvent.click(row as HTMLTableRowElement);

    fireEvent.click(await screen.findByRole("button", { name: "Runtime" }));
    fireEvent.click(await screen.findByRole("button", { name: "Approve" }));

    await waitFor(() => {
      expect(submitToolFoundryPromotionDecisionMock).toHaveBeenCalledWith({
        sessionId: "sessions_super_admin",
        organizationId: "organizations_super_admin",
        proposalKey: "toolspec:issue_refund_transfer:org_1:session_1",
        decision: "granted",
        reason: "approved_via_agent_control_center",
      });
    });
  });
});
