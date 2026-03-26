import {
  composeKnowledgeContract,
  type KnowledgeCompositionContract,
} from "./systemKnowledge/index";
import {
  buildArchetypePromptOverlay,
  resolveActiveArchetypeRuntimeContract,
  resolveSensitiveArchetypeRuntimeConstraint,
} from "./archetypes";
import {
  normalizeAutonomyLevel,
  type AutonomyLevelInput,
} from "./autonomy";
import { buildInterviewPromptContext } from "./interviewRunner";
import type { KnowledgeContextDocument } from "./memoryComposer";
import { resolveSoulModeRuntimeContract } from "./soulModes";
import type {
  KnowledgeContextConfidenceContract,
  KnowledgeContextProvenanceContract,
  KnowledgeContextScopeContract,
} from "../schemas/aiSchemas";

export interface SemanticKnowledgeChunkSearchChunk {
  chunkId: string;
  mediaId?: string;
  chunkOrdinal?: number;
  chunkText: string;
  sourceFilename: string;
  sourceDescription?: string;
  sourceTags?: string[];
  sourceUpdatedAt?: number;
  semanticScore?: number;
  confidence?: number;
  confidenceBand?: "high" | "medium" | "low";
  matchedTokens?: string[];
  knowledgeContextProvenance?: KnowledgeContextProvenanceContract;
  knowledgeContextConfidence?: KnowledgeContextConfidenceContract;
}

export interface SemanticKnowledgeChunkSearchResult {
  knowledgeContextScope?: KnowledgeContextScopeContract;
  queryTokenCount: number;
  totalCandidates: number;
  filteredCandidates: number;
  returned: number;
  chunks: SemanticKnowledgeChunkSearchChunk[];
}

export interface AgentPromptConfig {
  displayName?: string;
  personality?: string;
  language?: string;
  additionalLanguages?: string[];
  brandVoiceInstructions?: string;
  systemPrompt?: string;
  faqEntries?: Array<{ q: string; a: string }>;
  blockedTopics?: string[];
  autonomyLevel: AutonomyLevelInput;
  activeSoulMode?: string;
  activeArchetype?: string | null;
  modeChannelBindings?: unknown;
  enabledArchetypes?: unknown;
  activeChannel?: string;
  weekendModeEnabled?: boolean;
  weekendModeActive?: boolean;
  weekendModeReason?: string;
  weekendModeTimezone?: string;
  weekendModeFridayStart?: string;
  weekendModeMondayEnd?: string;
}

export interface AgentPromptHandoffContext {
  sharedContext?: string;
  teamAccessMode?: "invisible" | "direct" | "meeting";
  lastHandoff?: {
    fromAgent: string;
    reason: string;
    summary?: string;
    goal?: string;
    contextSummary?: string;
  };
  harnessContext?: string;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return undefined;
}

function normalizeIdString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  if (
    value &&
    typeof value === "object" &&
    typeof (value as { toString?: () => string }).toString === "function"
  ) {
    const normalized = (value as { toString: () => string }).toString();
    if (normalized.trim().length > 0) {
      return normalized;
    }
  }
  return undefined;
}

function normalizeConfidenceBand(
  value: unknown
): "high" | "medium" | "low" | undefined {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }
  return undefined;
}

export function mapSemanticChunksToKnowledgeDocuments(
  chunks: SemanticKnowledgeChunkSearchChunk[]
): KnowledgeContextDocument[] {
  return chunks
    .filter(
      (chunk) =>
        typeof chunk.chunkText === "string" && chunk.chunkText.trim().length > 0
    )
    .map((chunk, index) => ({
      mediaId: normalizeIdString(chunk.mediaId),
      chunkId: normalizeOptionalString(chunk.chunkId),
      chunkOrdinal:
        typeof chunk.chunkOrdinal === "number" ? chunk.chunkOrdinal : undefined,
      filename:
        normalizeOptionalString(chunk.sourceFilename) ?? `chunk-${index + 1}.md`,
      content: chunk.chunkText,
      description: normalizeOptionalString(chunk.sourceDescription),
      tags: Array.isArray(chunk.sourceTags)
        ? chunk.sourceTags
            .filter((tag): tag is string => typeof tag === "string")
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)
        : undefined,
      source: "organization_knowledge_chunk",
      updatedAt:
        typeof chunk.sourceUpdatedAt === "number" ? chunk.sourceUpdatedAt : undefined,
      citationId: `KB-${index + 1}`,
      semanticScore:
        typeof chunk.semanticScore === "number"
          ? Number(chunk.semanticScore.toFixed(4))
          : undefined,
      confidence:
        typeof chunk.confidence === "number"
          ? Number(chunk.confidence.toFixed(4))
          : undefined,
      confidenceBand: normalizeConfidenceBand(chunk.confidenceBand),
      matchedTokens: Array.isArray(chunk.matchedTokens)
        ? chunk.matchedTokens.filter(
            (token): token is string => typeof token === "string"
          )
        : undefined,
      retrievalMethod: "semantic_chunk_index",
      knowledgeContextProvenance: chunk.knowledgeContextProvenance,
      knowledgeContextConfidence: chunk.knowledgeContextConfidence,
    }));
}

