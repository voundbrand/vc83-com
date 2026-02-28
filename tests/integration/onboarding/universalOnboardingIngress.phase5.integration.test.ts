import { afterEach, describe, expect, it, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { handleWebchatMessage } from "../../../convex/api/v1/webchatApi";
import { resolveChatToOrg } from "../../../convex/onboarding/telegramResolver";

const ORG_ID = "org_platform_phase5" as Id<"organizations">;
const AGENT_ID = "agent_platform_phase5" as Id<"objects">;
const ACTIVE_ORG_ID = "org_active_phase5" as Id<"organizations">;
const ORIGINAL_TEST_ORG_ID = process.env.TEST_ORG_ID;

function createWebchatIngressContext(args: { channel: "webchat" | "native_guest" }) {
  const eventMutations: Array<Record<string, unknown>> = [];
  const metadataPayloads: Array<Record<string, unknown>> = [];

  const runQuery = vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
    if (Object.prototype.hasOwnProperty.call(payload, "sessionToken")) {
      return null;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "agentId")) {
      return { agentName: "Operator" };
    }
    return null;
  });

  const runMutation = vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
    if (
      Object.prototype.hasOwnProperty.call(payload, "organizationId")
      && Object.prototype.hasOwnProperty.call(payload, "agentId")
      && Object.prototype.hasOwnProperty.call(payload, "channel")
      && !Object.prototype.hasOwnProperty.call(payload, "sessionToken")
    ) {
      return { sessionToken: args.channel === "native_guest" ? "ng_phase5_1" : "wc_phase5_1" };
    }

    if (Object.prototype.hasOwnProperty.call(payload, "eventName")) {
      eventMutations.push(payload);
      return { success: true };
    }

    if (
      Object.prototype.hasOwnProperty.call(payload, "sessionToken")
      && Object.prototype.hasOwnProperty.call(payload, "organizationId")
      && Object.prototype.hasOwnProperty.call(payload, "agentId")
      && Object.prototype.hasOwnProperty.call(payload, "channel")
      && Object.prototype.hasOwnProperty.call(payload, "attribution")
    ) {
      return { claimToken: "claim_phase5" };
    }

    return { success: true };
  });

  const runAction = vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
    metadataPayloads.push((payload.metadata || {}) as Record<string, unknown>);
    return {
      status: "success",
      sessionId: "session_phase5",
      response: "hello",
    };
  });

  return {
    ctx: { runQuery, runMutation, runAction },
    runAction,
    eventMutations,
    metadataPayloads,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  if (ORIGINAL_TEST_ORG_ID === undefined) {
    delete process.env.TEST_ORG_ID;
  } else {
    process.env.TEST_ORG_ID = ORIGINAL_TEST_ORG_ID;
  }
});

describe("universal onboarding ingress matrix", () => {
  it("records first-touch and optional onboarding metadata for webchat ingress", async () => {
    const { ctx, eventMutations, metadataPayloads } = createWebchatIngressContext({
      channel: "webchat",
    });

    const result = await (handleWebchatMessage as any)._handler(ctx, {
      organizationId: ORG_ID,
      agentId: AGENT_ID,
      channel: "webchat",
      message: "hello webchat",
    });

    expect(result.success).toBe(true);
    expect(eventMutations.some((entry) => entry.eventName === "onboarding.funnel.first_touch")).toBe(true);
    expect(eventMutations.some((entry) => entry.eventName === "onboarding.funnel.activation")).toBe(true);

    const executionMetadata = metadataPayloads[0] || {};
    expect(executionMetadata.onboardingPolicyVersion).toBe("universal_onboarding_policy.v1");
    expect(executionMetadata.onboardingWarmupOffered).toBe(true);
    expect(executionMetadata.skipOutbound).toBeUndefined();
  });

  it("records first-touch and native_guest transport metadata for native guest ingress", async () => {
    const { ctx, metadataPayloads } = createWebchatIngressContext({
      channel: "native_guest",
    });

    const result = await (handleWebchatMessage as any)._handler(ctx, {
      organizationId: ORG_ID,
      agentId: AGENT_ID,
      channel: "native_guest",
      message: "hello native guest",
    });

    expect(result.success).toBe(true);
    const executionMetadata = metadataPayloads[0] || {};
    expect(executionMetadata.onboardingPolicyVersion).toBe("universal_onboarding_policy.v1");
    expect(executionMetadata.onboardingWarmupOffered).toBe(true);
    expect(executionMetadata.skipOutbound).toBe(true);
    expect(executionMetadata.transport).toBe("native_guest_http");
  });

  it("routes unknown telegram first-touch to platform onboarding and emits first-touch event", async () => {
    process.env.TEST_ORG_ID = ORG_ID;
    const mutations: Array<Record<string, unknown>> = [];
    const runQuery = vi.fn(async () => null);
    const runMutation = vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
      mutations.push(payload);
      return { success: true };
    });

    const result = await (resolveChatToOrg as any)._handler(
      { runQuery, runMutation },
      {
        telegramChatId: "tg_phase5_new",
        senderName: "New User",
      }
    );

    expect(typeof result.organizationId).toBe("string");
    expect(result.routeToSystemBot).toBe(true);
    expect(result.isNew).toBe(true);
    expect(mutations.some((entry) => entry.eventName === "onboarding.funnel.first_touch")).toBe(true);
  });

  it("routes active telegram mapping to existing org and emits activation", async () => {
    process.env.TEST_ORG_ID = ORG_ID;
    const mutations: Array<Record<string, unknown>> = [];
    const runQuery = vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
      if (Object.prototype.hasOwnProperty.call(payload, "telegramChatId")) {
        return {
          organizationId: ACTIVE_ORG_ID,
          status: "active",
        };
      }
      return null;
    });
    const runMutation = vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
      mutations.push(payload);
      return { success: true };
    });

    const result = await (resolveChatToOrg as any)._handler(
      { runQuery, runMutation },
      {
        telegramChatId: "tg_phase5_existing",
        senderName: "Existing User",
      }
    );

    expect(result.organizationId).toBe(ACTIVE_ORG_ID);
    expect(result.routeToSystemBot).toBe(false);
    expect(result.isNew).toBe(false);
    expect(mutations.some((entry) => entry.eventName === "onboarding.funnel.activation")).toBe(true);
  });
});
