export type LegacyPublicCutoverMode =
  | "compatibility"
  | "cutover_hide_legacy"
  | "rollback_show_legacy_public";

const DEFAULT_LEGACY_PUBLIC_CUTOVER_MODE: LegacyPublicCutoverMode = "compatibility";

function normalizeLegacyPublicCutoverMode(value: string | undefined): LegacyPublicCutoverMode {
  if (value === "cutover_hide_legacy") return "cutover_hide_legacy";
  if (value === "rollback_show_legacy_public") return "rollback_show_legacy_public";
  return DEFAULT_LEGACY_PUBLIC_CUTOVER_MODE;
}

export function resolveLegacyPublicCutoverMode(): LegacyPublicCutoverMode {
  return normalizeLegacyPublicCutoverMode(process.env.NEXT_PUBLIC_CPMU_LEGACY_PUBLIC_CUTOVER_MODE);
}

export function shouldShowLegacyCards(args: {
  mode: LegacyPublicCutoverMode;
  hasLegacyPlanAccess: boolean;
  legacyPricingManualRevealEnabled: boolean;
}): boolean {
  if (args.mode === "rollback_show_legacy_public") return true;
  if (args.mode === "cutover_hide_legacy") return args.legacyPricingManualRevealEnabled;
  return args.hasLegacyPlanAccess || args.legacyPricingManualRevealEnabled;
}
