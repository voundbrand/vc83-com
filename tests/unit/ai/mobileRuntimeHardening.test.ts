import { describe, expect, it } from "vitest";
import {
  MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION,
  MOBILE_SOURCE_ATTESTATION_CONTRACT_VERSION,
  buildMobileSourceAttestationChallenge,
  computeMobileSourceAttestationSignature,
  resolveMobileNodeCommandPolicyDecision,
  resolveMobileSourceAttestationContract,
} from "../../../convex/ai/mobileRuntimeHardening";

describe("mobile runtime hardening", () => {
  it("verifies signed attestation for mobile AV sources before trusting metadata", () => {
    const nowMs = 1_701_400_000_000;
    const liveSessionId = "mobile_live_test_1";
    const sourceId = "iphone_camera:ios_avfoundation:rear_camera";
    const sourceClass = "iphone_camera";
    const providerId = "ios_avfoundation";
    const nonce = "nonce_test_1";
    const challenge = buildMobileSourceAttestationChallenge({
      liveSessionId,
      sourceId,
      nonce,
    });
    const issuedAtMs = nowMs - 1_000;
    const signature = computeMobileSourceAttestationSignature({
      secret: "attestation_secret_1",
      challenge,
      nonce,
      issuedAtMs,
      liveSessionId,
      sourceId,
      sourceClass,
      providerId,
    });

    const contract = resolveMobileSourceAttestationContract({
      nowMs,
      secret: "attestation_secret_1",
      metadata: {
        liveSessionId,
        cameraRuntime: {
          liveSessionId,
          sourceId,
          sourceClass,
          providerId,
          sourceAttestation: {
            contractVersion: MOBILE_SOURCE_ATTESTATION_CONTRACT_VERSION,
            challenge,
            nonce,
            issuedAtMs,
            sourceId,
            sourceClass,
            providerId,
            signature,
          },
        },
      },
    });

    expect(contract.verificationRequired).toBe(true);
    expect(contract.verified).toBe(true);
    expect(contract.verificationStatus).toBe("verified");
    expect(contract.verifiedSourceCount).toBe(1);
    expect(contract.quarantinedSourceIds).toEqual([]);
    expect(contract.reasonCodes).toEqual([]);
  });

  it("quarantines unverifiable mobile source attestations", () => {
    const nowMs = 1_701_500_000_000;
    const liveSessionId = "mobile_live_test_2";
    const sourceId = "iphone_microphone:ios_avfoundation:primary_mic";
    const sourceClass = "iphone_microphone";
    const providerId = "ios_avfoundation";
    const nonce = "nonce_test_2";
    const challenge = buildMobileSourceAttestationChallenge({
      liveSessionId,
      sourceId,
      nonce,
    });

    const contract = resolveMobileSourceAttestationContract({
      nowMs,
      secret: "attestation_secret_2",
      metadata: {
        liveSessionId,
        voiceRuntime: {
          liveSessionId,
          sourceId,
          sourceClass,
          providerId,
          sourceAttestation: {
            contractVersion: MOBILE_SOURCE_ATTESTATION_CONTRACT_VERSION,
            challenge,
            nonce,
            issuedAtMs: nowMs - 1_000,
            sourceId,
            sourceClass,
            providerId,
            signature: "sigv1_tampered_signature",
          },
        },
      },
    });

    expect(contract.verificationRequired).toBe(true);
    expect(contract.verified).toBe(false);
    expect(contract.verificationStatus).toBe("invalid_signature");
    expect(contract.reasonCodes).toContain("invalid_signature");
    expect(contract.quarantinedSourceIds).toEqual([sourceId]);
  });

  it("rejects unsupported attestation contract versions", () => {
    const contract = resolveMobileSourceAttestationContract({
      nowMs: 1_701_550_000_000,
      secret: "attestation_secret_2",
      metadata: {
        liveSessionId: "mobile_live_test_unknown_contract",
        cameraRuntime: {
          sourceId: "iphone_camera:ios_avfoundation:front_camera",
          sourceClass: "iphone_camera",
          providerId: "ios_avfoundation",
          sourceAttestation: {
            contractVersion: "legacy_attestation_v0",
            challenge: "attn:legacy",
            nonce: "legacy_nonce",
            issuedAtMs: 1_701_550_000_000,
            sourceId: "iphone_camera:ios_avfoundation:front_camera",
            sourceClass: "iphone_camera",
            providerId: "ios_avfoundation",
            signature: "sigv1_legacy",
          },
        },
      },
    });

    expect(contract.verified).toBe(false);
    expect(contract.verificationStatus).toBe("unknown_contract");
    expect(contract.reasonCodes).toContain("unknown_attestation_contract");
  });

  it("skips attestation requirement for non-mobile source classes", () => {
    const contract = resolveMobileSourceAttestationContract({
      nowMs: 1_701_600_000_000,
      secret: "attestation_secret_3",
      metadata: {
        liveSessionId: "desktop_live_1",
        cameraRuntime: {
          sourceId: "webcam:default",
          sourceClass: "webcam",
          providerId: "browser",
        },
      },
    });

    expect(contract.verificationRequired).toBe(false);
    expect(contract.verified).toBe(true);
    expect(contract.verificationStatus).toBe("not_required");
  });

  it("enforces server-authoritative command policy fail-closed when contract is missing", () => {
    const decision = resolveMobileNodeCommandPolicyDecision({
      metadata: {
        liveSessionId: "mobile_live_policy_1",
      },
      requiredCommands: ["assemble_concierge_payload", "preview_meeting_concierge"],
      enforceForLiveIngress: true,
    });

    expect(decision.policyRequired).toBe(true);
    expect(decision.allowed).toBe(false);
    expect(decision.status).toBe("blocked");
    expect(decision.reasonCode).toBe("missing_policy_contract");
  });

  it("blocks unknown or unsafe commands under command policy enforcement", () => {
    const unknownDecision = resolveMobileNodeCommandPolicyDecision({
      metadata: {
        commandPolicy: {
          contractVersion: MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION,
          attemptedCommands: ["assemble_concierge_payload", "publish_page"],
        },
      },
      requiredCommands: ["assemble_concierge_payload", "preview_meeting_concierge"],
      enforceForLiveIngress: true,
    });
    expect(unknownDecision.allowed).toBe(false);
    expect(unknownDecision.reasonCode).toBe("unsafe_command_pattern");
    expect(unknownDecision.blockedCommand).toBe("publish_page");

    const unsafeDecision = resolveMobileNodeCommandPolicyDecision({
      metadata: {
        commandPolicy: {
          contractVersion: MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION,
          attemptedCommands: ["assemble_concierge_payload", "sudo reboot"],
        },
      },
      requiredCommands: ["assemble_concierge_payload", "preview_meeting_concierge"],
      enforceForLiveIngress: true,
    });
    expect(unsafeDecision.allowed).toBe(false);
    expect(unsafeDecision.reasonCode).toBe("unsafe_command_pattern");
    expect(unsafeDecision.blockedCommand).toBe("sudo reboot");
  });

  it("allows evaluated command set when policy contract is valid and allowlisted", () => {
    const decision = resolveMobileNodeCommandPolicyDecision({
      metadata: {
        commandPolicy: {
          contractVersion: MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION,
          attemptedCommands: ["assemble_concierge_payload", "preview_meeting_concierge"],
        },
      },
      requiredCommands: ["assemble_concierge_payload", "preview_meeting_concierge"],
      enforceForLiveIngress: true,
    });

    expect(decision.policyRequired).toBe(true);
    expect(decision.allowed).toBe(true);
    expect(decision.status).toBe("allowed");
    expect(decision.reasonCode).toBe("allowed");
    expect(decision.evaluatedCommands).toEqual([
      "assemble_concierge_payload",
      "preview_meeting_concierge",
    ]);
  });
});
