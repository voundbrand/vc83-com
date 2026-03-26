"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleBookingCheck = handleBookingCheck;
const args_1 = require("../../core/args");
const colors_1 = require("../../core/colors");
const shared_1 = require("./shared");
function printUsage() {
    console.log((0, colors_1.colorOrange)("Usage: sevenlayers booking check [options]"));
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
async function handleBookingCheck(parsed) {
    if ((0, args_1.getOptionBoolean)(parsed, "help")) {
        printUsage();
        return 0;
    }
    const command = await (0, shared_1.resolveBookingCommandContext)(parsed, { mutating: false });
    const envFilePath = (0, shared_1.resolveEnvFilePath)(parsed);
    const identifiers = await (0, shared_1.resolveBookingIdentifiers)(parsed, envFilePath);
    const reachability = await (0, shared_1.runBookingReachabilityChecks)(command.api);
    const entity = await (0, shared_1.runBookingEntityChecks)({
        api: command.api,
        eventId: identifiers.eventId,
        productId: identifiers.productId
    });
    const issues = [...reachability.issues, ...entity.issues];
    const success = issues.length === 0;
    if (command.json) {
        console.log(JSON.stringify({
            success,
            profile: command.profile,
            organizationId: command.organizationId,
            applicationId: command.applicationId,
            backendUrl: command.backendUrl,
            eventId: identifiers.eventId ?? null,
            productId: identifiers.productId ?? null,
            source: identifiers.source,
            issues
        }, null, 2));
        return success ? 0 : 1;
    }
    console.log((0, colors_1.colorOrange)("Booking environment check"));
    console.log((0, colors_1.colorGray)(`Profile: ${command.profile}`));
    console.log((0, colors_1.colorGray)(`Organization: ${command.organizationId}`));
    console.log((0, colors_1.colorGray)(`Application: ${command.applicationId}`));
    console.log((0, colors_1.colorGray)(`Backend URL: ${command.backendUrl}`));
    console.log((0, colors_1.colorGray)(`Event ID: ${identifiers.eventId ?? "<unset>"}`));
    console.log((0, colors_1.colorGray)(`Product ID: ${identifiers.productId ?? "<unset>"}`));
    console.log((0, colors_1.colorGray)(`Source: ${identifiers.source}`));
    if (success) {
        console.log((0, colors_1.colorGreen)("Booking prerequisites are valid."));
        return 0;
    }
    for (const issue of issues) {
        console.log((0, colors_1.colorGray)(`- ${issue}`));
    }
    return 1;
}
//# sourceMappingURL=check.js.map