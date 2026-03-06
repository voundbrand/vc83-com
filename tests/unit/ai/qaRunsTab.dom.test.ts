/* @vitest-environment jsdom */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useConvex: vi.fn(),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

import { useConvex, useMutation, useQuery } from "convex/react";
import { useAuth } from "@/hooks/use-auth";
import { useSearchParams } from "next/navigation";
import { QaRunsTab } from "../../../src/components/window-content/super-admin-organizations-window/qa-runs-tab";

const useAuthMock = vi.mocked(useAuth);
const useQueryMock = vi.mocked(useQuery as any);
const useMutationMock = vi.mocked(useMutation as any);
const useConvexMock = vi.mocked(useConvex as any);
const useSearchParamsMock = vi.mocked(useSearchParams as any);

const RUN_ID = "qa_20260303081705";
const ORG_ID = "kn7ec6jb5dpxyf3bt3y3g20x61816466";
const SESSION_ID = "sessions_super_admin";

const LIST_RUNS_RESPONSE = {
  runs: [
    {
      _id: "qa_row_1",
      runId: RUN_ID,
      modeVersion: "super_admin_agent_qa_v1",
      organizationId: ORG_ID,
      organizationName: "l4yercak3 Platform",
      ownerUserId: "users_1",
      ownerEmail: "owner@test.dev",
      label: "platform_samantha_lead_capture_1",
      targetTemplateRole: "one_of_one_lead_capture_consultant_template",
      status: "active" as const,
      startedAt: 1_772_525_863_497,
      lastActivityAt: 1_772_525_885_136,
      turnCount: 1,
      successCount: 0,
      blockedCount: 1,
      errorCount: 0,
      blockedReasonCounts: {
        tool_unavailable: 0,
        missing_required_fields: 1,
        missing_audit_session_context: 0,
        audit_session_not_found: 0,
        tool_not_observed: 0,
        ambiguous_name: 0,
        ambiguous_founder_contact: 0,
        unknown: 0,
      },
      dispatchDecisionCounts: {
        auto_dispatch_executed_email: 0,
        recovery_attempted_missing_required_fields: 1,
        blocked_missing_required_fields: 0,
        blocked_missing_audit_session_context: 0,
        blocked_audit_session_not_found: 0,
        blocked_ambiguous_name: 0,
        blocked_ambiguous_founder_contact: 0,
        blocked_tool_unavailable: 0,
        blocked_tool_not_observed: 0,
        unknown: 0,
      },
      deepLink: "http://localhost:3000/?app=organizations",
    },
  ],
  total: 1,
};

const LIST_PLATFORM_AGENTS_RESPONSE = {
  systemOrganizationId: ORG_ID,
  total: 1,
  agents: [
    {
      _id: "agent_1",
      name: "Samantha Lead Capture",
      status: "template",
      protectedTemplate: true,
      templateRole: "one_of_one_lead_capture_consultant_template",
      templateLayer: "lead_capture",
      templatePlaybook: "lead_capture",
      primary: false,
      operatorId: null,
    },
  ],
};

const INCIDENT_BUNDLE = {
  contractVersion: "super_admin_agent_qa_incident_bundle_v1",
  exportedAt: 1_772_525_920_687,
  incidents: [
    {
      status: "blocked",
      blockedReason: "missing_required_fields",
      missingRequiredFields: ["first_name", "last_name"],
      requiredTools: ["generate_audit_workflow_deliverable"],
    },
  ],
  run: {
    runId: RUN_ID,
    organizationId: ORG_ID,
  },
};

describe("QaRunsTab DOM behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).React = React;
    useAuthMock.mockReturnValue({
      sessionId: SESSION_ID,
      isSuperAdmin: true,
    } as any);
    useSearchParamsMock.mockReturnValue(new URLSearchParams(`qaRunId=${RUN_ID}`));
    useQueryMock.mockReturnValue(LIST_RUNS_RESPONSE);
    useMutationMock.mockReturnValue(vi.fn().mockResolvedValue({ success: true }));
    useConvexMock.mockReturnValue({
      query: vi.fn(async (_queryRef: unknown, args: any) => {
        if (args?.limit === 2000) {
          return LIST_PLATFORM_AGENTS_RESPONSE;
        }
        if (args?.runId === RUN_ID && args?.organizationId === ORG_ID) {
          return INCIDENT_BUNDLE;
        }
        return null;
      }),
    } as any);
    vi.stubGlobal("open", vi.fn());
  });

  it("opens per-agent QA chat with qa mode URL parameters", async () => {
    render(React.createElement(QaRunsTab));

    const openQaButtons = await screen.findAllByRole("button", { name: "Open QA" });
    fireEvent.click(openQaButtons[0]);

    await waitFor(() => {
      expect(window.open).toHaveBeenCalledTimes(1);
    });

    const [url, target] = vi.mocked(window.open).mock.calls[0] as [string, string];
    const parsed = new URL(url, "http://localhost:3000");

    expect(parsed.pathname).toBe("/chat");
    expect(parsed.searchParams.get("qa")).toBe("1");
    expect(parsed.searchParams.get("qaRunId")).toBe(RUN_ID);
    expect(parsed.searchParams.get("qaTemplateRole")).toBe("one_of_one_lead_capture_consultant_template");
    expect(parsed.searchParams.get("qaLabel")).toBe("platform_samantha_lead_capture");
    expect(target).toBe("_blank");
  });

  it("expands incident bundle inline and renders JSON", async () => {
    render(React.createElement(QaRunsTab));

    fireEvent.click(await screen.findByRole("button", { name: "View incident bundle" }));

    expect(await screen.findByText(/"contractVersion": "super_admin_agent_qa_incident_bundle_v1"/)).toBeTruthy();
    expect(screen.getByText(/"blockedReason": "missing_required_fields"/)).toBeTruthy();
    expect(screen.getByText(/"requiredTools": \[/)).toBeTruthy();
    expect(screen.getByText(/recovery_attempted_missing_required_fields: 1/)).toBeTruthy();
    expect(screen.getByText(/^ambiguous_founder_contact: 0$/)).toBeTruthy();
  });
});
