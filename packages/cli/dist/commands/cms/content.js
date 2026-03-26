"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCmsEntry = normalizeCmsEntry;
exports.readJsonFile = readJsonFile;
exports.writeJsonFile = writeJsonFile;
exports.parseLegacyCmsInput = parseLegacyCmsInput;
exports.buildContentDocument = buildContentDocument;
exports.parseContentDocument = parseContentDocument;
exports.buildParityReport = buildParityReport;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
function normalizeToken(value, label) {
    const normalized = value.trim();
    if (normalized.length === 0) {
        throw new Error(`${label} cannot be empty.`);
    }
    return normalized;
}
function normalizeCmsEntry(input) {
    return {
        locale: normalizeToken(input.locale, "locale"),
        lookupKey: normalizeToken(input.lookupKey, "lookupKey"),
        value: input.value ?? ""
    };
}
async function readJsonFile(filePath) {
    const absolutePath = node_path_1.default.resolve(process.cwd(), filePath);
    const raw = await promises_1.default.readFile(absolutePath, "utf8");
    return JSON.parse(raw);
}
async function writeJsonFile(filePath, payload) {
    const absolutePath = node_path_1.default.resolve(process.cwd(), filePath);
    await promises_1.default.mkdir(node_path_1.default.dirname(absolutePath), { recursive: true });
    await promises_1.default.writeFile(absolutePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}
function parseLegacyCmsInput(input) {
    if (Array.isArray(input)) {
        return input.map((entry) => parseLegacyEntry(entry));
    }
    if (!input || typeof input !== "object") {
        throw new Error("Legacy CMS input must be an object or array.");
    }
    const record = input;
    if (Array.isArray(record.entries)) {
        return record.entries.map((entry) => parseLegacyEntry(entry));
    }
    const entries = [];
    for (const [locale, maybeFieldMap] of Object.entries(record)) {
        if (!maybeFieldMap || typeof maybeFieldMap !== "object" || Array.isArray(maybeFieldMap)) {
            continue;
        }
        for (const [lookupKey, value] of Object.entries(maybeFieldMap)) {
            entries.push(normalizeCmsEntry({
                locale,
                lookupKey,
                value: typeof value === "string" ? value : String(value ?? "")
            }));
        }
    }
    return entries;
}
function parseLegacyEntry(entry) {
    if (!entry || typeof entry !== "object") {
        throw new Error("Legacy CMS entries must be objects.");
    }
    const record = entry;
    const locale = typeof record.locale === "string" ? record.locale : "";
    const lookupKey = typeof record.lookupKey === "string"
        ? record.lookupKey
        : typeof record.key === "string"
            ? record.key
            : "";
    const value = typeof record.value === "string" ? record.value : String(record.value ?? "");
    return normalizeCmsEntry({ locale, lookupKey, value });
}
function buildContentDocument(entries, source) {
    return {
        schemaVersion: "sevenlayers.cms.content.v1",
        generatedAt: new Date().toISOString(),
        source,
        entries: entries.map((entry) => normalizeCmsEntry(entry))
    };
}
function parseContentDocument(input) {
    if (!input || typeof input !== "object") {
        throw new Error("CMS content document must be an object.");
    }
    const record = input;
    if (record.schemaVersion !== "sevenlayers.cms.content.v1") {
        throw new Error("Unsupported CMS content schema.");
    }
    if (!Array.isArray(record.entries)) {
        throw new Error("CMS content document requires entries array.");
    }
    return {
        schemaVersion: "sevenlayers.cms.content.v1",
        generatedAt: typeof record.generatedAt === "string" ? record.generatedAt : new Date().toISOString(),
        source: typeof record.source === "string" ? record.source : "unknown",
        entries: record.entries.map((entry) => parseLegacyEntry(entry))
    };
}
function buildParityReport(args) {
    const localeSet = new Set();
    const keySet = new Set();
    const valuesByLocale = new Map();
    for (const entry of args.entries) {
        localeSet.add(entry.locale);
        keySet.add(entry.lookupKey);
        const bucket = valuesByLocale.get(entry.locale) ?? new Map();
        bucket.set(entry.lookupKey, entry.value);
        valuesByLocale.set(entry.locale, bucket);
    }
    const locales = Array.from(localeSet).sort((left, right) => left.localeCompare(right));
    const lookupKeys = Array.from(keySet).sort((left, right) => left.localeCompare(right));
    const issues = [];
    for (const locale of locales) {
        const values = valuesByLocale.get(locale) ?? new Map();
        for (const lookupKey of lookupKeys) {
            if (!values.has(lookupKey)) {
                issues.push({
                    type: "missing_field",
                    locale,
                    lookupKey,
                    message: `Locale '${locale}' is missing lookupKey '${lookupKey}'.`
                });
                continue;
            }
            if (!args.allowEmptyValues) {
                const value = values.get(lookupKey) ?? "";
                if (value.trim().length === 0) {
                    issues.push({
                        type: "empty_value",
                        locale,
                        lookupKey,
                        message: `Locale '${locale}' has empty value for '${lookupKey}'.`
                    });
                }
            }
        }
    }
    for (const requiredLocale of args.requiredLocales ?? []) {
        if (!localeSet.has(requiredLocale)) {
            issues.push({
                type: "missing_locale",
                locale: requiredLocale,
                message: `Required locale '${requiredLocale}' is missing.`
            });
        }
    }
    for (const requiredLookupKey of args.requiredLookupKeys ?? []) {
        if (!keySet.has(requiredLookupKey)) {
            issues.push({
                type: "missing_required_field",
                lookupKey: requiredLookupKey,
                message: `Required lookupKey '${requiredLookupKey}' is missing from all locales.`
            });
        }
    }
    return {
        locales,
        lookupKeys,
        issues,
        complete: issues.length === 0
    };
}
//# sourceMappingURL=content.js.map