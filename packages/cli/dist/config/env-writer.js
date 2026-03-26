"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeEnvFile = writeEnvFile;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const env_parser_1 = require("./env-parser");
function resolveMode(options) {
    return options.mode ?? "upsert";
}
function ensureUniqueUpdates(updates) {
    const map = new Map();
    for (const update of updates) {
        map.set(update.key, update.value);
    }
    return Array.from(map.entries()).map(([key, value]) => ({ key, value }));
}
function findEntryIndex(lines, key) {
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        if (line.kind === "entry" && line.key === key) {
            return index;
        }
    }
    return -1;
}
function appendManagedEntries(lines, entries) {
    if (entries.length === 0) {
        return lines;
    }
    const next = [...lines];
    if (next.length > 0) {
        const last = next[next.length - 1];
        if (last.kind !== "blank") {
            next.push({ kind: "blank", raw: "" });
        }
    }
    const hasManagedMarker = next.some((line) => line.kind === "comment" && line.raw.trim() === "# Added by sevenlayers CLI");
    if (!hasManagedMarker) {
        next.push({ kind: "comment", raw: "# Added by sevenlayers CLI" });
    }
    next.push(...entries);
    return next;
}
function buildFullRewriteLines(updates) {
    return updates
        .slice()
        .sort((left, right) => left.key.localeCompare(right.key))
        .map((update) => ({
        kind: "entry",
        raw: (0, env_parser_1.renderEnvAssignment)(update.key, update.value),
        key: update.key,
        value: update.value,
        hasExport: false
    }));
}
function nextTmpPath(filePath) {
    const directory = node_path_1.default.dirname(filePath);
    const basename = node_path_1.default.basename(filePath);
    return node_path_1.default.join(directory, `.${basename}.tmp-${process.pid}-${Date.now()}`);
}
async function writeEnvFile(filePath, updatesInput, options = {}) {
    const mode = resolveMode(options);
    if (mode === "full-rewrite" && !options.allowFullRewrite) {
        throw new Error("full-rewrite mode is blocked by default. Re-run with allowFullRewrite=true to proceed.");
    }
    const updates = ensureUniqueUpdates(updatesInput);
    const targetFile = node_path_1.default.resolve(filePath);
    let existingContent = "";
    let fileExists = false;
    try {
        existingContent = await promises_1.default.readFile(targetFile, "utf8");
        fileExists = true;
    }
    catch (error) {
        const readError = error;
        if (readError.code !== "ENOENT") {
            throw readError;
        }
    }
    const parsed = (0, env_parser_1.parseEnvText)(existingContent);
    const changes = [];
    if (mode === "full-rewrite") {
        parsed.lines = buildFullRewriteLines(updates);
        parsed.hadTrailingNewline = true;
        for (const update of updates) {
            changes.push({ type: "add", key: update.key, after: update.value });
        }
    }
    else {
        const entriesToAppend = [];
        for (const update of updates) {
            const entryIndex = findEntryIndex(parsed.lines, update.key);
            if (entryIndex === -1) {
                entriesToAppend.push({
                    kind: "entry",
                    raw: (0, env_parser_1.renderEnvAssignment)(update.key, update.value),
                    key: update.key,
                    value: update.value,
                    hasExport: false
                });
                changes.push({ type: "add", key: update.key, after: update.value });
                continue;
            }
            const current = parsed.lines[entryIndex];
            if (current.kind !== "entry") {
                continue;
            }
            const beforeValue = (0, env_parser_1.normalizeEnvValue)(current.value);
            const afterValue = (0, env_parser_1.normalizeEnvValue)(update.value);
            if (beforeValue === afterValue) {
                changes.push({ type: "noop", key: update.key, before: beforeValue, after: afterValue });
                continue;
            }
            if (mode === "upsert") {
                changes.push({
                    type: "skip-existing",
                    key: update.key,
                    before: beforeValue,
                    after: afterValue,
                    reason: "existing value preserved in upsert mode"
                });
                continue;
            }
            parsed.lines[entryIndex] = {
                kind: "entry",
                key: update.key,
                value: update.value,
                hasExport: current.hasExport,
                raw: (0, env_parser_1.renderEnvAssignment)(update.key, update.value, current.hasExport)
            };
            changes.push({ type: "update", key: update.key, before: beforeValue, after: afterValue });
        }
        parsed.lines = appendManagedEntries(parsed.lines, entriesToAppend);
        if (parsed.lines.length > 0) {
            parsed.hadTrailingNewline = true;
        }
    }
    const nextContent = (0, env_parser_1.serializeEnv)(parsed);
    const shouldWrite = changes.some((change) => change.type === "add" || change.type === "update");
    if (options.dryRun || !shouldWrite) {
        return {
            filePath: targetFile,
            mode,
            changes,
            applied: false,
            nextContent
        };
    }
    await promises_1.default.mkdir(node_path_1.default.dirname(targetFile), { recursive: true });
    let backupPath;
    if (fileExists) {
        backupPath = options.backupPath
            ? node_path_1.default.resolve(options.backupPath)
            : `${targetFile}.bak.${Date.now()}`;
        await promises_1.default.copyFile(targetFile, backupPath);
    }
    const tmpPath = nextTmpPath(targetFile);
    await promises_1.default.writeFile(tmpPath, nextContent, "utf8");
    await promises_1.default.rename(tmpPath, targetFile);
    return {
        filePath: targetFile,
        mode,
        changes,
        applied: true,
        backupPath,
        nextContent
    };
}
//# sourceMappingURL=env-writer.js.map