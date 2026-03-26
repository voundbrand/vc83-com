import { type ParsedArgs, getOptionBoolean } from "../../core/args";
import { colorGray, colorGreen, colorOrange } from "../../core/colors";
import { resolveTargetContext } from "../../safety/target-guard";

export async function handleDoctorTarget(parsed: ParsedArgs): Promise<number> {
  const context = await resolveTargetContext(parsed, {
    requireOrgApp: false,
    mutatingCommand: false
  });

  const issues: string[] = [];
  if (!context.orgId) {
    issues.push("org-id is not resolved");
  }
  if (!context.appId) {
    issues.push("app-id is not resolved");
  }

  if (getOptionBoolean(parsed, "json")) {
    console.log(
      JSON.stringify(
        {
          profile: context.profileName,
          backendUrl: context.backendUrl,
          orgId: context.orgId ?? null,
          appId: context.appId ?? null,
          requiresConfirmation: context.profile.requiresConfirmation,
          status: issues.length === 0 ? "ok" : "incomplete",
          issues
        },
        null,
        2
      )
    );
    return issues.length === 0 ? 0 : 1;
  }

  console.log(colorOrange("Target resolution"));
  console.log(colorGray(`  profile: ${context.profileName}`));
  console.log(colorGray(`  backendUrl: ${context.backendUrl}`));
  console.log(colorGray(`  orgId: ${context.orgId ?? "<unset>"}`));
  console.log(colorGray(`  appId: ${context.appId ?? "<unset>"}`));
  console.log(colorGray(`  requires confirmation: ${context.profile.requiresConfirmation ? "yes" : "no"}`));

  if (issues.length === 0) {
    console.log(colorGreen("Target context is complete."));
    return 0;
  }

  for (const issue of issues) {
    console.log(colorGray(`  issue: ${issue}`));
  }
  return 1;
}
