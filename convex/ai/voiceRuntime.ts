import { action, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { requireAuthenticatedUser } from "../rbacHelpers";
import { resolveOrganizationProviderBindingForProvider } from "./providerRegistry";
import {
  TRUST_EVENT_TAXONOMY_VERSION,
  trustEventNameValidator,
  type TrustEventPayload,
  validateTrustEventPayload,
} from "./trustEvents";
import {
  normalizeVoiceRuntimeProviderId,
  resolveVoiceRuntimeAdapter,
  type VoiceProviderHealth,
  type VoiceRuntimeProviderId,
} from "./voiceRuntimeAdapter";

// Dynamic require keeps action contexts ergonomic for internal runQuery/runMutation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedApi: any = require("../_generated/api");

const VOICE_CHANNEL = "voice_runtime";

type VoiceTrustEventName =
  | "trust.voice.session_transition.v1"
  | "trust.voice.adaptive_flow_decision.v1"
  | "trust.voice.runtime_failover_triggered.v1";

type VoiceRuntimeContext = {
  organizationId: Id<"organizations">;
  actorId: string;
  interviewSessionId: Id<"agentSessions">;
  elevenLabsBinding: {
    apiKey: string;
    baseUrl?: string;
    defaultVoiceId?: string;
  } | null;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function decodeBase64Audio(payload: string): Uint8Array {
  const base64Payload = payload.includes(",")
    ? payload.split(",", 2)[1] ?? ""
    : payload;
  return new Uint8Array(Buffer.from(base64Payload, "base64"));
}

function extractDefaultVoiceId(
  providerAuthProfiles: unknown,
  profileId: string,
): string | undefined {
  if (!Array.isArray(providerAuthProfiles)) {
    return undefined;
  }

  for (const profile of providerAuthProfiles) {
    if (typeof profile !== "object" || profile === null) {
      continue;
    }
    const typedProfile = profile as Record<string, unknown>;
    if (typedProfile.providerId !== "elevenlabs") {
      continue;
    }
    if (normalizeString(typedProfile.profileId) !== profileId) {
      continue;
    }
    const metadata = typedProfile.metadata;
    if (typeof metadata !== "object" || metadata === null) {
      continue;
    }
    const defaultVoiceId = normalizeString(
      (metadata as Record<string, unknown>).defaultVoiceId,
    );
    if (defaultVoiceId) {
      return defaultVoiceId;
    }
  }

  return undefined;
}

async function emitVoiceTrustEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: {
    eventName: VoiceTrustEventName;
    organizationId: Id<"organizations">;
    interviewSessionId: Id<"agentSessions">;
    actorId: string;
    mode: "lifecycle" | "runtime";
    additionalPayload: Record<string, unknown>;
  },
) {
  const occurredAt = Date.now();
  const basePayload: TrustEventPayload = {
    event_id: `${args.eventName}:${args.interviewSessionId}:${occurredAt}`,
    event_version: TRUST_EVENT_TAXONOMY_VERSION,
    occurred_at: occurredAt,
    org_id: args.organizationId,
    mode: args.mode,
    channel: VOICE_CHANNEL,
    session_id: String(args.interviewSessionId),
    actor_type: "system",
    actor_id: args.actorId,
  };
  const payload = Object.assign({}, basePayload, args.additionalPayload) as TrustEventPayload;

  await ctx.runMutation(generatedApi.internal.ai.voiceRuntime.recordVoiceTrustEvent, {
    eventName: args.eventName,
    payload,
  });
}

async function emitVoiceFailoverEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: {
    organizationId: Id<"organizations">;
    interviewSessionId: Id<"agentSessions">;
    actorId: string;
    voiceSessionId: string;
    requestedProviderId: VoiceRuntimeProviderId;
    fallbackProviderId: VoiceRuntimeProviderId;
    health: VoiceProviderHealth;
    reason: string;
  },
) {
  await emitVoiceTrustEvent(ctx, {
    eventName: "trust.voice.runtime_failover_triggered.v1",
    organizationId: args.organizationId,
    interviewSessionId: args.interviewSessionId,
    actorId: args.actorId,
    mode: "runtime",
    additionalPayload: {
      voice_session_id: args.voiceSessionId,
      voice_runtime_provider: args.requestedProviderId,
      voice_failover_provider: args.fallbackProviderId,
      voice_failover_reason: args.reason,
      voice_provider_health_status: args.health.status,
    },
  });
}

