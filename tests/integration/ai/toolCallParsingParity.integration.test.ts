import { describe, expect, it } from "vitest";
import { parseToolCallArguments } from "../../../convex/ai/toolBroker";

describe("tool call parsing parity", () => {
  it("uses one adapter with mode-specific strictness", () => {
    const permissive = parseToolCallArguments("{oops", { strict: false });
    const strict = parseToolCallArguments("{oops", { strict: true });

    expect(permissive.args).toEqual({});
    expect(permissive.isError).toBe(false);

    expect(strict.args).toEqual({});
    expect(strict.isError).toBe(true);
  });

  it("treats null/undefined string payloads as empty object in both modes", () => {
    const permissive = parseToolCallArguments("undefined", { strict: false });
    const strict = parseToolCallArguments("null", { strict: true });

    expect(permissive.isError).toBe(false);
    expect(permissive.args).toEqual({});

    expect(strict.isError).toBe(false);
    expect(strict.args).toEqual({});
  });
});
