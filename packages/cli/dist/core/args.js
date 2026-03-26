"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseArgv = parseArgv;
exports.getOptionString = getOptionString;
exports.getOptionBoolean = getOptionBoolean;
exports.hasOption = hasOption;
exports.getOptionStringArray = getOptionStringArray;
function addOption(options, key, value) {
    const existing = options[key];
    if (existing === undefined) {
        options[key] = value;
        return;
    }
    if (Array.isArray(existing)) {
        existing.push(String(value));
        options[key] = existing;
        return;
    }
    options[key] = [String(existing), String(value)];
}
function parseArgv(argv) {
    const positionals = [];
    const options = {};
    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === "--") {
            positionals.push(...argv.slice(index + 1));
            break;
        }
        if (!token.startsWith("--")) {
            positionals.push(token);
            continue;
        }
        const withoutPrefix = token.slice(2);
        const equalsIndex = withoutPrefix.indexOf("=");
        if (equalsIndex > -1) {
            const key = withoutPrefix.slice(0, equalsIndex);
            const value = withoutPrefix.slice(equalsIndex + 1);
            addOption(options, key, value);
            continue;
        }
        const key = withoutPrefix;
        const next = argv[index + 1];
        if (next && !next.startsWith("--")) {
            addOption(options, key, next);
            index += 1;
            continue;
        }
        addOption(options, key, true);
    }
    return { positionals, options };
}
function getOptionString(parsed, key) {
    const value = parsed.options[key];
    if (value === undefined) {
        return undefined;
    }
    if (Array.isArray(value)) {
        return value.length > 0 ? String(value[value.length - 1]) : undefined;
    }
    if (typeof value === "boolean") {
        return undefined;
    }
    return value;
}
function getOptionBoolean(parsed, key) {
    const value = parsed.options[key];
    if (value === undefined) {
        return false;
    }
    if (Array.isArray(value)) {
        return value.length > 0;
    }
    if (typeof value === "string") {
        const normalized = value.toLowerCase();
        if (normalized === "false" || normalized === "0" || normalized === "no") {
            return false;
        }
        return true;
    }
    return value;
}
function hasOption(parsed, key) {
    return parsed.options[key] !== undefined;
}
function getOptionStringArray(parsed, key) {
    const value = parsed.options[key];
    if (value === undefined) {
        return [];
    }
    const rawValues = Array.isArray(value) ? value : [value];
    const results = [];
    for (const rawValue of rawValues) {
        if (typeof rawValue !== "string") {
            continue;
        }
        for (const piece of rawValue.split(",")) {
            const normalized = piece.trim();
            if (normalized.length > 0) {
                results.push(normalized);
            }
        }
    }
    return results;
}
//# sourceMappingURL=args.js.map