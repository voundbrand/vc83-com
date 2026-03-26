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
  console.log(colorOrange("Usage: sevenlayers app link [options]"));
  console.log("");
  console.log("Options:");
  console.log("  --env <profile>             Target profile (local|staging|prod)");
  console.log("  --org-id <id>               Target organization id");
  console.log("  --app-id <id>               Target application id");
  console.log("  --name <name>               Set application display name");
  console.log("  --description <text>        Set application description");
  console.log("  --status <status>           Set application status");
  console.log("  --feature <name>            Repeated or comma-separated feature list");
  console.log("  --has-frontend-database     Set frontend database flag");
  console.log("  --frontend-db-type <type>   Set frontend database type");
  console.log("  --github-repo <owner/repo>  Link GitHub repository");
  console.log("  --production-url <url>      Set production deployment URL");
  console.log("  --staging-url <url>         Set staging deployment URL");
  console.log("  --token <value>             API token (or use env vars)");
  console.log("  --yes --confirm-prod PROD   Required on confirm-gated targets");
  console.log("  --json                      Output deterministic JSON");
  console.log("  --help                      Show this help");
}

export async function handleAppLink(parsed: ParsedArgs): Promise<number> {
  if (getOptionBoolean(parsed, "help")) {
    printUsage();
    return 0;
  }

  const command = await resolveRemoteCommand(parsed, {
    requireOrgApp: true,
    mutatingCommand: true
  });

  const features = getOptionStringArray(parsed, "feature");
  const hasConnectionUpdate =
    features.length > 0 ||
    hasOption(parsed, "has-frontend-database") ||
    hasOption(parsed, "frontend-db-type");

  const hasDeploymentUpdate =
    hasOption(parsed, "github-repo") ||
    hasOption(parsed, "production-url") ||
    hasOption(parsed, "staging-url");

  const payload = {
    name: getOptionString(parsed, "name"),
    description: getOptionString(parsed, "description"),
    status: getOptionString(parsed, "status"),
    connection: hasConnectionUpdate
      ? {
          features: features.length > 0 ? features : undefined,
          hasFrontendDatabase: hasOption(parsed, "has-frontend-database")
            ? getOptionBoolean(parsed, "has-frontend-database")
            : undefined,
          frontendDatabaseType: getOptionString(parsed, "frontend-db-type")
        }
      : undefined,
    deployment: hasDeploymentUpdate
      ? {
          githubRepo: getOptionString(parsed, "github-repo"),
          productionUrl: getOptionString(parsed, "production-url"),
          stagingUrl: getOptionString(parsed, "staging-url")
        }
      : undefined
  };

  const hasAnyUpdate =
    payload.name !== undefined ||
    payload.description !== undefined ||
    payload.status !== undefined ||
    payload.connection !== undefined ||
    payload.deployment !== undefined;

  if (!hasAnyUpdate) {
    throw new Error(
      "No link metadata provided. Pass at least one field such as --feature, --github-repo, or --production-url."
    );
  }

  await command.api.updateApplication(command.target.appId!, payload);
  const application = await command.api.getApplication(command.target.appId!);

  if (command.json) {
    console.log(
      JSON.stringify(
        {
          success: true,
          profile: command.target.profileName,
          organizationId: command.target.orgId,
          application: application.application
        },
        null,
        2
      )
    );
    return 0;
  }

  console.log(colorGreen("Application link metadata updated."));
  console.log(colorGray(`Profile: ${command.target.profileName}`));
  console.log(colorGray(`Organization: ${command.target.orgId}`));
  console.log(colorGray(`Application: ${application.application.id}`));
  console.log(colorGray(`Name: ${application.application.name}`));
  console.log(colorGray(`Status: ${application.application.status}`));
  return 0;
}
