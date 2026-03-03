import { describe, expect, it } from "vitest";
import {
  ADMISSION_DENIAL_CONTRACT_VERSION,
  buildAdmissionDenial,
  evaluateIngressAdmission,
} from "../../../convex/ai/admissionController";

describe("admission denial contract", () => {
  it("emits admission_denial_v1 for unresolved context", () => {
    const decision = evaluateIngressAdmission({
      channel: "webchat",
      contextResolved: false,
      deniedAtMs: 1772448000000,
    });

    expect(decision).toEqual({
      allowed: false,
      denial: {
        contractVersion: ADMISSION_DENIAL_CONTRACT_VERSION,
        denied: true,
        stage: "admission",
        reasonCode: "context_invalid",
        reason: "Ingress context is invalid or unresolved.",
        httpStatusHint: 403,
        userSafeMessage: "We could not process your message right now. Please try again.",
        channel: "webchat",
        deniedAt: 1772448000000,
        manifestHash: undefined,
        idempotency: undefined,
        metadata: undefined,
      },
    });
  });

  it("emits channel_not_allowed denial for disabled ingress channel", () => {
    const decision = evaluateIngressAdmission({
      channel: "native_guest",
      contextResolved: true,
      agentFound: true,
      channelAllowed: false,
      deniedAtMs: 1772448000001,
    });

    expect(decision).toEqual({
      allowed: false,
      denial: {
        contractVersion: ADMISSION_DENIAL_CONTRACT_VERSION,
        denied: true,
        stage: "admission",
        reasonCode: "channel_not_allowed",
        reason: "Requested ingress channel is not enabled for this agent.",
        httpStatusHint: 403,
        userSafeMessage: "We could not process your message right now. Please try again.",
        channel: "native_guest",
        deniedAt: 1772448000001,
        manifestHash: undefined,
        idempotency: undefined,
        metadata: undefined,
      },
    });
  });

  it("allows ingress when context and channel checks pass", () => {
    const decision = evaluateIngressAdmission({
      channel: "webchat",
      contextResolved: true,
      agentFound: true,
      channelAllowed: true,
    });

    expect(decision).toEqual({ allowed: true });
  });

  it("builds deterministic denial payload from reason code", () => {
    expect(
      buildAdmissionDenial({
        channel: "webchat",
        reasonCode: "agent_not_found",
        deniedAtMs: 1772448000010,
      }),
    ).toEqual({
      contractVersion: ADMISSION_DENIAL_CONTRACT_VERSION,
      denied: true,
      stage: "admission",
      reasonCode: "agent_not_found",
      reason: "Agent not found for the requested context.",
      httpStatusHint: 403,
      userSafeMessage: "We could not process your message right now. Please try again.",
      channel: "webchat",
      deniedAt: 1772448000010,
      manifestHash: undefined,
      idempotency: undefined,
      metadata: undefined,
    });
  });
});
