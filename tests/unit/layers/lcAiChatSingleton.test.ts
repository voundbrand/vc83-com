import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const NODE_REGISTRY_PATH = resolve(process.cwd(), "convex/layers/nodeRegistry.ts");
const STORE_PATH = resolve(process.cwd(), "src/components/layers/use-layers-store.ts");
const WORKFLOW_ONTOLOGY_PATH = resolve(process.cwd(), "convex/layers/layerWorkflowOntology.ts");
const TOOL_CHEST_PATH = resolve(process.cwd(), "src/components/layers/tool-chest.tsx");

describe("lc_ai_chat singleton contracts", () => {
  it("registers lc_ai_chat as a singleton node type", () => {
    const source = readFileSync(NODE_REGISTRY_PATH, "utf8");

    expect(source).toContain('type: "lc_ai_chat"');
    expect(source).toContain("singleton: true");
  });

  it("prevents placing duplicate singleton nodes in addNode", () => {
    const source = readFileSync(STORE_PATH, "utf8");

    expect(source).toContain("if (definition.singleton && hasNodeType(nodes, definition.type))");
    expect(source).toContain("return;");
  });

  it("filters singleton collisions in AI import and duplicate flows", () => {
    const source = readFileSync(STORE_PATH, "utf8");

    expect(source).toContain("candidate.definition.singleton && singletonNodeTypes.has(candidate.definition.type)");
    expect(source).toContain("return !definition.singleton;");
  });

  it("enforces lc_ai_chat singleton in backend saveWorkflow with structured ConvexError", () => {
    const source = readFileSync(WORKFLOW_ONTOLOGY_PATH, "utf8");

    expect(source).toContain("LAYERED_CONTEXT_CHAT_NODE_TYPE = \"lc_ai_chat\"");
    expect(source).toContain("if (lcAiChatNodeIds.length > 1)");
    expect(source).toContain("new ConvexError({");
    expect(source).toContain("code: \"LAYER_SINGLETON_VIOLATION\"");
  });

  it("disables already-placed singleton nodes in tool chest with explicit affordance", () => {
    const source = readFileSync(TOOL_CHEST_PATH, "utf8");

    expect(source).toContain("placedNodeTypes");
    expect(source).toContain("def.singleton && placedNodeTypes.has(def.type)");
    expect(source).toContain("isSingletonPlaced");
    expect(source).toContain("Only one is allowed.");
    expect(source).toContain(">placed<");
    expect(source).toContain("aria-disabled={isDisabled}");
  });
});
