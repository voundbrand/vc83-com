import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const AI_CHAT_CONTEXT_PATH = resolve(process.cwd(), "src/contexts/ai-chat-context.tsx");
const USE_AI_CHAT_PATH = resolve(process.cwd(), "src/hooks/use-ai-chat.ts");
const AI_CHAT_ACTION_PATH = resolve(process.cwd(), "convex/ai/chat.ts");
const AGENT_EXECUTION_PATH = resolve(process.cwd(), "convex/ai/agentExecution.ts");

describe("layered context chat scoping contracts", () => {
  it("persists activeLayerWorkflowId in AIChatContext localStorage", () => {
    const source = readFileSync(AI_CHAT_CONTEXT_PATH, "utf8");

    expect(source).toContain("CHAT_ACTIVE_LAYER_WORKFLOW_ID_STORAGE_KEY");
    expect(source).toContain("activeLayerWorkflowId");
    expect(source).toContain("setActiveLayerWorkflowId");
    expect(source).toContain("window.localStorage.setItem(CHAT_ACTIVE_LAYER_WORKFLOW_ID_STORAGE_KEY");
  });

  it("syncs activeLayerWorkflowId from selected conversation payload", () => {
    const source = readFileSync(AI_CHAT_CONTEXT_PATH, "utf8");

    expect(source).toContain("chat.conversation?.layerWorkflowId");
    expect(source).toContain("setActiveLayerWorkflowId(conversationLayerWorkflowId)");
  });

  it("defaults createConversation layerWorkflowId from activeLayerWorkflowId", () => {
    const source = readFileSync(USE_AI_CHAT_PATH, "utf8");

    expect(source).toContain("activeLayerWorkflowId?: Id<\"objects\">");
    expect(source).toContain("layerWorkflowId: options?.ignoreActiveLayerContext");
    expect(source).toContain(": (layerWorkflowId ?? activeLayerWorkflowId)");
  });

  it("propagates layerWorkflowId on sendMessage payloads", () => {
    const hookSource = readFileSync(USE_AI_CHAT_PATH, "utf8");
    const actionSource = readFileSync(AI_CHAT_ACTION_PATH, "utf8");

    expect(hookSource).toContain("layerWorkflowId?: Id<\"objects\">");
    expect(hookSource).toContain("layerWorkflowId: options?.layerWorkflowId ?? activeLayerWorkflowId");
    expect(actionSource).toContain("layerWorkflowId: v.optional(v.id(\"objects\"))");
    expect(actionSource).toContain("layerWorkflowId: args.layerWorkflowId");
    expect(actionSource).toContain("layerWorkflowId: conversationLayerWorkflowId");
  });

  it("injects layered context prompt in agent runtime system messages", () => {
    const source = readFileSync(AGENT_EXECUTION_PATH, "utf8");

    expect(source).toContain("buildLayeredContextSystemPrompt");
    expect(source).toContain("getLayeredContextBundle");
    expect(source).toContain("layeredContextSystemPrompt");
    expect(source).toContain("layeredContextSystemPrompt ?? \"\"");
    expect(source).toContain("args.layeredContextSystemPrompt");
  });
});
