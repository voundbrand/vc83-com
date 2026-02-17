import { describe, expect, it } from "vitest";
import {
  parseToolCallArguments,
  validateToolCallAgainstContract,
} from "../../../scripts/model-validation-contracts";

describe("model validation contract helpers", () => {
  it("parses JSON argument payloads", () => {
    const parsed = parseToolCallArguments('{"query":"Alice"}');
    expect(parsed.query).toBe("Alice");
  });

  it("returns empty object for invalid argument payloads", () => {
    const parsed = parseToolCallArguments("{");
    expect(parsed).toEqual({});
  });

  it("passes when required contract fields are present", () => {
    const result = validateToolCallAgainstContract({
      name: "search_contacts",
      arguments: { query: "Alice Smith" },
    });

    expect(result.passed).toBe(true);
    expect(result.contractVersion).toBe("1.0.0");
    expect(result.missingFields).toEqual([]);
  });

  it("fails when required contract fields are missing", () => {
    const result = validateToolCallAgainstContract({
      name: "search_contacts",
      arguments: {},
    });

    expect(result.passed).toBe(false);
    expect(result.missingFields).toEqual(["query"]);
  });

  it("fails for non-critical tools without contract metadata", () => {
    const result = validateToolCallAgainstContract({
      name: "nonexistent_tool",
      arguments: {},
    });

    expect(result.passed).toBe(false);
    expect(result.message).toContain("No critical contract metadata");
  });
});
