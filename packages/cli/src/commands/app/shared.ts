import path from "node:path";
import { type ParsedArgs, getOptionBoolean, getOptionString } from "../../core/args";
import { formatEnvChanges } from "../../config/env-diff";
import {
  type EnvWriteMode,
  type ManagedEnvUpdate,
  writeEnvFile
} from "../../config/env-writer";
import { colorGray, colorGreen, colorOrange, colorRed } from "../../core/colors";
import { type TargetContext, resolveTargetContext } from "../../safety/target-guard";

interface RunAppEnvUpdateCommandParams {
  parsed: ParsedArgs;
  commandName: string;
  legacySource?: string;
}

function resolveManagedUpdates(parsed: ParsedArgs, target: TargetContext): ManagedEnvUpdate[] {
  const apiKey = getOptionString(parsed, "api-key") ?? process.env.L4YERCAK3_API_KEY;
  const backendUrl = target.backendUrl;
  const organizationId = target.orgId;
  const appId = target.appId;

  const updates: ManagedEnvUpdate[] = [];

  if (apiKey) {
    updates.push({ key: "L4YERCAK3_API_KEY", value: apiKey });
  }

  if (backendUrl) {
    updates.push({ key: "L4YERCAK3_BACKEND_URL", value: backendUrl });
    updates.push({ key: "NEXT_PUBLIC_L4YERCAK3_BACKEND_URL", value: backendUrl });
  }

  if (organizationId) {
    updates.push({ key: "L4YERCAK3_ORG_ID", value: organizationId });
    updates.push({ key: "L4YERCAK3_ORGANIZATION_ID", value: organizationId });
  }

  if (appId) {
    updates.push({ key: "L4YERCAK3_APP_ID", value: appId });
  }

  return updates;
}

function resolveWriteMode(parsed: ParsedArgs): EnvWriteMode {
  if (getOptionBoolean(parsed, "full-rewrite")) {
    return "full-rewrite";
  }

  if (getOptionBoolean(parsed, "replace-existing")) {
    return "replace-key";
  }

  return "upsert";
}

function printCommandUsage(commandName: string): void {
  console.log(colorOrange(`Usage: sevenlayers ${commandName} [options]`));
  console.log("");
  console.log("Options:");
  console.log("  --env <profile>             Target profile (local|staging|prod)");
  console.log("  --env-file <path>           Env file path (default: .env.local)");
  console.log("  --api-key <value>           Set L4YERCAK3_API_KEY");
  console.log("  --backend-url <url>         Override profile backend URL for this command");
  console.log("  --org-id <id>               Target organization id");
  console.log("  --app-id <id>               Target app id");
  console.log("  --allow-profile-override    Allow profile/default mismatch overrides");
  console.log("  --yes --confirm-prod PROD   Required for mutating commands on confirm-gated profile");
  console.log("  --dry-run                   Print changes without writing file");
  console.log("  --replace-existing          Replace managed keys that already exist");
  console.log("  --full-rewrite              Rewrite file using managed keys only (guarded)");
  console.log("  --allow-full-rewrite        Required with --full-rewrite");
  console.log("  --backup-path <path>        Custom backup path for writes");
  console.log("  --help                      Show this help");
  console.log("");
  console.log("Default mode is non-destructive upsert. Unknown keys are preserved.");
}

export async function runAppEnvUpdateCommand(
  params: RunAppEnvUpdateCommandParams
): Promise<number> {
  const { parsed, commandName, legacySource } = params;

  if (getOptionBoolean(parsed, "help")) {
    printCommandUsage(commandName);
    return 0;
  }

  const target = await resolveTargetContext(parsed, {
    requireOrgApp: true,
    mutatingCommand: true
  });

  const updates = resolveManagedUpdates(parsed, target);
  if (updates.length === 0) {
    console.error(
      colorRed(
        "No managed values resolved. Provide --api-key/--backend-url/--org-id/--app-id or set matching env vars."
      )
    );
    return 1;
  }

  const envFileArg = getOptionString(parsed, "env-file") ?? ".env.local";
  const envFile = path.resolve(process.cwd(), envFileArg);
  const mode = resolveWriteMode(parsed);

  if (legacySource) {
    console.log(
      colorGray(
        `Legacy command '${legacySource}' mapped to 'sevenlayers ${commandName}'.`
      )
    );
  }

  console.log(colorGray(`Resolved profile: ${target.profileName}`));
  console.log(colorGray(`Resolved org/app: ${target.orgId}/${target.appId}`));
  console.log("");

  const result = await writeEnvFile(envFile, updates, {
    mode,
    dryRun: getOptionBoolean(parsed, "dry-run"),
    backupPath: getOptionString(parsed, "backup-path"),
    allowFullRewrite: getOptionBoolean(parsed, "allow-full-rewrite")
  });

  console.log(colorOrange(`Target file: ${result.filePath}`));
  console.log(colorOrange(`Mode: ${result.mode}`));
  console.log("");
  console.log(formatEnvChanges(result.changes));

  if (!result.applied) {
    console.log("");
    console.log(colorGray("No write performed (dry-run or no mutable changes)."));
    return 0;
  }

  console.log("");
  console.log(colorGreen("Environment update applied successfully."));
  if (result.backupPath) {
    console.log(colorGray(`Backup: ${result.backupPath}`));
  }

  return 0;
}
