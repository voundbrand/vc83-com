import {
  HELENA_AGENT_RUNTIME_MODULE_KEY,
} from "../../agentSpecRegistry";
import {
  resolveAgentRuntimeTopologyAdapter,
} from "../../../schemas/aiSchemas";

const HELENA_RUNTIME_TOPOLOGY_PROFILE = "pipeline_router" as const;

export const HELENA_RUNTIME_CONTRACT_VERSION =
  "aoh_helena_runtime_contract_v1" as const;

export interface HelenaRuntimeContract {
  contractVersion: typeof HELENA_RUNTIME_CONTRACT_VERSION;
  moduleKey: typeof HELENA_AGENT_RUNTIME_MODULE_KEY;
  runtimeTopology: {
    profile: typeof HELENA_RUNTIME_TOPOLOGY_PROFILE;
    adapter: ReturnType<typeof resolveAgentRuntimeTopologyAdapter>;
  };
  roleBoundary: {
    voiceCallerFacing: false;
    requiresStructuredHandoff: true;
  };
  toolManifest: {
    requiredTools: string[];
    optionalTools: string[];
    deniedTools: string[];
  };
}

function normalizeToken(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function resolveHelenaRuntimeContract(
  config: Record<string, unknown> | null | undefined,
): HelenaRuntimeContract | null {
  if (!config || typeof config !== "object") {
    return null;
  }

  const runtimeModule =
    config.runtimeModule
    && typeof config.runtimeModule === "object"
    && !Array.isArray(config.runtimeModule)
      ? (config.runtimeModule as Record<string, unknown>)
      : null;

  const runtimeModuleKey =
    normalizeToken(config.runtimeModuleKey)
    || normalizeToken(runtimeModule?.key);
  if (runtimeModuleKey !== HELENA_AGENT_RUNTIME_MODULE_KEY) {
    return null;
  }

  return {
    contractVersion: HELENA_RUNTIME_CONTRACT_VERSION,
    moduleKey: HELENA_AGENT_RUNTIME_MODULE_KEY,
    runtimeTopology: {
      profile: HELENA_RUNTIME_TOPOLOGY_PROFILE,
      adapter: resolveAgentRuntimeTopologyAdapter(
        HELENA_RUNTIME_TOPOLOGY_PROFILE,
      ),
    },
    roleBoundary: {
      voiceCallerFacing: false,
      requiresStructuredHandoff: true,
    },
    toolManifest: {
      requiredTools: ["create_contact", "search_contacts", "update_contact"],
      optionalTools: ["escalate_to_human", "manage_bookings"],
      deniedTools: [],
    },
  };
}
