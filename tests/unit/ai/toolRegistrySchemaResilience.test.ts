import { afterEach, describe, expect, it } from "vitest";
import {
  TOOL_REGISTRY,
  getToolSchemas,
  getToolSchemasForNames,
  type AITool,
} from "../../../convex/ai/tools/registry";

const INVALID_TOOL_KEY = "__invalid_schema_tool__";

function restoreToolEntry(key: string, original: AITool | undefined) {
  if (original) {
    TOOL_REGISTRY[key] = original;
    return;
  }
  delete TOOL_REGISTRY[key];
}

describe("tool registry schema resilience", () => {
  afterEach(() => {
    delete TOOL_REGISTRY[INVALID_TOOL_KEY];
  });

  it("skips malformed registry entries when generating full tool schemas", () => {
    const original = TOOL_REGISTRY[INVALID_TOOL_KEY];
    (TOOL_REGISTRY as Record<string, unknown>)[INVALID_TOOL_KEY] = undefined;

    expect(() => getToolSchemas()).not.toThrow();
    const names = getToolSchemas().map((tool) => tool.function.name);
    expect(names).not.toContain(INVALID_TOOL_KEY);

    restoreToolEntry(INVALID_TOOL_KEY, original);
  });

  it("skips malformed registry entries when generating named tool schemas", () => {
    const original = TOOL_REGISTRY[INVALID_TOOL_KEY];
    (TOOL_REGISTRY as Record<string, unknown>)[INVALID_TOOL_KEY] = {
      name: "",
      description: "",
      status: "ready",
      parameters: {},
    };

    const schemas = getToolSchemasForNames([
      INVALID_TOOL_KEY,
      "list_forms",
    ]);
    const names = schemas.map((tool) => tool.function.name);

    expect(names).not.toContain(INVALID_TOOL_KEY);
    expect(names).toContain("list_forms");

    restoreToolEntry(INVALID_TOOL_KEY, original);
  });
});
