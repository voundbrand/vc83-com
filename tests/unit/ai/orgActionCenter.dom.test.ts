/* @vitest-environment jsdom */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

import { useMutation, useQuery } from "convex/react";
import { OrgActionCenter } from "../../../src/components/window-content/agents/org-action-center";

const useQueryMock = vi.mocked(useQuery as any);
const useMutationMock = vi.mocked(useMutation as any);
let transitionMutationMock: ReturnType<typeof vi.fn>;

const BASE_VIEW = {
  pipelineStates: [
    "pending",
    "assigned",
    "approved",
    "executing",
    "failed",
    "completed",
  ],
  totalsByPipelineState: {
    pending: 1,
    assigned: 0,
    approved: 1,
    executing: 0,
    failed: 1,
    completed: 1,
  },
  agentFilters: [
    { catalogAgentNumber: 35, label: "#35 Revenue Strategist" },
    { catalogAgentNumber: 42, label: "#42 Concierge Operator" },
  ],
  items: [
    {
      _id: "objects_action_1",
      title: "Review outbound refund email",
      summary: "Awaiting owner review before customer send.",
      status: "pending_review",
      pipelineState: "pending",
      actionFamily: "customer_refund",
      catalogAgentNumber: 35,
      catalogLabel: "#35 Revenue Strategist",
      channel: "email",
      sourceSessionId: "agentSessions_1",
      sourceTurnId: "agentTurns_1",
      agentObjectId: "objects_agent_1",
      takeover: {
        required: true,
        reason: "Owner confirmation required for customer-visible mutation.",
        escalatedAt: 1_763_000_000_500,
      },
      policySnapshot: {
        policySnapshotId: "orgActionPolicySnapshots_1",
        decision: "approval_required",
        riskLevel: "low",
        actionFamily: "customer_refund",
        resolvedAt: 1_763_000_000_200,
      },
      latestReceipt: {
        receiptId: "orgActionExecutionReceipts_1",
        executionStatus: "queued",
        attemptNumber: 2,
        correlationId: "org_action_correlation:agentSessions_1:objects_action_1:2",
        idempotencyKey: "org_action_receipt:organizations_1:objects_action_1:customer_refund:2",
        errorMessage: null,
        startedAt: 1_763_000_000_300,
        completedAt: null,
        updatedAt: 1_763_000_000_400,
      },
      availableTransitions: ["approve", "assign", "takeover"],
      createdAt: 1_763_000_000_000,
      updatedAt: 1_763_000_000_000,
    },
    {
      _id: "objects_action_2",
      title: "Push CRM owner assignment",
      summary: "Approved by owner.",
      status: "approved",
      pipelineState: "approved",
      actionFamily: "crm_assignment",
      catalogAgentNumber: 35,
      catalogLabel: "#35 Revenue Strategist",
      channel: "crm",
      sourceSessionId: "agentSessions_2",
      sourceTurnId: "agentTurns_2",
      availableTransitions: ["complete"],
      createdAt: 1_763_000_010_000,
      updatedAt: 1_763_000_010_000,
    },
    {
      _id: "objects_action_3",
      title: "Retry call connector",
      summary: "Connector rejected payload format.",
      status: "failed",
      pipelineState: "failed",
      actionFamily: "connector_retry",
      catalogAgentNumber: 42,
      catalogLabel: "#42 Concierge Operator",
      channel: "phone_call",
      sourceSessionId: "agentSessions_3",
      sourceTurnId: "agentTurns_3",
      availableTransitions: ["retry"],
      createdAt: 1_763_000_020_000,
      updatedAt: 1_763_000_020_000,
    },
    {
      _id: "objects_action_4",
      title: "Post follow-up summary",
      summary: "Summary written to CRM activity feed.",
      status: "completed",
      pipelineState: "completed",
      actionFamily: "crm_post",
      catalogAgentNumber: 42,
      catalogLabel: "#42 Concierge Operator",
      channel: "crm",
      sourceSessionId: "agentSessions_4",
      sourceTurnId: "agentTurns_4",
      availableTransitions: [],
      createdAt: 1_763_000_030_000,
      updatedAt: 1_763_000_030_000,
    },
  ],
  total: 4,
};

