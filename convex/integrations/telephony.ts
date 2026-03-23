import { ConvexError, v } from "convex/values";
import {
  action,
  internalQuery,
  internalMutation,
  mutation,
  query,
} from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { getUserContext, requireAuthenticatedUser } from "../rbacHelpers";
import {
  ElevenLabsClient,
  resolveElevenLabsConvaiBaseUrl,
} from "../../apps/one-of-one-landing/scripts/elevenlabs/lib/elevenlabs-api";
import {
  buildElevenLabsAgentCreatePayload,
  buildDesiredPrompt,
  computeAgentSyncDrift,
  normalizeKnowledgeBaseRefs,
  toKnowledgeBaseRef,
  type ElevenLabsRemoteKnowledgeBaseState,
} from "../../src/lib/telephony/elevenlabs-agent-sync";
import {
  ANNE_BECKER_TEMPLATE_PLAYBOOK,
  ANNE_BECKER_TEMPLATE_ROLE,
  CLARA_TEMPLATE_PLAYBOOK,
  CLARA_TEMPLATE_ROLE,
  DEFAULT_TELEPHONY_INSTALLATION_ID,
  DEFAULT_TELEPHONY_PROFILE_ID,
  JONAS_TEMPLATE_PLAYBOOK,
  JONAS_TEMPLATE_ROLE,
  MAREN_TEMPLATE_PLAYBOOK,
  MAREN_TEMPLATE_ROLE,
  buildTelephonyConnectionId,
  buildTelephonyRouteKey,
  extractTemplateRoleTransferDependencies,
  normalizeAgentTelephonyConfig,
  resolveTemplateRoleTransferManagedTools,
  resolveImplementedTelephonyProvider,
  type AgentTelephonyConfig,
  type AgentTelephonyProviderKey,
  TELEPHONY_PROVIDER_OPTIONS,
} from "../../src/lib/telephony/agent-telephony";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedApi: any = require("../_generated/api");

type AgentDoc = {
  _id: Id<"objects">;
  organizationId: Id<"organizations">;
  type: string;
  status: string;
  name?: string;
  customProperties?: Record<string, unknown>;
};

type TelephonyOrgBinding = {
  providerKey: AgentTelephonyProviderKey;
  enabled: boolean;
  baseUrl?: string;
  fromNumber?: string;
  webhookSecret?: string;
  providerConnectionId: string;
  providerInstallationId: string;
  providerProfileId: string;
  routeKey: string;
};

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function getPlatformOrgId(): Id<"organizations"> {
  const id = process.env.PLATFORM_ORG_ID || process.env.TEST_ORG_ID;
  if (!id) {
    throw new Error("PLATFORM_ORG_ID or TEST_ORG_ID must be set");
  }
  return id as Id<"organizations">;
}

function normalizeProviderKey(value: unknown): AgentTelephonyProviderKey {
  if (value === "elevenlabs" || value === "twilio_voice" || value === "custom_sip") {
    return value;
  }
  return "elevenlabs";
}

function readTelephonyConfig(customProperties: Record<string, unknown> | undefined): AgentTelephonyConfig {
  return normalizeAgentTelephonyConfig(customProperties?.telephonyConfig);
}

function requireAgentDoc(agent: AgentDoc | null, organizationId: Id<"organizations">): AgentDoc {
  if (!agent || agent.type !== "org_agent") {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Agent not found.",
    });
  }
  if (agent.organizationId !== organizationId) {
    throw new ConvexError({
      code: "INVALID_ARGUMENT",
      message: "Agent organization mismatch.",
    });
  }
  return agent;
}

function buildTelephonyAgentDisplayName(agent: AgentDoc): string {
  const customProperties = (agent.customProperties || {}) as Record<string, unknown>;
  return (
    normalizeOptionalString(customProperties.displayName)
    || normalizeOptionalString(agent.name)
    || "Telephony Agent"
  );
}

function resolveStoredTelephonyBaseUrl(
  props: Record<string, unknown>,
): string | null {
  return (
    normalizeOptionalString(props.directCallBaseUrl) ||
    normalizeOptionalString(props.elevenTelephonyBaseUrl) ||
    null
  );
}

function resolveStoredTelephonyFromNumber(
  props: Record<string, unknown>,
): string | null {
  return (
    normalizeOptionalString(props.twilioVoiceFromNumber) ||
    normalizeOptionalString(props.directCallFromNumber) ||
    normalizeOptionalString(props.elevenTelephonyFromNumber) ||
    null
  );
}

function resolveStoredTelephonyWebhookSecret(
  props: Record<string, unknown>,
): string | null {
  return (
    normalizeOptionalString(props.twilioVoiceWebhookSecret) ||
    normalizeOptionalString(props.directCallWebhookSecret) ||
    normalizeOptionalString(props.elevenTelephonyWebhookSecret) ||
    null
  );
}

function resolveTelephonyRouteKeyPolicy(
  providerIdentity: ReturnType<typeof resolveImplementedTelephonyProvider>,
): "eleven_route_v1" | "twilio_voice_v1" {
  return providerIdentity === "twilio_voice"
    ? "twilio_voice_v1"
    : "eleven_route_v1";
}

