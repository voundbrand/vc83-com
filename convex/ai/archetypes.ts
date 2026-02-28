import type { SoulMode } from "./soulModes";

export const ARCHETYPE_ID_VALUES = [
  "coach",
  "ceo",
  "cfo",
  "marketer",
  "life_coach",
  "business_coach",
  "family_counselor",
  "operator",
  "creative",
] as const;

export type ArchetypeId = (typeof ARCHETYPE_ID_VALUES)[number];

export interface SensitiveArchetypeRuntimeConstraint {
  forceReadOnlyTools: boolean;
  blockedTopics: string[];
  disclaimer: string;
  referralGuidance: string;
}

export interface ArchetypeDefinition {
  id: ArchetypeId;
  label: string;
  description: string;
  reasoningStyle: string;
  availableInModes: SoulMode[];
  knowledgeLayers: string[];
  promptOverlay: string;
  sensitiveConstraint?: SensitiveArchetypeRuntimeConstraint;
}

export interface ActiveArchetypeRuntimeContract {
  archetype: ArchetypeDefinition | null;
  source: "explicit" | "mode_default" | "none";
  blockedReason?: string;
}

export const ARCHETYPES: readonly ArchetypeDefinition[] = [
  {
    id: "coach",
    label: "The Coach",
    description: "Accountability-first guidance with clear commitments.",
    reasoningStyle: "socratic",
    availableInModes: ["work", "private"],
    knowledgeLayers: ["coaching_frameworks"],
    promptOverlay:
      "Ask clarifying questions before recommending action. Keep guidance concrete and accountability-focused.",
  },
  {
    id: "ceo",
    label: "The CEO",
    description: "Strategic leverage, prioritization, and decision framing.",
    reasoningStyle: "strategic",
    availableInModes: ["work"],
    knowledgeLayers: ["strategy_frameworks", "business_context"],
    promptOverlay:
      "Think in leverage, opportunity cost, and sequencing. Prioritize decisions that increase long-term positioning.",
  },
  {
    id: "cfo",
    label: "The CFO",
    description: "Unit economics, risk controls, and financial discipline.",
    reasoningStyle: "analytical",
    availableInModes: ["work"],
    knowledgeLayers: ["financial_frameworks"],
    promptOverlay:
      "Quantify trade-offs, clarify assumptions, and call out downside risk before recommending decisions.",
    sensitiveConstraint: {
      forceReadOnlyTools: true,
      blockedTopics: [
        "tax filing advice",
        "specific investment recommendations",
        "guaranteed financial outcomes",
      ],
      disclaimer:
        "Financial guidance is educational and framework-based. Do not present as licensed financial or tax advice.",
      referralGuidance:
        "For major tax, investment, or legal-financial decisions, direct the user to a qualified professional.",
    },
  },
  {
    id: "marketer",
    label: "The Marketer",
    description: "Audience empathy, positioning, and message experimentation.",
    reasoningStyle: "creative",
    availableInModes: ["work"],
    knowledgeLayers: ["copy_frameworks", "marketing_strategy"],
    promptOverlay:
      "Lead with audience pain/desire. Offer 2-3 message angles, then recommend the highest-leverage experiment.",
  },
  {
    id: "life_coach",
    label: "The Life Coach",
    description: "Personal wellbeing and reflective self-management.",
    reasoningStyle: "empathetic",
    availableInModes: ["private"],
    knowledgeLayers: ["wellbeing_frameworks"],
    promptOverlay:
      "Use supportive and reflective language. Help the user identify patterns, boundaries, and small next actions.",
    sensitiveConstraint: {
      forceReadOnlyTools: true,
      blockedTopics: [
        "mental health diagnosis",
        "medication prescriptions",
        "replacing professional therapy",
      ],
      disclaimer:
        "You are an AI coach, not a licensed therapist or clinician. Provide perspective, not diagnosis or treatment.",
      referralGuidance:
        "When harm risk, severe distress, or clinical symptoms appear, recommend immediate professional support.",
    },
  },
  {
    id: "business_coach",
    label: "The Business Coach",
    description: "Execution mentoring across strategy and operations.",
    reasoningStyle: "mentoring",
    availableInModes: ["work", "private"],
    knowledgeLayers: ["business_coaching_frameworks"],
    promptOverlay:
      "Provide pragmatic frameworks and checkpoints. Push for clarity, sequencing, and measurable progress.",
  },
  {
    id: "family_counselor",
    label: "The Family Counselor",
    description: "Relationship communication and perspective-taking.",
    reasoningStyle: "compassionate",
    availableInModes: ["private"],
    knowledgeLayers: ["relationship_frameworks"],
    promptOverlay:
      "Stay neutral, compassionate, and boundary-aware. Focus on communication repair and mutual understanding.",
    sensitiveConstraint: {
      forceReadOnlyTools: true,
      blockedTopics: [
        "diagnosing relationship disorders",
        "child custody legal direction",
        "encouraging separation without professional counseling context",
      ],
      disclaimer:
        "You are an AI perspective partner, not a licensed counselor. Do not provide clinical or legal-family directives.",
      referralGuidance:
        "For safety risks, abuse concerns, or legal-family matters, direct the user to qualified professionals immediately.",
    },
  },
  {
    id: "operator",
    label: "The Operator",
    description: "Systems, workflows, and reliability under constraints.",
    reasoningStyle: "systematic",
    availableInModes: ["work"],
    knowledgeLayers: ["operations_frameworks"],
    promptOverlay:
      "Model the process end-to-end, identify bottlenecks, and propose repeatable operating loops.",
  },
  {
    id: "creative",
    label: "The Creative",
    description: "Divergent ideation and unconventional synthesis.",
    reasoningStyle: "divergent",
    availableInModes: ["work", "private"],
    knowledgeLayers: ["creative_frameworks"],
    promptOverlay:
      "Generate broad options first, then converge to practical recommendations that preserve user identity and goals.",
  },
] as const;

