import { describe, expect, it } from "vitest";

import { sanitizeUserFacingRuntimeFailureMessage } from "../../../convex/ai/kernel/agentExecution";

describe("user-facing runtime failure messaging", () => {
  it("rewrites internal error codes into plain English", () => {
    const result = sanitizeUserFacingRuntimeFailureMessage({
      assistantContent:
        "reason=claim_tool_not_observed; invocation=not_attempted; skipReasons=[tool_already_attempted, missing_required_fields]",
      language: "en",
    });

    expect(result.rewritten).toBe(true);
    expect(result.assistantContent.toLowerCase()).not.toContain("claim_tool_not_observed");
    expect(result.assistantContent.toLowerCase()).not.toContain("missing_required_fields");
    expect(result.assistantContent.toLowerCase()).not.toContain("skipreasons");
    expect(result.assistantContent.toLowerCase()).toContain("missing");
  });

  it("rewrites internal error codes into plain German", () => {
    const result = sanitizeUserFacingRuntimeFailureMessage({
      assistantContent:
        "preflightReasonCode=missing_required_fields; runtime scope blocked wegen claim_tool_unavailable.",
      language: "de",
    });

    expect(result.rewritten).toBe(true);
    expect(result.assistantContent.toLowerCase()).not.toContain("missing_required_fields");
    expect(result.assistantContent.toLowerCase()).not.toContain("claim_tool_unavailable");
    expect(result.assistantContent.toLowerCase()).toContain("funktion");
  });

  it("does not touch normal user-facing content", () => {
    const content =
      "Perfekt! Ich versende Ihren Implementierungsplan per E-Mail und melde mich in Kuerze.";
    const result = sanitizeUserFacingRuntimeFailureMessage({
      assistantContent: content,
      language: "de",
    });

    expect(result.rewritten).toBe(false);
    expect(result.assistantContent).toBe(content);
  });

  it("rewrites runtime contract checks without duplicating checks", () => {
    const result = sanitizeUserFacingRuntimeFailureMessage({
      assistantContent:
        "I couldn't complete a visible response for this turn after runtime contract checks. Please retry your request.",
      language: "en",
    });

    expect(result.rewritten).toBe(true);
    expect(result.assistantContent.toLowerCase()).toContain("execution checks");
    expect(result.assistantContent.toLowerCase()).not.toContain("execution check checks");
  });
});
