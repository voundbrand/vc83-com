import { type ParsedArgs } from "../../core/args";
import { colorGreen } from "../../core/colors";
import { setActiveProfile } from "../../config/profile-store";

export async function handleEnvUse(parsed: ParsedArgs): Promise<number> {
  const profileName = parsed.positionals[2];
  if (!profileName) {
    throw new Error("Usage: sevenlayers env use <profile-name>");
  }

  const store = await setActiveProfile(profileName);
  console.log(colorGreen(`Active profile set to '${store.activeProfile}'.`));
  return 0;
}
