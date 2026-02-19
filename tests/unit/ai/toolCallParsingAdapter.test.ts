import { describe, expect, it } from "vitest";
import {
  normalizeToolArgumentString,
  normalizeToolCallsForProvider,
  parseToolCallArguments,
} from "../../../convex/ai/toolBroker";

describe("tool call parsing adapter", () => {
  it("normalizes empty-ish argument payloads to an object JSON string", () => {
    expect(normalizeToolArgumentString(undefined)).toBe("{}");
    expect(normalizeToolArgumentString("")).toBe("{}");
    expect(normalizeToolArgumentString("undefined")).toBe("{}");
    expect(normalizeToolArgumentString("null")).toBe("{}");
  });

  it("keeps permissive parsing behavior for chat", () => {
    const parsed = parseToolCallArguments("{not-json", { strict: false });

    expect(parsed.isError).toBe(false);
    expect(parsed.args).toEqual({});
    expect(parsed.error).toBeDefined();
  });

  it("enforces strict parsing behavior for agent runtime", () => {
    const parsed = parseToolCallArguments("{not-json", { strict: true });

    expect(parsed.isError).toBe(true);
    expect(parsed.args).toEqual({});
    expect(parsed.error).toContain("Invalid tool arguments");
  });

  it("rejects non-object JSON payloads in strict mode", () => {
    const parsed = parseToolCallArguments("[1,2,3]", { strict: true });

    expect(parsed.isError).toBe(true);
    expect(parsed.error).toContain("must be a JSON object");
  });

  it("normalizes provider tool call envelopes to always include arguments", () => {
    const toolCalls = normalizeToolCallsForProvider([
      {
        id: "call_1",
        type: "function",
        function: {
          name: "list_forms",
          arguments: undefined,
        },
      },
      {
        id: "call_2",
        type: "function",
        function: {
          name: "search_contacts",
          arguments: "{\"query\":\"alice\"}",
        },
      },
    ]);

    expect(toolCalls[0].function.arguments).toBe("{}");
    expect(toolCalls[1].function.arguments).toBe('{"query":"alice"}');
  });
});
