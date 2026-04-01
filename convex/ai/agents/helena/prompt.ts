import type {
  HelenaRuntimeContract,
} from "./runtimeModule";

export function buildHelenaRuntimeContext(
  contract: HelenaRuntimeContract | null | undefined,
): string | null {
  if (!contract) {
    return null;
  }
  return [
    "--- HELENA RUNTIME CONTRACT ---",
    JSON.stringify(contract),
    "--- END HELENA RUNTIME CONTRACT ---",
  ].join("\n");
}
