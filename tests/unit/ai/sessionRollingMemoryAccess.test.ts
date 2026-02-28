import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { evaluateSessionRollingMemoryWriteScope } from "../../../convex/ai/agentSessions";

const ORG_A = "org_a" as Id<"organizations">;
const ORG_B = "org_b" as Id<"organizations">;

describe("session rolling memory scope", () => {
  it("allows writes when requested org matches the session org", () => {
    const decision = evaluateSessionRollingMemoryWriteScope({
      sessionOrganizationId: ORG_A,
      requestedOrganizationId: ORG_A,
    });

    expect(decision.allowed).toBe(true);
  });

  it("fails closed when scope metadata is missing", () => {
    const decision = evaluateSessionRollingMemoryWriteScope({
      sessionOrganizationId: ORG_A,
      requestedOrganizationId: null,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("missing_scope");
  });

  it("fails closed on cross-tenant writes", () => {
    const decision = evaluateSessionRollingMemoryWriteScope({
      sessionOrganizationId: ORG_A,
      requestedOrganizationId: ORG_B,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("session_org_mismatch");
  });
});
