import fs from "node:fs/promises";
import path from "node:path";

export interface CmsContentEntry {
  locale: string;
  lookupKey: string;
  value: string;
}

export interface CmsContentDocument {
  schemaVersion: "sevenlayers.cms.content.v1";
  generatedAt: string;
  source: string;
  entries: CmsContentEntry[];
}

export interface CmsParityIssue {
  type: "missing_field" | "missing_locale" | "missing_required_field" | "empty_value";
  locale?: string;
  lookupKey?: string;
  message: string;
}

export interface CmsParityReport {
  locales: string[];
  lookupKeys: string[];
  issues: CmsParityIssue[];
  complete: boolean;
}

function normalizeToken(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${label} cannot be empty.`);
  }
  return normalized;
}

export function normalizeCmsEntry(input: {
  locale: string;
  lookupKey: string;
  value?: string;
}): CmsContentEntry {
  return {
    locale: normalizeToken(input.locale, "locale"),
    lookupKey: normalizeToken(input.lookupKey, "lookupKey"),
    value: input.value ?? ""
  };
}

export async function readJsonFile(filePath: string): Promise<unknown> {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const raw = await fs.readFile(absolutePath, "utf8");
  return JSON.parse(raw) as unknown;
}

export async function writeJsonFile(filePath: string, payload: unknown): Promise<void> {
  const absolutePath = path.resolve(process.cwd(), filePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export function parseLegacyCmsInput(input: unknown): CmsContentEntry[] {
  if (Array.isArray(input)) {
    return input.map((entry) => parseLegacyEntry(entry));
  }

  if (!input || typeof input !== "object") {
    throw new Error("Legacy CMS input must be an object or array.");
  }

  const record = input as Record<string, unknown>;

  if (Array.isArray(record.entries)) {
    return record.entries.map((entry) => parseLegacyEntry(entry));
  }

  const entries: CmsContentEntry[] = [];
  for (const [locale, maybeFieldMap] of Object.entries(record)) {
    if (!maybeFieldMap || typeof maybeFieldMap !== "object" || Array.isArray(maybeFieldMap)) {
      continue;
    }
    for (const [lookupKey, value] of Object.entries(maybeFieldMap as Record<string, unknown>)) {
      entries.push(
        normalizeCmsEntry({
          locale,
          lookupKey,
          value: typeof value === "string" ? value : String(value ?? "")
        })
      );
    }
  }
  return entries;
}

function parseLegacyEntry(entry: unknown): CmsContentEntry {
  if (!entry || typeof entry !== "object") {
    throw new Error("Legacy CMS entries must be objects.");
  }
  const record = entry as Record<string, unknown>;
  const locale = typeof record.locale === "string" ? record.locale : "";
  const lookupKey = typeof record.lookupKey === "string"
    ? record.lookupKey
    : typeof record.key === "string"
      ? record.key
      : "";
  const value = typeof record.value === "string" ? record.value : String(record.value ?? "");
  return normalizeCmsEntry({ locale, lookupKey, value });
}

export function buildContentDocument(entries: CmsContentEntry[], source: string): CmsContentDocument {
  return {
    schemaVersion: "sevenlayers.cms.content.v1",
    generatedAt: new Date().toISOString(),
    source,
    entries: entries.map((entry) => normalizeCmsEntry(entry))
  };
}

export function parseContentDocument(input: unknown): CmsContentDocument {
  if (!input || typeof input !== "object") {
    throw new Error("CMS content document must be an object.");
  }
  const record = input as Record<string, unknown>;
  if (record.schemaVersion !== "sevenlayers.cms.content.v1") {
    throw new Error("Unsupported CMS content schema.");
  }
  if (!Array.isArray(record.entries)) {
    throw new Error("CMS content document requires entries array.");
  }
  return {
    schemaVersion: "sevenlayers.cms.content.v1",
    generatedAt:
      typeof record.generatedAt === "string" ? record.generatedAt : new Date().toISOString(),
    source: typeof record.source === "string" ? record.source : "unknown",
    entries: record.entries.map((entry) => parseLegacyEntry(entry))
  };
}

export function buildParityReport(args: {
  entries: CmsContentEntry[];
  requiredLocales?: string[];
  requiredLookupKeys?: string[];
  allowEmptyValues?: boolean;
}): CmsParityReport {
  const localeSet = new Set<string>();
  const keySet = new Set<string>();
  const valuesByLocale = new Map<string, Map<string, string>>();

  for (const entry of args.entries) {
    localeSet.add(entry.locale);
    keySet.add(entry.lookupKey);
    const bucket = valuesByLocale.get(entry.locale) ?? new Map<string, string>();
    bucket.set(entry.lookupKey, entry.value);
    valuesByLocale.set(entry.locale, bucket);
  }

  const locales = Array.from(localeSet).sort((left, right) => left.localeCompare(right));
  const lookupKeys = Array.from(keySet).sort((left, right) => left.localeCompare(right));
  const issues: CmsParityIssue[] = [];

  for (const locale of locales) {
    const values = valuesByLocale.get(locale) ?? new Map<string, string>();
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
