/* @vitest-environment jsdom */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

import { useMutation, useQuery } from "convex/react";
import { AgentToolsConfig } from "../../../src/components/window-content/agents/agent-tools-config";

const useQueryMock = vi.mocked(useQuery as any);
const useMutationMock = vi.mocked(useMutation as any);

const TOOL_LIST = [
  { key: "search_contacts", name: "Search Contacts", status: "ready" },
  { key: "create_contact", name: "Create Contact", status: "ready" },
  { key: "list_forms", name: "List Forms", status: "beta" },
];

let updateAgentMock: ReturnType<typeof vi.fn>;
let currentAgent: any;

function renderConfig() {
  return render(
    React.createElement(AgentToolsConfig, {
      agentId: "objects_agent_1",
      sessionId: "sessions_1",
      organizationId: "organizations_1",
    } as any)
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as any).React = React;

  currentAgent = {
    _id: "objects_agent_1",
    customProperties: {
      autonomyLevel: "supervised",
      maxMessagesPerDay: 100,
      maxCostPerDay: 5,
      enabledTools: [],
      disabledTools: [],
    },
  };

  updateAgentMock = vi.fn().mockResolvedValue({ success: true });
  useMutationMock.mockReturnValue(updateAgentMock);
  useQueryMock.mockImplementation((_queryRef, args) => {
    if (args && typeof args === "object" && "agentId" in args) {
      return currentAgent;
    }
    if (args && typeof args === "object" && "sessionId" in args) {
      return TOOL_LIST;
    }
    return undefined;
  });
});

