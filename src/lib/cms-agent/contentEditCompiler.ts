import {
  CmsContentCompilerError,
  type CmsContentDocumentInput,
  type CmsContentEditInstruction,
  type CmsContentEditIntent,
  type CmsContentEditIntentPayload,
  type CmsJsonPatchOperation,
  type CmsJsonValue,
  normalizeCmsPath,
  parseCmsContentEditIntentPayload,
} from "./contentEditContracts";
import type { CmsPolicyDecision } from "./policyContracts";
import { evaluateCmsPolicyForRequest } from "./policyLoader";

type NormalizedDocument = {
  filePath: string;
  content: Record<string, CmsJsonValue>;
};

type ResolvedEdit = {
  op: CmsContentEditInstruction["op"];
  filePath: string;
  pointer: string;
  pathSegments: string[];
  value?: CmsJsonValue;
};

export type CmsCompiledPatchFile = {
  filePath: string;
  operations: CmsJsonPatchOperation[];
};

export type CmsRepoFileChange = {
  filePath: string;
  nextContent: string;
};

export type CmsContentCompileResult = {
  normalizedIntent: CmsContentEditIntent;
  touchedFiles: string[];
  policyDecision: CmsPolicyDecision;
  patches: CmsCompiledPatchFile[];
  repoChanges: CmsRepoFileChange[];
};

export function compileCmsContentEditIntent(
  intent: CmsContentEditIntent,
  documents: CmsContentDocumentInput[]
): CmsContentCompileResult {
  const normalizedIntent = normalizeIntent(intent);
  const normalizedDocuments = normalizeDocuments(documents);
  const resolvedEdits = normalizedIntent.edits
    .map((edit) => resolveEditTarget(normalizedIntent.targetAppPath, edit, normalizedDocuments))
    .sort(compareResolvedEdits);

  rejectConflictingTargets(resolvedEdits);

  const touchedFiles = uniqueSorted(resolvedEdits.map((entry) => entry.filePath));
  const policyDecision = evaluateCmsPolicyForRequest({
    targetAppPath: normalizedIntent.targetAppPath,
    operationClass: normalizedIntent.operationClass,
    touchedFiles,
    riskTier: normalizedIntent.riskTier,
  });

  if (!policyDecision.allowed) {
    throw new CmsContentCompilerError(
      "policy_denied",
      `CMS content edit compiler denied by policy (${policyDecision.reason})`,
      {
        reason: policyDecision.reason,
        blockedFilePath: policyDecision.blockedFilePath,
        matchedPolicyPath: policyDecision.matchedPolicyPath,
      }
    );
  }

  const contentByPath = new Map<string, Record<string, CmsJsonValue>>();
  for (const document of normalizedDocuments) {
    contentByPath.set(document.filePath, cloneJsonValue(document.content) as Record<string, CmsJsonValue>);
  }

  const operationsByFile = new Map<string, CmsJsonPatchOperation[]>();
  for (const resolved of resolvedEdits) {
    const document = contentByPath.get(resolved.filePath);
    if (!document) {
      throw new CmsContentCompilerError(
        "invalid_target",
        `Document not found during compile for ${resolved.filePath}`
      );
    }

    if (resolved.op === "remove") {
      removeAtPath(document, resolved.pathSegments, resolved.filePath, resolved.pointer);
      const operations = operationsByFile.get(resolved.filePath) || [];
      operations.push({
        op: "remove",
        path: resolved.pointer,
      });
      operationsByFile.set(resolved.filePath, operations);
      continue;
    }

    if (typeof resolved.value === "undefined") {
      throw new CmsContentCompilerError(
        "invalid_intent",
        `Replace edit for ${resolved.filePath}${resolved.pointer} is missing value`
      );
    }

    replaceAtPath(
      document,
      resolved.pathSegments,
      cloneJsonValue(resolved.value),
      resolved.filePath,
      resolved.pointer
    );
    const operations = operationsByFile.get(resolved.filePath) || [];
    operations.push({
      op: "replace",
      path: resolved.pointer,
      value: cloneJsonValue(resolved.value),
    });
    operationsByFile.set(resolved.filePath, operations);
  }

  const patchFiles = [...operationsByFile.entries()]
    .map(([filePath, operations]) => ({
      filePath,
      operations,
    }))
    .sort((a, b) => a.filePath.localeCompare(b.filePath));

  const repoChanges = touchedFiles.map((filePath) => {
    const nextDocument = contentByPath.get(filePath);
    if (!nextDocument) {
      throw new CmsContentCompilerError(
        "invalid_target",
        `Document not found for repo change generation: ${filePath}`
      );
    }
    return {
      filePath,
      nextContent: `${JSON.stringify(sortJsonValue(nextDocument), null, 2)}\n`,
    };
  });

  return {
    normalizedIntent,
    touchedFiles,
    policyDecision,
    patches: patchFiles,
    repoChanges,
  };
}

