"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveBookingIdentifiers = resolveBookingIdentifiers;
exports.resolveBookingCommandContext = resolveBookingCommandContext;
exports.resolveEnvFilePath = resolveEnvFilePath;
exports.runBookingReachabilityChecks = runBookingReachabilityChecks;
exports.runBookingEntityChecks = runBookingEntityChecks;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const args_1 = require("../../core/args");
const env_parser_1 = require("../../config/env-parser");
const remote_1 = require("../app/remote");
async function readEnvFileValues(envFilePath) {
    try {
        const content = await promises_1.default.readFile(envFilePath, "utf8");
        const parsed = (0, env_parser_1.parseEnvText)(content);
        const values = {};
        for (const line of parsed.lines) {
            if (line.kind === "entry") {
                values[line.key] = (0, env_parser_1.normalizeEnvValue)(line.value);
            }
        }
        return values;
    }
    catch (error) {
        const ioError = error;
        if (ioError.code === "ENOENT") {
            return {};
        }
        throw error;
    }
}
async function resolveBookingIdentifiers(parsed, envFilePath) {
    const envValues = await readEnvFileValues(envFilePath);
    return {
        eventId: (0, args_1.getOptionString)(parsed, "event-id") ??
            envValues.L4YERCAK3_BOOKING_EVENT_ID ??
            envValues.BOOKING_EVENT_ID,
        productId: (0, args_1.getOptionString)(parsed, "product-id") ??
            envValues.L4YERCAK3_BOOKING_PRODUCT_ID ??
            envValues.BOOKING_PRODUCT_ID,
        source: (0, args_1.getOptionString)(parsed, "booking-source") ?? envValues.L4YERCAK3_BOOKING_SOURCE ?? "web"
    };
}
async function resolveBookingCommandContext(parsed, options) {
    const command = await (0, remote_1.resolveRemoteCommand)(parsed, {
        requireOrgApp: true,
        mutatingCommand: options.mutating
    });
    return {
        profile: command.target.profileName,
        organizationId: command.target.orgId ?? "",
        applicationId: command.target.appId ?? "",
        backendUrl: command.target.backendUrl,
        json: command.json,
        api: command.api
    };
}
function resolveEnvFilePath(parsed) {
    const envFileArg = (0, args_1.getOptionString)(parsed, "env-file") ?? ".env.local";
    return node_path_1.default.resolve(process.cwd(), envFileArg);
}
async function runBookingReachabilityChecks(api) {
    const issues = [];
    try {
        await api.listEvents(1);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        issues.push(`events endpoint unreachable: ${message}`);
    }
    try {
        await api.listProducts(1);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        issues.push(`products endpoint unreachable: ${message}`);
    }
    return { issues };
}
async function runBookingEntityChecks(args) {
    const issues = [];
    if (!args.eventId) {
        issues.push("event-id is not resolved");
    }
    else {
        try {
            await args.api.getEvent(args.eventId);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            issues.push(`event lookup failed (${args.eventId}): ${message}`);
        }
    }
    if (!args.productId) {
        issues.push("product-id is not resolved");
    }
    else {
        try {
            await args.api.getProduct(args.productId);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            issues.push(`product lookup failed (${args.productId}): ${message}`);
        }
    }
    return { issues };
}
//# sourceMappingURL=shared.js.map