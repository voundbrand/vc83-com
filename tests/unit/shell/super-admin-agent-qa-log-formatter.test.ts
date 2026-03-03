import { describe, expect, it } from "vitest";

const formatterModulePath = "../../../scripts/ai/super-admin-agent-qa-log-formatter.mjs";

describe("super-admin QA log formatter", () => {
  it("parses structured action-completion logs and formats highlighted fields", async () => {
    const { formatQaLogEvent, parseQaLogLine } = await import(formatterModulePath);
    const line = JSON.stringify({
      qaRunId: "qa_20260303_samantha_pdf",
      sessionId: "sess_123",
      turnId: "turn_123",
      agentId: "agent_123",
      enforcementMode: "enforce",
      dispatchDecision: "blocked_tool_not_observed",
      payload: {
        preflightReasonCode: "missing_required_fields",
        reasonCode: "claim_tool_unavailable",
        requiredTools: ["generate_pdf"],
        availableTools: ["send_email"],
        preflightMissingRequiredFields: ["deliverable.summary"],
      },
    });

    const event = parseQaLogLine(line);
    expect(event).not.toBeNull();
    expect(event).toMatchObject({
      qaRunId: "qa_20260303_samantha_pdf",
      sessionId: "sess_123",
      turnId: "turn_123",
      agentId: "agent_123",
      preflightReasonCode: "missing_required_fields",
      reasonCode: "claim_tool_unavailable",
      requiredTools: ["generate_pdf"],
      availableTools: ["send_email"],
      missingRequiredFields: ["deliverable.summary"],
      actionDecision: "enforce",
      dispatchDecision: "blocked_tool_not_observed",
    });

    const formatted = formatQaLogEvent(event);
    expect(formatted).toContain("run=qa_20260303_samantha_pdf");
    expect(formatted).toContain("preflightReasonCode=missing_required_fields");
    expect(formatted).toContain("reasonCode=claim_tool_unavailable");
    expect(formatted).toContain("requiredTools=[generate_pdf]");
    expect(formatted).toContain("availableTools=[send_email]");
    expect(formatted).toContain("missingRequiredFields=[deliverable.summary]");
    expect(formatted).toContain("actionDecision=enforce");
    expect(formatted).toContain("dispatchDecision=blocked_tool_not_observed");
  });

  it("filters by run, session, turn, and agent", async () => {
    const { parseQaLogLine, qaLogMatchesFilters } = await import(formatterModulePath);
    const line = JSON.stringify({
      qaRunId: "qa_001",
      sessionId: "sess_A",
      turnId: "turn_A",
      agentId: "agent_A",
      payload: {
        reasonCode: "claim_tool_unavailable",
      },
    });
    const event = parseQaLogLine(line);
    if (!event) {
      throw new Error("Expected parsed event");
    }

    expect(qaLogMatchesFilters(event, { run: "qa_001" })).toBe(true);
    expect(qaLogMatchesFilters(event, { run: "qa_002" })).toBe(false);
    expect(qaLogMatchesFilters(event, { session: "sess_A" })).toBe(true);
    expect(qaLogMatchesFilters(event, { session: "sess_B" })).toBe(false);
    expect(qaLogMatchesFilters(event, { turn: "turn_A", session: undefined })).toBe(true);
    expect(qaLogMatchesFilters(event, { turn: "turn_B", session: undefined })).toBe(false);
    expect(qaLogMatchesFilters(event, { agent: "agent_A", session: undefined })).toBe(true);
    expect(qaLogMatchesFilters(event, { agent: "agent_B", session: undefined })).toBe(false);
  });

  it("returns null for non-diagnostic lines", async () => {
    const { parseQaLogLine } = await import(formatterModulePath);
    expect(parseQaLogLine("[info] regular runtime heartbeat")).toBeNull();
  });
});