function buildOrgBindingContract(args: {
  organizationId: Id<"organizations">;
  providerKey: AgentTelephonyProviderKey;
  enabled: boolean;
  baseUrl?: string;
  fromNumber?: string;
  webhookSecret?: string;
}): TelephonyOrgBinding {
  const providerConnectionId = buildTelephonyConnectionId(
    String(args.organizationId),
    args.providerKey,
  );
  const providerInstallationId = DEFAULT_TELEPHONY_INSTALLATION_ID;
  const providerProfileId = DEFAULT_TELEPHONY_PROFILE_ID;
  return {
    providerKey: args.providerKey,
    enabled: args.enabled,
    baseUrl: normalizeOptionalString(args.baseUrl),
    fromNumber: normalizeOptionalString(args.fromNumber),
    webhookSecret: normalizeOptionalString(args.webhookSecret),
    providerConnectionId,
    providerInstallationId,
    providerProfileId,
    routeKey: buildTelephonyRouteKey({
      providerConnectionId,
      providerInstallationId,
      providerKey: args.providerKey,
    }),
  };
}

async function requireSuperAdminForOrganization(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  sessionId: string,
  organizationId: Id<"organizations">,
) {
  const authenticated = await requireAuthenticatedUser(ctx, sessionId);
  const userContext = await getUserContext(
    ctx,
    authenticated.userId,
    organizationId,
  );
  if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
    throw new Error(
      "Permission denied: super_admin required to manage organization telephony settings.",
    );
  }
  return authenticated;
}

async function resolveExistingTelephonyObjects(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  organizationId: Id<"organizations">,
): Promise<{
  directSettings: AgentDoc | null;
  phoneBinding: AgentDoc | null;
}> {
  const objects = await db
    .query("objects")
    .withIndex("by_org_type", (q: any) =>
      q.eq("organizationId", organizationId).eq("type", "direct_settings"),
    )
    .collect();

  const bindings = await db
    .query("objects")
    .withIndex("by_org_type", (q: any) =>
      q.eq("organizationId", organizationId).eq("type", "channel_provider_binding"),
    )
    .collect();

  const directSettings = (objects[0] as AgentDoc | undefined) ?? null;
  const phoneBinding = (
    bindings.find((binding: AgentDoc) => {
      const props = (binding.customProperties || {}) as Record<string, unknown>;
      return props.channel === "phone_call";
    }) as AgentDoc | undefined
  ) ?? null;

  return {
    directSettings,
    phoneBinding,
  };
}

async function readRemoteKnowledgeBaseState(
  client: ElevenLabsClient,
  knowledgeBase: ReturnType<typeof normalizeKnowledgeBaseRefs>,
): Promise<ElevenLabsRemoteKnowledgeBaseState> {
  const refs = normalizeKnowledgeBaseRefs(knowledgeBase);
  const documents = await Promise.all(
    refs.map(async (ref) => ({
      name: ref.name ?? "",
      content: (await client.getKnowledgeBaseDocumentContent(ref.id)).trim(),
    })),
  );

  return {
    refs,
    documents,
  };
}

export const getOrganizationTemplateRoleRemoteAgentIds = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    templateRoles: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const requestedRoles = new Set(
      args.templateRoles
        .map((role) => normalizeOptionalString(role))
        .filter((role): role is string => Boolean(role)),
    );
    if (requestedRoles.size === 0) {
      return {};
    }

    const agents = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "org_agent"),
      )
      .collect();

    const remoteAgentIdsByTemplateRole: Record<string, string> = {};
    for (const agent of agents) {
      const props = (agent.customProperties || {}) as Record<string, unknown>;
      const templateRole = normalizeOptionalString(props.templateRole);
      if (!templateRole || !requestedRoles.has(templateRole)) {
        continue;
      }
      const telephonyConfig = readTelephonyConfig(props);
      const remoteAgentId =
        normalizeOptionalString(telephonyConfig.elevenlabs.remoteAgentId)
        || normalizeOptionalString(telephonyConfig.elevenlabs.syncState.lastSyncedProviderAgentId);
      if (!remoteAgentId) {
        continue;
      }
      remoteAgentIdsByTemplateRole[templateRole] = remoteAgentId;
    }

    return remoteAgentIdsByTemplateRole;
  },
});

