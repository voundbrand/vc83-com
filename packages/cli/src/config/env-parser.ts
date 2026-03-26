export type EnvLine =
  | {
      kind: "blank" | "comment" | "unknown";
      raw: string;
    }
  | {
      kind: "entry";
      raw: string;
      key: string;
      value: string;
      hasExport: boolean;
    };

export interface ParsedEnvFile {
  lines: EnvLine[];
  hadTrailingNewline: boolean;
}

const ASSIGNMENT_PATTERN = /^\s*(export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/;

export function parseEnvText(content: string): ParsedEnvFile {
  const normalized = content.replace(/\r\n/g, "\n");
  const hadTrailingNewline = normalized.endsWith("\n");
  const rawLines = normalized.length === 0 ? [] : normalized.split("\n");

  if (hadTrailingNewline) {
    rawLines.pop();
  }

  const lines: EnvLine[] = rawLines.map((line) => {
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

export function renderEnvValue(value: string): string {
  if (/^[A-Za-z0-9_./:@-]+$/.test(value)) {
    return value;
  }

  return JSON.stringify(value);
}

export function renderEnvAssignment(key: string, value: string, hasExport = false): string {
  const exportPrefix = hasExport ? "export " : "";
  return `${exportPrefix}${key}=${renderEnvValue(value)}`;
}

export function normalizeEnvValue(value: string): string {
  const trimmed = value.trim();

  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export function serializeEnv(parsed: ParsedEnvFile): string {
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
