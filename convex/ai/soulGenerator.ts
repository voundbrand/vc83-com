/**
 * SOUL GENERATOR — Agent Self-Generation
 *
 * Allows an agent to generate its own SOUL.md based on business context.
 * Inspired by OpenClaw's approach where Peter told his agent "give yourself a name"
 * and it self-generated its entire behavioral specification.
 *
 * Two modes:
 * 1. Generate from business context (org name, industry, FAQs, knowledge base)
 * 2. Agent self-reflection (agent evaluates its own conversations and refines its soul)
 */

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { OpenRouterClient } from "./openrouter";
import type { Id } from "../_generated/dataModel";
import {
  applyBoundedMidwifeOverlay,
  type MidwifeHybridCompositionProvenanceContract,
} from "./midwifeCatalogComposer";
import {
  createNonChatAiUsageMeteringRunners,
  meterNonChatAiUsage,
} from "./nonChatUsageMetering";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _apiCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  if (!_apiCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _apiCache = require("../_generated/api").internal;
  }
  return _apiCache;
}

function normalizeNonNegativeInt(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toUsageErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    const normalized = error.trim();
    return normalized.length > 0 ? normalized : undefined;
  }
  return undefined;
}

function convertUsdToCents(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.max(0, Math.round(value * 100));
}

function extractCompletionUsage(response: unknown): {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  providerRequestId?: string;
} {
  const usage = (response as { usage?: Record<string, unknown> } | null)?.usage ?? null;
  const inputTokens = normalizeNonNegativeInt(usage?.prompt_tokens);
  const outputTokens = normalizeNonNegativeInt(usage?.completion_tokens);
  const totalTokens = Math.max(
    normalizeNonNegativeInt(usage?.total_tokens),
    inputTokens + outputTokens
  );
  const providerRequestId = normalizeOptionalString(
    (response as { id?: unknown } | null)?.id
  );
  return {
    inputTokens,
    outputTokens,
    totalTokens,
    providerRequestId,
  };
}

async function meterSoulGenerationUsage(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  organizationId: Id<"organizations">;
  agentId: Id<"objects">;
  client: OpenRouterClient;
  model: string;
  action: "soul_generate" | "soul_generate_internal";
  response: unknown;
  providerError: unknown;
  startedAt: number;
}) {
  const usage = extractCompletionUsage(args.response);
  const costInCents = convertUsdToCents(
    args.client.calculateCost(
      {
        prompt_tokens: usage.inputTokens,
        completion_tokens: usage.outputTokens,
      },
      args.model
    )
  );
  const meteringRunners = createNonChatAiUsageMeteringRunners({
    runMutation: args.ctx.runMutation,
  });

  try {
    await meterNonChatAiUsage({
      runners: meteringRunners,
      organizationId: args.organizationId,
      requestType: "completion",
      provider: "openrouter",
      model: args.model,
      action: args.action,
      requestCount: 1,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      costInCents,
      usage: {
        nativeUsageUnit: "tokens",
        nativeInputUnits: usage.inputTokens,
        nativeOutputUnits: usage.outputTokens,
        nativeTotalUnits: usage.totalTokens,
        nativeUsageQuantity: usage.totalTokens,
        nativeCostInCents: costInCents,
        nativeCostCurrency: costInCents > 0 ? "USD" : undefined,
        nativeCostSource:
          costInCents > 0 ? "estimated_model_pricing" : "not_available",
        providerRequestId: usage.providerRequestId,
        metadata: {
          agentId: `${args.agentId}`,
          flow: args.action,
        },
      },
      billingSource: "platform",
      requestSource: "llm",
      ledgerMode: "credits_ledger",
      creditLedgerAction: args.action,
      relatedEntityType: "agent",
      relatedEntityId: `${args.agentId}`,
      success: args.providerError === null,
      errorMessage:
        args.providerError === null
          ? undefined
          : toUsageErrorMessage(args.providerError),
      requestDurationMs: Date.now() - args.startedAt,
    });
  } catch (meteringError) {
    console.warn(
      "[SoulGenerator] Failed to record non-chat usage:",
      toUsageErrorMessage(meteringError) ?? String(meteringError)
    );
  }
}

function toNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .map((item) => toNonEmptyString(item))
    .filter((item): item is string => Boolean(item));
  if (normalized.length === 0) {
    return undefined;
  }
  return Array.from(new Set(normalized));
}

export const SOUL_IDENTITY_IMMUTABLE_ORIGIN_VALUES = [
  "interview",
  "generated",
  "manual",
] as const;

export type SoulIdentityImmutableOrigin =
  (typeof SOUL_IDENTITY_IMMUTABLE_ORIGIN_VALUES)[number];

export interface SoulIdentityOriginMetadata {
  immutableOrigin: SoulIdentityImmutableOrigin;
  interviewSessionId?: string;
  interviewTemplateId?: string;
  firstWordsHandshakeId?: string;
}

function normalizeSoulIdentityOrigin(
  value: SoulIdentityOriginMetadata | undefined,
): SoulIdentityOriginMetadata {
  const immutableOrigin =
    value?.immutableOrigin === "interview"
    || value?.immutableOrigin === "manual"
      ? value.immutableOrigin
      : "generated";

  return {
    immutableOrigin,
    interviewSessionId: toNonEmptyString(value?.interviewSessionId),
    interviewTemplateId: toNonEmptyString(value?.interviewTemplateId),
    firstWordsHandshakeId: toNonEmptyString(value?.firstWordsHandshakeId),
  };
}

export function attachSoulV2Overlay(args: {
  soul: Record<string, unknown>;
  generatedAt: number;
  identityOrigin?: SoulIdentityOriginMetadata;
  hybridComposition?: {
    overlay?: Record<string, unknown>;
    provenance?: MidwifeHybridCompositionProvenanceContract;
  };
}): Record<string, unknown> {
  const identityOrigin = normalizeSoulIdentityOrigin(args.identityOrigin);
  const composedSoul = applyBoundedMidwifeOverlay({
    soul: args.soul,
    overlay: args.hybridComposition?.overlay,
    preserveIdentityAnchors: identityOrigin.immutableOrigin === "interview",
  });

  const identityAnchors = {
    name: toNonEmptyString(composedSoul.name),
    tagline: toNonEmptyString(composedSoul.tagline),
    traits: normalizeStringArray(composedSoul.traits),
    coreValues: normalizeStringArray(composedSoul.coreValues),
    neverDo: normalizeStringArray(composedSoul.neverDo),
    escalationTriggers: normalizeStringArray(composedSoul.escalationTriggers),
    coreMemories: Array.isArray(composedSoul.coreMemories)
      ? composedSoul.coreMemories
      : [],
    immutableOrigin: identityOrigin.immutableOrigin,
    interviewSessionId: identityOrigin.interviewSessionId,
    interviewTemplateId: identityOrigin.interviewTemplateId,
    firstWordsHandshakeId: identityOrigin.firstWordsHandshakeId,
  };

  const executionPreferences = {
    alwaysDo: normalizeStringArray(composedSoul.alwaysDo),
    communicationStyle: toNonEmptyString(composedSoul.communicationStyle),
    toneGuidelines: toNonEmptyString(composedSoul.toneGuidelines),
    greetingStyle: toNonEmptyString(composedSoul.greetingStyle),
    closingStyle: toNonEmptyString(composedSoul.closingStyle),
    emojiUsage: toNonEmptyString(composedSoul.emojiUsage),
  };

  const existingVersion =
    typeof composedSoul.version === "number" && Number.isFinite(composedSoul.version)
      ? composedSoul.version
      : 1;

  return {
    ...composedSoul,
    version: Math.max(3, existingVersion),
    lastUpdatedAt: args.generatedAt,
    generatedBy: "agent_self",
    soulV2: {
      schemaVersion: 3,
      identityAnchors,
      executionPreferences,
      hybridCompositionProvenance: args.hybridComposition?.provenance,
      requireOwnerApprovalForMutations: true,
    },
  };
}

/**
 * Generate a soul for an agent based on business context.
 * Returns structured soul data + rendered markdown.
 */