async function upsertOrganizationTelephonySettings(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: {
    organizationId: Id<"organizations">;
    providerKey: AgentTelephonyProviderKey;
    enabled: boolean;
    baseUrl?: string;
    fromNumber?: string;
    webhookSecret?: string;
    performedBy: Id<"users">;
  },
) {
  const providerIdentity = resolveImplementedTelephonyProvider(args.providerKey);
  if (!providerIdentity) {
    throw new ConvexError({
      code: "INVALID_ARGUMENT",
      message: `${args.providerKey} is not implemented yet.`,
    });
  }

  const now = Date.now();
  const { directSettings, phoneBinding } = await resolveExistingTelephonyObjects(
    ctx.db,
    args.organizationId,
  );
  const existingDirectProps = (directSettings?.customProperties || {}) as Record<
    string,
    unknown
  >;
  const contract = buildOrgBindingContract({
    organizationId: args.organizationId,
    providerKey: args.providerKey,
    enabled: args.enabled,
    baseUrl: args.baseUrl,
    fromNumber: args.fromNumber,
    webhookSecret:
      normalizeOptionalString(args.webhookSecret) ??
      normalizeOptionalString(existingDirectProps.elevenTelephonyWebhookSecret),
  });
  let directSettingsId = directSettings?._id;
  let phoneBindingId = phoneBinding?._id;
  const routeKeyPolicy = resolveTelephonyRouteKeyPolicy(providerIdentity);
  const preservedWebhookSecret = contract.webhookSecret
    ?? normalizeOptionalString(existingDirectProps.elevenTelephonyWebhookSecret)
    ?? normalizeOptionalString(existingDirectProps.directCallWebhookSecret)
    ?? normalizeOptionalString(existingDirectProps.twilioVoiceWebhookSecret);

  const nextDirectProperties = {
    ...existingDirectProps,
    providerId: "direct",
    providerKey: args.providerKey,
    telephonyProviderIdentity: providerIdentity,
    telephonyRouteKeyPolicy: routeKeyPolicy,
    providerConnectionId: contract.providerConnectionId,
    providerInstallationId: contract.providerInstallationId,
    providerProfileId: contract.providerProfileId,
    providerProfileType: "organization",
    bindingRouteKey: contract.routeKey,
    routeKey: contract.routeKey,
    elevenTelephonyBaseUrl: contract.baseUrl ?? "",
    elevenTelephonyFromNumber: contract.fromNumber ?? "",
    elevenTelephonyWebhookSecret: preservedWebhookSecret,
    directCallBaseUrl: contract.baseUrl ?? "",
    directCallFromNumber: contract.fromNumber ?? "",
    directCallWebhookSecret: preservedWebhookSecret,
    twilioVoiceFromNumber: contract.fromNumber ?? "",
    twilioVoiceWebhookSecret: preservedWebhookSecret,
    encryptedFields: preservedWebhookSecret
      ? ["elevenTelephonyWebhookSecret"]
      : [],
  };

  if (directSettings?._id) {
    await ctx.db.patch(directSettings._id, {
      customProperties: nextDirectProperties,
      updatedAt: now,
    });
  } else {
    directSettingsId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "direct_settings",
      name: "Telephony Routing Settings",
      status: "active",
      customProperties: nextDirectProperties,
      createdAt: now,
      updatedAt: now,
    });
  }

  const nextBindingProperties = {
    ...(phoneBinding?.customProperties || {}),
    channel: "phone_call",
    providerId: "direct",
    providerKey: args.providerKey,
    priority: 1,
    enabled: contract.enabled,
    providerConnectionId: contract.providerConnectionId,
    providerInstallationId: contract.providerInstallationId,
    providerProfileId: contract.providerProfileId,
    providerProfileType: "organization",
    routeKey: contract.routeKey,
    bindingRouteKey: contract.routeKey,
    telephonyProviderIdentity: providerIdentity,
    telephonyRouteKeyPolicy: routeKeyPolicy,
    allowPlatformFallback: false,
  };

  if (phoneBinding?._id) {
    await ctx.db.patch(phoneBinding._id, {
      customProperties: nextBindingProperties,
      updatedAt: now,
    });
  } else {
    phoneBindingId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "channel_provider_binding",
      name: "Phone Call Channel Binding",
      status: "active",
      customProperties: nextBindingProperties,
      createdAt: now,
      updatedAt: now,
    });
  }

  const actionObjectId = phoneBindingId ?? directSettingsId;
  if (!actionObjectId) {
    throw new Error("Failed to resolve telephony binding object for audit log.");
  }

  await ctx.db.insert("objectActions", {
    organizationId: args.organizationId,
    objectId: actionObjectId,
    actionType: "telephony_binding_saved",
    actionData: {
      providerKey: args.providerKey,
      providerIdentity,
      enabled: contract.enabled,
      routeKey: contract.routeKey,
      providerConnectionId: contract.providerConnectionId,
      providerInstallationId: contract.providerInstallationId,
    },
    performedBy: args.performedBy,
    performedAt: now,
  });

  return {
    success: true,
    binding: {
      providerKey: args.providerKey,
      providerIdentity,
      enabled: contract.enabled,
      routeKey: contract.routeKey,
      providerConnectionId: contract.providerConnectionId,
      providerInstallationId: contract.providerInstallationId,
    },
  };
}

export const getAgentTelephonyPanelState = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    agentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const authenticated = await requireAuthenticatedUser(ctx, args.sessionId);
    if (authenticated.organizationId !== args.organizationId) {
      throw new Error("Organization mismatch while loading telephony panel state.");
    }

    const agent = requireAgentDoc(
      (await ctx.db.get(args.agentId)) as AgentDoc | null,
      args.organizationId,
    );
    const telephonyConfig = readTelephonyConfig(agent.customProperties);
    const { directSettings, phoneBinding } = await resolveExistingTelephonyObjects(
      ctx.db,
      args.organizationId,
    );
    const directProps = (directSettings?.customProperties || {}) as Record<string, unknown>;
    const bindingProps = (phoneBinding?.customProperties || {}) as Record<string, unknown>;
    const elevenLabsSettings = await ctx.runQuery(
      generatedApi.api.integrations.elevenlabs.getElevenLabsSettings,
      {
        sessionId: args.sessionId,
        organizationId: args.organizationId,
      },
    );
    const twilioSettings = await ctx.runQuery(
      generatedApi.api.integrations.twilio.getTwilioSettings,
      {
        sessionId: args.sessionId,
      },
    );

    return {
      providerOptions: TELEPHONY_PROVIDER_OPTIONS,
      telephonyConfig,
      phoneChannelEnabled:
        Array.isArray(agent.customProperties?.channelBindings)
          && agent.customProperties?.channelBindings.some(
            (binding) =>
              binding
              && typeof binding === "object"
              && (binding as { channel?: unknown }).channel === "phone_call"
              && (binding as { enabled?: unknown }).enabled === true,
          ),
      organizationBinding: {
        providerKey: normalizeProviderKey(directProps.providerKey),
        enabled: bindingProps.enabled === true,
        routeKey:
          normalizeOptionalString(bindingProps.routeKey) ||
          normalizeOptionalString(bindingProps.bindingRouteKey) ||
          null,
        providerConnectionId:
          normalizeOptionalString(bindingProps.providerConnectionId) ||
          normalizeOptionalString(directProps.providerConnectionId) ||
          null,
        providerInstallationId:
          normalizeOptionalString(bindingProps.providerInstallationId) ||
          normalizeOptionalString(directProps.providerInstallationId) ||
          null,
        providerProfileId:
          normalizeOptionalString(bindingProps.providerProfileId) ||
          normalizeOptionalString(directProps.providerProfileId) ||
          null,
        baseUrl: resolveStoredTelephonyBaseUrl(directProps),
        fromNumber: resolveStoredTelephonyFromNumber(directProps),
        hasWebhookSecret: Boolean(resolveStoredTelephonyWebhookSecret(directProps)),
        providerIdentity:
          normalizeOptionalString(bindingProps.telephonyProviderIdentity) ||
          normalizeOptionalString(directProps.telephonyProviderIdentity) ||
          null,
        twilioIncomingNumberSid:
          normalizeOptionalString(directProps.twilioVoiceIncomingNumberSid) || null,
        twilioWebhookAppliedAt:
          typeof directProps.twilioVoiceWebhookAppliedAt === "number"
            ? directProps.twilioVoiceWebhookAppliedAt
            : null,
      },
      providerReadiness: {
        elevenlabs: {
          enabled: elevenLabsSettings?.enabled === true,
          hasEffectiveApiKey: elevenLabsSettings?.hasEffectiveApiKey === true,
          baseUrl: elevenLabsSettings?.baseUrl ?? null,
          healthStatus: elevenLabsSettings?.healthStatus ?? "degraded",
          healthReason: elevenLabsSettings?.healthReason ?? null,
        },
        twilio: {
          enabled: twilioSettings?.enabled === true,
          hasEffectiveCredentials: twilioSettings?.hasEffectiveCredentials === true,
          runtimeSource: twilioSettings?.runtimeSource ?? null,
          accountSidLast4: twilioSettings?.accountSidLast4 ?? null,
        },
      },
    };
  },
});

