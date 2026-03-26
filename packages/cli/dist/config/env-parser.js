"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseEnvText = parseEnvText;
exports.renderEnvValue = renderEnvValue;
exports.renderEnvAssignment = renderEnvAssignment;
exports.normalizeEnvValue = normalizeEnvValue;
exports.serializeEnv = serializeEnv;
const ASSIGNMENT_PATTERN = /^\s*(export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/;
function parseEnvText(content) {
    const normalized = content.replace(/\r\n/g, "\n");
    const hadTrailingNewline = normalized.endsWith("\n");
    const rawLines = normalized.length === 0 ? [] : normalized.split("\n");
    if (hadTrailingNewline) {
        rawLines.pop();
    }
    const lines = rawLines.map((line) => {
        if (line.trim().length === 0) {
            return { kind: "blank", raw: line };
        }
        if (/^\s*#/.test(line)) {
            return { kind: "comment", raw: line };
        }
        const assignment = line.match(ASSIGNMENT_PATTERN);
        if (!assignment) {
            return { kind: "unknown", raw: line };
        }
        return {
            kind: "entry",
            raw: line,
            hasExport: Boolean(assignment[1]),
            key: assignment[2],
            value: assignment[3].trim()
        };
    });
    return { lines, hadTrailingNewline };
}
function renderEnvValue(value) {
    if (/^[A-Za-z0-9_./:@-]+$/.test(value)) {
        return value;
    }
    return JSON.stringify(value);
}
function renderEnvAssignment(key, value, hasExport = false) {
    const exportPrefix = hasExport ? "export " : "";
    return `${exportPrefix}${key}=${renderEnvValue(value)}`;
}
function normalizeEnvValue(value) {
    const trimmed = value.trim();
    if (trimmed.length >= 2 &&
        ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
            (trimmed.startsWith("'") && trimmed.endsWith("'")))) {
        return trimmed.slice(1, -1);
    }
    return trimmed;
}
function serializeEnv(parsed) {
    if (parsed.lines.length === 0) {
        return "";
    }
    const body = parsed.lines
        .map((line) => {
        if (line.kind === "entry") {
            return line.raw;
        }
        return line.raw;
    })
        .join("\n");
    return parsed.hadTrailingNewline ? `${body}\n` : body;
}
//# sourceMappingURL=env-parser.js.map