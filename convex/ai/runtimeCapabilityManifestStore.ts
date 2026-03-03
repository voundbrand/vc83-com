import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import {
  RUNTIME_CAPABILITY_MANIFEST_CONTRACT_VERSION,
  type RuntimeCapabilityManifestV1,
  type RuntimePolicyDecisionSourceLayer,
} from "./policyCompiler";

export const RUNTIME_CAPABILITY_MANIFEST_ARTIFACT_CONTRACT_VERSION =
  "runtime_capability_manifest_artifact_v1" as const;
export const RUNTIME_CAPABILITY_MANIFEST_ARTIFACT_ACTION_TYPE =
  "runtime_capability_manifest_artifact" as const;

export interface RuntimeCapabilityManifestArtifactV1 {
  contractVersion: typeof RUNTIME_CAPABILITY_MANIFEST_ARTIFACT_CONTRACT_VERSION;
  manifestKey: string;
  manifestHash: string;
  sourceLayerCatalog: RuntimePolicyDecisionSourceLayer[];
  denyCatalog: string[];
  manifest: RuntimeCapabilityManifestV1;
}

const BASE_DENY_CATALOG = [
  "context_invalid",
  "channel_not_allowed",
  "tool_unavailable",
  "precondition_missing",
  "replay_duplicate",
] as const;

function normalizeNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeSortedUniqueStrings(values: unknown[]): string[] {
  return Array.from(
    new Set(
      values
        .map((entry) => normalizeNonEmptyString(entry))
        .filter((entry): entry is string => Boolean(entry)),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function isKnownSourceLayer(value: unknown): value is RuntimePolicyDecisionSourceLayer {
  return (
    value === "platform"
    || value === "org"
    || value === "agent"
    || value === "session"
    || value === "channel"
  );
}

export function buildRuntimeCapabilityManifestStorageKey(manifestHash: string): string {
  return `${RUNTIME_CAPABILITY_MANIFEST_CONTRACT_VERSION}/${manifestHash}`;
}

export function normalizeRuntimeCapabilityManifestArtifact(
  value: unknown,
): RuntimeCapabilityManifestArtifactV1 | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const contractVersion = normalizeNonEmptyString(record.contractVersion);
  const manifestHash = normalizeNonEmptyString(record.manifestHash);
  const manifest = record.manifest;
  if (
    contractVersion !== RUNTIME_CAPABILITY_MANIFEST_ARTIFACT_CONTRACT_VERSION
    || !manifestHash
    || !manifest
    || typeof manifest !== "object"
  ) {
    return null;
  }

  const manifestRecord = manifest as Record<string, unknown>;
  if (
    manifestRecord.contractVersion !== RUNTIME_CAPABILITY_MANIFEST_CONTRACT_VERSION
    || manifestRecord.manifestHash !== manifestHash
  ) {
    return null;
  }

  const normalizedManifest = normalizeManifestForArtifact(
    manifestRecord as unknown as RuntimeCapabilityManifestV1,
  );
  const sourceLayerCatalog = Array.from(
    new Set(
      Object.values(normalizedManifest.toolDecisions)
        .map((decision) => decision.sourceLayer)
        .filter(isKnownSourceLayer),
    ),
  ).sort((left, right) => left.localeCompare(right));

  return {
    contractVersion: RUNTIME_CAPABILITY_MANIFEST_ARTIFACT_CONTRACT_VERSION,
    manifestKey: buildRuntimeCapabilityManifestStorageKey(manifestHash),
    manifestHash,
    sourceLayerCatalog,
    denyCatalog: normalizedManifest.denyCatalog,
    manifest: normalizedManifest,
  };
}

export function buildRuntimeCapabilityManifestArtifact(
  manifest: RuntimeCapabilityManifestV1,
): RuntimeCapabilityManifestArtifactV1 {
  const normalized = normalizeRuntimeCapabilityManifestArtifact({
    contractVersion: RUNTIME_CAPABILITY_MANIFEST_ARTIFACT_CONTRACT_VERSION,
    manifestHash: manifest.manifestHash,
    manifest: normalizeManifestForArtifact(manifest),
  });
  if (!normalized) {
    throw new Error("Invalid runtime capability manifest artifact payload");
  }
  return normalized;
}

function normalizeManifestForArtifact(
  manifest: RuntimeCapabilityManifestV1,
): RuntimeCapabilityManifestV1 {
  const toolDecisions = Object.keys(manifest.toolDecisions)
    .sort((left, right) => left.localeCompare(right))
    .reduce<RuntimeCapabilityManifestV1["toolDecisions"]>((accumulator, key) => {
      const decision = manifest.toolDecisions[key];
      accumulator[key] = {
        allowed: decision.allowed,
        sourceLayer: decision.sourceLayer,
        denials: normalizeSortedUniqueStrings(decision.denials),
      };
      return accumulator;
    }, {});

  const channelDecisions = Object.keys(manifest.channelDecisions)
    .sort((left, right) => left.localeCompare(right))
    .reduce<RuntimeCapabilityManifestV1["channelDecisions"]>((accumulator, key) => {
      accumulator[key] = manifest.channelDecisions[key];
      return accumulator;
    }, {});

  const outcomeContracts = Object.keys(manifest.outcomeContracts)
    .sort((left, right) => left.localeCompare(right))
    .reduce<RuntimeCapabilityManifestV1["outcomeContracts"]>((accumulator, key) => {
      const contract = manifest.outcomeContracts[key];
      accumulator[key] = {
        enforcementMode: contract.enforcementMode,
        requiredFields: normalizeSortedUniqueStrings(contract.requiredFields),
        requiredTools: normalizeSortedUniqueStrings(contract.requiredTools),
      };
      return accumulator;
    }, {});

  const decisionDenials = Object.values(toolDecisions).flatMap((decision) => decision.denials);
  const denyCatalog = normalizeSortedUniqueStrings([
    ...BASE_DENY_CATALOG,
    ...manifest.denyCatalog,
    ...decisionDenials,
  ]);

  return {
    ...manifest,
    channelDecisions,
    toolDecisions,
    outcomeContracts,
    denyCatalog,
  };
}

export const internalPersistRuntimeCapabilityManifestArtifact = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("objects"),
    manifest: v.any(),
    persistedAtMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const artifact = buildRuntimeCapabilityManifestArtifact(
      args.manifest as RuntimeCapabilityManifestV1,
    );

    const existing = await ctx.db
      .query("objectActions")
      .withIndex("by_org_action_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("actionType", RUNTIME_CAPABILITY_MANIFEST_ARTIFACT_ACTION_TYPE),
      )
      .collect();

    const duplicate = existing.find((action) => {
      if (action.objectId !== args.agentId) {
        return false;
      }
      const normalized = normalizeRuntimeCapabilityManifestArtifact(action.actionData);
      return normalized?.manifestHash === artifact.manifestHash;
    });

    if (duplicate) {
      return {
        stored: false,
        actionId: duplicate._id,
        manifestHash: artifact.manifestHash,
        manifestKey: artifact.manifestKey,
      };
    }

    const actionId = await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.agentId,
      actionType: RUNTIME_CAPABILITY_MANIFEST_ARTIFACT_ACTION_TYPE,
      actionData: artifact,
      performedAt: args.persistedAtMs ?? Date.now(),
    });

    return {
      stored: true,
      actionId,
      manifestHash: artifact.manifestHash,
      manifestKey: artifact.manifestKey,
    };
  },
});

export const internalGetRuntimeCapabilityManifestArtifact = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    manifestHash: v.string(),
    agentId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    const actions = await ctx.db
      .query("objectActions")
      .withIndex("by_org_action_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("actionType", RUNTIME_CAPABILITY_MANIFEST_ARTIFACT_ACTION_TYPE),
      )
      .order("desc")
      .collect();

    for (const action of actions) {
      if (args.agentId && action.objectId !== args.agentId) {
        continue;
      }
      const artifact = normalizeRuntimeCapabilityManifestArtifact(action.actionData);
      if (artifact?.manifestHash === args.manifestHash) {
        return {
          actionId: action._id,
          agentId: action.objectId,
          performedAt: action.performedAt,
          artifact,
        };
      }
    }

    return null;
  },
});