export const resolveVoiceRuntimeContext = internalQuery({
  args: {
    sessionId: v.string(),
    interviewSessionId: v.id("agentSessions"),
  },
  handler: async (ctx, args): Promise<VoiceRuntimeContext> => {
    const { userId, organizationId } = await requireAuthenticatedUser(
      ctx,
      args.sessionId,
    );
    const interviewSession = await ctx.db.get(args.interviewSessionId);

    if (!interviewSession) {
      throw new Error("Interview session not found.");
    }
    if (interviewSession.organizationId !== organizationId) {
      throw new Error("Interview session does not belong to your organization.");
    }

    const aiSettings = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId),
      )
      .first();

    const binding = aiSettings?.llm
      ? resolveOrganizationProviderBindingForProvider({
          providerId: "elevenlabs",
          llmSettings: aiSettings.llm,
          defaultBillingSource:
            aiSettings.billingSource ??
            (aiSettings.billingMode === "byok" ? "byok" : "platform"),
          now: Date.now(),
        })
      : null;

    const defaultVoiceId = binding?.profileId
      ? extractDefaultVoiceId(
          aiSettings?.llm?.providerAuthProfiles,
          binding.profileId,
        )
      : undefined;

    return {
      organizationId,
      actorId: String(userId),
      interviewSessionId: args.interviewSessionId,
      elevenLabsBinding: binding
        ? {
            apiKey: binding.apiKey,
            baseUrl: binding.baseUrl,
            defaultVoiceId,
          }
        : null,
    };
  },
});

export const recordVoiceTrustEvent = internalMutation({
  args: {
    eventName: trustEventNameValidator,
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const payload = args.payload as TrustEventPayload;
    const validation = validateTrustEventPayload(args.eventName, payload);
    await ctx.db.insert("aiTrustEvents", {
      event_name: args.eventName,
      payload,
      schema_validation_status: validation.ok ? "passed" : "failed",
      schema_errors: validation.ok ? undefined : validation.errors,
      created_at: Date.now(),
    });
  },
});

export const openVoiceSession = action({
  args: {
    sessionId: v.string(),
    interviewSessionId: v.id("agentSessions"),
    requestedProviderId: v.optional(
      v.union(v.literal("browser"), v.literal("elevenlabs")),
    ),
    requestedVoiceId: v.optional(v.string()),
    voiceSessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const runtimeContext = (await ctx.runQuery(
      generatedApi.internal.ai.voiceRuntime.resolveVoiceRuntimeContext,
      {
        sessionId: args.sessionId,
        interviewSessionId: args.interviewSessionId,
      },
    )) as VoiceRuntimeContext;
    const requestedProviderId = normalizeVoiceRuntimeProviderId(
      args.requestedProviderId,
    );
    const voiceId =
      normalizeString(args.requestedVoiceId) ??
      runtimeContext.elevenLabsBinding?.defaultVoiceId;
    const voiceSessionId =
      normalizeString(args.voiceSessionId) ??
      `voice:${args.interviewSessionId}:${Date.now()}`;
    const resolved = await resolveVoiceRuntimeAdapter({
      requestedProviderId,
      elevenLabsBinding: runtimeContext.elevenLabsBinding,
      fetchFn: fetch,
    });

    const session = await resolved.adapter.openSession({
      voiceSessionId,
      organizationId: String(runtimeContext.organizationId),
      interviewSessionId: String(runtimeContext.interviewSessionId),
      voiceId: voiceId ?? undefined,
    });

    await emitVoiceTrustEvent(ctx, {
      eventName: "trust.voice.session_transition.v1",
      organizationId: runtimeContext.organizationId,
      interviewSessionId: runtimeContext.interviewSessionId,
      actorId: runtimeContext.actorId,
      mode: "lifecycle",
      additionalPayload: {
        voice_session_id: voiceSessionId,
        voice_state_from: "created",
        voice_state_to: "capturing",
        voice_transition_reason: "voice_session_open",
        voice_runtime_provider: session.providerId,
      },
    });

    if (resolved.fallbackFromProviderId) {
      await emitVoiceFailoverEvent(ctx, {
        organizationId: runtimeContext.organizationId,
        interviewSessionId: runtimeContext.interviewSessionId,
        actorId: runtimeContext.actorId,
        voiceSessionId,
        requestedProviderId,
        fallbackProviderId: resolved.adapter.providerId,
        health: resolved.health,
        reason: resolved.health.reason ?? "provider_health_degraded",
      });
    }

    return {
      success: true,
      voiceSessionId,
      providerId: session.providerId,
      requestedProviderId,
      fallbackProviderId: resolved.fallbackFromProviderId ?? null,
      health: resolved.health,
    };
  },
});

