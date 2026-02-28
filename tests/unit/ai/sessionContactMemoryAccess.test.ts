import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  evaluateSessionContactMemoryWriteProvenance,
  evaluateSessionContactMemoryWriteScope,
} from "../../../convex/ai/agentSessions";

const ORG_A = "org_a" as Id<"organizations">;
const ORG_B = "org_b" as Id<"organizations">;

describe("session contact memory L4 contracts", () => {
  it("allows writes when tenant/channel/contact/route scope matches", () => {
    const decision = evaluateSessionContactMemoryWriteScope({
      sessionOrganizationId: ORG_A,
      requestedOrganizationId: ORG_A,
      sessionChannel: "slack",
      requestedChannel: "slack",
      sessionExternalContactIdentifier: "slack:C123:user:U123",
      requestedExternalContactIdentifier: "slack:C123:user:U123",
      sessionRoutingKey: "route:slack:T123",
      requestedSessionRoutingKey: "route:slack:T123",
    });

    expect(decision.allowed).toBe(true);
  });

  it("fails closed on cross-tenant or cross-route L4 writes", () => {
    const tenantMismatch = evaluateSessionContactMemoryWriteScope({
      sessionOrganizationId: ORG_A,
      requestedOrganizationId: ORG_B,
      sessionChannel: "slack",
      requestedChannel: "slack",
      sessionExternalContactIdentifier: "slack:C123:user:U123",
      requestedExternalContactIdentifier: "slack:C123:user:U123",
      sessionRoutingKey: "route:slack:T123",
      requestedSessionRoutingKey: "route:slack:T123",
    });
    const routeMismatch = evaluateSessionContactMemoryWriteScope({
      sessionOrganizationId: ORG_A,
      requestedOrganizationId: ORG_A,
      sessionChannel: "slack",
      requestedChannel: "slack",
      sessionExternalContactIdentifier: "slack:C123:user:U123",
      requestedExternalContactIdentifier: "slack:C123:user:U123",
      sessionRoutingKey: "route:slack:T123",
      requestedSessionRoutingKey: "route:slack:T999",
    });

    expect(tenantMismatch.allowed).toBe(false);
    expect(tenantMismatch.reason).toBe("session_org_mismatch");
    expect(routeMismatch.allowed).toBe(false);
    expect(routeMismatch.reason).toBe("route_mismatch");
  });

  it("requires strict provenance contract fields for L4 writes", () => {
    const allowed = evaluateSessionContactMemoryWriteProvenance({
      provenance: {
        contractVersion: "session_contact_memory_v1",
        sourcePolicy: "explicit_user_verified_tool_v1",
        actor: "agent_execution_pipeline",
        trustEventName: "trust.memory.consent_decided.v1",
      },
    });
    const invalidTrustEvent = evaluateSessionContactMemoryWriteProvenance({
      provenance: {
        contractVersion: "session_contact_memory_v1",
        sourcePolicy: "explicit_user_verified_tool_v1",
        actor: "agent_execution_pipeline",
        trustEventName: "trust.memory.write_blocked_no_consent.v1",
      },
    });

    expect(allowed.allowed).toBe(true);
    expect(invalidTrustEvent.allowed).toBe(false);
    expect(invalidTrustEvent.reason).toBe("invalid_trust_event");
  });
});
