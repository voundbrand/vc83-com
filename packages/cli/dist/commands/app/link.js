"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAppLink = handleAppLink;
const args_1 = require("../../core/args");
const colors_1 = require("../../core/colors");
const remote_1 = require("./remote");
function printUsage() {
    console.log((0, colors_1.colorOrange)("Usage: sevenlayers app link [options]"));
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
async function handleAppLink(parsed) {
    if ((0, args_1.getOptionBoolean)(parsed, "help")) {
        printUsage();
        return 0;
    }
    const command = await (0, remote_1.resolveRemoteCommand)(parsed, {
        requireOrgApp: true,
        mutatingCommand: true
    });
    const features = (0, args_1.getOptionStringArray)(parsed, "feature");
    const hasConnectionUpdate = features.length > 0 ||
        (0, args_1.hasOption)(parsed, "has-frontend-database") ||
        (0, args_1.hasOption)(parsed, "frontend-db-type");
    const hasDeploymentUpdate = (0, args_1.hasOption)(parsed, "github-repo") ||
        (0, args_1.hasOption)(parsed, "production-url") ||
        (0, args_1.hasOption)(parsed, "staging-url");
    const payload = {
        name: (0, args_1.getOptionString)(parsed, "name"),
        description: (0, args_1.getOptionString)(parsed, "description"),
        status: (0, args_1.getOptionString)(parsed, "status"),
        connection: hasConnectionUpdate
            ? {
                features: features.length > 0 ? features : undefined,
                hasFrontendDatabase: (0, args_1.hasOption)(parsed, "has-frontend-database")
                    ? (0, args_1.getOptionBoolean)(parsed, "has-frontend-database")
                    : undefined,
                frontendDatabaseType: (0, args_1.getOptionString)(parsed, "frontend-db-type")
            }
            : undefined,
        deployment: hasDeploymentUpdate
            ? {
                githubRepo: (0, args_1.getOptionString)(parsed, "github-repo"),
                productionUrl: (0, args_1.getOptionString)(parsed, "production-url"),
                stagingUrl: (0, args_1.getOptionString)(parsed, "staging-url")
            }
            : undefined
    };
    const hasAnyUpdate = payload.name !== undefined ||
        payload.description !== undefined ||
        payload.status !== undefined ||
        payload.connection !== undefined ||
        payload.deployment !== undefined;
    if (!hasAnyUpdate) {
        throw new Error("No link metadata provided. Pass at least one field such as --feature, --github-repo, or --production-url.");
    }
    await command.api.updateApplication(command.target.appId, payload);
    const application = await command.api.getApplication(command.target.appId);
    if (command.json) {
        console.log(JSON.stringify({
            success: true,
            profile: command.target.profileName,
            organizationId: command.target.orgId,
            application: application.application
        }, null, 2));
        return 0;
    }
    console.log((0, colors_1.colorGreen)("Application link metadata updated."));
    console.log((0, colors_1.colorGray)(`Profile: ${command.target.profileName}`));
    console.log((0, colors_1.colorGray)(`Organization: ${command.target.orgId}`));
    console.log((0, colors_1.colorGray)(`Application: ${application.application.id}`));
    console.log((0, colors_1.colorGray)(`Name: ${application.application.name}`));
    console.log((0, colors_1.colorGray)(`Status: ${application.application.status}`));
    return 0;
}
//# sourceMappingURL=link.js.map