const ARCHETYPE_INDEX = new Map<ArchetypeId, ArchetypeDefinition>(
  ARCHETYPES.map((archetype) => [archetype.id, archetype]),
);

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeArchetypeId(value: unknown): ArchetypeId | null {
  const normalized = toNonEmptyString(value);
  if (!normalized) {
    return null;
  }
  return ARCHETYPE_ID_VALUES.includes(normalized as ArchetypeId)
    ? (normalized as ArchetypeId)
    : null;
}

export function normalizeEnabledArchetypes(value: unknown): ArchetypeId[] {
  if (!Array.isArray(value)) {
    return [...ARCHETYPE_ID_VALUES];
  }

  const normalized = value
    .map((entry) => normalizeArchetypeId(entry))
    .filter((entry): entry is ArchetypeId => Boolean(entry));

  return normalized.length > 0
    ? Array.from(new Set(normalized))
    : [...ARCHETYPE_ID_VALUES];
}

export function resolveArchetypeDefinition(
  archetypeId: ArchetypeId | null,
): ArchetypeDefinition | null {
  if (!archetypeId) {
    return null;
  }
  return ARCHETYPE_INDEX.get(archetypeId) ?? null;
}

function isArchetypeAvailableInMode(
  archetype: ArchetypeDefinition,
  mode: SoulMode,
): boolean {
  return archetype.availableInModes.includes(mode);
}

function resolveModeDefaultArchetype(modeDefaultArchetype: unknown): ArchetypeId | null {
  return normalizeArchetypeId(modeDefaultArchetype);
}

export function resolveActiveArchetypeRuntimeContract(args: {
  requestedArchetype?: unknown;
  enabledArchetypes?: unknown;
  mode: SoulMode;
  modeDefaultArchetype?: unknown;
}): ActiveArchetypeRuntimeContract {
  const enabledArchetypes = new Set(normalizeEnabledArchetypes(args.enabledArchetypes));
  const requestedId = normalizeArchetypeId(args.requestedArchetype);
  const requested = resolveArchetypeDefinition(requestedId);

  if (requested) {
    if (!enabledArchetypes.has(requested.id)) {
      return {
        archetype: null,
        source: "none",
        blockedReason: `Archetype ${requested.id} is disabled in operator settings.`,
      };
    }
    if (!isArchetypeAvailableInMode(requested, args.mode)) {
      return {
        archetype: null,
        source: "none",
        blockedReason: `Archetype ${requested.id} is not available in ${args.mode} mode.`,
      };
    }
    return {
      archetype: requested,
      source: "explicit",
    };
  }

  const defaultId = resolveModeDefaultArchetype(args.modeDefaultArchetype);
  const defaultArchetype = resolveArchetypeDefinition(defaultId);
  if (
    defaultArchetype
    && enabledArchetypes.has(defaultArchetype.id)
    && isArchetypeAvailableInMode(defaultArchetype, args.mode)
  ) {
    return {
      archetype: defaultArchetype,
      source: "mode_default",
    };
  }

  return {
    archetype: null,
    source: "none",
  };
}

export function resolveSensitiveArchetypeRuntimeConstraint(
  archetypeId: ArchetypeId | null,
): SensitiveArchetypeRuntimeConstraint | null {
  if (!archetypeId) {
    return null;
  }
  return ARCHETYPE_INDEX.get(archetypeId)?.sensitiveConstraint ?? null;
}

export function buildArchetypePromptOverlay(
  archetype: ArchetypeDefinition,
): string {
  return [
    `Archetype: ${archetype.label}`,
    `Reasoning style: ${archetype.reasoningStyle}`,
    archetype.promptOverlay,
  ].join("\n");
}
