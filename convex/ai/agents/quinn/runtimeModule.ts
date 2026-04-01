export const QUINN_AGENT_RUNTIME_MODULE_KEY =
  "platform_quinn_runtime_module_v1" as const;
export const QUINN_RUNTIME_CONTRACT_VERSION =
  "aoh_quinn_runtime_contract_v1" as const;

export interface QuinnRuntimeContract {
  contractVersion: typeof QUINN_RUNTIME_CONTRACT_VERSION;
  moduleKey: typeof QUINN_AGENT_RUNTIME_MODULE_KEY;
  roleBoundary: {
    onboardingOnly: true;
    legalFrontOfficeRoutingAllowed: false;
  };
  handoffPolicy: {
    allowedHandoffs: Array<"customer_default_operator" | "human_support">;
  };
}

function normalizeToken(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function resolveQuinnRuntimeContract(
  config: Record<string, unknown> | null | undefined,
): QuinnRuntimeContract | null {
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
  if (runtimeModuleKey !== QUINN_AGENT_RUNTIME_MODULE_KEY) {
    return null;
  }

  return {
    contractVersion: QUINN_RUNTIME_CONTRACT_VERSION,
    moduleKey: QUINN_AGENT_RUNTIME_MODULE_KEY,
    roleBoundary: {
      onboardingOnly: true,
      legalFrontOfficeRoutingAllowed: false,
    },
    handoffPolicy: {
      allowedHandoffs: [
        "customer_default_operator",
        "human_support",
      ],
    },
  };
}