export const saveOrganizationTelephonySettings = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    providerKey: v.string(),
    enabled: v.boolean(),
    baseUrl: v.optional(v.string()),
    fromNumber: v.optional(v.string()),
    webhookSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authenticated = await requireAuthenticatedUser(ctx, args.sessionId);
    if (authenticated.organizationId !== args.organizationId) {
      throw new Error("Organization mismatch while saving telephony settings.");
    }
    return await upsertOrganizationTelephonySettings(ctx, {
      organizationId: args.organizationId,
      providerKey: normalizeProviderKey(args.providerKey),
      enabled: args.enabled,
      baseUrl: args.baseUrl,
      fromNumber: args.fromNumber,
      webhookSecret: args.webhookSecret,
      performedBy: authenticated.userId,
    });
  },
});

export const getOrganizationTwilioVoiceGreeting = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const agents = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "org_agent"),
      )
      .collect();

    const matchingAgents = agents
      .filter((agent) => agent.status === "active")
      .map((agent) => {
        const customProperties = (agent.customProperties || {}) as Record<string, unknown>;
        const telephonyConfig = readTelephonyConfig(customProperties);
        const phoneChannelEnabled =
          Array.isArray(customProperties.channelBindings) &&
          customProperties.channelBindings.some(
            (binding) =>
              binding &&
              typeof binding === "object" &&
              (binding as { channel?: unknown }).channel === "phone_call" &&
              (binding as { enabled?: unknown }).enabled === true,
          );

        return {
          agent,
          telephonyConfig,
          phoneChannelEnabled,
        };
      })
      .filter((entry) => entry.phoneChannelEnabled);

    const prioritized =
      matchingAgents.find(
        (entry) => entry.telephonyConfig.selectedProvider === "twilio_voice",
      ) || matchingAgents[0];

    if (!prioritized) {
      return {
        firstMessage:
          "Hello, please leave your name, number, and reason for calling after the tone.",
        agentName: "Telephony Agent",
      };
    }

    return {
      firstMessage:
        normalizeOptionalString(prioritized.telephonyConfig.elevenlabs.firstMessage) ||
        "Hello, please leave your name, number, and reason for calling after the tone.",
      agentName: buildTelephonyAgentDisplayName(prioritized.agent as AgentDoc),
    };
  },
});

export const getOrganizationTelephonyAdminState = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminForOrganization(
      ctx,
      args.sessionId,
      args.organizationId,
    );
    const { directSettings, phoneBinding } = await resolveExistingTelephonyObjects(
      ctx.db,
      args.organizationId,
    );
    const directProps = (directSettings?.customProperties || {}) as Record<string, unknown>;
    const bindingProps = (phoneBinding?.customProperties || {}) as Record<string, unknown>;

    return {
      providerKey: normalizeProviderKey(directProps.providerKey),
      enabled: bindingProps.enabled === true,
      routeKey:
        normalizeOptionalString(bindingProps.routeKey) ||
        normalizeOptionalString(bindingProps.bindingRouteKey) ||
        null,
      providerConnectionId:
        normalizeOptionalString(bindingProps.providerConnectionId) ||
        normalizeOptionalString(directProps.providerConnectionId) ||
        null,
      providerInstallationId:
        normalizeOptionalString(bindingProps.providerInstallationId) ||
        normalizeOptionalString(directProps.providerInstallationId) ||
        null,
      providerProfileId:
        normalizeOptionalString(bindingProps.providerProfileId) ||
        normalizeOptionalString(directProps.providerProfileId) ||
        null,
      baseUrl: resolveStoredTelephonyBaseUrl(directProps),
      fromNumber: resolveStoredTelephonyFromNumber(directProps),
      hasWebhookSecret: Boolean(resolveStoredTelephonyWebhookSecret(directProps)),
      providerIdentity:
        normalizeOptionalString(bindingProps.telephonyProviderIdentity) ||
        normalizeOptionalString(directProps.telephonyProviderIdentity) ||
        null,
      twilioIncomingNumberSid:
        normalizeOptionalString(directProps.twilioVoiceIncomingNumberSid) || null,
      twilioWebhookAppliedAt:
        typeof directProps.twilioVoiceWebhookAppliedAt === "number"
          ? directProps.twilioVoiceWebhookAppliedAt
          : null,
      twilioInboundWebhookUrl:
        normalizeOptionalString(directProps.twilioVoiceInboundWebhookUrl) || null,
      twilioStatusCallbackUrl:
        normalizeOptionalString(directProps.twilioVoiceStatusCallbackUrl) || null,
    };
  },
});

