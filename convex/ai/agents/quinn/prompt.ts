import type {
  QuinnRuntimeContract,
} from "./runtimeModule";

export function buildQuinnRuntimeContext(
  contract: QuinnRuntimeContract | null | undefined,
): string | null {
  if (!contract) {
    return null;
  }
  return [
    "--- QUINN RUNTIME CONTRACT ---",
    JSON.stringify(contract),
    "--- END QUINN RUNTIME CONTRACT ---",
  ].join("\n");
}
