import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const AI_CHAT_PATH = resolve(process.cwd(), "convex/ai/chat.ts");

describe("layers builder dedicated runtime path", () => {
  it("routes layers_builder through a dedicated builder branch (not operator runtime)", () => {
    const source = readFileSync(AI_CHAT_PATH, "utf8");

    expect(source).toContain("args.context === \"layers_builder\"");
    expect(source).toContain("const useLegacyBuilderFlow =");
    expect(source).toContain("const isLayersBuilderContext = args.context === \"layers_builder\";");
    expect(source).toContain("getLayersBuilderPrompt()");
    expect(source).toContain("const availableTools = isLayersBuilderContext ? [] : getToolSchemas(builderMode);");
  });

  it("normalizes and validates layers builder workflow JSON before persisting", () => {
    const source = readFileSync(AI_CHAT_PATH, "utf8");

    expect(source).toContain("normalizeLayersBuilderWorkflowPayload(");
    expect(source).toContain("formatLayersBuilderResponse(");
    expect(source).toContain("LAYERS_BUILDER_STRUCTURED_OUTPUT_REQUIRED");
    expect(source).toContain("LAYERS_BUILDER_UNKNOWN_NODE_TYPE");
    expect(source).toContain("LAYERS_BUILDER_INVALID_EDGE");
  });
});
