import {
  type ParsedArgs,
  getOptionBoolean,
  getOptionString
} from "../../core/args";
import { colorGray, colorGreen, colorOrange } from "../../core/colors";
import { runBookingSmoke } from "../../testing/booking-smoke";
import {
  resolveBookingCommandContext,
  resolveBookingIdentifiers,
  resolveEnvFilePath,
  runBookingEntityChecks,
  runBookingReachabilityChecks
} from "./shared";

function printUsage(): void {
  console.log(colorOrange("Usage: sevenlayers booking smoke [options]"));
  console.log("");
  console.log("Options:");
  console.log("  --env <profile>             Target profile (local|staging|prod)");
  console.log("  --org-id <id>               Target organization id");
  console.log("  --app-id <id>               Target application id");
  console.log("  --event-id <id>             Booking event object id override");
  console.log("  --product-id <id>           Booking product object id override");
  console.log("  --booking-source <source>   Booking source marker (default: web)");
  console.log("  --env-file <path>           Env file path (default: .env.local)");
  console.log("  --run-id <id>               Optional deterministic run id");
  console.log("  --execute                   Execute booking smoke against backend");
  console.log("  --allow-prod-smoke          Required with --execute on prod profile");
  console.log("  --token <value>             API token (or use env vars)");
  console.log("  --yes --confirm-prod PROD   Required on confirm-gated targets");
  console.log("  --json                      Output deterministic JSON");
  console.log("  --help                      Show this help");
  console.log("");
  console.log("Default behavior is dry-run; use --execute for live smoke booking creation.");
}

export async function handleBookingSmoke(parsed: ParsedArgs): Promise<number> {
  if (getOptionBoolean(parsed, "help")) {
    printUsage();
    return 0;
  }

  const execute = getOptionBoolean(parsed, "execute");
  const context = await resolveBookingCommandContext(parsed, { mutating: execute });
  const envFilePath = resolveEnvFilePath(parsed);
  const identifiers = await resolveBookingIdentifiers(parsed, envFilePath);

  const reachability = await runBookingReachabilityChecks(context.api);
  const entity = await runBookingEntityChecks({
    api: context.api,
    eventId: identifiers.eventId,
    productId: identifiers.productId
  });
  const issues = [...reachability.issues, ...entity.issues];

  if (issues.length > 0) {
    if (context.json) {
      console.log(
        JSON.stringify(
          {
            success: false,
            dryRun: !execute,
            profile: context.profile,
            organizationId: context.organizationId,
            applicationId: context.applicationId,
            issues
          },
          null,
          2
        )
      );
      return 1;
    }

    console.log(colorOrange("Booking smoke preflight failed."));
    for (const issue of issues) {
      console.log(colorGray(`- ${issue}`));
    }
    return 1;
  }

  if (execute && context.profile === "prod" && !getOptionBoolean(parsed, "allow-prod-smoke")) {
    throw new Error(
      "Production smoke execution blocked. Re-run with --allow-prod-smoke in addition to prod confirmation flags."
    );
  }

  const smoke = await runBookingSmoke({
    api: context.api,
    eventId: identifiers.eventId!,
    productId: identifiers.productId!,
    source: identifiers.source,
    dryRun: !execute,
    runId: getOptionString(parsed, "run-id")
  });

  if (context.json) {
    console.log(
      JSON.stringify(
        {
          success: true,
          dryRun: smoke.dryRun,
          profile: context.profile,
          organizationId: context.organizationId,
          applicationId: context.applicationId,
          runId: smoke.runId,
          payload: smoke.payload,
          response: smoke.response ?? null,
          issues: []
        },
        null,
        2
      )
    );
    return 0;
  }

  console.log(colorGreen("Booking smoke preflight passed."));
  console.log(colorGray(`Profile: ${context.profile}`));
  console.log(colorGray(`Organization: ${context.organizationId}`));
  console.log(colorGray(`Application: ${context.applicationId}`));
  console.log(colorGray(`Run ID: ${smoke.runId}`));
  if (smoke.dryRun) {
    console.log(colorGray("Dry-run mode: booking was not created."));
  } else {
    console.log(colorGreen("Smoke booking executed successfully."));
  }
  return 0;
}
