import "server-only";

type CmsContentValue = string | Record<string, unknown> | null;

type CmsContentRecordSource = {
  _id?: string;
  name: string;
  subtype?: string;
  locale?: string;
  value?: string;
  description?: string;
  status?: string;
  customProperties?: Record<string, unknown>;
  fileUrl?: string | null;
  imageMetadata?: Record<string, unknown> | null;
};

export interface CmsBridgeRecord {
  recordId: string | null;
  name: string;
  subtype: string;
  locale: string | null;
  resolvedLocale: string | null;
  value: CmsContentValue;
  description?: string;
  status?: string;
  customProperties?: Record<string, unknown>;
  fileUrl?: string | null;
  imageMetadata?: Record<string, unknown> | null;
}

interface SerializedCmsContentInput {
  value?: string | null;
  customProperties?: Record<string, unknown>;
}

const CMS_TEXT_WITH_LINKS_SCHEMA = "cms_text_with_links_v1";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeNullableString(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }
  return normalizeOptionalString(value);
}

function normalizeBoolean(value: string | null): boolean {
  if (!value) {
    return false;
  }
  return value === "1" || value.toLowerCase() === "true";
}

function normalizeLink(value: unknown): Record<string, unknown> | null {
  const candidate = asRecord(value);
  if (!candidate) {
    return null;
  }

  const id = normalizeOptionalString(candidate.id);
  const title = normalizeOptionalString(candidate.title);
  const url = normalizeOptionalString(candidate.url);

  if (!id || !title || !url) {
    return null;
  }

  const nextLink: Record<string, unknown> = {
    id,
    title,
    url,
  };

  const icon = normalizeOptionalString(candidate.icon);
  if (icon) {
    nextLink.icon = icon;
  }

  return nextLink;
}

function normalizeLinks(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => normalizeLink(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null);
}

export function buildCmsContentName(
  page: string,
  section: string,
  key: string
): string {
  return `${page.trim()}_${section.trim()}_${key.trim()}`;
}

export function parseBooleanFlag(value: string | null): boolean {
  return normalizeBoolean(value);
}

export function parseJsonObject(
  value: string | null | undefined,
  fieldName: string
): Record<string, unknown> | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value);
    return asRecord(parsed);
  } catch {
    throw new Error(`${fieldName} must be valid JSON`);
  }
}

export function createEmptyCmsRecord(args: {
  name: string;
  subtype?: string;
}): CmsBridgeRecord {
  return {
    recordId: null,
    name: args.name,
    subtype: args.subtype || "text",
    locale: null,
    resolvedLocale: null,
    value: null,
    description: undefined,
    status: undefined,
    customProperties: undefined,
    fileUrl: null,
    imageMetadata: null,
  };
}

function deserializeCmsValue(record: CmsContentRecordSource): CmsContentValue {
  const customProperties = asRecord(record.customProperties);

  if (record.subtype === "text_with_links") {
    return {
      text: record.value ?? "",
      links: normalizeLinks(customProperties?.links),
    };
  }

  const valueJson = asRecord(customProperties?.valueJson);
  if (valueJson) {
    return valueJson;
  }

  return record.value ?? null;
}

export function toCmsBridgeRecord(
  record: CmsContentRecordSource,
  args?: {
    fallbackName?: string;
    fallbackSubtype?: string;
    resolvedLocale?: string | null;
  }
): CmsBridgeRecord {
  return {
    recordId: record._id ?? null,
    name: record.name || args?.fallbackName || "",
    subtype: record.subtype || args?.fallbackSubtype || "text",
    locale: normalizeOptionalString(record.locale) || null,
    resolvedLocale:
      args?.resolvedLocale ?? (normalizeOptionalString(record.locale) || null),
    value: deserializeCmsValue(record),
    description: record.description,
    status: record.status,
    customProperties: asRecord(record.customProperties),
    fileUrl: record.fileUrl ?? null,
    imageMetadata: record.imageMetadata ?? null,
  };
}

export function serializeCmsContentInput(args: {
  subtype: string;
  value: unknown;
  customProperties?: Record<string, unknown>;
}): SerializedCmsContentInput {
  if (args.subtype === "text") {
    if (typeof args.value !== "string") {
      throw new Error("Text CMS content requires a string value");
    }

    return {
      value: args.value,
      customProperties: args.customProperties,
    };
  }

  if (args.subtype === "text_with_links") {
    const candidate = asRecord(args.value);
    const text =
      normalizeOptionalString(candidate?.text) ||
      (typeof args.value === "string" ? args.value : "") ||
      "";

    return {
      value: text,
      customProperties: {
        ...(args.customProperties || {}),
        contentSchema: CMS_TEXT_WITH_LINKS_SCHEMA,
        links: normalizeLinks(candidate?.links),
      },
    };
  }

  if (args.value === null || typeof args.value === "string") {
    return {
      value: args.value,
      customProperties: args.customProperties,
    };
  }

  const valueRecord = asRecord(args.value);
  if (!valueRecord) {
    throw new Error(`Unsupported CMS content payload for subtype "${args.subtype}"`);
  }

  return {
    value: normalizeNullableString(valueRecord.text) ?? null,
    customProperties: {
      ...(args.customProperties || {}),
      valueJson: valueRecord,
    },
  };
}
