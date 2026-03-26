import type { AgentModule, ResolvedAgentModule } from "./types";
import {
  DAVID_OGILVY_AGENT_RUNTIME_MODULE_KEY,
  resolveDavidOgilvyRuntimeContract,
  type DavidOgilvyRuntimeContract,
} from "./david_ogilvy/runtimeModule";
import { buildDavidOgilvyRuntimeContext } from "./david_ogilvy/prompt";
import {
  DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
  resolveDerTerminmacherRuntimeContract,
  type DerTerminmacherRuntimeContract,
} from "./der_terminmacher/runtimeModule";
import { buildDerTerminmacherRuntimeContext } from "./der_terminmacher/prompt";
import {
  SAMANTHA_AGENT_RUNTIME_MODULE_KEY,
} from "../agentSpecRegistry";
import {
  AGENT_RUNTIME_TOPOLOGY_ADAPTER_VALUES,
  isAgentRuntimeTopologyProfile,
  resolveAgentRuntimeTopologyAdapter,
  type AgentRuntimeTopologyAdapter,
  type AgentRuntimeTopologyProfile,
} from "../../schemas/aiSchemas";
import {
  resolveSamanthaRuntimeContract,
  type SamanthaRuntimeContract,
} from "./samantha/runtimeModule";
import { buildSamanthaRuntimeContext } from "./samantha/prompt";

export type KnownRuntimeModuleContract =
  | DerTerminmacherRuntimeContract
  | DavidOgilvyRuntimeContract
  | SamanthaRuntimeContract;

type KnownRuntimeModule = AgentModule<KnownRuntimeModuleContract>;

const KNOWN_MODULES: KnownRuntimeModule[] = [
  {
    key: DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
    resolveContract: (config) => resolveDerTerminmacherRuntimeContract(config),
    buildPromptContext: (contract) =>
      contract.moduleKey === DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY
        ? buildDerTerminmacherRuntimeContext(contract)
        : null,
  },
  {
    key: SAMANTHA_AGENT_RUNTIME_MODULE_KEY,
    resolveContract: (config) => resolveSamanthaRuntimeContract(config),
    buildPromptContext: (contract) =>
      contract.moduleKey === SAMANTHA_AGENT_RUNTIME_MODULE_KEY
        ? buildSamanthaRuntimeContext(contract)
        : null,
  },
  {
    key: DAVID_OGILVY_AGENT_RUNTIME_MODULE_KEY,
    resolveContract: (config) => resolveDavidOgilvyRuntimeContract(config),
    buildPromptContext: (contract) =>
      contract.moduleKey === DAVID_OGILVY_AGENT_RUNTIME_MODULE_KEY
        ? buildDavidOgilvyRuntimeContext(contract)
        : null,
  },
];

const EXPECTED_RUNTIME_TOPOLOGY_PROFILE_BY_MODULE_KEY: Record<
  string,
  AgentRuntimeTopologyProfile
> = {
  [DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY]: "pipeline_router",
  [SAMANTHA_AGENT_RUNTIME_MODULE_KEY]: "evaluator_loop",
  [DAVID_OGILVY_AGENT_RUNTIME_MODULE_KEY]: "single_agent_loop",
};
const KNOWN_RUNTIME_TOPOLOGY_ADAPTERS = new Set<string>(
  AGENT_RUNTIME_TOPOLOGY_ADAPTER_VALUES as readonly string[],
);

function resolveModuleAttemptOrder(preferredModuleKey?: string | null): KnownRuntimeModule[] {
  if (!preferredModuleKey) {
    return KNOWN_MODULES;
  }
  const preferred = KNOWN_MODULES.find((module) => module.key === preferredModuleKey);
  if (!preferred) {
    return KNOWN_MODULES;
  }
  return [preferred, ...KNOWN_MODULES.filter((module) => module.key !== preferredModuleKey)];
}

