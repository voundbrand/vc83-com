import {
  type ParsedArgs,
  getOptionBoolean,
  getOptionString
} from "../../core/args";
import { formatEnvChanges } from "../../config/env-diff";
import { writeEnvFile } from "../../config/env-writer";
import { colorGray, colorGreen, colorOrange } from "../../core/colors";
import {
  resolveBookingCommandContext,
  resolveBookingIdentifiers,
  resolveEnvFilePath,
  runBookingEntityChecks,
  runBookingReachabilityChecks
} from "./shared";

function printUsage(): void {
  console.log(colorOrange("Usage: sevenlayers booking setup [options]"));
  console.log("");
  console.log("Options:");
  console.log("  --env <profile>             Target profile (local|staging|prod)");
  console.log("  --org-id <id>               Target organization id");
  console.log("  --app-id <id>               Target application id");
  console.log("  --event-id <id>             Booking event object id");
  console.log("  --product-id <id>           Booking product object id");
  console.log("  --booking-source <source>   Booking source marker (default: web)");
  console.log("  --env-file <path>           Env file path (default: .env.local)");
  console.log("  --dry-run                   Validate and preview without writing");
  console.log("  --replace-existing          Replace existing managed booking keys");
  console.log("  --backup-path <path>        Custom backup path");
  console.log("  --token <value>             API token (or use env vars)");
  console.log("  --yes --confirm-prod PROD   Required on confirm-gated targets");
  console.log("  --json                      Output deterministic JSON");
  console.log("  --help                      Show this help");
}

export async function handleBookingSetup(parsed: ParsedArgs): Promise<number> {
  if (getOptionBoolean(parsed, "help")) {
    printUsage();
    return 0;
  }

  const command = await resolveBookingCommandContext(parsed, { mutating: true });
  const envFilePath = resolveEnvFilePath(parsed);
  const identifiers = await resolveBookingIdentifiers(parsed, envFilePath);

  const reachability = await runBookingReachabilityChecks(command.api);
  const entity = await runBookingEntityChecks({
    api: command.api,
    eventId: identifiers.eventId,
    productId: identifiers.productId
  });
  const issues = [...reachability.issues, ...entity.issues];

  if (issues.length > 0) {
    if (command.json) {
      console.log(
        JSON.stringify(
          {
            success: false,
            profile: command.profile,
            organizationId: command.organizationId,
            applicationId: command.applicationId,
            issues
          },
          null,
          2
        )
      );
      return 1;
    }

    console.log(colorOrange("Booking setup preflight failed."));
    for (const issue of issues) {
      console.log(colorGray(`- ${issue}`));
    }
    return 1;
  }

  const updates = [
    { key: "L4YERCAK3_BOOKING_EVENT_ID", value: identifiers.eventId! },
    { key: "L4YERCAK3_BOOKING_PRODUCT_ID", value: identifiers.productId! },
    { key: "L4YERCAK3_BOOKING_SOURCE", value: identifiers.source }
  ];

  const result = await writeEnvFile(envFilePath, updates, {
    mode: getOptionBoolean(parsed, "replace-existing") ? "replace-key" : "upsert",
    dryRun: getOptionBoolean(parsed, "dry-run"),
    backupPath: getOptionString(parsed, "backup-path")
  });

  if (command.json) {
    console.log(
      JSON.stringify(
        {
          success: true,
          profile: command.profile,
          organizationId: command.organizationId,
          applicationId: command.applicationId,
          file: result.filePath,
          applied: result.applied,
          changes: result.changes,
          issues: []
        },
        null,
        2
      )
    );
    return 0;
  }

  console.log(colorGreen("Booking setup preflight passed."));
  console.log(colorGray(`Profile: ${command.profile}`));
  console.log(colorGray(`Organization: ${command.organizationId}`));
  console.log(colorGray(`Application: ${command.applicationId}`));
  console.log(colorGray(`Env file: ${result.filePath}`));
  console.log("");
  console.log(formatEnvChanges(result.changes));
  if (!result.applied) {
    console.log(colorGray("No file write performed (dry-run or no mutable changes)."));
  }
  return 0;
}