export function compileCmsContentEditPayload(args: {
  targetAppPath: string;
  riskTier: CmsContentEditIntent["riskTier"];
  operationClass: CmsContentEditIntent["operationClass"];
  intentPayload: unknown;
  documents: CmsContentDocumentInput[];
}): CmsContentCompileResult {
  const parsedPayload = parseCmsContentEditIntentPayload(args.intentPayload);
  return compileCmsContentEditIntent(
    {
      targetAppPath: args.targetAppPath,
      riskTier: args.riskTier,
      operationClass: args.operationClass,
      edits: parsedPayload.edits,
    },
    args.documents
  );
}

export function createCmsContentIntentPayloadFromEdits(
  edits: CmsContentEditIntentPayload["edits"]
): CmsContentEditIntentPayload {
  return {
    edits,
  };
}

function normalizeIntent(intent: CmsContentEditIntent): CmsContentEditIntent {
  const targetAppPath = normalizeCmsPath(intent.targetAppPath);
  if (!targetAppPath) {
    throw new CmsContentCompilerError(
      "invalid_intent",
      "CMS content edit intent targetAppPath must be a non-empty path"
    );
  }

  if (!Array.isArray(intent.edits) || intent.edits.length === 0) {
    throw new CmsContentCompilerError(
      "invalid_intent",
      "CMS content edit intent must include at least one edit"
    );
  }

  const normalizedEdits = [...intent.edits]
    .map((edit) => normalizeEditInstruction(edit))
    .sort(compareNormalizedEdits);

  return {
    targetAppPath,
    riskTier: intent.riskTier,
    operationClass: intent.operationClass,
    edits: normalizedEdits,
  };
}

function normalizeDocuments(documents: CmsContentDocumentInput[]): NormalizedDocument[] {
  if (!Array.isArray(documents) || documents.length === 0) {
    throw new CmsContentCompilerError(
      "invalid_intent",
      "CMS content edit compiler requires at least one content document"
    );
  }

  const normalized = documents.map((document) => {
    const filePath = normalizeCmsPath(document.filePath);
    if (!filePath || !isRecord(document.content)) {
      throw new CmsContentCompilerError(
        "invalid_intent",
        `Invalid content document input for file: ${String(document.filePath)}`
      );
    }
    return {
      filePath,
      content: cloneJsonValue(document.content) as Record<string, CmsJsonValue>,
    };
  });

  const uniquePaths = new Set<string>();
  for (const document of normalized) {
    if (uniquePaths.has(document.filePath)) {
      throw new CmsContentCompilerError(
        "invalid_intent",
        `Duplicate content document path detected: ${document.filePath}`
      );
    }
    uniquePaths.add(document.filePath);
  }

  normalized.sort((a, b) => a.filePath.localeCompare(b.filePath));
  return normalized;
}

function normalizeEditInstruction(
  edit: CmsContentEditInstruction
): CmsContentEditInstruction {
  if (edit.op === "replace") {
    return {
      op: "replace",
      selector: normalizeSelector(edit.selector),
      value: cloneJsonValue(edit.value),
    };
  }

  return {
    op: "remove",
    selector: normalizeSelector(edit.selector),
  };
}

function normalizeSelector(selector: CmsContentEditInstruction["selector"]) {
  if (selector.type === "json_pointer") {
    const filePath = normalizeCmsPath(selector.filePath);
    const pointer = normalizePointer(selector.pointer);
    return {
      type: "json_pointer" as const,
      filePath,
      pointer,
    };
  }

  const locale = selector.locale?.trim().toLowerCase();
  return {
    type: "content_key" as const,
    key: normalizeContentKey(selector.key),
    locale: locale || undefined,
    filePathPattern: selector.filePathPattern
      ? normalizeCmsPath(selector.filePathPattern)
      : undefined,
  };
}

