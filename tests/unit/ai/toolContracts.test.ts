import { describe, expect, it } from "vitest";
import {
  CRITICAL_TOOL_CONTRACTS,
  CRITICAL_TOOL_NAMES,
  getCriticalToolContract,
} from "../../../convex/ai/tools/contracts";

describe("tool contract metadata", () => {
  it("defines versioned metadata for exactly ten critical tools", () => {
    expect(CRITICAL_TOOL_NAMES).toHaveLength(10);
    expect(Object.keys(CRITICAL_TOOL_CONTRACTS)).toHaveLength(10);
  });

  it("includes semantic version + compatibility notes for each critical tool", () => {
    for (const toolName of CRITICAL_TOOL_NAMES) {
      const contract = getCriticalToolContract(toolName);
      expect(contract).not.toBeNull();
      expect(contract?.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(contract?.backwardCompatibilityNotes.length).toBeGreaterThan(0);
      expect(contract?.successEnvelope.requiredKeys.length).toBeGreaterThan(0);
    }
  });

  it("retains expected required fields for representative contracts", () => {
    expect(getCriticalToolContract("search_contacts")?.requiredFields).toEqual([
      "query",
    ]);
    expect(getCriticalToolContract("list_forms")?.requiredFields).toEqual([]);
    expect(getCriticalToolContract("create_checkout_page")?.requiredFields).toEqual([
      "name",
      "productIds",
    ]);
  });
});
