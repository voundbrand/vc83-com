/* @vitest-environment jsdom */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditableProposalView } from "../../../src/components/window-content/ai-chat-window/four-pane/editable-proposal-view";

describe("EditableProposalView configure_agent_fields editor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).React = React;
  });

  it("collects warn override confirmation and reason within the approval rail", async () => {
    const onUpdateParameters = vi.fn().mockResolvedValue(undefined);

    render(
      React.createElement(EditableProposalView, {
        execution: {
          _id: "aiToolExecutions_1",
          toolName: "configure_agent_fields",
          status: "proposed",
          proposalMessage: "Proposed agent field patch for Anne is blocked.",
          parameters: {
            targetAgentId: "objects_agent_1",
            patch: {
              systemPrompt: "Use the new org prompt",
            },
            proposalPreview: {
              targetAgentId: "objects_agent_1",
              targetAgentName: "Anne",
              currentValues: {
                systemPrompt: "Current prompt",
              },
              changes: [
                {
                  field: "systemPrompt",
                  label: "System Prompt",
                  category: "supported",
                  applyStatus: "blocked_warn_confirmation_required",
                  before: "Current prompt",
                  after: "Use the new org prompt",
                  changed: true,
                  reason: "Managed-clone warn override requires explicit confirmation and reason.",
                },
              ],
              summary: {
                canApply: false,
                changedFieldCount: 1,
                readyFieldCount: 0,
                unsupportedFieldCount: 0,
                deferredFieldCount: 0,
                blockedReason: "Managed-clone warn confirmation required: systemPrompt.",
              },
              overrideGate: {
                decision: "blocked_warn_confirmation_required",
                warnFields: ["systemPrompt"],
              },
            },
          },
        },
        onApprove: vi.fn(),
        onReject: vi.fn(),
        onUpdateParameters,
      })
    );

    const refreshButton = screen.getByRole("button", {
      name: "Refresh Proposal With Override",
    });
    expect((refreshButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByLabelText("Confirm warn policy override"));
    fireEvent.change(screen.getByLabelText("Override reason"), {
      target: { value: "This clone needs org-specific phone handling." },
    });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(onUpdateParameters).toHaveBeenCalledWith(
        "aiToolExecutions_1",
        expect.objectContaining({
          targetAgentId: "objects_agent_1",
          patch: {
            systemPrompt: "Use the new org prompt",
          },
          overridePolicyGate: {
            confirmWarnOverride: true,
            reason: "This clone needs org-specific phone handling.",
          },
        }),
      );
    });
  });

  it("lets operators edit, add, and remove patch fields before refreshing the structured preview", async () => {
    const onUpdateParameters = vi.fn().mockResolvedValue(undefined);

    render(
      React.createElement(EditableProposalView, {
        execution: {
          _id: "aiToolExecutions_2",
          toolName: "configure_agent_fields",
          status: "proposed",
          proposalMessage: "Propose agent updates for Anne.",
          parameters: {
            targetAgentId: "objects_agent_2",
            patch: {
              displayName: "Anne",
            },
            proposalPreview: {
              targetAgentId: "objects_agent_2",
              targetAgentName: "Anne",
              currentValues: {
                displayName: "Anne",
                additionalLanguages: ["en"],
                knowledgeBaseTags: ["billing"],
              },
              changes: [
                {
                  field: "displayName",
                  label: "Display Name",
                  category: "supported",
                  applyStatus: "no_change",
                  before: "Anne",
                  after: "Anne",
                  changed: false,
                },
              ],
              summary: {
                canApply: false,
                changedFieldCount: 0,
                readyFieldCount: 0,
                unsupportedFieldCount: 0,
                deferredFieldCount: 0,
                blockedReason: "No supported field changes were proposed.",
              },
            },
          },
        },
        onApprove: vi.fn(),
        onReject: vi.fn(),
        onUpdateParameters,
      })
    );

    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Anne Updated" },
    });

    fireEvent.change(screen.getByLabelText("Add patch field"), {
      target: { value: "additionalLanguages" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add Field" }));
    fireEvent.click(
      screen.getByLabelText("Remove Additional Languages from patch"),
    );

    fireEvent.change(screen.getByLabelText("Add patch field"), {
      target: { value: "knowledgeBaseTags" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add Field" }));
    fireEvent.change(screen.getByLabelText("Knowledge Base Tags"), {
      target: { value: "shipping\nreturns" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Refresh Proposal Preview" }),
    );

    await waitFor(() => {
      expect(onUpdateParameters).toHaveBeenCalledWith(
        "aiToolExecutions_2",
        expect.objectContaining({
          targetAgentId: "objects_agent_2",
          patch: {
            displayName: "Anne Updated",
            knowledgeBaseTags: ["shipping", "returns"],
          },
        }),
      );
    });
  });

  it("edits structured FAQ entries before refreshing the proposal", async () => {
    const onUpdateParameters = vi.fn().mockResolvedValue(undefined);

    render(
      React.createElement(EditableProposalView, {
        execution: {
          _id: "aiToolExecutions_3",
          toolName: "configure_agent_fields",
          status: "proposed",
          proposalMessage: "Propose FAQ updates for Anne.",
          parameters: {
            targetAgentId: "objects_agent_3",
            patch: {
              faqEntries: [{ q: "Current?", a: "Current answer" }],
            },
            proposalPreview: {
              targetAgentId: "objects_agent_3",
              targetAgentName: "Anne",
              currentValues: {
                faqEntries: [{ q: "Current?", a: "Current answer" }],
              },
              changes: [
                {
                  field: "faqEntries",
                  label: "FAQ Entries",
                  category: "supported",
                  applyStatus: "no_change",
                  before: [{ q: "Current?", a: "Current answer" }],
                  after: [{ q: "Current?", a: "Current answer" }],
                  changed: false,
                },
              ],
              summary: {
                canApply: false,
                changedFieldCount: 0,
                readyFieldCount: 0,
                unsupportedFieldCount: 0,
                deferredFieldCount: 0,
                blockedReason: "No supported field changes were proposed.",
              },
            },
          },
        },
        onApprove: vi.fn(),
        onReject: vi.fn(),
        onUpdateParameters,
      })
    );

    fireEvent.change(screen.getByLabelText("FAQ Entries Question 1"), {
      target: { value: "How do returns work?" },
    });
    fireEvent.change(screen.getByLabelText("FAQ Entries Answer 1"), {
      target: { value: "Returns are processed within 14 days." },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Refresh Proposal Preview" }),
    );

    await waitFor(() => {
      expect(onUpdateParameters).toHaveBeenCalledWith(
        "aiToolExecutions_3",
        expect.objectContaining({
          targetAgentId: "objects_agent_3",
          patch: {
            faqEntries: [
              {
                q: "How do returns work?",
                a: "Returns are processed within 14 days.",
              },
            ],
          },
        }),
      );
    });
  });
});
