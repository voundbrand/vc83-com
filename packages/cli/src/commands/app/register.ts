import crypto from "node:crypto";
import path from "node:path";
import pkg from "../../../package.json";
import {
  type ParsedArgs,
  getOptionBoolean,
  getOptionString,
  getOptionStringArray,
  hasOption
} from "../../core/args";
import { colorGray, colorGreen, colorOrange } from "../../core/colors";
import { resolveRemoteCommand } from "./remote";

function printUsage(): void {
  console.log(colorOrange("Usage: sevenlayers app register [options]"));
  console.log("");
  console.log("Options:");
  console.log("  --env <profile>             Target profile (local|staging|prod)");
  console.log("  --org-id <id>               Target organization id (required)");
  console.log("  --name <name>               Application name (default: current folder)");
  console.log("  --description <text>        Application description");
  console.log("  --framework <name>          Framework marker (default: unknown)");
  console.log("  --router-type <type>        Router type marker (app/pages/etc.)");
  console.log("  --typescript                Mark project as TypeScript");
  console.log("  --project-path-hash <hash>  Optional stable project hash override");
  console.log("  --feature <name>            Repeated or comma-separated feature flags");
  console.log("  --has-frontend-database     Mark app as frontend-db connected");
  console.log("  --frontend-db-type <type>   Frontend DB type marker");
  console.log("  --token <value>             API token (or use env vars)");
  console.log("  --yes --confirm-prod PROD   Required on confirm-gated targets");
  console.log("  --json                      Output deterministic JSON");
  console.log("  --help                      Show this help");
}

function hashProjectPath(projectPath: string): string {
  return crypto.createHash("sha256").update(projectPath).digest("hex");
}

export async function handleAppRegister(parsed: ParsedArgs): Promise<number> {
  if (getOptionBoolean(parsed, "help")) {
    printUsage();
    return 0;
  }

  const command = await resolveRemoteCommand(parsed, {
    requireOrgApp: false,
    mutatingCommand: true
  });

  if (!command.target.orgId) {
    throw new Error(
      "app register requires an organization target. Provide --org-id or set defaultOrgId on the active profile."
    );
  }

  const projectPath = path.resolve(process.cwd());
  const appName = getOptionString(parsed, "name") ?? path.basename(projectPath);
  const sourceHash = getOptionString(parsed, "project-path-hash") ?? hashProjectPath(projectPath);
  const features = getOptionStringArray(parsed, "feature");

  const payload = {
    organizationId: command.target.orgId,
    name: appName,
    description: getOptionString(parsed, "description"),
    source: {
      type: "cli" as const,
      projectPathHash: sourceHash,
      cliVersion: pkg.version,
      framework: getOptionString(parsed, "framework") ?? "unknown",
      routerType: getOptionString(parsed, "router-type"),
      hasTypeScript: getOptionBoolean(parsed, "typescript")
    },
    connection: {
      features,
      hasFrontendDatabase: hasOption(parsed, "has-frontend-database")
        ? getOptionBoolean(parsed, "has-frontend-database")
        : undefined,
      frontendDatabaseType: getOptionString(parsed, "frontend-db-type")
    }
  };

  const result = await command.api.registerApplication(payload);

  if (command.json) {
    console.log(
      JSON.stringify(
        {
          success: result.success,
          profile: command.target.profileName,
          organizationId: command.target.orgId,
          applicationId: result.applicationId,
          existingApplication: result.existingApplication,
          backendUrl: result.backendUrl ?? command.target.backendUrl,
          apiKeyPrefix: result.apiKey?.prefix ?? null
        },
        null,
        2
      )
    );
    return 0;
  }

  console.log(colorGreen("Application registration completed."));
  console.log(colorGray(`Profile: ${command.target.profileName}`));
  console.log(colorGray(`Organization: ${command.target.orgId}`));
  console.log(colorGray(`Application: ${result.applicationId}`));
  console.log(colorGray(`Existing registration: ${result.existingApplication ? "yes" : "no"}`));
  if (result.apiKey?.prefix) {
    console.log(colorGray(`API key: ${result.apiKey.prefix}`));
  }
  console.log("");
  console.log(colorOrange("Next step:"));
  console.log(colorGray(`  sevenlayers app link --app-id ${result.applicationId}`));
  return 0;
}
