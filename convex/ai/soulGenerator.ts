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

function attachSoulV2Overlay(
  soul: Record<string, unknown>,
  generatedAt: number,
): Record<string, unknown> {
  const identityAnchors = {
    name: toNonEmptyString(soul.name),
    tagline: toNonEmptyString(soul.tagline),
    traits: normalizeStringArray(soul.traits),
    coreValues: normalizeStringArray(soul.coreValues),
    neverDo: normalizeStringArray(soul.neverDo),
    escalationTriggers: normalizeStringArray(soul.escalationTriggers),
    coreMemories: Array.isArray(soul.coreMemories) ? soul.coreMemories : [],
  };

  const executionPreferences = {
    alwaysDo: normalizeStringArray(soul.alwaysDo),
    communicationStyle: toNonEmptyString(soul.communicationStyle),
    toneGuidelines: toNonEmptyString(soul.toneGuidelines),
    greetingStyle: toNonEmptyString(soul.greetingStyle),
    closingStyle: toNonEmptyString(soul.closingStyle),
    emojiUsage: toNonEmptyString(soul.emojiUsage),
  };

  const existingVersion =
    typeof soul.version === "number" && Number.isFinite(soul.version)
      ? soul.version
      : 1;

  return {
    ...soul,
    version: Math.max(2, existingVersion),
    lastUpdatedAt: generatedAt,
    generatedBy: "agent_self",
    soulV2: {
      schemaVersion: 2,
      identityAnchors,
      executionPreferences,
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

    const response = await client.chatCompletion({
      model: "anthropic/claude-sonnet-4.5",
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

    const content = response.choices?.[0]?.message?.content || "{}";

    try {
      // Handle potential markdown code blocks in response
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : content;

      const generatedAt = Date.now();
      const soul = attachSoulV2Overlay(JSON.parse(jsonText), generatedAt);

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

  const response = await client.chatCompletion({
    model: "anthropic/claude-sonnet-4.5",
    messages: [
      { role: "system", content: "You are a soul architect. Create authentic agent personalities. Output only valid JSON." },
      { role: "user", content: prompt },
    ],
    temperature: 0.8,
    max_tokens: 2000,
  });

  const content = response.choices?.[0]?.message?.content || "{}";

  try {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : content;
    const generatedAt = Date.now();
    const soul = attachSoulV2Overlay(JSON.parse(jsonText), generatedAt);
    return { status: "success", soul };
  } catch {
    return { status: "error", message: "Failed to parse soul JSON" };
  }
}