export const saveOrganizationTelephonySettingsAdmin = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    providerKey: v.string(),
    enabled: v.boolean(),
    baseUrl: v.optional(v.string()),
    fromNumber: v.optional(v.string()),
    webhookSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authenticated = await requireSuperAdminForOrganization(
      ctx,
      args.sessionId,
      args.organizationId,
    );
    return await upsertOrganizationTelephonySettings(ctx, {
      organizationId: args.organizationId,
      providerKey: normalizeProviderKey(args.providerKey),
      enabled: args.enabled,
      baseUrl: args.baseUrl,
      fromNumber: args.fromNumber,
      webhookSecret: args.webhookSecret,
      performedBy: authenticated.userId,
    });
  },
});

export const saveAgentTelephonyConfig = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    agentId: v.id("objects"),
    telephonyConfig: v.any(),
  },
  handler: async (ctx, args) => {
    const authenticated = await requireAuthenticatedUser(ctx, args.sessionId);
    if (authenticated.organizationId !== args.organizationId) {
      throw new Error("Organization mismatch while saving agent telephony config.");
    }

    const agent = requireAgentDoc(
      (await ctx.db.get(args.agentId)) as AgentDoc | null,
      args.organizationId,
    );
    const userContext = await getUserContext(ctx, authenticated.userId, args.organizationId);
    const isSuperAdmin = userContext.isGlobal && userContext.roleName === "super_admin";
    if (agent.customProperties?.protected === true && !isSuperAdmin) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Protected template telephony config requires super_admin.",
      });
    }

    const telephonyConfig = normalizeAgentTelephonyConfig(args.telephonyConfig);
    const now = Date.now();
    await ctx.db.patch(agent._id, {
      customProperties: {
        ...(agent.customProperties || {}),
        telephonyConfig,
      },
      updatedAt: now,
    });

    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: agent._id,
      actionType: "agent_telephony_config_saved",
      actionData: {
        selectedProvider: telephonyConfig.selectedProvider,
        hasRemoteAgentId: Boolean(telephonyConfig.elevenlabs.remoteAgentId),
        transferDestinationCount: telephonyConfig.elevenlabs.transferDestinations.length,
      },
      performedBy: authenticated.userId,
      performedAt: now,
    });

    return {
      success: true,
      telephonyConfig,
    };
  },
});

export const recordAgentTelephonySyncStateInternal = internalMutation({
  args: {
    agentId: v.id("objects"),
    organizationId: v.id("organizations"),
    syncState: v.any(),
    remoteAgentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agent = requireAgentDoc(
      (await ctx.db.get(args.agentId)) as AgentDoc | null,
      args.organizationId,
    );
    const telephonyConfig = readTelephonyConfig(agent.customProperties);
    const now = Date.now();

    await ctx.db.patch(agent._id, {
      customProperties: {
        ...(agent.customProperties || {}),
        telephonyConfig: {
          ...telephonyConfig,
          elevenlabs: {
            ...telephonyConfig.elevenlabs,
            remoteAgentId:
              normalizeOptionalString(args.remoteAgentId)
              || telephonyConfig.elevenlabs.remoteAgentId,
            syncState: args.syncState,
          },
        },
      },
      updatedAt: now,
    });

    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: agent._id,
      actionType: "agent_telephony_sync_recorded",
      actionData: args.syncState,
      performedAt: now,
    });
  },
});

