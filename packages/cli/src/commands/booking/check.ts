import { type ParsedArgs, getOptionBoolean } from "../../core/args";
import { colorGray, colorGreen, colorOrange } from "../../core/colors";
import {
  resolveBookingCommandContext,
  resolveBookingIdentifiers,
  resolveEnvFilePath,
  runBookingEntityChecks,
  runBookingReachabilityChecks
} from "./shared";

function printUsage(): void {
  console.log(colorOrange("Usage: sevenlayers booking check [options]"));
  console.log("");
  console.log("Options:");
  console.log("  --env <profile>             Target profile (local|staging|prod)");
  console.log("  --org-id <id>               Target organization id");
  console.log("  --app-id <id>               Target application id");
  console.log("  --event-id <id>             Booking event object id override");
  console.log("  --product-id <id>           Booking product object id override");
  console.log("  --env-file <path>           Env file path (default: .env.local)");
  console.log("  --token <value>             API token (or use env vars)");
  console.log("  --json                      Output deterministic JSON");
  console.log("  --help                      Show this help");
}

export async function handleBookingCheck(parsed: ParsedArgs): Promise<number> {
  if (getOptionBoolean(parsed, "help")) {
    printUsage();
    return 0;
  }

  const command = await resolveBookingCommandContext(parsed, { mutating: false });
  const envFilePath = resolveEnvFilePath(parsed);
  const identifiers = await resolveBookingIdentifiers(parsed, envFilePath);

  const reachability = await runBookingReachabilityChecks(command.api);
  const entity = await runBookingEntityChecks({
    api: command.api,
    eventId: identifiers.eventId,
    productId: identifiers.productId
  });
  const issues = [...reachability.issues, ...entity.issues];
  const success = issues.length === 0;

  if (command.json) {
    console.log(
      JSON.stringify(
        {
          success,
          profile: command.profile,
          organizationId: command.organizationId,
          applicationId: command.applicationId,
          backendUrl: command.backendUrl,
          eventId: identifiers.eventId ?? null,
          productId: identifiers.productId ?? null,
          source: identifiers.source,
          issues
        },
        null,
        2
      )
    );
    return success ? 0 : 1;
  }

  console.log(colorOrange("Booking environment check"));
  console.log(colorGray(`Profile: ${command.profile}`));
  console.log(colorGray(`Organization: ${command.organizationId}`));
  console.log(colorGray(`Application: ${command.applicationId}`));
  console.log(colorGray(`Backend URL: ${command.backendUrl}`));
  console.log(colorGray(`Event ID: ${identifiers.eventId ?? "<unset>"}`));
  console.log(colorGray(`Product ID: ${identifiers.productId ?? "<unset>"}`));
  console.log(colorGray(`Source: ${identifiers.source}`));

  if (success) {
    console.log(colorGreen("Booking prerequisites are valid."));
    return 0;
  }

  for (const issue of issues) {
    console.log(colorGray(`- ${issue}`));
  }
  return 1;
}
