"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCmsBind = handleCmsBind;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const args_1 = require("../../core/args");
const colors_1 = require("../../core/colors");
const shared_1 = require("./shared");
function printUsage() {
    console.log((0, colors_1.colorOrange)("Usage: sevenlayers cms bind [options]"));
    console.log("");
    console.log("Required options:");
    console.log("  --page-id <id>             Target page id OR");
    console.log("  --page-path <path>         Target page path lookup within app");
    console.log("  --binding <spec>           Binding spec (repeatable)");
    console.log("  --bindings-file <path>     JSON file of binding objects");
    console.log("");
    console.log("Binding spec format:");
    console.log("  <objectType>:<accessMode>[:<syncDirection>[:<id1,id2,...>]]");
    console.log("  accessMode: read|write|read_write");
    console.log("  syncDirection: push|pull|bidirectional");
    console.log("");
    console.log("Shared options:");
    console.log("  --env <profile>             Target profile (local|staging|prod)");
    console.log("  --org-id <id>               Target organization id");
    console.log("  --app-id <id>               Target application id");
    console.log("  --token <value>             API token (or use env vars)");
    console.log("  --replace-existing          Replace all existing bindings");
    console.log("  --dry-run                   Preview bind result");
    console.log("  --yes --confirm-prod PROD   Required on confirm-gated targets");
    console.log("  --json                      Output deterministic JSON");
    console.log("  --help                      Show this help");
}
function parseBindingSpec(spec) {
    const [objectTypeRaw, accessModeRaw, syncDirectionRaw, idsRaw] = spec.split(":");
    const objectType = objectTypeRaw?.trim();
    const accessMode = accessModeRaw?.trim();
    if (!objectType || !accessMode) {
        throw new Error(`Invalid --binding '${spec}'. Expected <objectType>:<accessMode>[:<syncDirection>[:<id1,id2>]]`);
    }
    if (accessMode !== "read" && accessMode !== "write" && accessMode !== "read_write") {
        throw new Error(`Invalid accessMode '${accessMode}' in --binding '${spec}'.`);
    }
    const syncToken = syncDirectionRaw && syncDirectionRaw.trim().length > 0 ? syncDirectionRaw.trim() : undefined;
    let syncDirection;
    if (syncToken === undefined) {
        syncDirection = undefined;
    }
    else if (syncToken === "push" || syncToken === "pull" || syncToken === "bidirectional") {
        syncDirection = syncToken;
    }
    else {
        throw new Error(`Invalid syncDirection '${syncToken}' in --binding '${spec}'.`);
    }
    const boundObjectIds = idsRaw && idsRaw.trim().length > 0
        ? idsRaw
            .split(",")
            .map((value) => value.trim())
            .filter((value) => value.length > 0)
        : undefined;
    return {
        objectType,
        accessMode,
        syncEnabled: Boolean(syncDirection),
        syncDirection,
        boundObjectIds
    };
}
async function loadBindingsFile(filePath) {
    const absolutePath = node_path_1.default.resolve(process.cwd(), filePath);
    const raw = await promises_1.default.readFile(absolutePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
        throw new Error(`Bindings file '${filePath}' must contain an array.`);
    }
    return parsed.map((entry) => {
        if (!entry || typeof entry !== "object") {
            throw new Error(`Bindings file '${filePath}' contains invalid entries.`);
        }
        const record = entry;
        const objectType = typeof record.objectType === "string" ? record.objectType.trim() : "";
        const accessMode = typeof record.accessMode === "string" ? record.accessMode.trim() : "";
        if (!objectType || !accessMode) {
            throw new Error(`Bindings file '${filePath}' entries require objectType + accessMode.`);
        }
        if (accessMode !== "read" && accessMode !== "write" && accessMode !== "read_write") {
            throw new Error(`Bindings file '${filePath}' has invalid accessMode '${accessMode}'.`);
        }
        const syncToken = typeof record.syncDirection === "string" && record.syncDirection.trim().length > 0
            ? record.syncDirection.trim()
            : undefined;
        let syncDirection;
        if (syncToken === undefined) {
            syncDirection = undefined;
        }
        else if (syncToken === "push" || syncToken === "pull" || syncToken === "bidirectional") {
            syncDirection = syncToken;
        }
        else {
            throw new Error(`Bindings file '${filePath}' has invalid syncDirection '${syncToken}'.`);
        }
        const boundObjectIds = Array.isArray(record.boundObjectIds)
            ? record.boundObjectIds.filter((value) => typeof value === "string")
            : undefined;
        return {
            objectType,
            accessMode,
            syncEnabled: typeof record.syncEnabled === "boolean" ? record.syncEnabled : Boolean(syncDirection),
            syncDirection,
            boundObjectIds
        };
    });
}
async function resolveRequestedBindings(parsed) {
    const inline = readRawStringOptions(parsed.options["binding"]).map(parseBindingSpec);
    const filePath = (0, args_1.getOptionString)(parsed, "bindings-file");
    if (!filePath) {
        return inline;
    }
    const fromFile = await loadBindingsFile(filePath);
    return [...fromFile, ...inline];
}
function readRawStringOptions(value) {
    if (value === undefined) {
        return [];
    }
    if (Array.isArray(value)) {
        return value.filter((entry) => typeof entry === "string");
    }
    if (typeof value === "string") {
        return [value];
    }
    return [];
}
function mergeBindings(existingBindings, requestedBindings, replaceExisting) {
    if (replaceExisting) {
        return requestedBindings;
    }
    const byObjectType = new Map();
    for (const binding of existingBindings) {
        byObjectType.set(binding.objectType, binding);
    }
    for (const binding of requestedBindings) {
        byObjectType.set(binding.objectType, binding);
    }
    return Array.from(byObjectType.values());
}
async function handleCmsBind(parsed) {
    if ((0, args_1.getOptionBoolean)(parsed, "help")) {
        printUsage();
        return 0;
    }
    const command = await (0, shared_1.resolveCmsCommandContext)(parsed, { mutating: true });
    const requestedBindings = await resolveRequestedBindings(parsed);
    if (requestedBindings.length === 0) {
        throw new Error("No bindings provided. Use --binding or --bindings-file.");
    }
    const pagesResult = await command.api.getApplicationPages(command.applicationId);
    const pageIdFlag = (0, args_1.getOptionString)(parsed, "page-id");
    const pagePathFlag = (0, args_1.getOptionString)(parsed, "page-path");
    let pageId = pageIdFlag ?? "";
    if (!pageId) {
        if (!pagePathFlag) {
            throw new Error("Provide --page-id or --page-path.");
        }
        const match = pagesResult.pages.find((page) => page.path === pagePathFlag);
        if (!match) {
            throw new Error(`No application page found for path '${pagePathFlag}'.`);
        }
        pageId = match.id;
    }
    const existingPage = pagesResult.pages.find((page) => page.id === pageId);
    const existingBindings = Array.isArray(existingPage?.objectBindings)
        ? existingPage?.objectBindings
        : [];
    const replaceExisting = (0, args_1.getOptionBoolean)(parsed, "replace-existing");
    const finalBindings = mergeBindings(existingBindings, requestedBindings, replaceExisting);
    const dryRun = (0, args_1.getOptionBoolean)(parsed, "dry-run");
    if (!dryRun) {
        await command.api.updatePageBindings(pageId, finalBindings);
    }
    if (command.json) {
        console.log(JSON.stringify({
            success: true,
            dryRun,
            profile: command.profile,
            organizationId: command.organizationId,
            applicationId: command.applicationId,
            pageId,
            replaceExisting,
            bindings: finalBindings
        }, null, 2));
        return 0;
    }
    console.log((0, colors_1.colorGreen)("CMS page bindings updated."));
    console.log((0, colors_1.colorGray)(`Application: ${command.applicationId}`));
    console.log((0, colors_1.colorGray)(`Page: ${pageId}`));
    if (dryRun) {
        console.log((0, colors_1.colorGray)("Dry-run: no backend update applied."));
    }
    if ((0, shared_1.toComparableBindings)(existingBindings) !== (0, shared_1.toComparableBindings)(finalBindings)) {
        console.log((0, colors_1.colorGray)(`Bindings count: ${finalBindings.length}`));
    }
    else {
        console.log((0, colors_1.colorGray)("Bindings unchanged."));
    }
    return 0;
}
//# sourceMappingURL=bind.js.map