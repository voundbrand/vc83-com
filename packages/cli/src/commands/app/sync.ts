import {
  type ParsedArgs,
  getOptionBoolean,
  getOptionString,
  getOptionStringArray
} from "../../core/args";
import { colorGray, colorGreen, colorOrange } from "../../core/colors";
import { resolveRemoteCommand } from "./remote";

interface SyncResultsPayload {
  direction?: string;
  status?: string;
  recordsProcessed?: number;
  recordsCreated?: number;
  recordsUpdated?: number;
  errors?: number;
}

interface SyncOptions {
  legacySource?: string;
}

function printUsage(): void {
  console.log(colorOrange("Usage: sevenlayers app sync [options]"));
  console.log("");
  console.log("Options:");
  console.log("  --env <profile>             Target profile (local|staging|prod)");
  console.log("  --org-id <id>               Target organization id");
  console.log("  --app-id <id>               Target application id");
  console.log("  --direction <mode>          push|pull|bidirectional (default: bidirectional)");
  console.log("  --model <name>              Restrict sync to model names (repeatable)");
  console.log("  --dry-run                   Request dry-run sync instructions");
  console.log("  --result-status <status>    Record sync result status");
  console.log("  --records-processed <n>     Record processed count");
  console.log("  --records-created <n>       Record created count");
  console.log("  --records-updated <n>       Record updated count");
  console.log("  --result-errors <n>         Record error count");
  console.log("  --token <value>             API token (or use env vars)");
  console.log("  --yes --confirm-prod PROD   Required on confirm-gated targets");
  console.log("  --json                      Output deterministic JSON");
  console.log("  --help                      Show this help");
}

function parseOptionalNumber(rawValue: string | undefined): number | undefined {
  if (rawValue === undefined) {
    return undefined;
  }
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Expected numeric value, received '${rawValue}'.`);
  }
  return parsed;
}

function buildResultsPayload(parsed: ParsedArgs): SyncResultsPayload | undefined {
  const status = getOptionString(parsed, "result-status");
  const recordsProcessed = parseOptionalNumber(getOptionString(parsed, "records-processed"));
  const recordsCreated = parseOptionalNumber(getOptionString(parsed, "records-created"));
  const recordsUpdated = parseOptionalNumber(getOptionString(parsed, "records-updated"));
  const errors = parseOptionalNumber(getOptionString(parsed, "result-errors"));

  if (
    status === undefined &&
    recordsProcessed === undefined &&
    recordsCreated === undefined &&
    recordsUpdated === undefined &&
    errors === undefined
  ) {
    return undefined;
  }

  return {
    direction: getOptionString(parsed, "direction"),
    status,
    recordsProcessed,
    recordsCreated,
    recordsUpdated,
    errors
  };
}

export async function handleAppSync(parsed: ParsedArgs, options: SyncOptions = {}): Promise<number> {
  if (getOptionBoolean(parsed, "help")) {
    printUsage();
    return 0;
  }

  const command = await resolveRemoteCommand(parsed, {
    requireOrgApp: true,
    mutatingCommand: true
  });

  const direction = getOptionString(parsed, "direction") ?? "bidirectional";
  const models = getOptionStringArray(parsed, "model");
  const dryRun = getOptionBoolean(parsed, "dry-run");
  const results = buildResultsPayload(parsed);

  const response = await command.api.syncApplication(command.target.appId!, {
    direction,
    models: models.length > 0 ? models : undefined,
    dryRun,
    results
  });

  if (command.json) {
    console.log(
      JSON.stringify(
        {
          success: true,
          profile: command.target.profileName,
          organizationId: command.target.orgId,
          applicationId: command.target.appId,
          direction,
          models,
          dryRun,
          response
        },
        null,
        2
      )
    );
    return 0;
  }

  if (options.legacySource) {
    console.log(
      colorGray(`Legacy command '${options.legacySource}' mapped to 'sevenlayers app sync'.`)
    );
  }

  console.log(colorGreen("Application sync request completed."));
  console.log(colorGray(`Profile: ${command.target.profileName}`));
  console.log(colorGray(`Organization: ${command.target.orgId}`));
  console.log(colorGray(`Application: ${command.target.appId}`));
  if (dryRun) {
    console.log(colorGray("Dry-run: yes"));
  }
  console.log(colorGray(`Direction: ${direction}`));
  if (models.length > 0) {
    console.log(colorGray(`Models: ${models.join(", ")}`));
  }
  return 0;
}
