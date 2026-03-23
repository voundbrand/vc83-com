/* @vitest-environment jsdom */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditableProposalView } from "../../../src/components/window-content/ai-chat-window/four-pane/editable-proposal-view";

describe("EditableProposalView warn override controls", () => {
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
});
