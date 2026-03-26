import {
  DAVID_OGILVY_AGENT_RUNTIME_MODULE_KEY,
  DAVID_OGILVY_TEMPLATE_ROLE,
} from "./runtimeModule";

function normalizeToken(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function isDavidOgilvyRuntime(
  config: Record<string, unknown> | null | undefined,
): boolean {
  if (!config || typeof config !== "object") {
    return false;
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

  return (
    runtimeModuleKey === DAVID_OGILVY_AGENT_RUNTIME_MODULE_KEY
    || templateRole === DAVID_OGILVY_TEMPLATE_ROLE
  );
}
