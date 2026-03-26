import fs from "node:fs/promises";
import path from "node:path";
import {
  type EnvLine,
  normalizeEnvValue,
  parseEnvText,
  renderEnvAssignment,
  serializeEnv
} from "./env-parser";
import { type EnvChange } from "./env-diff";

export type EnvWriteMode = "upsert" | "replace-key" | "full-rewrite";

export interface ManagedEnvUpdate {
  key: string;
  value: string;
}

export interface EnvWriteOptions {
  mode?: EnvWriteMode;
  dryRun?: boolean;
  backupPath?: string;
  allowFullRewrite?: boolean;
}

export interface EnvWriteResult {
  filePath: string;
  mode: EnvWriteMode;
  changes: EnvChange[];
  applied: boolean;
  backupPath?: string;
  nextContent: string;
}

function resolveMode(options: EnvWriteOptions): EnvWriteMode {
  return options.mode ?? "upsert";
}

function ensureUniqueUpdates(updates: ManagedEnvUpdate[]): ManagedEnvUpdate[] {
  const map = new Map<string, string>();
  for (const update of updates) {
    map.set(update.key, update.value);
  }

  return Array.from(map.entries()).map(([key, value]) => ({ key, value }));
}

function findEntryIndex(lines: EnvLine[], key: string): number {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.kind === "entry" && line.key === key) {
      return index;
    }
  }

  return -1;
}

function appendManagedEntries(lines: EnvLine[], entries: EnvLine[]): EnvLine[] {
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

  const hasManagedMarker = next.some(
    (line) => line.kind === "comment" && line.raw.trim() === "# Added by sevenlayers CLI"
  );
  if (!hasManagedMarker) {
    next.push({ kind: "comment", raw: "# Added by sevenlayers CLI" });
  }

  next.push(...entries);
  return next;
}

function buildFullRewriteLines(updates: ManagedEnvUpdate[]): EnvLine[] {
  return updates
    .slice()
    .sort((left, right) => left.key.localeCompare(right.key))
    .map((update) => ({
      kind: "entry" as const,
      raw: renderEnvAssignment(update.key, update.value),
      key: update.key,
      value: update.value,
      hasExport: false
    }));
}

function nextTmpPath(filePath: string): string {
  const directory = path.dirname(filePath);
  const basename = path.basename(filePath);
  return path.join(directory, `.${basename}.tmp-${process.pid}-${Date.now()}`);
}

export async function writeEnvFile(
  filePath: string,
  updatesInput: ManagedEnvUpdate[],
  options: EnvWriteOptions = {}
): Promise<EnvWriteResult> {
  const mode = resolveMode(options);
  if (mode === "full-rewrite" && !options.allowFullRewrite) {
    throw new Error(
      "full-rewrite mode is blocked by default. Re-run with allowFullRewrite=true to proceed."
    );
  }

  const updates = ensureUniqueUpdates(updatesInput);
  const targetFile = path.resolve(filePath);

  let existingContent = "";
  let fileExists = false;
  try {
    existingContent = await fs.readFile(targetFile, "utf8");
    fileExists = true;
  } catch (error) {
    const readError = error as NodeJS.ErrnoException;
    if (readError.code !== "ENOENT") {
      throw readError;
    }
  }

  const parsed = parseEnvText(existingContent);
  const changes: EnvChange[] = [];

  if (mode === "full-rewrite") {
    parsed.lines = buildFullRewriteLines(updates);
    parsed.hadTrailingNewline = true;

    for (const update of updates) {
      changes.push({ type: "add", key: update.key, after: update.value });
    }
  } else {
    const entriesToAppend: EnvLine[] = [];

    for (const update of updates) {
      const entryIndex = findEntryIndex(parsed.lines, update.key);
      if (entryIndex === -1) {
        entriesToAppend.push({
          kind: "entry",
          raw: renderEnvAssignment(update.key, update.value),
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

      const beforeValue = normalizeEnvValue(current.value);
      const afterValue = normalizeEnvValue(update.value);

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
        raw: renderEnvAssignment(update.key, update.value, current.hasExport)
      };
      changes.push({ type: "update", key: update.key, before: beforeValue, after: afterValue });
    }

    parsed.lines = appendManagedEntries(parsed.lines, entriesToAppend);

    if (parsed.lines.length > 0) {
      parsed.hadTrailingNewline = true;
    }
  }

  const nextContent = serializeEnv(parsed);
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

  await fs.mkdir(path.dirname(targetFile), { recursive: true });

  let backupPath: string | undefined;
  if (fileExists) {
    backupPath = options.backupPath
      ? path.resolve(options.backupPath)
      : `${targetFile}.bak.${Date.now()}`;
    await fs.copyFile(targetFile, backupPath);
  }

  const tmpPath = nextTmpPath(targetFile);
  await fs.writeFile(tmpPath, nextContent, "utf8");
  await fs.rename(tmpPath, targetFile);

  return {
    filePath: targetFile,
    mode,
    changes,
    applied: true,
    backupPath,
    nextContent
  };
}