export const syncAgentTelephonyProvider = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    agentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const authenticated = await ctx.runQuery(
      generatedApi.internal.rbacHelpers.requireAuthenticatedUserQuery,
      {
        sessionId: args.sessionId,
      },
    );

    if (authenticated.organizationId !== args.organizationId) {
      throw new Error("Organization mismatch while syncing telephony provider.");
    }

    const agent = requireAgentDoc(
      (await ctx.runQuery(generatedApi.internal.agentOntology.getAgentInternal, {
        agentId: args.agentId,
      })) as AgentDoc | null,
      args.organizationId,
    );
    const telephonyConfig = readTelephonyConfig(agent.customProperties);
    if (telephonyConfig.selectedProvider === "twilio_voice") {
      const panelState = await ctx.runQuery(
        generatedApi.api.integrations.telephony.getAgentTelephonyPanelState,
        {
          sessionId: args.sessionId,
          organizationId: args.organizationId,
          agentId: args.agentId,
        },
      );

      if (panelState?.organizationBinding?.providerKey !== "twilio_voice") {
        return {
          success: false,
          status: "blocked",
          message:
            "Organization phone binding is not set to Twilio Voice. Save the org binding first.",
        };
      }
      if (!panelState?.organizationBinding?.enabled) {
        return {
          success: false,
          status: "blocked",
          message: "Organization phone binding is disabled.",
        };
      }
      if (!panelState?.organizationBinding?.fromNumber) {
        return {
          success: false,
          status: "blocked",
          message: "Organization phone binding is missing a Twilio voice number.",
        };
      }

      const phoneValidation = await ctx.runAction(
        generatedApi.api.integrations.twilio.validateOrganizationTwilioPhoneNumber,
        {
          sessionId: args.sessionId,
          organizationId: args.organizationId,
          phoneNumber: panelState.organizationBinding.fromNumber,
        },
      );
      if (!phoneValidation?.success || phoneValidation.valid !== true) {
        return {
          success: false,
          status: "blocked",
          message:
            phoneValidation?.reason ||
            "Twilio voice number validation failed for the current phone binding.",
        };
      }

      const webhookValidation = await ctx.runAction(
        generatedApi.api.integrations.twilio.validateOrganizationTwilioVoiceNumberBinding,
        {
          sessionId: args.sessionId,
          organizationId: args.organizationId,
          phoneNumber: panelState.organizationBinding.fromNumber,
        },
      );
      if (!webhookValidation?.success || webhookValidation.valid !== true) {
        return {
          success: false,
          status: "blocked",
          message:
            webhookValidation?.reason ||
            "Twilio voice webhook bridge is not applied to the current binding number.",
        };
      }

      return {
        success: true,
        status: "validated",
        message: "Twilio Voice binding and webhook bridge validated.",
      };
    }

    if (telephonyConfig.selectedProvider !== "elevenlabs") {
      return {
        success: false,
        status: "blocked",
        message: `${telephonyConfig.selectedProvider} is not implemented yet.`,
      };
    }

    const runtimeBinding = await ctx.runQuery(
      generatedApi.internal.integrations.elevenlabs.getOrganizationElevenLabsRuntimeBinding,
      {
        organizationId: args.organizationId,
      },
    );

    if (!runtimeBinding?.apiKey) {
      return {
        success: false,
        status: "blocked",
        message: "ElevenLabs is not connected for this organization.",
      };
    }

    const remoteAgentIdsByTemplateRole =
      extractTemplateRoleTransferDependencies(telephonyConfig.elevenlabs.managedTools).length > 0
        ? await ctx.runQuery(
            generatedApi.internal.integrations.telephony.getOrganizationTemplateRoleRemoteAgentIds,
            {
              organizationId: args.organizationId,
              templateRoles: extractTemplateRoleTransferDependencies(
                telephonyConfig.elevenlabs.managedTools,
              ),
            },
          )
        : {};
    const resolvedManagedTools = resolveTemplateRoleTransferManagedTools({
      managedTools: telephonyConfig.elevenlabs.managedTools,
      remoteAgentIdsByTemplateRole,
    });

    const desired = {
      prompt: telephonyConfig.elevenlabs.systemPrompt,
      firstMessage: telephonyConfig.elevenlabs.firstMessage,
      knowledgeBase: {
        content: telephonyConfig.elevenlabs.knowledgeBase,
        name: telephonyConfig.elevenlabs.knowledgeBaseName,
      },
      managedBuiltInTools: resolvedManagedTools,
      workflow: telephonyConfig.elevenlabs.workflow,
    };

    try {
      const client = new ElevenLabsClient(
        runtimeBinding.apiKey,
        resolveElevenLabsConvaiBaseUrl(runtimeBinding.baseUrl),
      );
      let remoteAgentId = normalizeOptionalString(telephonyConfig.elevenlabs.remoteAgentId);

      if (!remoteAgentId) {
        const createdKnowledgeBaseIds: string[] = [];
        let desiredKnowledgeBase = undefined as ReturnType<typeof normalizeKnowledgeBaseRefs> | undefined;

        if (desired.knowledgeBase.content.trim().length > 0) {
          const createdKnowledgeBase = await client.createTextKnowledgeBaseDocument(
            desired.knowledgeBase.name,
            desired.knowledgeBase.content,
          );
          createdKnowledgeBaseIds.push(createdKnowledgeBase.id);
          desiredKnowledgeBase = [
            toKnowledgeBaseRef(createdKnowledgeBase, desired.knowledgeBase.name),
          ];
        }

        try {
          const createdAgent = await client.createAgent(
            buildElevenLabsAgentCreatePayload({
              name: buildTelephonyAgentDisplayName(agent),
              desired,
              knowledgeBase: desiredKnowledgeBase,
            }),
          );
          remoteAgentId = normalizeOptionalString(createdAgent.agent_id);
          if (!remoteAgentId) {
            throw new Error("ElevenLabs create-agent response did not return agent_id.");
          }
        } catch (error) {
          for (const documentId of createdKnowledgeBaseIds) {
            try {
              await client.deleteKnowledgeBaseDocument(documentId, true);
            } catch (cleanupError) {
              console.warn("[TelephonySync] Failed to clean up provisioning KB doc", {
                documentId,
                error:
                  cleanupError instanceof Error
                    ? cleanupError.message
                    : String(cleanupError),
              });
            }
          }
          throw error;
        }

        const now = Date.now();
        await ctx.runMutation(
          generatedApi.internal.integrations.telephony.recordAgentTelephonySyncStateInternal,
          {
            agentId: args.agentId,
            organizationId: args.organizationId,
            remoteAgentId,
            syncState: {
              status: "success",
              lastSyncedAt: now,
              lastSyncedProviderAgentId: remoteAgentId,
              drift: [],
            },
          },
        );

        return {
          success: true,
          status: "provisioned",
          drift: [],
          remoteAgentId,
        };
      }

      const remoteAgent = await client.getAgent(remoteAgentId);
      const remoteKnowledgeBase = await readRemoteKnowledgeBaseState(
        client,
        normalizeKnowledgeBaseRefs(remoteAgent.conversation_config.agent.prompt.knowledge_base),
      );
      const drift = computeAgentSyncDrift({
        remoteAgent,
        remoteKnowledgeBase,
        desired,
      });
      const driftKeys = [
        ...(drift.promptChanged ? ["system_prompt"] : []),
        ...(drift.firstMessageChanged ? ["first_message"] : []),
        ...(drift.knowledgeBaseChanged ? ["knowledge_base"] : []),
        ...(drift.builtInToolsChanged ? ["managed_tools"] : []),
        ...(drift.workflowChanged ? ["workflow"] : []),
      ] as Array<
        "system_prompt" | "first_message" | "knowledge_base" | "managed_tools" | "workflow"
      >;
      const now = Date.now();

      if (driftKeys.length === 0) {
        await ctx.runMutation(
        generatedApi.internal.integrations.telephony.recordAgentTelephonySyncStateInternal,
        {
          agentId: args.agentId,
          organizationId: args.organizationId,
          remoteAgentId,
          syncState: {
            status: "success",
            lastSyncedAt: now,
            lastSyncedProviderAgentId: remoteAgentId,
            drift: [],
            },
          },
        );
        return {
          success: true,
          status: "noop",
          drift: [],
          remoteAgentId,
        };
      }

      let desiredKnowledgeBase = remoteKnowledgeBase.refs;
      let staleKnowledgeBaseIds: string[] = [];
      if (drift.knowledgeBaseChanged) {
        const createdKnowledgeBase = await client.createTextKnowledgeBaseDocument(
          desired.knowledgeBase.name,
          desired.knowledgeBase.content,
        );
        desiredKnowledgeBase = [
          toKnowledgeBaseRef(createdKnowledgeBase, desired.knowledgeBase.name),
        ];
        staleKnowledgeBaseIds = remoteKnowledgeBase.refs.map((ref) => ref.id).filter(Boolean);
      }

      const payload = {
        conversation_config: {
          ...remoteAgent.conversation_config,
          agent: {
            ...remoteAgent.conversation_config.agent,
            first_message: desired.firstMessage,
            prompt: buildDesiredPrompt(
              remoteAgent.conversation_config.agent.prompt,
              desired.prompt,
              desired.managedBuiltInTools,
              desiredKnowledgeBase,
            ),
          },
        },
        ...(desired.workflow !== undefined ? { workflow: desired.workflow } : {}),
      };

      await client.updateAgent(remoteAgentId, payload);

      for (const documentId of staleKnowledgeBaseIds) {
        try {
          await client.deleteKnowledgeBaseDocument(documentId, true);
        } catch (error) {
          console.warn("[TelephonySync] Failed to delete stale knowledge-base doc", {
            documentId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      await ctx.runMutation(
        generatedApi.internal.integrations.telephony.recordAgentTelephonySyncStateInternal,
        {
          agentId: args.agentId,
          organizationId: args.organizationId,
          remoteAgentId,
          syncState: {
            status: "success",
            lastSyncedAt: now,
            lastSyncedProviderAgentId: remoteAgentId,
            drift: driftKeys,
          },
        },
      );

      return {
        success: true,
        status: "synced",
        drift: driftKeys,
        remoteAgentId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const remoteAgentId = normalizeOptionalString(
        telephonyConfig.elevenlabs.remoteAgentId,
      );
      await ctx.runMutation(
        generatedApi.internal.integrations.telephony.recordAgentTelephonySyncStateInternal,
        {
          agentId: args.agentId,
          organizationId: args.organizationId,
          remoteAgentId,
          syncState: {
            status: "error",
            lastSyncError: message,
            lastSyncedProviderAgentId: remoteAgentId,
          },
        },
      );
      return {
        success: false,
        status: "error",
        message,
      };
    }
  },
});

export const deployAnneBeckerTemplateToOrganization = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    preferredCloneName: v.optional(v.string()),
  },
  handler: async (ctx, args) =>
    deployProtectedTelephonyTemplateToOrganization(ctx, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      templateRole: ANNE_BECKER_TEMPLATE_ROLE,
      playbook: ANNE_BECKER_TEMPLATE_PLAYBOOK,
      preferredCloneName: args.preferredCloneName,
      defaultCloneName: "Anne Becker",
      useCase: "Customer Telephony",
      spawnReason: "anne_becker_platform_telephony_deploy",
      deploymentFlow: "platform_native_customer_telephony_beta_v1",
      missingTemplateMessage:
        "Anne Becker template not found on the platform org. Run onboarding/seedPlatformAgents.seedAll first.",
      organizationMismatchMessage: "Organization mismatch while deploying Anne Becker.",
    }),
});

