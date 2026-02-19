import { describe, expect, it } from "vitest";
import {
  buildVoiceAgentCoCreationHandoffPayload,
  buildVoiceAgentForThisDraft,
} from "../../../src/lib/voice-assistant/agent-co-creation-handoff";

describe("voice agent co-creation handoff helpers", () => {
  it("builds a trust-safe draft with artifact highlights and explicit approvals", () => {
    const draft = buildVoiceAgentForThisDraft({
      contentDNAId: "obj_content_dna_123",
      extractedData: {
        brandVoice: "Clear and direct",
        escalationPolicy: "Escalate legal and billing disputes",
      },
      trustArtifacts: {
        version: "trust-artifacts.v1",
        soulCard: {
          identityAnchors: [{ fieldId: "identity", valuePreview: "Reliable operator voice." }],
        },
        guardrailsCard: {
          guardrails: [{ fieldId: "guardrail", valuePreview: "Do not execute refunds without review." }],
        },
        teamCharter: {
          handoffBoundaries: [{ fieldId: "handoff", valuePreview: "Escalate uncertain policy calls to human." }],
        },
        memoryLedger: {
          ledgerEntries: [{ fieldId: "ledger", valuePreview: "Trust boundaries confirmed by operator." }],
        },
      },
      voiceConsentSummary: {
        activeCheckpointId: "cp3_post_save_revoke",
        sourceAttributionCount: 6,
        memoryCandidateCount: 9,
        sourceAttributionPolicy: "Show source attribution before any save or action.",
      },
      memoryConsent: {
        status: "accepted",
        consentScope: "content_dna_profile",
        consentPromptVersion: "interview-memory-consent-v1",
      },
    });

    expect(draft).toContain("Operator-approved handoff");
    expect(draft).toContain("Content DNA ID: obj_content_dna_123");
    expect(draft).toContain("Source-attributed candidates: 6");
    expect(draft).toContain("Keep human-in-the-loop approvals explicit");
    expect(draft).toContain("Preserve trust-artifacts.v1 compatibility");
    expect(draft).toContain("Soul Card: Reliable operator voice.");
    expect(draft).toContain("Guardrails: Do not execute refunds without review.");
    expect(draft).toContain("Team Charter: Escalate uncertain policy calls to human.");
  });

  it("keeps source-field highlights deterministic by key order", () => {
    const draft = buildVoiceAgentForThisDraft({
      contentDNAId: "obj_sorted",
      extractedData: {
        zetaField: "last",
        alphaField: "first",
      },
    });

    const alphaIndex = draft.indexOf("- alphaField: first");
    const zetaIndex = draft.indexOf("- zetaField: last");
    expect(alphaIndex).toBeGreaterThan(-1);
    expect(zetaIndex).toBeGreaterThan(-1);
    expect(alphaIndex).toBeLessThan(zetaIndex);
  });

  it("builds payload metadata with schema-compatible defaults", () => {
    const payload = buildVoiceAgentCoCreationHandoffPayload({
      contentDNAId: "obj_payload",
      trustArtifacts: {
        version: "trust-artifacts.v1",
      },
      voiceConsentSummary: {
        activeCheckpointId: "cp3_post_save_revoke",
      },
    });

    expect(payload.version).toBe("voice-agent-handoff.v1");
    expect(payload.source).toBe("voice_interview");
    expect(payload.contentDNAId).toBe("obj_payload");
    expect(payload.trustArtifactsVersion).toBe("trust-artifacts.v1");
    expect(payload.consentCheckpointId).toBe("cp3_post_save_revoke");
    expect(payload.requiresHumanReview).toBe(true);
    expect(payload.createdAt).toBeTypeOf("number");
    expect(payload.draftMessage).toContain("agent for this");
  });
});