function withForcedModuleKey(
  config: Record<string, unknown> | null | undefined,
  forcedModuleKey?: string | null,
): Record<string, unknown> | null | undefined {
  if (!config || !forcedModuleKey) {
    return config;
  }
  return {
    ...config,
    runtimeModuleKey: forcedModuleKey,
  };
}

export function resolveAgentModuleFromConfig(args: {
  config: Record<string, unknown> | null | undefined;
  preferredModuleKey?: string | null;
}): ResolvedAgentModule<KnownRuntimeModuleContract> | null {
  const candidateConfig = withForcedModuleKey(args.config, args.preferredModuleKey);
  for (const module of resolveModuleAttemptOrder(args.preferredModuleKey)) {
    const contract = module.resolveContract(candidateConfig);
    if (!contract) {
      continue;
    }
    return {
      module,
      contract,
    };
  }
  return null;
}

export interface KnownRuntimeModuleResolution {
  moduleKey: string;
  contract: KnownRuntimeModuleContract;
}

export function resolveKnownRuntimeModuleContractFromConfig(
  config: Record<string, unknown> | null | undefined
): KnownRuntimeModuleResolution | null {
  const resolved = resolveAgentModuleFromConfig({ config });
  if (!resolved) {
    return null;
  }
  return {
    moduleKey: resolved.module.key,
    contract: resolved.contract,
  };
}

export const OAR_EXISTING_AGENT_TOPOLOGY_MIGRATION_EVIDENCE_VERSION =
  "oar_existing_agent_topology_migration_v1" as const;

export type ExistingAgentTopologyMigrationStatus = "compatible" | "blocked";
export type ExistingAgentTopologyMigrationReasonCode =
  | "compatible"
  | "missing_topology_profile"
  | "missing_topology_adapter"
  | "invalid_topology_profile"
  | "invalid_topology_adapter"
  | "runtime_module_profile_mismatch"
  | "profile_adapter_mismatch";

export interface ExistingAgentTopologyMigrationCandidate {
  agentKey: string;
  displayName?: string;
  runtimeModuleKey?: string | null;
  declaredProfile?: string | null;
  declaredAdapter?: string | null;
}

export interface ExistingAgentTopologyMigrationEntry {
  agentKey: string;
  displayName?: string;
  runtimeModuleKey: string | null;
  declaredProfile: AgentRuntimeTopologyProfile | null;
  declaredAdapter: AgentRuntimeTopologyAdapter | null;
  expectedProfile: AgentRuntimeTopologyProfile | null;
  expectedAdapter: AgentRuntimeTopologyAdapter | null;
  status: ExistingAgentTopologyMigrationStatus;
  reasonCode: ExistingAgentTopologyMigrationReasonCode;
  remediation: string | null;
}

export interface ExistingAgentTopologyMigrationEvidence {
  contractVersion: typeof OAR_EXISTING_AGENT_TOPOLOGY_MIGRATION_EVIDENCE_VERSION;
  generatedAt: number;
  totals: {
    totalAgents: number;
    migratedAgents: number;
    blockedAgents: number;
  };
  entries: ExistingAgentTopologyMigrationEntry[];
  blockedQueue: Array<{
    agentKey: string;
    reasonCode: ExistingAgentTopologyMigrationReasonCode;
    remediation: string;
  }>;
}