async function deployProtectedTelephonyTemplateToOrganization(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: {
    sessionId: string;
    organizationId: Id<"organizations">;
    templateRole: string;
    playbook: string;
    preferredCloneName?: string;
    defaultCloneName: string;
    useCase: string;
    spawnReason: string;
    deploymentFlow: string;
    missingTemplateMessage: string;
    organizationMismatchMessage: string;
  },
) {
  const authenticated = await ctx.runQuery(
    generatedApi.internal.rbacHelpers.requireAuthenticatedUserQuery,
    {
      sessionId: args.sessionId,
    },
  );
  if (authenticated.organizationId !== args.organizationId) {
    throw new Error(args.organizationMismatchMessage);
  }

  const platformOrgId = getPlatformOrgId();
  const template = await ctx.runQuery(
    generatedApi.internal.agentOntology.getProtectedTemplateAgentByRole,
    {
      organizationId: platformOrgId,
      templateRole: args.templateRole,
    },
  );

  if (!template?._id) {
    return {
      success: false,
      status: "blocked",
      message: args.missingTemplateMessage,
    };
  }

  const result = await ctx.runMutation(
    generatedApi.internal.ai.workerPool.spawnUseCaseAgent,
    {
      organizationId: args.organizationId,
      templateAgentId: template._id,
      ownerUserId: authenticated.userId,
      requestedByUserId: authenticated.userId,
      useCase: args.useCase,
      playbook: args.playbook,
      preferredCloneName:
        normalizeOptionalString(args.preferredCloneName) || args.defaultCloneName,
      spawnReason: args.spawnReason,
      metadata: {
        templateRole: args.templateRole,
        deploymentFlow: args.deploymentFlow,
      },
    },
  );

  return {
    success: true,
    status: "success",
    templateAgentId: template._id,
    templateRole: args.templateRole,
    ...result,
  };
}

