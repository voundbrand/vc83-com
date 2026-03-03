import type {
  CmsContentDocumentInput,
  CmsJsonValue,
} from "./contentEditContracts";
import type { CmsContentCompileResult } from "./contentEditCompiler";

export const CMS_CONTENT_CHANGE_MANIFEST_VERSION = "cms_content_change_manifest.v1" as const;

export type CmsSemanticDiffChange = {
  filePath: string;
  path: string;
  op: "replace" | "remove";
  before: CmsJsonValue | null;
  after: CmsJsonValue | null;
};

export type CmsDiffUxContract = {
  canonicalKeyOrderingApplied: true;
  keyReorderingIsCosmetic: true;
  semanticChanges: CmsSemanticDiffChange[];
  semanticChangeCount: number;
};

export type CmsContentChangeManifest = {
  contractVersion: typeof CMS_CONTENT_CHANGE_MANIFEST_VERSION;
  targetAppPath: string;
  operationClass: CmsContentCompileResult["normalizedIntent"]["operationClass"];
  riskTier: CmsContentCompileResult["normalizedIntent"]["riskTier"];
  touchedFiles: string[];
  requiredVerifyProfiles: string[];
  patches: CmsContentCompileResult["patches"];
  diffUx: CmsDiffUxContract;
};

export function buildCmsContentChangeManifest(args: {
  compileResult: CmsContentCompileResult;
  beforeDocuments: CmsContentDocumentInput[];
}): CmsContentChangeManifest {
  const beforeByPath = new Map(
    args.beforeDocuments.map((document) => [document.filePath, document.content])
  );

  const semanticChanges: CmsSemanticDiffChange[] = [];
  for (const patchFile of args.compileResult.patches) {
    const beforeDocument = beforeByPath.get(patchFile.filePath) || {};
    for (const operation of patchFile.operations) {
      const beforeValue = getValueAtPointer(beforeDocument, operation.path);
      semanticChanges.push({
        filePath: patchFile.filePath,
        path: operation.path,
        op: operation.op,
        before: beforeValue,
        after: operation.op === "replace" ? cloneJsonValue(operation.value) : null,
      });
    }
  }

  semanticChanges.sort((left, right) => {
    const filePathComparison = left.filePath.localeCompare(right.filePath);
    if (filePathComparison !== 0) {
      return filePathComparison;
    }
    return left.path.localeCompare(right.path);
  });

  return {
    contractVersion: CMS_CONTENT_CHANGE_MANIFEST_VERSION,
    targetAppPath: args.compileResult.normalizedIntent.targetAppPath,
    operationClass: args.compileResult.normalizedIntent.operationClass,
    riskTier: args.compileResult.normalizedIntent.riskTier,
    touchedFiles: args.compileResult.touchedFiles,
    requiredVerifyProfiles: args.compileResult.policyDecision.requiredVerifyProfiles,
    patches: args.compileResult.patches,
    diffUx: {
      canonicalKeyOrderingApplied: true,
      keyReorderingIsCosmetic: true,
      semanticChanges,
      semanticChangeCount: semanticChanges.length,
    },
  };
}

function getValueAtPointer(
  root: Record<string, CmsJsonValue>,
  pointer: string
): CmsJsonValue | null {
  const normalized = pointer.startsWith("/") ? pointer : `/${pointer}`;
  const segments = normalized
    .slice(1)
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));

  let current: unknown = root;
  for (const segment of segments) {
    if (!isRecord(current) || !(segment in current)) {
      return null;
    }
    current = current[segment];
  }

  return cloneJsonValue((current as CmsJsonValue) ?? null);
}

function cloneJsonValue(value: CmsJsonValue): CmsJsonValue {
  return JSON.parse(JSON.stringify(value)) as CmsJsonValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