const SEMANTIC_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "for",
  "from",
  "how",
  "in",
  "is",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "we",
  "what",
  "when",
  "where",
  "which",
  "with",
]);

function tokenizeSemanticText(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !SEMANTIC_STOP_WORDS.has(token));
}

function assignCitationMetadata(
  docs: KnowledgeContextDocument[],
  retrievalMethod: "semantic_lexical" | "tag_recency_fallback"
): KnowledgeContextDocument[] {
  return docs.map((doc, index) => ({
    ...doc,
    citationId:
      typeof doc.citationId === "string" && doc.citationId.trim().length > 0
        ? doc.citationId
        : `KB-${index + 1}`,
    retrievalMethod,
  }));
}

export function rankKnowledgeDocsForSemanticRetrieval(args: {
  documents: KnowledgeContextDocument[];
  queryText: string;
  limit?: number;
  minScore?: number;
}): KnowledgeContextDocument[] {
  const queryTokens = tokenizeSemanticText(args.queryText);
  if (queryTokens.length === 0 || args.documents.length === 0) {
    return [];
  }
  const queryTokenSet = new Set(queryTokens);
  const minScore = typeof args.minScore === "number" ? args.minScore : 0.08;
  const limit = Math.max(1, Math.floor(args.limit ?? args.documents.length));

  const scoredDocs: KnowledgeContextDocument[] = [];
  for (const doc of args.documents) {
    const contentPreview = doc.content.slice(0, 6000);
    const docTokens = tokenizeSemanticText(
      [
        doc.filename,
        doc.description ?? "",
        (doc.tags ?? []).join(" "),
        contentPreview,
      ].join(" ")
    );
    if (docTokens.length === 0) {
      continue;
    }

    const docTokenSet = new Set(docTokens);
    let overlapCount = 0;
    for (const queryToken of queryTokenSet) {
      if (docTokenSet.has(queryToken)) {
        overlapCount += 1;
      }
    }

    const filenameTokens = tokenizeSemanticText(doc.filename);
    const tagTokens = tokenizeSemanticText((doc.tags ?? []).join(" "));
    const filenameMatches = filenameTokens.filter((token) =>
      queryTokenSet.has(token)
    ).length;
    const tagMatches = tagTokens.filter((token) => queryTokenSet.has(token)).length;

    const overlapScore = overlapCount / queryTokenSet.size;
    const filenameBoost = filenameMatches * 0.15;
    const tagBoost = tagMatches * 0.2;
    const score = Number((overlapScore + filenameBoost + tagBoost).toFixed(4));
    if (score < minScore) {
      continue;
    }

    scoredDocs.push({
      ...doc,
      semanticScore: score,
    });
  }

  const ranked = scoredDocs
    .sort((a, b) => {
      const scoreDelta = (b.semanticScore ?? 0) - (a.semanticScore ?? 0);
      if (scoreDelta !== 0) return scoreDelta;
      const updatedAtA = typeof a.updatedAt === "number" ? a.updatedAt : 0;
      const updatedAtB = typeof b.updatedAt === "number" ? b.updatedAt : 0;
      return updatedAtB - updatedAtA;
    })
    .slice(0, limit);

  return assignCitationMetadata(ranked, "semantic_lexical");
}

