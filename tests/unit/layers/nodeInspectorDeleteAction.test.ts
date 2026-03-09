import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const NODE_INSPECTOR_PATH = resolve(process.cwd(), "src/components/layers/node-inspector.tsx");
const LAYERS_CANVAS_PATH = resolve(process.cwd(), "src/components/layers/layers-canvas.tsx");
const STORE_PATH = resolve(process.cwd(), "src/components/layers/use-layers-store.ts");

describe("node inspector delete action contracts", () => {
  it("adds explicit delete action in node inspector UI", () => {
    const source = readFileSync(NODE_INSPECTOR_PATH, "utf8");

    expect(source).toContain("onDelete: (nodeId: string) => void;");
    expect(source).toContain("onClick={() => onDelete(node.id)}");
    expect(source).toContain("title=\"Delete node\"");
    expect(source).toContain("Delete");
  });

  it("wires inspector delete action to canvas/store deletion semantics", () => {
    const canvasSource = readFileSync(LAYERS_CANVAS_PATH, "utf8");
    const storeSource = readFileSync(STORE_PATH, "utf8");

    expect(canvasSource).toContain("deleteNode,");
    expect(canvasSource).toContain("onDelete={deleteNode}");
    expect(storeSource).toContain("const deleteNode = useCallback(");
    expect(storeSource).toContain("setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))");
  });
});
