/* @vitest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock("../../../src/components/window-content/agents/agent-soul-editor", () => ({
  AgentSoulEditor: () => React.createElement("div", null, "soul"),
}));
vi.mock("../../../src/components/window-content/agents/agent-tools-config", () => ({
  AgentToolsConfig: () => React.createElement("div", null, "tools"),
}));
vi.mock("../../../src/components/window-content/agents/agent-sessions-viewer", () => ({
  AgentSessionsViewer: () => React.createElement("div", null, "sessions"),
}));
vi.mock("../../../src/components/window-content/agents/agent-approval-queue", () => ({
  AgentApprovalQueue: () => React.createElement("div", null, "approvals"),
}));
vi.mock("../../../src/components/window-content/agents/agent-escalation-queue", () => ({
  AgentEscalationQueue: () => React.createElement("div", null, "escalations"),
}));
vi.mock("../../../src/components/window-content/agents/agent-analytics", () => ({
  AgentAnalytics: () => React.createElement("div", null, "analytics"),
}));
vi.mock("../../../src/components/window-content/agents/agent-debug-events", () => ({
  AgentDebugEvents: () => React.createElement("div", null, "debug"),
}));
vi.mock("../../../src/components/window-content/agents/agent-trust-cockpit", () => ({
  AgentTrustCockpit: () => React.createElement("div", null, "trust"),
}));

import { useMutation, useQuery } from "convex/react";
import { AgentDetailPanel } from "../../../src/components/window-content/agents/agent-detail-panel";

const useQueryMock = vi.mocked(useQuery as any);
const useMutationMock = vi.mocked(useMutation as any);

describe("AgentDetailPanel template lineage badges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).React = React;
    useMutationMock.mockReturnValue(vi.fn());
    useQueryMock.mockImplementation((_ref, args) => {
      if (args && typeof args === "object" && "agentId" in args) {
        return {
          _id: "objects_agent_1",
          name: "Support Agent",
          subtype: "general",
          status: "active",
          customProperties: {
            displayName: "Support Agent",
            modelId: "openrouter/openai/gpt-4o-mini",
            templateAgentId: "objects_template_77",
            templateVersion: "v9",
            cloneLifecycle: "managed_in_sync",
            templateCloneLinkage: {
              sourceTemplateId: "objects_template_77",
              sourceTemplateVersion: "v9",
              cloneLifecycleState: "managed_in_sync",
              overridePolicy: {
                mode: "warn",
              },
            },
          },
        };
      }
      if (args && typeof args === "object" && "organizationId" in args) {
        return [];
      }
      return undefined;
    });
  });

  it("renders template source/version/lifecycle and override badge", () => {
    render(
      React.createElement(AgentDetailPanel, {
        agentId: "objects_agent_1",
        sessionId: "sessions_1",
        organizationId: "organizations_1",
        activeTab: "tools",
        onTabChange: vi.fn(),
        onEdit: vi.fn(),
      } as any),
    );

    const templateBadge = screen.getByText("template linked");
    const templateBadgeTitle = templateBadge.getAttribute("title");

    expect(templateBadge).toBeTruthy();
    expect(templateBadgeTitle).toContain("Source: objects_template_77");
    expect(templateBadgeTitle).toContain("Version: v9");
    expect(screen.getByText("managed in sync")).toBeTruthy();
    expect(screen.getByText("override: warn")).toBeTruthy();
  });
});