export function resolveKnowledgeRetrieval(args: {
  queryText: string;
  candidateDocs: KnowledgeContextDocument[];
  limit?: number;
}): {
  documents: KnowledgeContextDocument[];
  mode: "semantic" | "fallback";
  fallbackUsed: boolean;
  fallbackReason?: string;
  semanticCandidates: number;
} {
  const semanticDocs = rankKnowledgeDocsForSemanticRetrieval({
    documents: args.candidateDocs,
    queryText: args.queryText,
    limit: args.limit,
  });

  if (semanticDocs.length > 0) {
    return {
      documents: semanticDocs,
      mode: "semantic",
      fallbackUsed: false,
      semanticCandidates: semanticDocs.length,
    };
  }

  const fallbackDocs = assignCitationMetadata(
    args.candidateDocs.slice(0, args.limit ?? args.candidateDocs.length),
    "tag_recency_fallback"
  );
  return {
    documents: fallbackDocs,
    mode: "fallback",
    fallbackUsed: fallbackDocs.length > 0,
    fallbackReason: fallbackDocs.length > 0 ? "semantic_no_match" : "knowledge_base_empty",
    semanticCandidates: 0,
  };
}

export function buildAgentSystemPrompt(
  config: AgentPromptConfig,
  knowledgeBaseDocs?: KnowledgeContextDocument[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interviewContext?: any,
  previousSessionSummary?: string,
  disabledTools?: string[],
  handoffContext?: AgentPromptHandoffContext,
  systemKnowledgeLoadOrLegacyHarnessContext?: KnowledgeCompositionContract | string
): string {
  const parts: string[] = [];

  const resolvedHandoffContext =
    typeof systemKnowledgeLoadOrLegacyHarnessContext === "string"
      ? {
          ...(handoffContext ?? {}),
          harnessContext: systemKnowledgeLoadOrLegacyHarnessContext,
        }
      : handoffContext;
  const resolvedSystemKnowledgeLoad =
    typeof systemKnowledgeLoadOrLegacyHarnessContext === "string"
      ? undefined
      : systemKnowledgeLoadOrLegacyHarnessContext;

  const harnessContext = resolvedHandoffContext?.harnessContext;
  if (harnessContext && harnessContext.trim().length > 0) {
    parts.push(harnessContext.trim());
  }

  const knowledgeDocs =
    resolvedSystemKnowledgeLoad?.documents ??
    composeKnowledgeContract("customer").documents;
  if (knowledgeDocs.length > 0) {
    parts.push("=== SYSTEM KNOWLEDGE ===");
    for (const doc of knowledgeDocs) {
      parts.push(doc.content);
    }
    parts.push("=== END SYSTEM KNOWLEDGE ===\n");
  }

  if (knowledgeBaseDocs && knowledgeBaseDocs.length > 0) {
    parts.push("=== ORGANIZATION KNOWLEDGE BASE ===");
    parts.push(
      "The following documents were uploaded by the business owner. Use them to answer customer questions accurately.\n"
    );
    for (const doc of knowledgeBaseDocs) {
      const citationId =
        typeof doc.citationId === "string" && doc.citationId.trim().length > 0
          ? doc.citationId
          : undefined;
      parts.push(`--- ${citationId ? `[${citationId}] ` : ""}${doc.filename} ---`);
      if (doc.description) {
        parts.push(`(${doc.description})`);
      }
      parts.push(doc.content);
      parts.push("");
    }
    parts.push("=== END ORGANIZATION KNOWLEDGE BASE ===\n");
  }

  parts.push(`You are ${config.displayName || "an AI assistant"} for this organization.`);
  parts.push("\n--- IDENTITY + GREETING GUARDRAILS ---");
  parts.push(
    "Do not adopt or invent a legacy chatbot persona, personal alias, or canned role intro (for example, names like 'Kai').",
  );
  parts.push(
    "Do not open with a capabilities menu or sales-style bullet list unless the user explicitly asks what you can do.",
  );
  parts.push(
    "When the user sends a simple greeting (for example 'hello'), reply briefly in current orchestrator voice and ask one focused next-step question.",
  );
  parts.push(
    "Keep identity consistent with this runtime configuration and current thread mode; do not frame yourself as a generic CRM/forms assistant.",
  );
  parts.push(
    "One-of-one ownership invariant: the user should experience you as their dedicated operator, not as a shared agency desk or rotating team.",
  );
  parts.push(
    "Do not describe yourself as one of many agents serving many users unless the user explicitly asks for architecture/debug details.",
  );
  parts.push("--- END IDENTITY + GREETING GUARDRAILS ---");

  const soulModeRuntime = resolveSoulModeRuntimeContract({
    activeSoulMode: config.activeSoulMode,
    modeChannelBindings: config.modeChannelBindings,
    channel: config.activeChannel,
  });
  const archetypeRuntime = resolveActiveArchetypeRuntimeContract({
    requestedArchetype: config.activeArchetype,
    enabledArchetypes: config.enabledArchetypes,
    mode: soulModeRuntime.mode,
    modeDefaultArchetype: soulModeRuntime.config.archetypeDefault,
  });
  const sensitiveArchetypeConstraint = resolveSensitiveArchetypeRuntimeConstraint(
    archetypeRuntime.archetype?.id ?? null,
  );

  parts.push("\n--- CORE IDENTITY INVARIANTS ---");
  parts.push(
    "Mode and archetype overlays are lenses on top of the same soul. Identity anchors remain immutable from interview origin.",
  );
  parts.push("--- END CORE IDENTITY INVARIANTS ---");

  parts.push("\n--- SOUL MODE OVERLAY ---");
  parts.push(`Active mode: ${soulModeRuntime.mode} (${soulModeRuntime.config.label})`);
  parts.push(`Mode source: ${soulModeRuntime.source}`);
  parts.push(`Mode tone override: ${soulModeRuntime.config.toneOverride}`);
  parts.push(`Mode tool scope: ${soulModeRuntime.config.toolScope}`);
  parts.push(`Mode privacy level: ${soulModeRuntime.config.privacyLevel}`);
  if (soulModeRuntime.config.description) {
    parts.push(`Mode guidance: ${soulModeRuntime.config.description}`);
  }
  parts.push("--- END SOUL MODE OVERLAY ---");

  if (config.weekendModeEnabled) {
    parts.push("\n--- WEEKEND MODE OVERLAY ---");
    parts.push(`Weekend mode active: ${config.weekendModeActive === true ? "yes" : "no"}`);
    if (config.weekendModeTimezone) {
      parts.push(`Weekend timezone: ${config.weekendModeTimezone}`);
    }
    if (config.weekendModeFridayStart && config.weekendModeMondayEnd) {
      parts.push(
        `Weekend window: Friday ${config.weekendModeFridayStart} -> Monday ${config.weekendModeMondayEnd}`,
      );
    }
    if (config.weekendModeReason) {
      parts.push(`Weekend evaluation: ${config.weekendModeReason}`);
    }
    if (config.weekendModeActive) {
      parts.push(
        "Weekend response contract: prioritize clear information capture, avoid over-promising immediate execution, and set realistic Monday follow-up expectations.",
      );
      parts.push(
        "When uncertain, ask one clarifying question and summarize the exact callback/follow-up commitment before ending the turn.",
      );
      parts.push(
        "Capture caller intent and urgency explicitly so Monday handoff can execute without re-asking baseline details.",
      );
    }
    parts.push("--- END WEEKEND MODE OVERLAY ---");
  }

  parts.push("\n--- ARCHETYPE OVERLAY ---");
  if (archetypeRuntime.archetype) {
    parts.push(buildArchetypePromptOverlay(archetypeRuntime.archetype));
    parts.push(`Archetype source: ${archetypeRuntime.source}`);
  } else {
    parts.push("Archetype: General");
    if (archetypeRuntime.blockedReason) {
      parts.push(`Archetype fallback reason: ${archetypeRuntime.blockedReason}`);
    }
  }
  parts.push("--- END ARCHETYPE OVERLAY ---");

  if (sensitiveArchetypeConstraint) {
    parts.push("\n--- SENSITIVE ARCHETYPE GUARDRAILS ---");
    parts.push(
      `Runtime constraint: enforce read-only execution = ${sensitiveArchetypeConstraint.forceReadOnlyTools}.`,
    );
    parts.push(`Disclaimer: ${sensitiveArchetypeConstraint.disclaimer}`);
    parts.push(`Referral guidance: ${sensitiveArchetypeConstraint.referralGuidance}`);
    parts.push(
      `Blocked topics for this archetype: ${sensitiveArchetypeConstraint.blockedTopics.join(", ")}.`,
    );
    parts.push("--- END SENSITIVE ARCHETYPE GUARDRAILS ---");
  }

  if (config.language) {
    parts.push(`Primary language: ${config.language}.`);
  }
  if (config.additionalLanguages?.length) {
    parts.push(
      `You can also communicate in: ${config.additionalLanguages.join(", ")}.`
    );
  }

  if (config.personality) {
    parts.push(`\nPersonality: ${config.personality}`);
  }

  if (config.brandVoiceInstructions) {
    parts.push(`\nBrand voice guidelines: ${config.brandVoiceInstructions}`);
  }

  if (config.systemPrompt) {
    parts.push(`\n${config.systemPrompt}`);
  }

  if (config.faqEntries?.length) {
    parts.push("\n\nFrequently Asked Questions:");
    for (const faq of config.faqEntries) {
      parts.push(`Q: ${faq.q}\nA: ${faq.a}`);
    }
  }

  const combinedBlockedTopics = Array.from(
    new Set([
      ...(config.blockedTopics ?? []),
      ...(sensitiveArchetypeConstraint?.blockedTopics ?? []),
    ]),
  );

  if (combinedBlockedTopics.length > 0) {
    parts.push(
      `\nIMPORTANT: Do NOT discuss these topics: ${combinedBlockedTopics.join(
        ", "
      )}. Politely redirect the conversation if asked.`
    );
  }

  const resolvedAutonomyLevel = normalizeAutonomyLevel(config.autonomyLevel);
  if (soulModeRuntime.config.toolScope === "none") {
    parts.push(
      "\nIMPORTANT: You are in draft-only mode. Generate responses but do NOT execute any tools. Describe what you would do instead."
    );
  } else if (resolvedAutonomyLevel === "sandbox") {
    if (String(config.autonomyLevel).toLowerCase() === "draft_only") {
      parts.push(
        "\nIMPORTANT: You are in draft-only mode. Generate responses but do NOT execute any tools. Describe what you would do instead."
      );
    } else {
      parts.push(
        "\nIMPORTANT: You are in sandbox autonomy mode. Use read-only tools only and do NOT perform mutating actions."
      );
    }
  } else if (
    soulModeRuntime.config.toolScope === "read_only"
    || sensitiveArchetypeConstraint?.forceReadOnlyTools
  ) {
    parts.push(
      "\nIMPORTANT: Runtime is enforcing read-only execution for this mode/archetype. Do not perform mutating tool actions."
    );
  }

  if (interviewContext) {
    parts.push("\n");
    parts.push(buildInterviewPromptContext(interviewContext));
  }

  if (previousSessionSummary) {
    parts.push("\n--- PREVIOUS CONVERSATION ---");
    parts.push(
      `You previously spoke with this customer. Summary: "${previousSessionSummary}"`
    );
    parts.push(
      "Greet them naturally and reference the previous context if relevant."
    );
    parts.push("--- END PREVIOUS CONVERSATION ---");
  }

  if (resolvedHandoffContext) {
    parts.push("\n--- TEAM HANDOFF ---");
    if (resolvedHandoffContext.teamAccessMode) {
      parts.push(`Access mode: ${resolvedHandoffContext.teamAccessMode}`);
      if (resolvedHandoffContext.teamAccessMode === "invisible") {
        parts.push("Keep responses in primary-agent voice and treat specialist output as internal advice.");
      } else if (resolvedHandoffContext.teamAccessMode === "meeting") {
        parts.push("Keep the primary agent visible and synthesize specialist contributions.");
      } else {
        parts.push("You are in direct specialist mode for this handoff.");
      }
    }
    if (resolvedHandoffContext.lastHandoff) {
      const handoffSummary =
        resolvedHandoffContext.lastHandoff.summary ??
        resolvedHandoffContext.lastHandoff.contextSummary;
      parts.push(
        `You were tagged in by ${resolvedHandoffContext.lastHandoff.fromAgent}.`
      );
      parts.push(`Reason: ${resolvedHandoffContext.lastHandoff.reason}`);
      if (handoffSummary) {
        parts.push(`Summary: ${handoffSummary}`);
      }
      if (resolvedHandoffContext.lastHandoff.goal) {
        parts.push(`Goal: ${resolvedHandoffContext.lastHandoff.goal}`);
      }
    }
    if (resolvedHandoffContext.sharedContext) {
      parts.push(`Shared notes: ${resolvedHandoffContext.sharedContext}`);
    }
    parts.push(
      "Continue the conversation naturally. The customer may not know a handoff occurred."
    );
    parts.push("--- END TEAM HANDOFF ---");
  }

  if (disabledTools && disabledTools.length > 0) {
    parts.push("\n--- DEGRADED MODE ---");
    parts.push(
      `Some of your capabilities are temporarily unavailable: ${disabledTools.join(
        ", "
      )}.`
    );
    parts.push(
      "Focus on answering questions, providing information, and offering to connect the customer with our team for actions you cannot perform."
    );
    parts.push("Do NOT attempt to use the disabled tools.");
    parts.push("--- END DEGRADED MODE ---");
  }

  return parts.join("\n");
}
