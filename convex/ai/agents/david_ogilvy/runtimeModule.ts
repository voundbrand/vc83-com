export const DAVID_OGILVY_AGENT_RUNTIME_MODULE_KEY =
  "david_ogilvy_runtime_module_v1" as const;
export const DAVID_OGILVY_PROMPT_CONTRACT_VERSION =
  "aoh_david_ogilvy_prompt_contract_v1" as const;
export const DAVID_OGILVY_TEMPLATE_ROLE =
  "david_ogilvy_copywriter_template" as const;

export interface DavidOgilvyRuntimeContract {
  contractVersion: typeof DAVID_OGILVY_PROMPT_CONTRACT_VERSION;
  moduleKey: typeof DAVID_OGILVY_AGENT_RUNTIME_MODULE_KEY;
  stylePolicy: {
    mode: "research_first";
    evidenceRequired: true;
    directResponse: true;
    impersonationAllowed: false;
  };
  outputPolicy: {
    requireHeadline: true;
    requireReasonWhy: true;
    requireProof: true;
    requireCta: true;
  };
}

function normalizeToken(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function resolveDavidOgilvyRuntimeContract(
  config: Record<string, unknown> | null | undefined
): DavidOgilvyRuntimeContract | null {
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
  const templateRole = normalizeToken(config.templateRole);
  const displayName =
    normalizeToken(config.displayName) || normalizeToken(config.name);

  const shouldEnable =
    runtimeModuleKey === DAVID_OGILVY_AGENT_RUNTIME_MODULE_KEY
    || templateRole === DAVID_OGILVY_TEMPLATE_ROLE
    || Boolean(displayName?.includes("ogilvy"));

  if (!shouldEnable) {
    return null;
  }

  return {
    contractVersion: DAVID_OGILVY_PROMPT_CONTRACT_VERSION,
    moduleKey: DAVID_OGILVY_AGENT_RUNTIME_MODULE_KEY,
    stylePolicy: {
      mode: "research_first",
      evidenceRequired: true,
      directResponse: true,
      impersonationAllowed: false,
    },
    outputPolicy: {
      requireHeadline: true,
      requireReasonWhy: true,
      requireProof: true,
      requireCta: true,
    },
  };
}
