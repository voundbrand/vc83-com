import { type ParsedArgs, getOptionBoolean, getOptionString } from "../core/args";
import { type CliProfile, loadProfileStore } from "../config/profile-store";

export interface TargetContext {
  profile: CliProfile;
  profileName: string;
  backendUrl: string;
  orgId?: string;
  appId?: string;
}

export interface ResolveTargetContextOptions {
  requireOrgApp: boolean;
  mutatingCommand: boolean;
  profileStorePath?: string;
}

function assertNoMismatch(
  field: string,
  profileValue: string | undefined,
  flagValue: string | undefined,
  allowOverride: boolean
): void {
  if (!profileValue || !flagValue || allowOverride) {
    return;
  }

  if (profileValue !== flagValue) {
    throw new Error(
      `${field} mismatch between active profile (${profileValue}) and command flag (${flagValue}). ` +
        "Use --allow-profile-override to proceed intentionally."
    );
  }
}

export async function resolveTargetContext(
  parsed: ParsedArgs,
  options: ResolveTargetContextOptions
): Promise<TargetContext> {
  const store = await loadProfileStore({ filePath: options.profileStorePath });
  const allowProfileOverride = getOptionBoolean(parsed, "allow-profile-override");

  const profileName =
    getOptionString(parsed, "env") ?? getOptionString(parsed, "profile") ?? store.activeProfile;

  const profile = store.profiles[profileName];
  if (!profile) {
    throw new Error(`Profile '${profileName}' not found. Run 'sevenlayers env list' to inspect profiles.`);
  }

  const orgFlag = getOptionString(parsed, "org-id");
  const appFlag = getOptionString(parsed, "app-id");
  const backendFlag = getOptionString(parsed, "backend-url");

  assertNoMismatch("org-id", profile.defaultOrgId, orgFlag, allowProfileOverride);
  assertNoMismatch("app-id", profile.defaultAppId, appFlag, allowProfileOverride);
  assertNoMismatch("backend-url", profile.backendUrl, backendFlag, allowProfileOverride);

  const orgId = orgFlag ?? profile.defaultOrgId;
  const appId = appFlag ?? profile.defaultAppId;
  const backendUrl = backendFlag ?? profile.backendUrl;

  if (!backendUrl || backendUrl.trim().length === 0) {
    throw new Error(
      `Profile '${profileName}' has no backend URL configured. Set one using ` +
        "'sevenlayers env set <profile> --backend-url <url>'."
    );
  }

  if (options.requireOrgApp && (!orgId || !appId)) {
    throw new Error(
      "Missing required target tuple. Provide --org-id and --app-id, or set defaults on the active profile."
    );
  }

  if (options.mutatingCommand && profile.requiresConfirmation) {
    const confirmed = getOptionBoolean(parsed, "yes");
    const confirmToken = getOptionString(parsed, "confirm-prod");
    if (!confirmed || confirmToken !== "PROD") {
      throw new Error(
        "This target requires confirmation. Re-run with --yes --confirm-prod PROD to execute mutating operations."
      );
    }
  }

  return {
    profile,
    profileName,
    backendUrl,
    orgId,
    appId
  };
}
