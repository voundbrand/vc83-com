import type { DavidOgilvyRuntimeContract } from "./runtimeModule";

export function buildDavidOgilvyRuntimeContext(
  contract: DavidOgilvyRuntimeContract | null | undefined
): string | null {
  if (!contract) {
    return null;
  }
  return [
    "--- DAVID OGILVY RUNTIME CONTRACT ---",
    JSON.stringify(contract),
    "--- END DAVID OGILVY RUNTIME CONTRACT ---",
  ].join("\n");
}