function normalizeOptionalToken(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeTopologyProfile(
  value: unknown,
): AgentRuntimeTopologyProfile | null {
  const token = normalizeOptionalToken(value);
  if (!token || !isAgentRuntimeTopologyProfile(token)) {
    return null;
  }
  return token;
}

function normalizeTopologyAdapter(
  value: unknown,
): AgentRuntimeTopologyAdapter | null {
  const token = normalizeOptionalToken(value);
  if (!token || !KNOWN_RUNTIME_TOPOLOGY_ADAPTERS.has(token)) {
    return null;
  }
  return token as AgentRuntimeTopologyAdapter;
}

function resolveMigrationRemediation(
  reasonCode: ExistingAgentTopologyMigrationReasonCode,
): string | null {
  if (reasonCode === "missing_topology_profile") {
    return "Declare runtimeTopology.profile in agent package contract before rollout.";
  }
  if (reasonCode === "missing_topology_adapter") {
    return "Declare runtimeTopology.adapter using the canonical adapter for the selected profile.";
  }
  if (reasonCode === "invalid_topology_profile") {
    return "Replace unsupported runtimeTopology.profile with a supported OAR profile.";
  }
  if (reasonCode === "invalid_topology_adapter") {
    return "Replace unsupported runtimeTopology.adapter with a known adapter contract token.";
  }
  if (reasonCode === "runtime_module_profile_mismatch") {
    return "Align declared topology profile with runtime module topology contract.";
  }
  if (reasonCode === "profile_adapter_mismatch") {
    return "Update runtimeTopology.adapter to match resolveAgentRuntimeTopologyAdapter(profile).";
  }
  return null;
}

export function buildExistingAgentTopologyMigrationEvidence(args: {
  agents: ExistingAgentTopologyMigrationCandidate[];
  generatedAt?: number;
}): ExistingAgentTopologyMigrationEvidence {
  const entries = [...args.agents]
    .sort((left, right) => left.agentKey.localeCompare(right.agentKey))
    .map<ExistingAgentTopologyMigrationEntry>((candidate) => {
      const runtimeModuleKey = normalizeOptionalToken(candidate.runtimeModuleKey);
      const expectedProfile = runtimeModuleKey
        ? (EXPECTED_RUNTIME_TOPOLOGY_PROFILE_BY_MODULE_KEY[runtimeModuleKey] ?? null)
        : null;
      const expectedAdapter = expectedProfile
        ? resolveAgentRuntimeTopologyAdapter(expectedProfile)
        : null;
      const profileToken = normalizeOptionalToken(candidate.declaredProfile);
      const adapterToken = normalizeOptionalToken(candidate.declaredAdapter);
      const declaredProfile = normalizeTopologyProfile(candidate.declaredProfile);
      const declaredAdapter = normalizeTopologyAdapter(candidate.declaredAdapter);

      let reasonCode: ExistingAgentTopologyMigrationReasonCode = "compatible";
      if (!profileToken) {
        reasonCode = "missing_topology_profile";
      } else if (!declaredProfile) {
        reasonCode = "invalid_topology_profile";
      } else if (!adapterToken) {
        reasonCode = "missing_topology_adapter";
      } else if (!declaredAdapter) {
        reasonCode = "invalid_topology_adapter";
      } else if (expectedProfile && declaredProfile !== expectedProfile) {
        reasonCode = "runtime_module_profile_mismatch";
      } else {
        const expectedDeclaredAdapter = resolveAgentRuntimeTopologyAdapter(declaredProfile);
        if (declaredAdapter !== expectedDeclaredAdapter) {
          reasonCode = "profile_adapter_mismatch";
        }
      }

      const status: ExistingAgentTopologyMigrationStatus =
        reasonCode === "compatible" ? "compatible" : "blocked";
      const remediation = resolveMigrationRemediation(reasonCode);

      return {
        agentKey: candidate.agentKey,
        ...(candidate.displayName ? { displayName: candidate.displayName } : {}),
        runtimeModuleKey,
        declaredProfile,
        declaredAdapter,
        expectedProfile,
        expectedAdapter,
        status,
        reasonCode,
        remediation,
      };
    });

  const blockedQueue = entries
    .filter((entry) => entry.status === "blocked" && entry.remediation)
    .map((entry) => ({
      agentKey: entry.agentKey,
      reasonCode: entry.reasonCode,
      remediation: entry.remediation as string,
    }));

  return {
    contractVersion: OAR_EXISTING_AGENT_TOPOLOGY_MIGRATION_EVIDENCE_VERSION,
    generatedAt: args.generatedAt ?? Date.now(),
    totals: {
      totalAgents: entries.length,
      migratedAgents: entries.filter((entry) => entry.status === "compatible").length,
      blockedAgents: blockedQueue.length,
    },
    entries,
    blockedQueue,
  };
}
