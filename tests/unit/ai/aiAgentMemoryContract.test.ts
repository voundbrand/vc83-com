import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  buildRuntimeMemoryLaneTelemetry,
  evaluateAiAgentMemoryRuntimeContract,
} from "../../../convex/ai/kernel/agentExecution";

const ORG_A = "org_a" as Id<"organizations">;
const ORG_B = "org_b" as Id<"organizations">;

const BASE_SCOPE = {
  sessionOrganizationId: ORG_A,
  requestedOrganizationId: ORG_A,
  sessionChannel: "slack",
  requestedChannel: "slack",
  sessionExternalContactIdentifier: "slack:C123:user:U123",
  requestedExternalContactIdentifier: "slack:C123:user:U123",
  sessionRoutingKey: "route:slack:T123",
  requestedSessionRoutingKey: "route:slack:T123",
} as const;

describe("aiAgentMemory runtime contract", () => {
  it("enforces explicit deprecation for matching scope", () => {
    const decision = evaluateAiAgentMemoryRuntimeContract(BASE_SCOPE);

    expect(decision.contractVersion).toBe("occ_ai_agent_memory_runtime_v1");
    expect(decision.decision).toBe("deprecate");
    expect(decision.policyMode).toBe("fail_closed");
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("deprecated_contract");
  });

  it("fails closed with deterministic scope mismatch reasons", () => {
    const orgMismatch = evaluateAiAgentMemoryRuntimeContract({
      ...BASE_SCOPE,
      requestedOrganizationId: ORG_B,
    });
    const channelMismatch = evaluateAiAgentMemoryRuntimeContract({
      ...BASE_SCOPE,
      requestedChannel: "webchat",
    });
    const contactMismatch = evaluateAiAgentMemoryRuntimeContract({
      ...BASE_SCOPE,
      requestedExternalContactIdentifier: "slack:C999:user:U999",
    });
    const routeMismatch = evaluateAiAgentMemoryRuntimeContract({
      ...BASE_SCOPE,
      requestedSessionRoutingKey: "route:slack:T999",
    });
    const missingScope = evaluateAiAgentMemoryRuntimeContract({
      ...BASE_SCOPE,
      requestedSessionRoutingKey: " ",
    });

    expect(orgMismatch.reason).toBe("session_org_mismatch");
    expect(channelMismatch.reason).toBe("channel_mismatch");
    expect(contactMismatch.reason).toBe("contact_mismatch");
    expect(routeMismatch.reason).toBe("route_mismatch");
    expect(missingScope.reason).toBe("missing_scope");
  });

  it("builds deterministic memory telemetry with layer ordering and refresh outcomes", () => {
    const telemetry = buildRuntimeMemoryLaneTelemetry({
      aiAgentMemoryContract: evaluateAiAgentMemoryRuntimeContract(BASE_SCOPE),
      rollingMemoryRefresh: {
        success: false,
        reason: "scope_blocked",
        error: "session_org_mismatch",
      },
      contactMemoryRefresh: {
        success: true,
        insertedCount: 2.9,
        supersededCount: 1,
        ambiguousFields: ["email", "", "phone", "email"],
      },
    });

    expect(telemetry.contractVersion).toBe("occ_memory_lane_telemetry_v1");
    expect(telemetry.layerOrder).toEqual(["L3", "L2", "L5", "L4"]);
    expect(telemetry.aiAgentMemory.reason).toBe("deprecated_contract");
    expect(telemetry.rollingSummaryRefresh.status).toBe("blocked");
    expect(telemetry.contactMemoryRefresh.status).toBe("success");
    expect(telemetry.contactMemoryRefresh.insertedCount).toBe(2);
    expect(telemetry.contactMemoryRefresh.supersededCount).toBe(1);
    expect(telemetry.contactMemoryRefresh.ambiguousFieldCount).toBe(2);
    expect(telemetry.contactMemoryRefresh.ambiguousFields).toEqual(["email", "phone"]);
  });

  it("labels no-source contact memory refresh as skipped instead of blocked", () => {
    const telemetry = buildRuntimeMemoryLaneTelemetry({
      aiAgentMemoryContract: evaluateAiAgentMemoryRuntimeContract(BASE_SCOPE),
      rollingMemoryRefresh: {
        success: true,
      },
      contactMemoryRefresh: {
        success: true,
        skippedReason: "no_eligible_sources",
        extractedCandidateCount: 0,
        eligibleCandidateCount: 0,
      },
    });

    expect(telemetry.contactMemoryRefresh.status).toBe("skipped");
    expect(telemetry.contactMemoryRefresh.reason).toBe("no_eligible_sources");
    expect(telemetry.contactMemoryRefresh.insertedCount).toBe(0);
    expect(telemetry.contactMemoryRefresh.supersededCount).toBe(0);
  });
});