export const closeVoiceSession = action({
  args: {
    sessionId: v.string(),
    interviewSessionId: v.id("agentSessions"),
    voiceSessionId: v.string(),
    activeProviderId: v.optional(
      v.union(v.literal("browser"), v.literal("elevenlabs")),
    ),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const runtimeContext = (await ctx.runQuery(
      generatedApi.internal.ai.voiceRuntime.resolveVoiceRuntimeContext,
      {
        sessionId: args.sessionId,
        interviewSessionId: args.interviewSessionId,
      },
    )) as VoiceRuntimeContext;
    const requestedProviderId = normalizeVoiceRuntimeProviderId(
      args.activeProviderId,
    );
    const resolved = await resolveVoiceRuntimeAdapter({
      requestedProviderId,
      elevenLabsBinding: runtimeContext.elevenLabsBinding,
      fetchFn: fetch,
    });

    await resolved.adapter.closeSession({
      voiceSessionId: args.voiceSessionId,
      reason: normalizeString(args.reason) ?? "voice_session_close",
    });

    await emitVoiceTrustEvent(ctx, {
      eventName: "trust.voice.session_transition.v1",
      organizationId: runtimeContext.organizationId,
      interviewSessionId: runtimeContext.interviewSessionId,
      actorId: runtimeContext.actorId,
      mode: "lifecycle",
      additionalPayload: {
        voice_session_id: args.voiceSessionId,
        voice_state_from: "capturing",
        voice_state_to: "closed",
        voice_transition_reason:
          normalizeString(args.reason) ?? "voice_session_close",
        voice_runtime_provider: resolved.adapter.providerId,
      },
    });

    return {
      success: true,
      providerId: resolved.adapter.providerId,
      health: resolved.health,
    };
  },
});

export const transcribeVoiceAudio = action({
  args: {
    sessionId: v.string(),
    interviewSessionId: v.id("agentSessions"),
    voiceSessionId: v.string(),
    audioBase64: v.string(),
    mimeType: v.optional(v.string()),
    requestedProviderId: v.optional(
      v.union(v.literal("browser"), v.literal("elevenlabs")),
    ),
    requestedVoiceId: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const runtimeContext = (await ctx.runQuery(
      generatedApi.internal.ai.voiceRuntime.resolveVoiceRuntimeContext,
      {
        sessionId: args.sessionId,
        interviewSessionId: args.interviewSessionId,
      },
    )) as VoiceRuntimeContext;
    const requestedProviderId = normalizeVoiceRuntimeProviderId(
      args.requestedProviderId,
    );
    const resolved = await resolveVoiceRuntimeAdapter({
      requestedProviderId,
      elevenLabsBinding: runtimeContext.elevenLabsBinding,
      fetchFn: fetch,
    });
    if (resolved.fallbackFromProviderId) {
      await emitVoiceFailoverEvent(ctx, {
        organizationId: runtimeContext.organizationId,
        interviewSessionId: runtimeContext.interviewSessionId,
        actorId: runtimeContext.actorId,
        voiceSessionId: args.voiceSessionId,
        requestedProviderId,
        fallbackProviderId: resolved.adapter.providerId,
        health: resolved.health,
        reason: resolved.health.reason ?? "provider_health_degraded",
      });
    }

    if (resolved.adapter.providerId === "browser") {
      return {
        success: false,
        providerId: resolved.adapter.providerId,
        requestedProviderId,
        fallbackProviderId: resolved.fallbackFromProviderId ?? "browser",
        health: resolved.health,
        error: "browser_runtime_requires_client_side_voice_processing",
      };
    }

    try {
      const transcript = await resolved.adapter.transcribe({
        voiceSessionId: args.voiceSessionId,
        audioBytes: decodeBase64Audio(args.audioBase64),
        mimeType: normalizeString(args.mimeType) ?? "audio/webm",
        language: normalizeString(args.language) ?? undefined,
      });

      await emitVoiceTrustEvent(ctx, {
        eventName: "trust.voice.adaptive_flow_decision.v1",
        organizationId: runtimeContext.organizationId,
        interviewSessionId: runtimeContext.interviewSessionId,
        actorId: runtimeContext.actorId,
        mode: "runtime",
        additionalPayload: {
          voice_session_id: args.voiceSessionId,
          adaptive_phase_id: "stt_transport",
          adaptive_decision: "provider_transcription",
          adaptive_confidence: 1,
          consent_checkpoint_id: "cp0_capture_notice",
        },
      });

      return {
        success: true,
        text: transcript.text,
        providerId: transcript.providerId,
        requestedProviderId,
        fallbackProviderId: resolved.fallbackFromProviderId ?? null,
        health: resolved.health,
      };
    } catch (error) {
      return {
        success: false,
        providerId: resolved.adapter.providerId,
        requestedProviderId,
        fallbackProviderId: resolved.fallbackFromProviderId ?? null,
        health: resolved.health,
        error:
          error instanceof Error
            ? error.message
            : "Voice transcription failed.",
      };
    }
  },
});

