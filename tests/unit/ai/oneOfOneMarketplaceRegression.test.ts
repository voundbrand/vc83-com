import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const AGENTS_WINDOW_PATH = path.resolve(
  process.cwd(),
  "src/components/window-content/agents-window.tsx",
);
const STORE_CATALOG_PATH = path.resolve(
  process.cwd(),
  "convex/ai/agentStoreCatalog.ts",
);
const CATALOG_ADMIN_PATH = path.resolve(
  process.cwd(),
  "convex/ai/agentCatalogAdmin.ts",
);

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

describe("one-of-one marketplace regression guards", () => {
  it("keeps default creation entrypoints routed to primary-operator assistant context", () => {
    const source = readFile(AGENTS_WINDOW_PATH);

    expect(source).toContain("const openPrimaryOperatorCreation = () => {");
    expect(source).toContain("openAgentCreationAssistant(\"agent_creation:primary_operator\")");
    expect(source).toContain("onOpenCatalog={openAgentCatalog}");
    expect(source).toContain("onOpenPrimaryOperatorCreation={openPrimaryOperatorCreation}");
  });

  it("keeps legacy store and recommender compatibility endpoints fail-closed by default", () => {
    const storeCatalogSource = readFile(STORE_CATALOG_PATH);
    const catalogAdminSource = readFile(CATALOG_ADMIN_PATH);

    expect(storeCatalogSource).toContain("const compatibilityDecision = resolveStoreCompatibilityDecision()");
    expect(storeCatalogSource).toContain("if (!compatibilityDecision.enabled)");
    expect(storeCatalogSource).toContain("reason: decision.enabled ? \"enabled\" : \"compatibility_flag_disabled\"");
    expect(catalogAdminSource).toContain("const compatibilityDecision = resolveRecommenderCompatibilityDecision()");
    expect(catalogAdminSource).toContain("if (!compatibilityDecision.enabled)");
    expect(catalogAdminSource).toContain("reason: decision.enabled ? \"enabled\" : \"compatibility_flag_disabled\"");
  });
});
