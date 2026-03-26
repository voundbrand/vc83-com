"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleBookingSetup = handleBookingSetup;
const args_1 = require("../../core/args");
const env_diff_1 = require("../../config/env-diff");
const env_writer_1 = require("../../config/env-writer");
const colors_1 = require("../../core/colors");
const shared_1 = require("./shared");
function printUsage() {
    console.log((0, colors_1.colorOrange)("Usage: sevenlayers booking setup [options]"));
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
async function handleBookingSetup(parsed) {
    if ((0, args_1.getOptionBoolean)(parsed, "help")) {
        printUsage();
        return 0;
    }
    const command = await (0, shared_1.resolveBookingCommandContext)(parsed, { mutating: true });
    const envFilePath = (0, shared_1.resolveEnvFilePath)(parsed);
    const identifiers = await (0, shared_1.resolveBookingIdentifiers)(parsed, envFilePath);
    const reachability = await (0, shared_1.runBookingReachabilityChecks)(command.api);
    const entity = await (0, shared_1.runBookingEntityChecks)({
        api: command.api,
        eventId: identifiers.eventId,
        productId: identifiers.productId
    });
    const issues = [...reachability.issues, ...entity.issues];
    if (issues.length > 0) {
        if (command.json) {
            console.log(JSON.stringify({
                success: false,
                profile: command.profile,
                organizationId: command.organizationId,
                applicationId: command.applicationId,
                issues
            }, null, 2));
            return 1;
        }
        console.log((0, colors_1.colorOrange)("Booking setup preflight failed."));
        for (const issue of issues) {
            console.log((0, colors_1.colorGray)(`- ${issue}`));
        }
        return 1;
    }
    const updates = [
        { key: "L4YERCAK3_BOOKING_EVENT_ID", value: identifiers.eventId },
        { key: "L4YERCAK3_BOOKING_PRODUCT_ID", value: identifiers.productId },
        { key: "L4YERCAK3_BOOKING_SOURCE", value: identifiers.source }
    ];
    const result = await (0, env_writer_1.writeEnvFile)(envFilePath, updates, {
        mode: (0, args_1.getOptionBoolean)(parsed, "replace-existing") ? "replace-key" : "upsert",
        dryRun: (0, args_1.getOptionBoolean)(parsed, "dry-run"),
        backupPath: (0, args_1.getOptionString)(parsed, "backup-path")
    });
    if (command.json) {
        console.log(JSON.stringify({
            success: true,
            profile: command.profile,
            organizationId: command.organizationId,
            applicationId: command.applicationId,
            file: result.filePath,
            applied: result.applied,
            changes: result.changes,
            issues: []
        }, null, 2));
        return 0;
    }
    console.log((0, colors_1.colorGreen)("Booking setup preflight passed."));
    console.log((0, colors_1.colorGray)(`Profile: ${command.profile}`));
    console.log((0, colors_1.colorGray)(`Organization: ${command.organizationId}`));
    console.log((0, colors_1.colorGray)(`Application: ${command.applicationId}`));
    console.log((0, colors_1.colorGray)(`Env file: ${result.filePath}`));
    console.log("");
    console.log((0, env_diff_1.formatEnvChanges)(result.changes));
    if (!result.applied) {
        console.log((0, colors_1.colorGray)("No file write performed (dry-run or no mutable changes)."));
    }
    return 0;
}
//# sourceMappingURL=setup.js.map