import { describe, expect, it, vi } from "vitest";
import { layersWorkflowTool } from "../../../convex/ai/tools/layersWorkflowTool";
import type { ToolExecutionContext } from "../../../convex/ai/tools/registry";

function createToolContext(overrides?: Partial<ToolExecutionContext>) {
  return {
    organizationId: "organizations_main" as never,
    userId: "users_owner" as never,
    sessionId: "sessions_owner",
    runQuery: vi.fn(),
    runMutation: vi.fn(),
    ...overrides,
  } as ToolExecutionContext & {
    runQuery: ReturnType<typeof vi.fn>;
    runMutation: ReturnType<typeof vi.fn>;
  };
}

describe("layers workflow tool", () => {
  it("creates and attaches a workflow to an agent when attachToAgentId is provided", async () => {
    const ctx = createToolContext();
    ctx.runQuery.mockResolvedValue({
      _id: "objects_agent",
      type: "org_agent",
    });
    ctx.runMutation
      .mockResolvedValueOnce("objects_workflow")
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true, attached: true });

    const result = await layersWorkflowTool.execute(ctx, {
      name: "Real Estate Context",
      nodes: [
        { id: "node-1", type: "lc_ai_chat", label: "AI Chat" },
      ],
      edges: [],
      attachToAgentId: "objects_agent",
    });

    expect(ctx.runQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        sessionId: "sessions_owner",
        agentId: "objects_agent",
      }),
    );
    expect(ctx.runMutation).toHaveBeenNthCalledWith(
      3,
      expect.anything(),
      expect.objectContaining({
        sessionId: "sessions_owner",
        agentId: "objects_agent",
        workflowId: "objects_workflow",
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        workflowId: "objects_workflow",
        attachedToAgentId: "objects_agent",
      }),
    );
  });
});
