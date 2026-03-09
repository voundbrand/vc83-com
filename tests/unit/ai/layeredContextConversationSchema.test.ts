import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const AI_SCHEMAS_PATH = resolve(process.cwd(), "convex/schemas/aiSchemas.ts");
const AI_CONVERSATIONS_PATH = resolve(process.cwd(), "convex/ai/conversations.ts");

describe("layered context conversation schema contracts", () => {
  it("adds layerWorkflowId and by_workflow index to aiConversations schema", () => {
    const source = readFileSync(AI_SCHEMAS_PATH, "utf8");

    expect(source).toContain("layerWorkflowId: v.optional(v.id(\"objects\"))");
    expect(source).toContain(".index(\"by_workflow\", [\"layerWorkflowId\"])");
  });

  it("accepts layerWorkflowId in createConversation and persists it", () => {
    const source = readFileSync(AI_CONVERSATIONS_PATH, "utf8");

    expect(source).toContain("layerWorkflowId: v.optional(v.id(\"objects\"))");
    expect(source).toContain("layerWorkflowId: args.layerWorkflowId");
  });

  it("returns derived layerWorkflowTitle on get/list payloads", () => {
    const source = readFileSync(AI_CONVERSATIONS_PATH, "utf8");

    expect(source).toContain("layerWorkflowTitle");
    expect(source).toContain("getLayerWorkflowTitle");
  });
});
