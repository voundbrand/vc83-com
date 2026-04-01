import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  buildOrgBookingConciergePhoneSafeResult,
  ORG_BOOKING_CONCIERGE_PHONE_SAFE_CONTRACT_VERSION,
} from "../../../convex/ai/tools/bookingTool";
import { resolveInboundIngressEnvelope } from "../../../convex/ai/kernel/agentExecution";

const ORG_ID = "org_1" as Id<"organizations">;
const AGENT_ID = "agent_1" as Id<"objects">;

describe("org booking concierge phone-safe result", () => {
  it("builds preview-ready caller-safe booking output with a recommended slot", () => {
    const result = buildOrgBookingConciergePhoneSafeResult({
      outcome: "preview_ready",
      recommendedSlot: {
        startDateTime: Date.parse("2026-03-18T09:00:00.000Z"),
        endDateTime: Date.parse("2026-03-18T09:30:00.000Z"),
      },
      alternateSlots: [
        {
          startDateTime: Date.parse("2026-03-18T10:00:00.000Z"),
          endDateTime: Date.parse("2026-03-18T10:30:00.000Z"),
        },
      ],
      timezone: "Europe/Berlin",
    });

    expect(result.contractVersion).toBe(
      ORG_BOOKING_CONCIERGE_PHONE_SAFE_CONTRACT_VERSION,
    );
    expect(result.provider).toBe("native_booking");
    expect(result.outcome).toBe("preview_ready");
    expect(result.recommendedSlot?.startDateTime).toBe(
      "2026-03-18T09:00:00.000Z",
    );
    expect(result.alternateSlots).toHaveLength(1);
    expect(result.callerSafeConfirmation.confirmQuestion).toContain(
      "Would you like me to book",
    );
    expect(result.fallbackOptions.map((option) => option.action)).toEqual([
      "callback_capture",
      "human_escalation",
    ]);
  });

  it("builds blocked caller-safe output with failure guidance", () => {
    const result = buildOrgBookingConciergePhoneSafeResult({
      outcome: "blocked",
      recommendedSlot: null,
      alternateSlots: [],
      timezone: "Europe/Berlin",
      failureReason: "the confirmed slot is no longer available live",
    });

    expect(result.outcome).toBe("blocked");
    expect(result.provider).toBe("native_booking");
    expect(result.recommendedSlot).toBeNull();
    expect(result.callerSafeConfirmation.failureLine).toContain(
      "could not complete the booking safely",
    );
    expect(result.fallbackOptions).toHaveLength(2);
  });
});

describe("phone-call ingress envelope", () => {
  it("preserves provider call identifiers for downstream phone-safe booking tools", () => {
    const envelope = resolveInboundIngressEnvelope({
      organizationId: ORG_ID,
      channel: "phone_call",
      externalContactIdentifier: "+491234567890",
      metadata: {
        providerCallId: "call_123",
        providerConversationId: "conv_456",
      },
      authority: {
        primaryAgentId: AGENT_ID,
        authorityAgentId: AGENT_ID,
        speakerAgentId: AGENT_ID,
      },
      now: 1_763_174_400_000,
    });

    expect(envelope.channel).toBe("phone_call");
    expect(envelope.providerMessageId).toBe("call_123");
    expect(envelope.providerConversationId).toBe("conv_456");
  });
});
