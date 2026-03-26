import type {
  DerTerminmacherRuntimeContract,
} from "./runtimeModule";

export function buildDerTerminmacherRuntimeContext(
  contract: DerTerminmacherRuntimeContract | null | undefined
): string | null {
  if (!contract) {
    return null;
  }
  return [
    "--- DER TERMINMACHER RUNTIME CONTRACT ---",
    JSON.stringify(contract),
    "--- END DER TERMINMACHER RUNTIME CONTRACT ---",
  ].join("\n");
}
