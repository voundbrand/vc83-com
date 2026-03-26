import { type ParsedArgs, getOptionBoolean } from "../../core/args";
import { colorGray, colorOrange } from "../../core/colors";
import { loadProfileStore } from "../../config/profile-store";

export async function handleEnvList(parsed: ParsedArgs): Promise<number> {
  const store = await loadProfileStore();

  if (getOptionBoolean(parsed, "json")) {
    console.log(JSON.stringify(store, null, 2));
    return 0;
  }

  console.log(colorOrange("Configured profiles:"));
  for (const profile of Object.values(store.profiles)) {
    const active = profile.name === store.activeProfile ? "*" : " ";
    const backend = profile.backendUrl || "<unset>";
    const org = profile.defaultOrgId || "<unset>";
    const app = profile.defaultAppId || "<unset>";
    const confirm = profile.requiresConfirmation ? "yes" : "no";

    console.log(`${active} ${profile.name}`);
    console.log(colorGray(`    backend: ${backend}`));
    console.log(colorGray(`    default org: ${org}`));
    console.log(colorGray(`    default app: ${app}`));
    console.log(colorGray(`    requires confirmation: ${confirm}`));
  }

  return 0;
}