describe("AgentToolsConfig tool scope controls", () => {
  it("loads existing toolProfile + enabledTools from custom properties", async () => {
    currentAgent = {
      _id: "objects_agent_1",
      customProperties: {
        templateAgentId: "objects_template_42",
        templateVersion: "v3",
        templateCloneLinkage: {
          sourceTemplateId: "objects_template_42",
          sourceTemplateVersion: "v3",
          cloneLifecycleState: "managed_in_sync",
          overridePolicy: {
            mode: "warn",
            fields: {
              toolProfile: { mode: "locked" },
              enabledTools: { mode: "warn" },
              disabledTools: { mode: "free" },
            },
          },
        },
        toolProfile: "sales",
        enabledTools: ["list_forms", "search_contacts"],
        disabledTools: ["search_contacts"],
        autonomyLevel: "supervised",
        maxMessagesPerDay: 100,
        maxCostPerDay: 5,
      },
    };

    renderConfig();

    await waitFor(() => {
      expect((screen.getByLabelText("Tool profile") as HTMLSelectElement).value).toBe("sales");
    });
    expect(screen.getByText("Template Lineage")).toBeTruthy();
    expect(screen.getByText("Source template: objects_template_42")).toBeTruthy();
    expect(screen.getByText("Source version: v3")).toBeTruthy();
    expect(screen.getByText("Lifecycle: managed in sync")).toBeTruthy();
    expect(screen.getByText("Override policy: warn")).toBeTruthy();
    expect(screen.getByText("Template override mode: locked")).toBeTruthy();
    expect(screen.getByText("Template override mode: warn")).toBeTruthy();
    expect(screen.getByText("Template override mode: free")).toBeTruthy();

    expect(
      (screen.getByRole("checkbox", {
        name: "Allowlist Search Contacts (search_contacts)",
      }) as HTMLInputElement).checked
    ).toBe(true);
    expect(
      (screen.getByRole("checkbox", {
        name: "Allowlist List Forms (list_forms)",
      }) as HTMLInputElement).checked
    ).toBe(true);
    expect(
      screen.getByText(
        "Allowlist active: only listed tools can be executed (subject to profile + disabled tools)."
      )
    ).toBeTruthy();
  });

  it("saves toolProfile, enabledTools, and disabledTools together with deterministic arrays", async () => {
    renderConfig();

    fireEvent.change(screen.getByLabelText("Tool profile"), { target: { value: "support" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Allowlist Create Contact (create_contact)" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Allowlist List Forms (list_forms)" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Available Create Contact (create_contact)" }));

    fireEvent.click(screen.getByRole("button", { name: "Save Tools Config" }));

    await waitFor(() => {
      expect(updateAgentMock).toHaveBeenCalledWith({
        sessionId: "sessions_1",
        agentId: "objects_agent_1",
        updates: {
          toolProfile: "support",
          enabledTools: ["create_contact", "list_forms"],
          disabledTools: ["create_contact"],
          autonomyLevel: "supervised",
          maxMessagesPerDay: 100,
          maxCostPerDay: 5,
        },
      });
    });
  });

  it("warns on allowlist/disabled conflicts and keeps disabled precedence", async () => {
    currentAgent = {
      _id: "objects_agent_1",
      customProperties: {
        enabledTools: ["create_contact", "create_contact"],
        disabledTools: ["create_contact", "list_forms", "create_contact"],
        autonomyLevel: "supervised",
        maxMessagesPerDay: 100,
        maxCostPerDay: 5,
      },
    };

    renderConfig();

    expect(
      screen.getByText((content) => content.includes("Conflict detected: these tools are both allowlisted and disabled."))
    ).toBeTruthy();
    expect(
      (screen.getByRole("checkbox", {
        name: "Available Create Contact (create_contact)",
      }) as HTMLInputElement).checked
    ).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Save Tools Config" }));

    await waitFor(() => {
      expect(updateAgentMock).toHaveBeenCalledWith({
        sessionId: "sessions_1",
        agentId: "objects_agent_1",
        updates: {
          enabledTools: ["create_contact"],
          disabledTools: ["create_contact", "list_forms"],
          autonomyLevel: "supervised",
          maxMessagesPerDay: 100,
          maxCostPerDay: 5,
        },
      });
    });
  });

  it("blocks warn policy saves until confirmation + reason are provided", async () => {
    currentAgent = {
      _id: "objects_agent_1",
      customProperties: {
        templateAgentId: "objects_template_42",
        templateVersion: "v3",
        templateCloneLinkage: {
          sourceTemplateId: "objects_template_42",
          sourceTemplateVersion: "v3",
          cloneLifecycleState: "managed_in_sync",
          overridePolicy: {
            mode: "warn",
            fields: {
              enabledTools: { mode: "warn" },
            },
          },
        },
        enabledTools: [],
        disabledTools: [],
        autonomyLevel: "supervised",
        maxMessagesPerDay: 100,
        maxCostPerDay: 5,
      },
    };

    renderConfig();

    fireEvent.click(screen.getByRole("checkbox", { name: "Allowlist Create Contact (create_contact)" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Tools Config" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Template warning: confirm override and provide reason for enabledTools."
        )
      ).toBeTruthy();
    });
    expect(updateAgentMock).toHaveBeenCalledTimes(0);
  });

  it("submits warn override gate confirmation + reason when warn fields change", async () => {
    currentAgent = {
      _id: "objects_agent_1",
      customProperties: {
        templateAgentId: "objects_template_42",
        templateVersion: "v3",
        templateCloneLinkage: {
          sourceTemplateId: "objects_template_42",
          sourceTemplateVersion: "v3",
          cloneLifecycleState: "managed_in_sync",
          overridePolicy: {
            mode: "warn",
            fields: {
              enabledTools: { mode: "warn" },
            },
          },
        },
        enabledTools: [],
        disabledTools: [],
        autonomyLevel: "supervised",
        maxMessagesPerDay: 100,
        maxCostPerDay: 5,
      },
    };

    renderConfig();

    fireEvent.click(screen.getByRole("checkbox", { name: "Allowlist Create Contact (create_contact)" }));
    fireEvent.click(screen.getByLabelText("Confirm warn policy override"));
    fireEvent.change(screen.getByLabelText("Override reason"), {
      target: { value: "Need org-specific CRM trigger tool." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Tools Config" }));

    await waitFor(() => {
      expect(updateAgentMock).toHaveBeenCalledWith({
        sessionId: "sessions_1",
        agentId: "objects_agent_1",
        updates: {
          enabledTools: ["create_contact"],
          disabledTools: [],
          autonomyLevel: "supervised",
          maxMessagesPerDay: 100,
          maxCostPerDay: 5,
        },
        overridePolicyGate: {
          confirmWarnOverride: true,
          reason: "Need org-specific CRM trigger tool.",
        },
      });
    });
  });
});
