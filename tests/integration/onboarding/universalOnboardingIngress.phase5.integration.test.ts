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
  const bindingMutations: Array<Record<string, unknown>> = [];

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
      Object.prototype.hasOwnProperty.call(payload, "onboardingSurface")
      && Object.prototype.hasOwnProperty.call(payload, "sessionToken")
      && Object.prototype.hasOwnProperty.call(payload, "channel")
      && Object.prototype.hasOwnProperty.call(payload, "source")
      && !Object.prototype.hasOwnProperty.call(payload, "organizationId")
    ) {
      bindingMutations.push(payload);
      return {
        bindingId: "guest_binding_phase5",
        organizationId: "org_bound_phase5",
        created: true,
        lifecycleState: "provisional_onboarding",
        bindingStatus: "active",
      };
    }

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
    bindingMutations,
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
    const { ctx, eventMutations, metadataPayloads, bindingMutations } = createWebchatIngressContext({
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
    expect(bindingMutations).toHaveLength(0);
  });

  it("does not create onboarding bindings for generic webchat even when a native_guest surface is supplied", async () => {
    const { ctx, bindingMutations, metadataPayloads } = createWebchatIngressContext({
      channel: "webchat",
    });

    const result = await (handleWebchatMessage as any)._handler(ctx, {
      organizationId: ORG_ID,
      agentId: AGENT_ID,
      channel: "webchat",
      onboardingSurface: "one_of_one_landing_native_guest_audit",
      message: "hello generic webchat",
    });

    expect(result.success).toBe(true);
    expect(bindingMutations).toHaveLength(0);
    expect(metadataPayloads[0]?.onboardingSurface).toBeUndefined();
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

  it("forwards native_guest locale hints into execution metadata", async () => {
    const { ctx, metadataPayloads } = createWebchatIngressContext({
      channel: "native_guest",
    });

    const result = await (handleWebchatMessage as any)._handler(ctx, {
      organizationId: ORG_ID,
      agentId: AGENT_ID,
      channel: "native_guest",
      message: "hallo quinn",
      language: "de-DE",
      locale: "de-DE",
    });

    expect(result.success).toBe(true);
    expect(metadataPayloads[0]).toMatchObject({
      language: "de",
      locale: "de-DE",
    });
  });

  it("creates an onboarding-scoped guest binding only for explicit native_guest onboarding surfaces", async () => {
    const { ctx, bindingMutations, metadataPayloads } = createWebchatIngressContext({
      channel: "native_guest",
    });

    const result = await (handleWebchatMessage as any)._handler(ctx, {
      organizationId: ORG_ID,
      agentId: AGENT_ID,
      channel: "native_guest",
      onboardingSurface: "one_of_one_landing_native_guest_audit",
      message: "hello scoped native guest",
    });

    expect(result.success).toBe(true);
    expect(bindingMutations).toEqual([
      expect.objectContaining({
        channel: "native_guest",
        onboardingSurface: "one_of_one_landing_native_guest_audit",
        sessionToken: "ng_phase5_1",
      }),
    ]);
    expect(metadataPayloads[0]).toMatchObject({
      onboardingSurface: "one_of_one_landing_native_guest_audit",
      transport: "native_guest_http",
    });
  });

  it("returns success for native_guest when runtime provides fallback response despite non-success status", async () => {
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
        return { sessionToken: "ng_phase5_fallback" };
      }
      if (Object.prototype.hasOwnProperty.call(payload, "eventName")) {
        return { success: true };
      }
      if (
        Object.prototype.hasOwnProperty.call(payload, "sessionToken")
        && Object.prototype.hasOwnProperty.call(payload, "organizationId")
        && Object.prototype.hasOwnProperty.call(payload, "agentId")
        && Object.prototype.hasOwnProperty.call(payload, "channel")
        && Object.prototype.hasOwnProperty.call(payload, "attribution")
      ) {
        return { claimToken: "claim_phase5_fallback" };
      }
      return { success: true };
    });
    const runAction = vi.fn(async () => ({
      status: "error",
      message: "I can’t confirm completion yet; I have logged the request internally.",
      sessionId: "session_phase5_fallback",
    }));

    const result = await (handleWebchatMessage as any)._handler(
      { runQuery, runMutation, runAction },
      {
        organizationId: ORG_ID,
        agentId: AGENT_ID,
        channel: "native_guest",
        message: "please send my audit PDF",
        requestCorrelationId: "landing_ng_req_test",
      }
    );

    expect(result.success).toBe(true);
    expect(result.response).toContain("logged the request internally");
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
