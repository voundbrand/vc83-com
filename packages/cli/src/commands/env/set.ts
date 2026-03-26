import { type ParsedArgs, getOptionBoolean, getOptionString } from "../../core/args";
import { colorGreen } from "../../core/colors";
import { upsertProfile } from "../../config/profile-store";

export async function handleEnvSet(parsed: ParsedArgs): Promise<number> {
  const profileName = parsed.positionals[2];
  if (!profileName) {
    throw new Error("Usage: sevenlayers env set <profile-name> --backend-url <url> [options]");
  }

  const backendUrl = getOptionString(parsed, "backend-url") ?? "";
  const appUrl = getOptionString(parsed, "app-url") ?? "";
  const defaultOrgId = getOptionString(parsed, "org-id");
  const defaultAppId = getOptionString(parsed, "app-id");

  await upsertProfile({
    name: profileName,
    backendUrl,
    appUrl,
    defaultOrgId,
    defaultAppId,
    requiresConfirmation:
      getOptionBoolean(parsed, "requires-confirmation") || profileName === "prod"
  });

  console.log(colorGreen(`Profile '${profileName}' saved.`));
  return 0;
}