export const generateSoul = action({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("objects"),
    // Optional hints from the user
    hints: v.optional(v.object({
      preferredName: v.optional(v.string()),
      industry: v.optional(v.string()),
      targetAudience: v.optional(v.string()),
      tonePreference: v.optional(v.string()),
      additionalContext: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    // 1. Load agent config
    const agent = await ctx.runQuery(getInternal().agentOntology.getAgentInternal, {
      agentId: args.agentId,
    });

    if (!agent) {
      throw new Error("Agent not found");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = (agent.customProperties || {}) as Record<string, any>;

    // 2. Load org knowledge base for context
    const knowledgeDocs = await ctx.runQuery(
      getInternal().organizationMedia.getKnowledgeBaseDocsInternal,
      {
        organizationId: args.organizationId,
        tags: config.knowledgeBaseTags?.length ? config.knowledgeBaseTags : undefined,
      }
    );

    // 3. Build context summary for the generator
    const contextParts: string[] = [];

    contextParts.push(`Organization ID: ${args.organizationId}`);
    contextParts.push(`Agent type: ${agent.subtype || "general"}`);

    if (config.displayName) {
      contextParts.push(`Current display name: ${config.displayName}`);
    }
    if (config.personality) {
      contextParts.push(`Current personality setting: ${config.personality}`);
    }
    if (config.brandVoiceInstructions) {
      contextParts.push(`Current brand voice: ${config.brandVoiceInstructions}`);
    }
    if (config.faqEntries?.length) {
      contextParts.push(`\nFAQ entries (${config.faqEntries.length}):`);
      for (const faq of config.faqEntries.slice(0, 5)) {
        contextParts.push(`  Q: ${faq.q}`);
        contextParts.push(`  A: ${faq.a}`);
      }
    }
    if (knowledgeDocs?.length) {
      contextParts.push(`\nKnowledge base documents (${knowledgeDocs.length}):`);
      for (const doc of knowledgeDocs.slice(0, 3)) {
        contextParts.push(`  - ${doc.filename}: ${doc.description || "(no description)"}`);
        // Include first 500 chars of content for context
        contextParts.push(`    ${doc.content.slice(0, 500)}...`);
      }
    }

    // User hints
    if (args.hints) {
      if (args.hints.preferredName) contextParts.push(`\nUser wants agent named: ${args.hints.preferredName}`);
      if (args.hints.industry) contextParts.push(`Industry: ${args.hints.industry}`);
      if (args.hints.targetAudience) contextParts.push(`Target audience: ${args.hints.targetAudience}`);
      if (args.hints.tonePreference) contextParts.push(`Tone preference: ${args.hints.tonePreference}`);
      if (args.hints.additionalContext) contextParts.push(`Additional context: ${args.hints.additionalContext}`);
    }

    // 4. Call LLM to generate soul
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OpenRouter API key not configured");

    const client = new OpenRouterClient(apiKey);

    const prompt = `You are creating a SOUL for an AI agent. A soul defines who the agent IS — its personality, values, communication style, and behavioral rules.

Based on the following business context, generate a complete agent soul.

=== BUSINESS CONTEXT ===
${contextParts.join("\n")}
=== END CONTEXT ===

Generate a JSON response with this exact structure:
{
  "name": "A memorable, human name for the agent (e.g., Maya, Atlas, Quinn)",
  "tagline": "A one-liner identity statement (e.g., 'Your growth strategist and trusted guide')",
  "traits": ["3-5 personality traits that fit this business"],
  "communicationStyle": "2-3 sentences describing how this agent communicates",
  "toneGuidelines": "Specific tone instructions (when to be formal vs casual, etc.)",
  "coreValues": ["3-5 core values this agent embodies"],
  "neverDo": ["5-7 things this agent should NEVER do"],
  "alwaysDo": ["5-7 things this agent should ALWAYS do"],
  "escalationTriggers": ["3-5 situations where the agent should hand off to a human"],
  "greetingStyle": "How the agent opens conversations",
  "closingStyle": "How the agent ends conversations",
  "emojiUsage": "none|minimal|moderate|expressive",
  "soulMarkdown": "A complete SOUL.md document in markdown that captures everything above in a natural, readable format. This is the agent's self-description — write it in first person."
}

IMPORTANT:
- The soul should feel authentic and specific to this business, not generic
- The name should feel warm and approachable
- The "neverDo" rules should include business-specific guardrails
- The soulMarkdown should be written as if the agent is describing itself
- Keep the soulMarkdown under 500 words
- Output ONLY valid JSON, no markdown code blocks`;

    const model = "anthropic/claude-sonnet-4.5";
    const requestStartedAt = Date.now();
    let response: any = null;
    let providerError: unknown = null;
    try {
      response = await client.chatCompletion({
        model,
        messages: [
          {
            role: "system",
            content: "You are a soul architect. You create authentic, specific agent personalities. Output only valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.8, // Higher temp for creative personality generation
        max_tokens: 2000,
      });
    } catch (error) {
      providerError = error;
    }

    await meterSoulGenerationUsage({
      ctx,
      organizationId: args.organizationId,
      agentId: args.agentId,
      client,
      model,
      action: "soul_generate",
      response,
      providerError,
      startedAt: requestStartedAt,
    });

    if (providerError !== null) {
      throw providerError;
    }

    const content = response.choices?.[0]?.message?.content || "{}";

    try {
      // Handle potential markdown code blocks in response
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : content;

      const generatedAt = Date.now();
      const soul = attachSoulV2Overlay({
        soul: JSON.parse(jsonText),
        generatedAt,
      });

      return {
        status: "success",
        soul,
      };
    } catch (error) {
      console.error("[SoulGenerator] Failed to parse soul JSON:", error);
      return {
        status: "error",
        message: "Failed to generate soul — LLM returned invalid JSON",
        rawContent: content,
      };
    }
  },
});

/**
 * Bootstrap an agent from scratch — create, generate soul, activate.
 * One action that does it all. Designed for CLI / quick setup.
 *
 * Can be called as a public action from the CLI scripts.
 */
export const bootstrapAgent = action({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    subtype: v.optional(v.string()),
    // Hints for soul generation
    industry: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
    tonePreference: v.optional(v.string()),
    additionalContext: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Create the agent
    const agentId: Id<"objects"> = await ctx.runMutation(
      getInternal().agentOntology.createAgentInternal,
      {
        organizationId: args.organizationId,
        name: args.name,
        subtype: args.subtype || "general",
        displayName: args.name,
        autonomyLevel: "autonomous" as const,
        modelId: "anthropic/claude-sonnet-4.5",
      }
    );

    // 2. Generate a soul
    let soul = null;
    try {
      const soulResult = await generateSoulInternal(ctx, {
        organizationId: args.organizationId,
        agentId,
        hints: {
          preferredName: args.name,
          industry: args.industry,
          targetAudience: args.targetAudience,
          tonePreference: args.tonePreference,
          additionalContext: args.additionalContext,
        },
      });

      if (soulResult.status === "success") {
        soul = soulResult.soul;

        // Save soul to agent
        await ctx.runMutation(getInternal().agentOntology.updateAgentSoulInternal, {
          agentId,
          soul,
        });
      }
    } catch (e) {
      console.error("[Bootstrap] Soul generation failed, continuing without soul:", e);
    }

    // 3. Activate the agent
    await ctx.runMutation(getInternal().agentOntology.activateAgentInternal, {
      agentId,
    });

    return {
      status: "success",
      agentId,
      agentName: args.name,
      soul: soul ? {
        name: soul.name,
        tagline: soul.tagline,
        traits: soul.traits,
      } : null,
    };
  },
});

/**
 * Archive all agents for an org and re-bootstrap from scratch.
 * Called by CLI --fresh flag. Since archiveAllAgentsInternal is an internalMutation,
 * the CLI can't call it directly — this action wraps it.
 */
export const freshBootstrap = action({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const result = await ctx.runMutation(
      getInternal().agentOntology.archiveAllAgentsInternal,
      { organizationId: args.organizationId }
    );
    return result;
  },
});

/**
 * Internal helper: generate soul without being a separate action.
 * Reuses the same logic as generateSoul but callable from within other actions.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateSoulInternal(ctx: any, args: {
  organizationId: Id<"organizations">;
  agentId: Id<"objects">;
  hints?: {
    preferredName?: string;
    industry?: string;
    targetAudience?: string;
    tonePreference?: string;
    additionalContext?: string;
  };
}): Promise<{ status: string; soul?: any; message?: string }> {
  // Load agent config
  const agent = await ctx.runQuery(getInternal().agentOntology.getAgentInternal, {
    agentId: args.agentId,
  });

  if (!agent) throw new Error("Agent not found");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config = (agent.customProperties || {}) as Record<string, any>;

  // Load knowledge base
  const knowledgeDocs = await ctx.runQuery(
    getInternal().organizationMedia.getKnowledgeBaseDocsInternal,
    {
      organizationId: args.organizationId,
      tags: config.knowledgeBaseTags?.length ? config.knowledgeBaseTags : undefined,
    }
  );

  // Build context
  const contextParts: string[] = [];
  contextParts.push(`Organization ID: ${args.organizationId}`);
  contextParts.push(`Agent type: ${agent.subtype || "general"}`);
  if (config.displayName) contextParts.push(`Display name: ${config.displayName}`);
  if (config.personality) contextParts.push(`Personality: ${config.personality}`);
  if (knowledgeDocs?.length) {
    contextParts.push(`\nKnowledge base (${knowledgeDocs.length} docs):`);
    for (const doc of knowledgeDocs.slice(0, 3)) {
      contextParts.push(`  - ${doc.filename}: ${doc.content.slice(0, 300)}...`);
    }
  }

  if (args.hints) {
    if (args.hints.preferredName) contextParts.push(`\nPreferred name: ${args.hints.preferredName}`);
    if (args.hints.industry) contextParts.push(`Industry: ${args.hints.industry}`);
    if (args.hints.targetAudience) contextParts.push(`Target audience: ${args.hints.targetAudience}`);
    if (args.hints.tonePreference) contextParts.push(`Tone: ${args.hints.tonePreference}`);
    if (args.hints.additionalContext) contextParts.push(`Context: ${args.hints.additionalContext}`);
  }

  // Call LLM
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OpenRouter API key not configured");

  const client = new OpenRouterClient(apiKey);

  const prompt = `You are creating a SOUL for an AI agent. A soul defines who the agent IS — its personality, values, communication style, and behavioral rules.

Based on the following business context, generate a complete agent soul.

=== BUSINESS CONTEXT ===
${contextParts.join("\n")}
=== END CONTEXT ===

Generate a JSON response with this exact structure:
{
  "name": "A memorable, human name for the agent (e.g., Maya, Atlas, Quinn)",
  "tagline": "A one-liner identity statement",
  "traits": ["3-5 personality traits"],
  "communicationStyle": "2-3 sentences on communication style",
  "toneGuidelines": "Tone instructions",
  "coreValues": ["3-5 core values"],
  "neverDo": ["5-7 things to never do"],
  "alwaysDo": ["5-7 things to always do"],
  "escalationTriggers": ["3-5 escalation situations"],
  "greetingStyle": "How to open conversations",
  "closingStyle": "How to end conversations",
  "emojiUsage": "none|minimal|moderate|expressive",
  "soulMarkdown": "Complete SOUL.md in first person, under 500 words"
}

Output ONLY valid JSON, no markdown code blocks.`;

  const model = "anthropic/claude-sonnet-4.5";
  const requestStartedAt = Date.now();
  let response: any = null;
  let providerError: unknown = null;
  try {
    response = await client.chatCompletion({
      model,
      messages: [
        { role: "system", content: "You are a soul architect. Create authentic agent personalities. Output only valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    });
  } catch (error) {
    providerError = error;
  }

  await meterSoulGenerationUsage({
    ctx,
    organizationId: args.organizationId,
    agentId: args.agentId,
    client,
    model,
    action: "soul_generate_internal",
    response,
    providerError,
    startedAt: requestStartedAt,
  });

  if (providerError !== null) {
    throw providerError;
  }

  const content = response.choices?.[0]?.message?.content || "{}";

  try {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : content;
    const generatedAt = Date.now();
    const soul = attachSoulV2Overlay({
      soul: JSON.parse(jsonText),
      generatedAt,
    });
    return { status: "success", soul };
  } catch {
    return { status: "error", message: "Failed to parse soul JSON" };
  }
}
