import { describe, expect, it } from "vitest";
import {
  ADMISSION_DENIAL_CONTRACT_VERSION,
  ADMISSION_DENIAL_REASON_CATALOG,
  ADMISSION_DENIAL_STAGE_TAXONOMY,
  buildAdmissionDenial,
} from "../../../convex/ai/admissionController";
import { buildDeniedTurnAdmissionPayload } from "../../../convex/ai/agentExecution";

describe("admission reason catalog + stage taxonomy", () => {
  it("keeps the denial reason catalog deterministic", () => {
    expect(ADMISSION_DENIAL_REASON_CATALOG).toEqual([
      "agent_not_found",
      "channel_not_allowed",
      "context_invalid",
      "precondition_missing",
      "replay_duplicate",
      "tool_unavailable",
    ]);
  });

  it("keeps the denial stage taxonomy deterministic", () => {
    expect(ADMISSION_DENIAL_STAGE_TAXONOMY).toEqual([
      "admission",
      "idempotency",
      "runtime",
    ]);
  });
});

describe("admission denial payload contract", () => {
  it("emits machine-readable fields for admission-stage denials", () => {
    const denial = buildAdmissionDenial({
      channel: "webchat",
      reasonCode: "context_invalid",
      deniedAtMs: 1772448000000,
      metadata: {
        requestId: "req_1",
      },
    });

    expect(denial).toEqual({
      contractVersion: ADMISSION_DENIAL_CONTRACT_VERSION,
      denied: true,
      stage: "admission",
      reasonCode: "context_invalid",
      reason: "Ingress context is invalid or unresolved.",
      httpStatusHint: 403,
      userSafeMessage: "We could not process your message right now. Please try again.",
      channel: "webchat",
      metadata: {
        requestId: "req_1",
      },
      deniedAt: 1772448000000,
    });
  });

  it("emits machine-readable idempotency fields for denied turns", () => {
    const denial = buildDeniedTurnAdmissionPayload({
      channel: "native_guest",
      stage: "idempotency",
      reasonCode: "replay_duplicate",
      reason: "replay_duplicate_ingress",
      httpStatusHint: 409,
      userSafeMessage: "Message received. Continuing from your latest step.",
      deniedAtMs: 1772448001000,
      idempotencyContract: {
        contractVersion: "tcg_idempotency_v1",
        scopeKind: "route_workflow",
        scopeKey: "org_1:route:native_guest:message_ingress",
        intentType: "ingress",
        payloadHash: "hash_1",
        ttlMs: 30000,
        issuedAt: 1772448000000,
        expiresAt: 1772448030000,
        replayOutcome: "duplicate_acknowledged",
      },
      metadata: {
        conflictLabel: "replay_duplicate_ingress",
        duplicateCount: 2,
      },
    });

    expect(denial).toEqual({
      contractVersion: ADMISSION_DENIAL_CONTRACT_VERSION,
      denied: true,
      stage: "idempotency",
      reasonCode: "replay_duplicate",
      reason: "replay_duplicate_ingress",
      httpStatusHint: 409,
      userSafeMessage: "Message received. Continuing from your latest step.",
      channel: "native_guest",
      idempotency: {
        scopeKey: "org_1:route:native_guest:message_ingress",
        payloadHash: "hash_1",
        classification: "ingress",
      },
      metadata: {
        conflictLabel: "replay_duplicate_ingress",
        duplicateCount: 2,
      },
      deniedAt: 1772448001000,
    });
  });
});
