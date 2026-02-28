import { describe, expect, it, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  executeCodeTool,
  guardCodeExecutionSource,
  resolveCodeExecutionGovernanceDecision,
} from "../../../convex/ai/tools/codeExecutionTool";

const ORG_ID = "org_code_exec" as Id<"organizations">;
const USER_ID = "user_code_exec" as Id<"users">;

describe("code execution governance", () => {
  it("fails closed when runtime policy is missing", () => {
    const decision = resolveCodeExecutionGovernanceDecision({
      policy: null,
    });

    expect(decision.allow).toBe(false);
    expect(decision.reason).toBe("policy_missing");
    expect(decision.requiresApproval).toBe(true);
  });

  it("blocks sandbox and legacy draft_only autonomy", () => {
    const sandbox = resolveCodeExecutionGovernanceDecision({
      policy: {
        autonomyLevel: "sandbox",
      },
    });
    expect(sandbox.allow).toBe(false);
    expect(sandbox.reason).toBe("sandbox_autonomy_block");

    const draftOnly = resolveCodeExecutionGovernanceDecision({
      policy: {
        autonomyLevel: "draft_only",
      },
    });
    expect(draftOnly.allow).toBe(false);
    expect(draftOnly.reason).toBe("sandbox_autonomy_block");
  });

  it("requires approval when supervised policy has no granted token", () => {
    const decision = resolveCodeExecutionGovernanceDecision({
      policy: {
        autonomyLevel: "supervised",
        approvalRequired: true,
        approvalGranted: false,
      },
    });

    expect(decision.allow).toBe(false);
    expect(decision.reason).toBe("approval_missing");
  });

  it("allows execution when policy gates are satisfied", () => {
    const decision = resolveCodeExecutionGovernanceDecision({
      policy: {
        autonomyLevel: "autonomous",
        requireApprovalFor: ["process_payment"],
        approvalRequired: false,
        approvalGranted: false,
      },
    });

    expect(decision.allow).toBe(true);
    expect(decision.reason).toBe("policy_allow");
  });

  it("blocks forbidden network/process patterns in source", () => {
    expect(guardCodeExecutionSource("return input.value * 2;").allowed).toBe(true);

    const blockedFetch = guardCodeExecutionSource("return fetch('https://example.com');");
    expect(blockedFetch.allowed).toBe(false);
    expect(blockedFetch.reason).toBe("forbidden_pattern_detected");

    const blockedRequire = guardCodeExecutionSource("const fs = require('fs'); return fs.readdirSync('.');");
    expect(blockedRequire.allowed).toBe(false);
    expect(blockedRequire.reason).toBe("forbidden_pattern_detected");
  });

  it("emits deterministic trust events and blocks execution when policy is missing", async () => {
    const runMutation = vi.fn(async () => {});
    const runAction = vi.fn(async (_reference: unknown, actionArgs: any) => {
      if (typeof actionArgs?.timeoutMs === "number") {
        return {
          result: { ok: true },
          resultBytes: 12,
          resultTruncated: false,
        };
      }
      return {
        sourceHash: "test-hash",
        sourceBytes: 20,
      };
    });

    const result = await executeCodeTool.execute(
      {
        organizationId: ORG_ID,
        userId: USER_ID,
        channel: "webchat",
        runMutation,
        runAction,
      } as any,
      {
        sourceCode: "return { ok: true };",
      },
    );

    expect(result).toMatchObject({
      success: false,
      status: "blocked",
      reason: "policy_missing",
    });
    expect(runMutation).toHaveBeenCalledTimes(3);

    const eventNames = runMutation.mock.calls.map((call) => call[1]?.eventName);
    expect(eventNames).toEqual([
      "trust.guardrail.code_execution_requested.v1",
      "trust.guardrail.code_execution_blocked.v1",
      "trust.guardrail.code_execution_outcome.v1",
    ]);
  });

  it("executes in bounded sandbox and emits allow/outcome trust events", async () => {
    const runMutation = vi.fn(async () => {});
    const runAction = vi.fn(async (_reference: unknown, actionArgs: any) => {
      if (typeof actionArgs?.timeoutMs === "number") {
        return {
          result: { sum: actionArgs.input.a + actionArgs.input.b },
          resultBytes: 9,
          resultTruncated: false,
        };
      }
      return {
        sourceHash: "test-hash",
        sourceBytes: 31,
      };
    });

    const result = await executeCodeTool.execute(
      {
        organizationId: ORG_ID,
        userId: USER_ID,
        channel: "webchat",
        runtimePolicy: {
          codeExecution: {
            autonomyLevel: "autonomous",
            requireApprovalFor: [],
            approvalRequired: false,
            approvalGranted: false,
            policySource: "unit_test",
          },
        },
        runMutation,
        runAction,
      } as any,
      {
        sourceCode: "return { sum: input.a + input.b };",
        input: { a: 3, b: 4 },
        timeoutMs: 200,
      },
    );

    expect(result).toMatchObject({
      success: true,
      status: "executed",
      result: { sum: 7 },
    });
    expect(runMutation).toHaveBeenCalledTimes(3);

    const eventNames = runMutation.mock.calls.map((call) => call[1]?.eventName);
    expect(eventNames).toEqual([
      "trust.guardrail.code_execution_requested.v1",
      "trust.guardrail.code_execution_allowed.v1",
      "trust.guardrail.code_execution_outcome.v1",
    ]);
  });
});
