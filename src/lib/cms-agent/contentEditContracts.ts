import type {
  CmsOperationClass,
  CmsRequestRiskTier,
} from "./policyContracts";

export type CmsJsonValue =
  | string
  | number
  | boolean
  | null
  | CmsJsonValue[]
  | { [key: string]: CmsJsonValue };

export type CmsJsonPatchOperation =
  | {
      op: "replace";
      path: string;
      value: CmsJsonValue;
    }
  | {
      op: "remove";
      path: string;
    };

export type CmsContentEditSelector =
  | {
      type: "json_pointer";
      filePath: string;
      pointer: string;
    }
  | {
      type: "content_key";
      key: string;
      locale?: string;
      filePathPattern?: string;
    };

export type CmsContentEditInstruction =
  | {
      op: "replace";
      selector: CmsContentEditSelector;
      value: CmsJsonValue;
    }
  | {
      op: "remove";
      selector: CmsContentEditSelector;
    };

export type CmsContentEditIntent = {
  targetAppPath: string;
  riskTier: CmsRequestRiskTier;
  operationClass: CmsOperationClass;
  edits: CmsContentEditInstruction[];
};

export type CmsContentEditIntentPayload = {
  edits: CmsContentEditInstruction[];
};

export type CmsContentDocumentInput = {
  filePath: string;
  content: Record<string, CmsJsonValue>;
};

export type CmsCompilerErrorCode =
  | "invalid_intent"
  | "invalid_target"
  | "ambiguous_selector"
  | "policy_denied";

export class CmsContentCompilerError extends Error {
  code: CmsCompilerErrorCode;
  details?: Record<string, unknown>;

  constructor(
    code: CmsCompilerErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "CmsContentCompilerError";
    this.code = code;
    this.details = details;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePath(value: string): string {
  return value
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/");
}

export function normalizeCmsPath(value: string): string {
  return normalizePath(value);
}

export function parseCmsContentEditIntentPayload(
  payload: unknown
): CmsContentEditIntentPayload {
  if (!isRecord(payload) || !Array.isArray(payload.edits) || payload.edits.length === 0) {
    throw new CmsContentCompilerError(
      "invalid_intent",
      "CMS content edit payload must include a non-empty edits array"
    );
  }

  const edits = payload.edits.map((edit, index) => parseEditInstruction(edit, index));
  return { edits };
}

function parseEditInstruction(
  value: unknown,
  index: number
): CmsContentEditInstruction {
  if (!isRecord(value)) {
    throw new CmsContentCompilerError(
      "invalid_intent",
      `Edit at index ${index} must be an object`
    );
  }

  const op = normalizeString(value.op);
  if (op !== "replace" && op !== "remove") {
    throw new CmsContentCompilerError(
      "invalid_intent",
      `Edit at index ${index} has unsupported op: ${String(value.op)}`
    );
  }

  const selector = parseSelector(value.selector, index);
  if (op === "replace") {
    if (!("value" in value)) {
      throw new CmsContentCompilerError(
        "invalid_intent",
        `Replace edit at index ${index} must include a value`
      );
    }
    return {
      op: "replace",
      selector,
      value: value.value as CmsJsonValue,
    };
  }

  return {
    op: "remove",
    selector,
  };
}

function parseSelector(value: unknown, index: number): CmsContentEditSelector {
  if (!isRecord(value)) {
    throw new CmsContentCompilerError(
      "invalid_intent",
      `Edit selector at index ${index} must be an object`
    );
  }

  const selectorType = normalizeString(value.type);
  if (selectorType === "json_pointer") {
    const filePath = normalizePath(normalizeString(value.filePath));
    const pointer = normalizeString(value.pointer);

    if (!filePath || !pointer) {
      throw new CmsContentCompilerError(
        "invalid_intent",
        `json_pointer selector at index ${index} must include filePath and pointer`
      );
    }

    return {
      type: "json_pointer",
      filePath,
      pointer,
    };
  }

  if (selectorType === "content_key") {
    const key = normalizeString(value.key);
    const locale = normalizeString(value.locale);
    const filePathPattern = normalizePath(normalizeString(value.filePathPattern));
    if (!key) {
      throw new CmsContentCompilerError(
        "invalid_intent",
        `content_key selector at index ${index} must include key`
      );
    }

    return {
      type: "content_key",
      key,
      locale: locale || undefined,
      filePathPattern: filePathPattern || undefined,
    };
  }

  throw new CmsContentCompilerError(
    "invalid_intent",
    `Edit selector at index ${index} has unsupported type: ${String(value.type)}`
  );
}