export const deployClaraTemplateToOrganization = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    preferredCloneName: v.optional(v.string()),
  },
  handler: async (ctx, args) =>
    deployProtectedTelephonyTemplateToOrganization(ctx, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      templateRole: CLARA_TEMPLATE_ROLE,
      playbook: CLARA_TEMPLATE_PLAYBOOK,
      preferredCloneName: args.preferredCloneName,
      defaultCloneName: "Clara",
      useCase: "Reception",
      spawnReason: "clara_platform_telephony_deploy",
      deploymentFlow: "platform_core_wedge_telephony_beta_v1",
      missingTemplateMessage:
        "Clara template not found on the platform org. Run onboarding/seedPlatformAgents.seedAll first.",
      organizationMismatchMessage: "Organization mismatch while deploying Clara.",
    }),
});

export const deployJonasTemplateToOrganization = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    preferredCloneName: v.optional(v.string()),
  },
  handler: async (ctx, args) =>
    deployProtectedTelephonyTemplateToOrganization(ctx, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      templateRole: JONAS_TEMPLATE_ROLE,
      playbook: JONAS_TEMPLATE_PLAYBOOK,
      preferredCloneName: args.preferredCloneName,
      defaultCloneName: "Jonas",
      useCase: "Lead Qualification",
      spawnReason: "jonas_platform_telephony_deploy",
      deploymentFlow: "platform_core_wedge_telephony_beta_v1",
      missingTemplateMessage:
        "Jonas template not found on the platform org. Run onboarding/seedPlatformAgents.seedAll first.",
      organizationMismatchMessage: "Organization mismatch while deploying Jonas.",
    }),
});

export const deployMarenTemplateToOrganization = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    preferredCloneName: v.optional(v.string()),
  },
  handler: async (ctx, args) =>
    deployProtectedTelephonyTemplateToOrganization(ctx, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      templateRole: MAREN_TEMPLATE_ROLE,
      playbook: MAREN_TEMPLATE_PLAYBOOK,
      preferredCloneName: args.preferredCloneName,
      defaultCloneName: "Maren",
      useCase: "Appointment Coordination",
      spawnReason: "maren_platform_telephony_deploy",
      deploymentFlow: "platform_core_wedge_telephony_beta_v1",
      missingTemplateMessage:
        "Maren template not found on the platform org. Run onboarding/seedPlatformAgents.seedAll first.",
      organizationMismatchMessage: "Organization mismatch while deploying Maren.",
    }),
});

export const deployCoreWedgeTemplatesToOrganization = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const clara = await deployProtectedTelephonyTemplateToOrganization(ctx, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      templateRole: CLARA_TEMPLATE_ROLE,
      playbook: CLARA_TEMPLATE_PLAYBOOK,
      defaultCloneName: "Clara",
      useCase: "Reception",
      spawnReason: "clara_platform_telephony_deploy",
      deploymentFlow: "platform_core_wedge_telephony_beta_v1",
      missingTemplateMessage:
        "Clara template not found on the platform org. Run onboarding/seedPlatformAgents.seedAll first.",
      organizationMismatchMessage: "Organization mismatch while deploying Clara.",
    });
    const jonas = await deployProtectedTelephonyTemplateToOrganization(ctx, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      templateRole: JONAS_TEMPLATE_ROLE,
      playbook: JONAS_TEMPLATE_PLAYBOOK,
      defaultCloneName: "Jonas",
      useCase: "Lead Qualification",
      spawnReason: "jonas_platform_telephony_deploy",
      deploymentFlow: "platform_core_wedge_telephony_beta_v1",
      missingTemplateMessage:
        "Jonas template not found on the platform org. Run onboarding/seedPlatformAgents.seedAll first.",
      organizationMismatchMessage: "Organization mismatch while deploying Jonas.",
    });
    const maren = await deployProtectedTelephonyTemplateToOrganization(ctx, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      templateRole: MAREN_TEMPLATE_ROLE,
      playbook: MAREN_TEMPLATE_PLAYBOOK,
      defaultCloneName: "Maren",
      useCase: "Appointment Coordination",
      spawnReason: "maren_platform_telephony_deploy",
      deploymentFlow: "platform_core_wedge_telephony_beta_v1",
      missingTemplateMessage:
        "Maren template not found on the platform org. Run onboarding/seedPlatformAgents.seedAll first.",
      organizationMismatchMessage: "Organization mismatch while deploying Maren.",
    });

    return {
      success: [clara, jonas, maren].every((result) => result.success),
      status: [clara, jonas, maren].every((result) => result.success)
        ? "success"
        : "partial",
      results: {
        clara,
        jonas,
        maren,
      },
    };
  },
});
