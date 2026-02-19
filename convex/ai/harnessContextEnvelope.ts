import { LAYER_NAMES, determineAgentLayer } from "./harness";

export type HarnessContextSource = "approval" | "escalation";
export type HarnessLayerIndex = 1 | 2 | 3 | 4;

export interface HarnessContextLayer {
  index: HarnessLayerIndex;
  name: string;
}

export interface HarnessContextHandoffEdge {
  fromAgentId: string;
  toAgentId: string;
  reason: string;
  summary?: string;
  goal?: string;
  timestamp: number;
}

export interface HarnessContextEnvelope {
  source: HarnessContextSource;
  layer: HarnessContextLayer;
  toolsUsed: string[];
  handoffEdge: HarnessContextHandoffEdge | null;
}

interface HarnessOrganizationContext {
  _id: string;
  slug?: string;
  parentOrganizationId?: string;
}

interface HarnessTeamSessionContext {
  handoffHistory?: Array<{
    fromAgentId: string;
    toAgentId: string;
    reason?: string;
    summary?: string;
    goal?: string;
    contextSummary?: string;
    timestamp?: number;
  }>;
}

interface BuildHarnessContextEnvelopeArgs {
  source: HarnessContextSource;
  organization?: HarnessOrganizationContext | null;
  agentSubtype?: string | null;
  toolsUsed?: string[] | null;
  teamSession?: HarnessTeamSessionContext | null;
}

export function buildHarnessContextEnvelope(
  args: BuildHarnessContextEnvelopeArgs,
): HarnessContextEnvelope {
  const layerIndex = resolveLayerIndex(args.organization, args.agentSubtype);
  const layerName = LAYER_NAMES[layerIndex] || "Agency";

  return {
    source: args.source,
    layer: {
      index: layerIndex,
      name: layerName,
    },
    toolsUsed: normalizeToolsUsed(args.toolsUsed),
    handoffEdge: resolveLatestHandoffEdge(args.teamSession),
  };
}

export function normalizeHarnessContextEnvelope(
  value: unknown,
): HarnessContextEnvelope | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const source = record.source;
  if (source !== "approval" && source !== "escalation") {
    return null;
  }

  const layer = normalizeLayer(record.layer);
  if (!layer) {
    return null;
  }

  return {
    source,
    layer,
    toolsUsed: normalizeToolsUsed(record.toolsUsed),
    handoffEdge: normalizeHandoffEdge(record.handoffEdge),
  };
}

function resolveLayerIndex(
  organization?: HarnessOrganizationContext | null,
  agentSubtype?: string | null,
): HarnessLayerIndex {
  if (!organization) {
    return 2;
  }

  return determineAgentLayer(
    {
      _id: organization._id,
      parentOrganizationId: organization.parentOrganizationId,
    },
    agentSubtype || undefined,
    organization.slug === "system",
  );
}

function normalizeLayer(value: unknown): HarnessContextLayer | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const indexValue = record.index;
  if (typeof indexValue !== "number" || !Number.isInteger(indexValue)) {
    return null;
  }
  if (indexValue < 1 || indexValue > 4) {
    return null;
  }

  const index = indexValue as HarnessLayerIndex;
  const fallbackName = LAYER_NAMES[index] || "Agency";
  const rawName = typeof record.name === "string" ? record.name.trim() : "";

  return {
    index,
    name: rawName.length > 0 ? rawName : fallbackName,
  };
}

function normalizeToolsUsed(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const toolName of value) {
    if (typeof toolName !== "string") {
      continue;
    }
    const trimmed = toolName.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

function resolveLatestHandoffEdge(
  teamSession?: HarnessTeamSessionContext | null,
): HarnessContextHandoffEdge | null {
  const history = teamSession?.handoffHistory;
  if (!Array.isArray(history) || history.length === 0) {
    return null;
  }

  const latest = [...history].sort((a, b) => {
    const aTime = typeof a.timestamp === "number" ? a.timestamp : 0;
    const bTime = typeof b.timestamp === "number" ? b.timestamp : 0;
    return bTime - aTime;
  })[0];

  return normalizeHandoffEdge(latest);
}

function normalizeHandoffEdge(value: unknown): HarnessContextHandoffEdge | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const fromAgentId = normalizeNonEmptyString(record.fromAgentId);
  const toAgentId = normalizeNonEmptyString(record.toAgentId);
  const reason = normalizeNonEmptyString(record.reason);
  const summary = normalizeOptionalString(record.summary)
    || normalizeOptionalString(record.contextSummary);
  const goal = normalizeOptionalString(record.goal);
  const timestamp = typeof record.timestamp === "number" && Number.isFinite(record.timestamp)
    ? record.timestamp
    : null;

  if (!fromAgentId || !toAgentId || !reason || timestamp === null) {
    return null;
  }

  return {
    fromAgentId,
    toAgentId,
    reason,
    ...(summary ? { summary } : {}),
    ...(goal ? { goal } : {}),
    timestamp,
  };
}

function normalizeNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalString(value: unknown): string | undefined {
  const normalized = normalizeNonEmptyString(value);
  return normalized || undefined;
}