const TIMELINE_VIEW = {
  organizationId: "organizations_1",
  sourceSessionId: "agentSessions_1",
  streams: [
    "immutable_activity",
    "workflow_state_checkpoint",
    "execution_receipt",
    "policy_decision",
    "sync_event",
  ],
  mutableState: {
    actionItemId: "objects_action_1",
    title: "Review outbound refund email",
    status: "pending_review",
    pipelineState: "pending",
    updatedAt: 1_763_000_000_700,
    sessionId: "agentSessions_1",
  },
  events: [
    {
      eventId: "activity:1",
      stream: "immutable_activity",
      title: "Session Outcome Captured",
      summary: "Outcome captured from conversation context.",
      immutable: true,
      occurredAt: 1_763_000_000_600,
      correlationId: "corr_1",
      sessionId: "agentSessions_1",
      turnId: "agentTurns_1",
      actionItemId: "objects_action_1",
      activityKind: "session_outcome_captured",
      actionType: null,
      transition: null,
      previousStatus: null,
      nextStatus: null,
      executionStatus: null,
      attemptNumber: null,
      decision: null,
      riskLevel: null,
      syncStatus: null,
      connectorKey: null,
      externalRecordType: null,
    },
  ],
  total: 1,
};

function resolveQueryResult(view: typeof BASE_VIEW, args: any) {
  if (args?.actionItemId || args?.sourceSessionId) {
    return TIMELINE_VIEW;
  }
  return view;
}

describe("OrgActionCenter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transitionMutationMock = vi.fn().mockResolvedValue({
      ok: true,
    });
    useMutationMock.mockReturnValue(transitionMutationMock);
  });

  it("renders list and kanban columns with canonical state buckets", () => {
    useQueryMock.mockImplementation((_queryRef, args) =>
      resolveQueryResult(BASE_VIEW, args),
    );

    render(
      React.createElement(OrgActionCenter, {
        sessionId: "session_1",
        organizationId: "organizations_1" as any,
      }),
    );

    expect(screen.getByText("Org Action Center")).toBeTruthy();
    expect(screen.getByText("Action list")).toBeTruthy();
    expect(screen.getByText("Kanban pipeline")).toBeTruthy();

    expect(screen.getByTestId("org-action-center-column-pending").textContent).toContain("1");
    expect(screen.getByTestId("org-action-center-column-approved").textContent).toContain("1");
    expect(screen.getByTestId("org-action-center-column-failed").textContent).toContain("1");
    expect(screen.getByTestId("org-action-center-column-completed").textContent).toContain("1");

    expect(screen.getAllByText("Review outbound refund email").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Push CRM owner assignment").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Retry call connector").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Post follow-up summary").length).toBeGreaterThan(0);
  });

  it("defaults to all and applies per-agent catalog filter", async () => {
    useQueryMock.mockImplementation((_queryRef, args) => {
      if (args?.actionItemId || args?.sourceSessionId) {
        return TIMELINE_VIEW;
      }
      if (args?.catalogAgentNumber === 35) {
        const filteredItems = BASE_VIEW.items.filter(
          (item) => item.catalogAgentNumber === 35,
        );
        return {
          ...BASE_VIEW,
          items: filteredItems,
          total: filteredItems.length,
          totalsByPipelineState: {
            pending: 1,
            assigned: 0,
            approved: 1,
            executing: 0,
            failed: 0,
            completed: 0,
          },
        };
      }
      return BASE_VIEW;
    });

    render(
      React.createElement(OrgActionCenter, {
        sessionId: "session_1",
        organizationId: "organizations_1" as any,
      }),
    );

    const filter = screen.getByLabelText("Agent") as HTMLSelectElement;
    expect(filter.value).toBe("all");

    fireEvent.change(filter, { target: { value: "35" } });

    await waitFor(() => {
      expect(useQueryMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ catalogAgentNumber: 35 }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("Retry call connector")).toBeNull();
      expect(screen.queryByText("Post follow-up summary")).toBeNull();
    });
    expect(screen.getAllByText("Review outbound refund email").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Push CRM owner assignment").length).toBeGreaterThan(0);
  });

  it("renders detail context and keeps workflow actions available in list and kanban cards", async () => {
    useQueryMock.mockImplementation((_queryRef, args) =>
      resolveQueryResult(BASE_VIEW, args),
    );

    render(
      React.createElement(OrgActionCenter, {
        sessionId: "session_1",
        organizationId: "organizations_1" as any,
      }),
    );

    expect(screen.getByTestId("org-action-center-detail")).toBeTruthy();
    expect(screen.getByText("Policy snapshot")).toBeTruthy();
    expect(screen.getByText("Latest receipt")).toBeTruthy();
    expect(screen.getByText("Takeover context")).toBeTruthy();
    expect(screen.getByText("Takeover required: yes")).toBeTruthy();
    expect(screen.getByTestId("org-activity-timeline")).toBeTruthy();
    expect(screen.getAllByText("Approve").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Details").length).toBeGreaterThan(1);

    fireEvent.click(screen.getAllByText("Approve")[0]);

    await waitFor(() => {
      expect(transitionMutationMock).toHaveBeenCalledWith(
        expect.objectContaining({
          transition: "approve",
          actionItemId: "objects_action_1",
        }),
      );
    });
  });
});