export const synthesizeVoicePreview = action({
  args: {
    sessionId: v.string(),
    interviewSessionId: v.id("agentSessions"),
    voiceSessionId: v.string(),
    text: v.string(),
    requestedProviderId: v.optional(
      v.union(v.literal("browser"), v.literal("elevenlabs")),
    ),
    requestedVoiceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const runtimeContext = (await ctx.runQuery(
      generatedApi.internal.ai.voiceRuntime.resolveVoiceRuntimeContext,
      {
        sessionId: args.sessionId,
        interviewSessionId: args.interviewSessionId,
      },
    )) as VoiceRuntimeContext;
    const requestedProviderId = normalizeVoiceRuntimeProviderId(
      args.requestedProviderId,
    );
    const resolved = await resolveVoiceRuntimeAdapter({
      requestedProviderId,
      elevenLabsBinding: runtimeContext.elevenLabsBinding,
      fetchFn: fetch,
    });
    if (resolved.fallbackFromProviderId) {
      await emitVoiceFailoverEvent(ctx, {
        organizationId: runtimeContext.organizationId,
        interviewSessionId: runtimeContext.interviewSessionId,
        actorId: runtimeContext.actorId,
        voiceSessionId: args.voiceSessionId,
        requestedProviderId,
        fallbackProviderId: resolved.adapter.providerId,
        health: resolved.health,
        reason: resolved.health.reason ?? "provider_health_degraded",
      });
    }

    try {
      const synthesis = await resolved.adapter.synthesize({
        voiceSessionId: args.voiceSessionId,
        text: args.text,
        voiceId:
          normalizeString(args.requestedVoiceId) ??
          runtimeContext.elevenLabsBinding?.defaultVoiceId,
      });

      return {
        success: true,
        providerId: synthesis.providerId,
        requestedProviderId,
        fallbackProviderId: resolved.fallbackFromProviderId ?? null,
        health: resolved.health,
        mimeType: synthesis.mimeType,
        audioBase64: synthesis.audioBase64 ?? null,
        fallbackText: synthesis.fallbackText ?? null,
      };
    } catch (error) {
      return {
        success: false,
        providerId: resolved.adapter.providerId,
        requestedProviderId,
        fallbackProviderId: resolved.fallbackFromProviderId ?? null,
        health: resolved.health,
        error:
          error instanceof Error
            ? error.message
            : "Voice synthesis failed.",
      };
    }
  },
});

export const probeVoiceProviderHealth = action({
  args: {
    sessionId: v.string(),
    interviewSessionId: v.id("agentSessions"),
    requestedProviderId: v.optional(
      v.union(v.literal("browser"), v.literal("elevenlabs")),
    ),
  },
  handler: async (ctx, args) => {
    const runtimeContext = (await ctx.runQuery(
      generatedApi.internal.ai.voiceRuntime.resolveVoiceRuntimeContext,
      {
        sessionId: args.sessionId,
        interviewSessionId: args.interviewSessionId,
      },
    )) as VoiceRuntimeContext;
    const requestedProviderId = normalizeVoiceRuntimeProviderId(
      args.requestedProviderId,
    );
    const resolved = await resolveVoiceRuntimeAdapter({
      requestedProviderId,
      elevenLabsBinding: runtimeContext.elevenLabsBinding,
      fetchFn: fetch,
    });

    return {
      requestedProviderId,
      providerId: resolved.adapter.providerId,
      fallbackProviderId: resolved.fallbackFromProviderId ?? null,
      health: resolved.health,
    };
  },
});
