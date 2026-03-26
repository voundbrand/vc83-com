"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleBookingSmoke = handleBookingSmoke;
const args_1 = require("../../core/args");
const colors_1 = require("../../core/colors");
const booking_smoke_1 = require("../../testing/booking-smoke");
const shared_1 = require("./shared");
function printUsage() {
    console.log((0, colors_1.colorOrange)("Usage: sevenlayers booking smoke [options]"));
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
async function handleBookingSmoke(parsed) {
    if ((0, args_1.getOptionBoolean)(parsed, "help")) {
        printUsage();
        return 0;
    }
    const execute = (0, args_1.getOptionBoolean)(parsed, "execute");
    const context = await (0, shared_1.resolveBookingCommandContext)(parsed, { mutating: execute });
    const envFilePath = (0, shared_1.resolveEnvFilePath)(parsed);
    const identifiers = await (0, shared_1.resolveBookingIdentifiers)(parsed, envFilePath);
    const reachability = await (0, shared_1.runBookingReachabilityChecks)(context.api);
    const entity = await (0, shared_1.runBookingEntityChecks)({
        api: context.api,
        eventId: identifiers.eventId,
        productId: identifiers.productId
    });
    const issues = [...reachability.issues, ...entity.issues];
    if (issues.length > 0) {
        if (context.json) {
            console.log(JSON.stringify({
                success: false,
                dryRun: !execute,
                profile: context.profile,
                organizationId: context.organizationId,
                applicationId: context.applicationId,
                issues
            }, null, 2));
            return 1;
        }
        console.log((0, colors_1.colorOrange)("Booking smoke preflight failed."));
        for (const issue of issues) {
            console.log((0, colors_1.colorGray)(`- ${issue}`));
        }
        return 1;
    }
    if (execute && context.profile === "prod" && !(0, args_1.getOptionBoolean)(parsed, "allow-prod-smoke")) {
        throw new Error("Production smoke execution blocked. Re-run with --allow-prod-smoke in addition to prod confirmation flags.");
    }
    const smoke = await (0, booking_smoke_1.runBookingSmoke)({
        api: context.api,
        eventId: identifiers.eventId,
        productId: identifiers.productId,
        source: identifiers.source,
        dryRun: !execute,
        runId: (0, args_1.getOptionString)(parsed, "run-id")
    });
    if (context.json) {
        console.log(JSON.stringify({
            success: true,
            dryRun: smoke.dryRun,
            profile: context.profile,
            organizationId: context.organizationId,
            applicationId: context.applicationId,
            runId: smoke.runId,
            payload: smoke.payload,
            response: smoke.response ?? null,
            issues: []
        }, null, 2));
        return 0;
    }
    console.log((0, colors_1.colorGreen)("Booking smoke preflight passed."));
    console.log((0, colors_1.colorGray)(`Profile: ${context.profile}`));
    console.log((0, colors_1.colorGray)(`Organization: ${context.organizationId}`));
    console.log((0, colors_1.colorGray)(`Application: ${context.applicationId}`));
    console.log((0, colors_1.colorGray)(`Run ID: ${smoke.runId}`));
    if (smoke.dryRun) {
        console.log((0, colors_1.colorGray)("Dry-run mode: booking was not created."));
    }
    else {
        console.log((0, colors_1.colorGreen)("Smoke booking executed successfully."));
    }
    return 0;
}
//# sourceMappingURL=smoke.js.map