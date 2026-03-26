/* @vitest-environment jsdom */

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

import { useQuery } from "convex/react";
import { OrgActivityTimeline } from "../../../src/components/window-content/agents/org-activity-timeline";

const useQueryMock = vi.mocked(useQuery as any);

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
    status: "approved",
    pipelineState: "approved",
    updatedAt: 1_763_000_000_500,
    sessionId: "agentSessions_1",
  },
  events: [
    {
      eventId: "activity:1",
      stream: "immutable_activity",
      title: "Session Outcome Captured",
      summary: "Conversation outcome captured from operator session.",
      immutable: true,
      occurredAt: 1_763_000_000_400,
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
    {
      eventId: "action:1",
      stream: "workflow_state_checkpoint",
      title: "Approval Resolved",
      summary: "Owner approved this action item.",
      immutable: false,
      occurredAt: 1_763_000_000_300,
      correlationId: null,
      sessionId: "agentSessions_1",
      turnId: null,
      actionItemId: "objects_action_1",
      activityKind: null,
      actionType: "org_action_item_state_changed",
      transition: "approve",
      previousStatus: "pending_review",
      nextStatus: "approved",
      executionStatus: null,
      attemptNumber: null,
      decision: null,
      riskLevel: null,
      syncStatus: null,
      connectorKey: null,
      externalRecordType: null,
    },
    {
      eventId: "receipt:1",
      stream: "execution_receipt",
      title: "Execution Succeeded",
      summary: "Attempt 2 succeeded.",
      immutable: true,
      occurredAt: 1_763_000_000_200,
      correlationId: "corr_2",
      sessionId: "agentSessions_1",
      turnId: "agentTurns_2",
      actionItemId: "objects_action_1",
      activityKind: null,
      actionType: "org_action_execution_receipt_recorded",
      transition: null,
      previousStatus: null,
      nextStatus: null,
      executionStatus: "succeeded",
      attemptNumber: 2,
      decision: null,
      riskLevel: null,
      syncStatus: null,
      connectorKey: null,
      externalRecordType: null,
    },
  ],
  total: 3,
};

describe("OrgActivityTimeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders mutable work-item state and immutable timeline rows", () => {
    useQueryMock.mockReturnValue(TIMELINE_VIEW);

    render(
      React.createElement(OrgActivityTimeline, {
        sessionId: "session_1",
        organizationId: "organizations_1" as any,
        actionItemId: "objects_action_1" as any,
        sourceSessionId: "agentSessions_1",
      }),
    );

    expect(screen.getByTestId("org-activity-timeline")).toBeTruthy();
    expect(screen.getByText("Mutable work-item state")).toBeTruthy();
    expect(screen.getByText("Review outbound refund email")).toBeTruthy();
    expect(screen.getByText("Session Outcome Captured")).toBeTruthy();
    expect(screen.getByText("Approval Resolved")).toBeTruthy();
    expect(screen.getByText("Execution Succeeded")).toBeTruthy();
    expect(screen.getAllByText("Immutable evidence").length).toBeGreaterThan(0);
    expect(screen.getByText("Mutable state checkpoint")).toBeTruthy();
  });

  it("filters timeline by selected stream", () => {
    useQueryMock.mockReturnValue(TIMELINE_VIEW);

    render(
      React.createElement(OrgActivityTimeline, {
        sessionId: "session_1",
        organizationId: "organizations_1" as any,
        actionItemId: "objects_action_1" as any,
      }),
    );

    const streamFilter = screen.getByLabelText("Timeline stream") as HTMLSelectElement;
    fireEvent.change(streamFilter, { target: { value: "execution_receipt" } });

    expect(screen.queryByText("Session Outcome Captured")).toBeNull();
    expect(screen.queryByText("Approval Resolved")).toBeNull();
    expect(screen.getByText("Execution Succeeded")).toBeTruthy();
  });

  it("shows an instruction when no action-item or session scope is provided", () => {
    render(
      React.createElement(OrgActivityTimeline, {
        sessionId: "session_1",
        organizationId: "organizations_1" as any,
      }),
    );

    expect(
      screen.getByText("Select an action item or session to load correlated activity."),
    ).toBeTruthy();
  });
});