function normalizePointer(pointer: string): string {
  const trimmed = pointer.trim();
  if (!trimmed) {
    throw new CmsContentCompilerError(
      "invalid_intent",
      "JSON pointer selector must provide a non-empty pointer"
    );
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function normalizeContentKey(key: string): string {
  const normalized = key.trim();
  if (!normalized) {
    throw new CmsContentCompilerError(
      "invalid_intent",
      "content_key selector must provide a non-empty key"
    );
  }
  return normalized;
}

function compareNormalizedEdits(
  left: CmsContentEditInstruction,
  right: CmsContentEditInstruction
): number {
  return canonicalEditKey(left).localeCompare(canonicalEditKey(right));
}

function canonicalEditKey(edit: CmsContentEditInstruction): string {
  const opWeight = edit.op === "remove" ? "0" : "1";
  if (edit.selector.type === "json_pointer") {
    return [
      opWeight,
      "json_pointer",
      normalizeCmsPath(edit.selector.filePath),
      normalizePointer(edit.selector.pointer),
      edit.op === "replace" ? JSON.stringify(sortJsonValue(edit.value)) : "",
    ].join("|");
  }

  return [
    opWeight,
    "content_key",
    normalizeContentKey(edit.selector.key),
    edit.selector.locale?.toLowerCase() || "",
    edit.selector.filePathPattern ? normalizeCmsPath(edit.selector.filePathPattern) : "",
    edit.op === "replace" ? JSON.stringify(sortJsonValue(edit.value)) : "",
  ].join("|");
}

function resolveEditTarget(
  targetAppPath: string,
  edit: CmsContentEditInstruction,
  documents: NormalizedDocument[]
): ResolvedEdit {
  const selector = edit.selector;
  if (selector.type === "json_pointer") {
    const targetPath = normalizeCmsPath(selector.filePath);
    const pointer = normalizePointer(selector.pointer);
    const document = documents.find((entry) => entry.filePath === targetPath);
    if (!document) {
      throw new CmsContentCompilerError(
        "invalid_target",
        `json_pointer selector target file not found: ${targetPath}`
      );
    }

    assertPathUnderApp(targetAppPath, targetPath);
    const segments = decodePointerSegments(pointer);
    assertPathExists(document.content, segments, targetPath, pointer);

    return {
      op: edit.op,
      filePath: targetPath,
      pointer: buildPointer(segments),
      pathSegments: segments,
      value: edit.op === "replace" ? cloneJsonValue(edit.value) : undefined,
    };
  }

  const contentSelector = selector;
  const keySegments = decodeKeySegments(contentSelector.key);
  const candidates = documents
    .filter((entry) => isPathWithinApp(targetAppPath, entry.filePath))
    .filter((entry) =>
      contentSelector.locale
        ? extractLocaleFromPath(entry.filePath) === contentSelector.locale
        : true
    )
    .filter((entry) =>
      contentSelector.filePathPattern
        ? matchesPathPattern(entry.filePath, contentSelector.filePathPattern)
        : true
    )
    .filter((entry) => hasPath(entry.content, keySegments));

  if (candidates.length === 0) {
    throw new CmsContentCompilerError(
      "invalid_target",
      `content_key selector did not resolve any target for key "${contentSelector.key}"`,
      {
        key: contentSelector.key,
        locale: contentSelector.locale,
        filePathPattern: contentSelector.filePathPattern,
      }
    );
  }

  if (candidates.length > 1) {
    throw new CmsContentCompilerError(
      "ambiguous_selector",
      `content_key selector matched multiple targets for key "${contentSelector.key}"`,
      {
        key: contentSelector.key,
        locale: contentSelector.locale,
        filePathPattern: contentSelector.filePathPattern,
        candidateFilePaths: candidates.map((candidate) => candidate.filePath).sort(),
      }
    );
  }

  const candidate = candidates[0];
  const pointer = buildPointer(keySegments);
  return {
    op: edit.op,
    filePath: candidate.filePath,
    pointer,
    pathSegments: keySegments,
    value: edit.op === "replace" ? cloneJsonValue(edit.value) : undefined,
  };
}

function decodeKeySegments(key: string): string[] {
  const segments = key
    .split(".")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (segments.length === 0) {
    throw new CmsContentCompilerError(
      "invalid_intent",
      "content_key selector key must contain at least one segment"
    );
  }
  return segments;
}

function compareResolvedEdits(left: ResolvedEdit, right: ResolvedEdit): number {
  const filePathComparison = left.filePath.localeCompare(right.filePath);
  if (filePathComparison !== 0) {
    return filePathComparison;
  }
  const pathComparison = left.pointer.localeCompare(right.pointer);
  if (pathComparison !== 0) {
    return pathComparison;
  }
  if (left.op === right.op) {
    if (left.op === "replace" && right.op === "replace") {
      return JSON.stringify(sortJsonValue(left.value as CmsJsonValue)).localeCompare(
        JSON.stringify(sortJsonValue(right.value as CmsJsonValue))
      );
    }
    return 0;
  }
  return left.op === "remove" ? -1 : 1;
}

function rejectConflictingTargets(resolvedEdits: ResolvedEdit[]): void {
  const seen = new Set<string>();
  for (const edit of resolvedEdits) {
    const key = `${edit.filePath}|${edit.pointer}`;
    if (seen.has(key)) {
      throw new CmsContentCompilerError(
        "invalid_intent",
        `Multiple edits target the same path: ${edit.filePath}${edit.pointer}`
      );
    }
    seen.add(key);
  }
}

function replaceAtPath(
  root: Record<string, CmsJsonValue>,
  segments: string[],
  value: CmsJsonValue,
  filePath: string,
  pointer: string
): void {
  const parent = getParentObject(root, segments, filePath, pointer);
  const key = segments[segments.length - 1];
  if (!(key in parent)) {
    throw new CmsContentCompilerError(
      "invalid_target",
      `Target path does not exist for replace: ${filePath}${pointer}`
    );
  }
  parent[key] = value;
}

function removeAtPath(
  root: Record<string, CmsJsonValue>,
  segments: string[],
  filePath: string,
  pointer: string
): void {
  const parent = getParentObject(root, segments, filePath, pointer);
  const key = segments[segments.length - 1];
  if (!(key in parent)) {
    throw new CmsContentCompilerError(
      "invalid_target",
      `Target path does not exist for remove: ${filePath}${pointer}`
    );
  }
  delete parent[key];
}

function getParentObject(
  root: Record<string, CmsJsonValue>,
  segments: string[],
  filePath: string,
  pointer: string
): Record<string, CmsJsonValue> {
  if (segments.length === 0) {
    throw new CmsContentCompilerError(
      "invalid_target",
      `Root-level edits are not allowed: ${filePath}${pointer}`
    );
  }

  let current: unknown = root;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    if (!isRecord(current) || !(segment in current)) {
      throw new CmsContentCompilerError(
        "invalid_target",
        `Target path does not exist: ${filePath}${pointer}`
      );
    }
    current = current[segment];
  }
  if (!isRecord(current)) {
    throw new CmsContentCompilerError(
      "invalid_target",
      `Target path parent is not an object: ${filePath}${pointer}`
    );
  }
  return current as Record<string, CmsJsonValue>;
}

function assertPathExists(
  root: Record<string, CmsJsonValue>,
  segments: string[],
  filePath: string,
  pointer: string
): void {
  if (!hasPath(root, segments)) {
    throw new CmsContentCompilerError(
      "invalid_target",
      `Target path does not exist: ${filePath}${pointer}`
    );
  }
}

function hasPath(root: Record<string, CmsJsonValue>, segments: string[]): boolean {
  let current: unknown = root;
  for (const segment of segments) {
    if (!isRecord(current) || !(segment in current)) {
      return false;
    }
    current = current[segment];
  }
  return true;
}

function buildPointer(segments: string[]): string {
  return `/${segments.map(escapePointerSegment).join("/")}`;
}

function decodePointerSegments(pointer: string): string[] {
  const normalized = normalizePointer(pointer);
  if (normalized === "/") {
    return [""];
  }
  return normalized
    .slice(1)
    .split("/")
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function escapePointerSegment(segment: string): string {
  return segment.replace(/~/g, "~0").replace(/\//g, "~1");
}

function assertPathUnderApp(targetAppPath: string, filePath: string): void {
  if (!isPathWithinApp(targetAppPath, filePath)) {
    throw new CmsContentCompilerError(
      "invalid_target",
      `Target file is outside target app path (${targetAppPath}): ${filePath}`
    );
  }
}

function isPathWithinApp(targetAppPath: string, filePath: string): boolean {
  return filePath === targetAppPath || filePath.startsWith(`${targetAppPath}/`);
}

function extractLocaleFromPath(filePath: string): string | null {
  const match = filePath.match(/\.([a-z]{2}(?:-[a-z]{2})?)\.json$/i);
  return match ? match[1].toLowerCase() : null;
}

function matchesPathPattern(filePath: string, pattern: string): boolean {
  const normalizedPattern = normalizeCmsPath(pattern);
  const normalizedPath = normalizeCmsPath(filePath);
  return globToRegExp(normalizedPattern).test(normalizedPath);
}

function globToRegExp(glob: string): RegExp {
  let pattern = "";
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    if (char === "*") {
      const next = glob[index + 1];
      const nextNext = glob[index + 2];
      if (next === "*") {
        if (nextNext === "/") {
          pattern += "(?:.*/)?";
          index += 2;
        } else {
          pattern += ".*";
          index += 1;
        }
      } else {
        pattern += "[^/]*";
      }
      continue;
    }
    if ("\\.^$+?()[]{}|".includes(char)) {
      pattern += `\\${char}`;
      continue;
    }
    pattern += char;
  }
  return new RegExp(`^${pattern}$`);
}

function sortJsonValue(value: CmsJsonValue): CmsJsonValue {
  if (Array.isArray(value)) {
    return value.map((entry) => sortJsonValue(entry));
  }
  if (isRecord(value)) {
    const sorted: Record<string, CmsJsonValue> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortJsonValue(value[key] as CmsJsonValue);
    }
    return sorted;
  }
  return value;
}

function cloneJsonValue(value: CmsJsonValue): CmsJsonValue {
  return JSON.parse(JSON.stringify(value)) as CmsJsonValue;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
