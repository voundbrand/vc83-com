import { describe, expect, it } from "vitest";
import {
  buildOrgCrmProjectionObjectName,
  buildOrgCrmSyncCandidateName,
  normalizeOrgCrmProjectionSummary,
} from "../../../convex/ai/orgCrmProjection";

describe("org CRM projection contract", () => {
  it("normalizes projection summary with fallback and length guard", () => {
    expect(normalizeOrgCrmProjectionSummary(undefined)).toBe(
      "CRM projection captured",
    );
    expect(normalizeOrgCrmProjectionSummary("  ")).toBe(
      "CRM projection captured",
    );
    expect(normalizeOrgCrmProjectionSummary("hello")).toBe("hello");
    expect(normalizeOrgCrmProjectionSummary("x".repeat(1500))).toHaveLength(1200);
  });

  it("builds deterministic projection object names", () => {
    const sessionId = "session_123" as never;
    expect(
      buildOrgCrmProjectionObjectName({
        sessionId,
        turnId: "turn_456",
        capturedAt: 1735689600000,
      }),
    ).toBe("crm_projection:session_123:turn_456");
    expect(
      buildOrgCrmProjectionObjectName({
        sessionId,
        capturedAt: 1735689600000,
      }),
    ).toBe("crm_projection:session_123:1735689600000");
  });

  it("builds deterministic sync-candidate object names", () => {
    const sessionId = "session_123" as never;
    expect(
      buildOrgCrmSyncCandidateName({
        sessionId,
        turnId: "turn_456",
        capturedAt: 1735689600000,
      }),
    ).toBe("crm_sync_candidate:session_123:turn_456");
    expect(
      buildOrgCrmSyncCandidateName({
        sessionId,
        capturedAt: 1735689600000,
      }),
    ).toBe("crm_sync_candidate:session_123:1735689600000");
  });
});

