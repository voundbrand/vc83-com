import { describe, expect, it } from "vitest";
import {
  buildCanonicalIdempotencyTupleContract,
  buildDeterministicIdempotencyPayloadHash,
  evaluateInboundIdempotencyTuple,
} from "../../../convex/ai/idempotencyCoordinator";
import type { Id } from "../../../convex/_generated/dataModel";

const ORG_ID = "org_1" as Id<"organizations">;

describe("idempotency tuple contract", () => {
  it("normalizes tuple fields and emits a deterministic tuple hash", () => {
    const a = buildCanonicalIdempotencyTupleContract({
      ingressKey: "  ingress:key:123  ",
      scopeKey: "  org_1:route:slack:T123:message_ingress  ",
      payloadHash: " payload_hash_1 ",
      intentType: "ingress",
      ttlMs: 30000.9,
    });

    const b = buildCanonicalIdempotencyTupleContract({
      ingressKey: "ingress:key:123",
      scopeKey: "org_1:route:slack:T123:message_ingress",
      payloadHash: "payload_hash_1",
      intentType: "ingress",
      ttlMs: 30000,
    });

    expect(a.ingressKey).toBe("ingress:key:123");
    expect(a.scopeKey).toBe("org_1:route:slack:T123:message_ingress");
    expect(a.payloadHash).toBe("payload_hash_1");
    expect(a.ttlMs).toBe(30000);
    expect(a.tupleHash).toBe(b.tupleHash);
  });

  it("builds deterministic payload hashes for logically equivalent ingress payloads", () => {
    const hashA = buildDeterministicIdempotencyPayloadHash({
      organizationId: ORG_ID,
      workflowKey: "message_ingress",
      message: "  Hello   FROM   Queue  ",
      metadata: {
        eventId: "evt_123",
      },
      collaboration: {
        lineageId: "lineage:1",
        threadId: "thread:1",
      },
    });

    const hashB = buildDeterministicIdempotencyPayloadHash({
      organizationId: ORG_ID,
      workflowKey: "message_ingress",
      message: "hello from queue",
      metadata: {
        providerEventId: "evt_123",
      },
      collaboration: {
        threadId: "thread:1",
        lineageId: "lineage:1",
      },
    });

    expect(hashA).toBe(hashB);
  });

  it("evaluates replay policy and labels via canonical evaluator entrypoint", () => {
    const ingress = evaluateInboundIdempotencyTuple({
      channel: "native_guest",
      ingressKey: "ingress:abc",
      idempotencyContract: {
        contractVersion: "tcg_idempotency_v1",
        scopeKind: "route_workflow",
        scopeKey: "org_1:route:native_guest:message_ingress",
        intentType: "ingress",
        payloadHash: "hash_1",
        ttlMs: 30000,
        issuedAt: 1700000000000,
        expiresAt: 1700000030000,
        replayOutcome: "duplicate_acknowledged",
      },
    });

    const commit = evaluateInboundIdempotencyTuple({
      channel: "native_guest",
      ingressKey: "ingress:commit",
      idempotencyContract: {
        contractVersion: "tcg_idempotency_v1",
        scopeKind: "collaboration",
        scopeKey: "org_1:lineage:1:thread:1:commit",
        intentType: "commit",
        payloadHash: "hash_2",
        ttlMs: 30000,
        issuedAt: 1700000000000,
        expiresAt: 1700000030000,
        replayOutcome: "replay_previous_result",
      },
    });

    expect(ingress.allowScopePayloadHashReplayMatch).toBe(false);
    expect(ingress.replayConflictLabel).toBe("replay_duplicate_ingress");
    expect(ingress.replayOutcome).toBe("duplicate_acknowledged");
    expect(ingress.tuple?.contractVersion).toBe("tcg_idempotency_tuple_v1");
    expect(commit.allowScopePayloadHashReplayMatch).toBe(true);
    expect(commit.replayConflictLabel).toBe("replay_duplicate_commit");
    expect(commit.replayOutcome).toBe("replay_previous_result");
    expect(commit.tuple?.intentType).toBe("commit");
  });
});

