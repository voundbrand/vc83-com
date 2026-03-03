export const CMS_AGENT_POLICY_CONTRACT_VERSION = "cms_agent_policy.v1" as const;
export const CMS_AGENT_GLOBAL_GUARDRAILS_CONTRACT_VERSION =
  "cms_agent_global_guardrails.v1" as const;

export const CMS_REQUEST_RISK_TIERS = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export const CMS_OPERATION_CLASSES = [
  "content_copy",
  "design_token",
  "layout_structure",
  "component_code",
  "integration_config",
  "dependency_mutation",
  "secret_mutation",
  "shell_execution",
] as const;

export const CMS_VERIFY_PROFILES = [
  "V-DOCS",
  "V-TYPE",
  "V-LINT",
  "V-UNIT",
  "V-REFERENCE-APP-TYPE",
  "V-REFERENCE-APP-BUILD",
  "V-CMS-LINT",
] as const;

export type CmsRequestRiskTier = (typeof CMS_REQUEST_RISK_TIERS)[number];
export type CmsOperationClass = (typeof CMS_OPERATION_CLASSES)[number];
export type CmsVerifyProfile = (typeof CMS_VERIFY_PROFILES)[number];

export interface CmsGlobalGuardrailsPolicy {
  contractVersion: typeof CMS_AGENT_GLOBAL_GUARDRAILS_CONTRACT_VERSION;
  defaultAction: "deny";
  blockedFileGlobs: string[];
  allowedVerifyProfiles: CmsVerifyProfile[];
  blockedOperationClasses: CmsOperationClass[];
}

export interface CmsAppPolicy {
  contractVersion: typeof CMS_AGENT_POLICY_CONTRACT_VERSION;
  appPath: string;
  defaultAction: "deny";
  allowedFileGlobs: string[];
  allowedOperationClasses: CmsOperationClass[];
  verifyProfilesByRiskTier: Record<CmsRequestRiskTier, CmsVerifyProfile[]>;
  notes?: string;
}

export interface CmsPolicyContracts {
  guardrails: CmsGlobalGuardrailsPolicy;
  appPolicies: CmsAppPolicy[];
}

export type CmsPolicyDecisionReason =
  | "allowed"
  | "missing_app_policy"
  | "operation_class_not_allowed"
  | "operation_class_blocked_by_global_guardrail"
  | "file_path_not_allowed"
  | "file_path_blocked_by_global_guardrail"
  | "invalid_verify_profile_policy";

export interface CmsPolicyDecision {
  allowed: boolean;
  reason: CmsPolicyDecisionReason;
  appPath: string;
  requiredVerifyProfiles: CmsVerifyProfile[];
  matchedPolicyPath?: string;
  blockedFilePath?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => normalizeString(entry))
    .filter((entry) => entry.length > 0);
}

function isRiskTier(value: string): value is CmsRequestRiskTier {
  return CMS_REQUEST_RISK_TIERS.includes(value as CmsRequestRiskTier);
}

function isOperationClass(value: string): value is CmsOperationClass {
  return CMS_OPERATION_CLASSES.includes(value as CmsOperationClass);
}

function isVerifyProfile(value: string): value is CmsVerifyProfile {
  return CMS_VERIFY_PROFILES.includes(value as CmsVerifyProfile);
}

function normalizePath(value: string): string {
  return value
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/");
}

function globToRegExp(glob: string): RegExp {
  const normalized = normalizePath(glob);
  let pattern = "";

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];

    if (char === "*") {
      const next = normalized[index + 1];
      const nextNext = normalized[index + 2];
      if (next === "*") {
        if (nextNext === "/") {
          // "**/" matches zero or more directory segments.
          pattern += "(?:.*/)?";
          index += 2;
        } else {
          // "**" matches any nested path segment.
          pattern += ".*";
          index += 1;
        }
      } else {
        // "*" matches a single path segment (without slash).
        pattern += "[^/]*";
      }
      continue;
    }

    if ("\\.^$+?()[]{}|".includes(char)) {
      pattern += `\\${char}`;
    } else {
      pattern += char;
    }
  }

  return new RegExp(`^${pattern}$`);
}

function matchesAnyGlob(path: string, globs: string[]): boolean {
  const normalizedPath = normalizePath(path);
  return globs.some((glob) => globToRegExp(glob).test(normalizedPath));
}

function getVerifyProfilesByRiskTier(
  value: unknown
): Record<CmsRequestRiskTier, CmsVerifyProfile[]> | null {
  if (!isRecord(value)) {
    return null;
  }

  const result: Partial<Record<CmsRequestRiskTier, CmsVerifyProfile[]>> = {};
  for (const tier of CMS_REQUEST_RISK_TIERS) {
    const entries = normalizeStringArray(value[tier]);
    if (entries.length === 0 || !entries.every(isVerifyProfile)) {
      return null;
    }
    result[tier] = entries;
  }

  return result as Record<CmsRequestRiskTier, CmsVerifyProfile[]>;
}

export function parseCmsGlobalGuardrailsPolicy(
  raw: unknown
): CmsGlobalGuardrailsPolicy | null {
  if (!isRecord(raw)) {
    return null;
  }

  const contractVersion = normalizeString(raw.contractVersion);
  const defaultAction = normalizeString(raw.defaultAction);
  const blockedFileGlobs = normalizeStringArray(raw.blockedFileGlobs);
  const allowedVerifyProfiles = normalizeStringArray(raw.allowedVerifyProfiles);
  const blockedOperationClasses = normalizeStringArray(raw.blockedOperationClasses);

  if (
    contractVersion !== CMS_AGENT_GLOBAL_GUARDRAILS_CONTRACT_VERSION ||
    defaultAction !== "deny" ||
    blockedFileGlobs.length === 0 ||
    allowedVerifyProfiles.length === 0 ||
    blockedOperationClasses.length === 0
  ) {
    return null;
  }

  if (
    !allowedVerifyProfiles.every(isVerifyProfile) ||
    !blockedOperationClasses.every(isOperationClass)
  ) {
    return null;
  }

  return {
    contractVersion: CMS_AGENT_GLOBAL_GUARDRAILS_CONTRACT_VERSION,
    defaultAction: "deny",
    blockedFileGlobs,
    allowedVerifyProfiles: allowedVerifyProfiles as CmsVerifyProfile[],
    blockedOperationClasses: blockedOperationClasses as CmsOperationClass[],
  };
}

export function parseCmsAppPolicy(raw: unknown): CmsAppPolicy | null {
  if (!isRecord(raw)) {
    return null;
  }

  const contractVersion = normalizeString(raw.contractVersion);
  const appPath = normalizePath(normalizeString(raw.appPath));
  const defaultAction = normalizeString(raw.defaultAction);
  const allowedFileGlobs = normalizeStringArray(raw.allowedFileGlobs);
  const allowedOperationClasses = normalizeStringArray(raw.allowedOperationClasses);
  const verifyProfilesByRiskTier = getVerifyProfilesByRiskTier(
    raw.verifyProfilesByRiskTier
  );
  const notes = normalizeString(raw.notes);

  if (
    contractVersion !== CMS_AGENT_POLICY_CONTRACT_VERSION ||
    !appPath ||
    defaultAction !== "deny" ||
    allowedFileGlobs.length === 0 ||
    allowedOperationClasses.length === 0 ||
    !verifyProfilesByRiskTier
  ) {
    return null;
  }

  if (!allowedOperationClasses.every(isOperationClass)) {
    return null;
  }

  return {
    contractVersion: CMS_AGENT_POLICY_CONTRACT_VERSION,
    appPath,
    defaultAction: "deny",
    allowedFileGlobs,
    allowedOperationClasses: allowedOperationClasses as CmsOperationClass[],
    verifyProfilesByRiskTier,
    notes: notes || undefined,
  };
}

export function validateCmsPolicyContracts(
  contracts: CmsPolicyContracts
): string[] {
  const issues: string[] = [];
  const allowedVerifyProfiles = new Set(contracts.guardrails.allowedVerifyProfiles);

  for (const policy of contracts.appPolicies) {
    for (const operationClass of policy.allowedOperationClasses) {
      if (contracts.guardrails.blockedOperationClasses.includes(operationClass)) {
        issues.push(
          `Policy ${policy.appPath} allows globally blocked operation class: ${operationClass}`
        );
      }
    }

    for (const tier of CMS_REQUEST_RISK_TIERS) {
      for (const profile of policy.verifyProfilesByRiskTier[tier]) {
        if (!allowedVerifyProfiles.has(profile)) {
          issues.push(
            `Policy ${policy.appPath} uses verify profile not allowed by global guardrails: ${profile}`
          );
        }
      }
    }
  }

  return issues;
}

export function evaluateCmsPolicyDecision(args: {
  contracts: CmsPolicyContracts;
  targetAppPath: string;
  operationClass: CmsOperationClass;
  touchedFiles: string[];
  riskTier: CmsRequestRiskTier;
}): CmsPolicyDecision {
  const appPath = normalizePath(args.targetAppPath);
  const policy = args.contracts.appPolicies.find((entry) => entry.appPath === appPath);

  if (!policy) {
    return {
      allowed: false,
      reason: "missing_app_policy",
      appPath,
      requiredVerifyProfiles: [],
    };
  }

  const requiredVerifyProfiles = policy.verifyProfilesByRiskTier[args.riskTier];
  if (
    requiredVerifyProfiles.length === 0 ||
    requiredVerifyProfiles.some(
      (profile) => !args.contracts.guardrails.allowedVerifyProfiles.includes(profile)
    )
  ) {
    return {
      allowed: false,
      reason: "invalid_verify_profile_policy",
      appPath,
      requiredVerifyProfiles: [],
      matchedPolicyPath: policy.appPath,
    };
  }

  if (args.contracts.guardrails.blockedOperationClasses.includes(args.operationClass)) {
    return {
      allowed: false,
      reason: "operation_class_blocked_by_global_guardrail",
      appPath,
      requiredVerifyProfiles,
      matchedPolicyPath: policy.appPath,
    };
  }

  if (!policy.allowedOperationClasses.includes(args.operationClass)) {
    return {
      allowed: false,
      reason: "operation_class_not_allowed",
      appPath,
      requiredVerifyProfiles,
      matchedPolicyPath: policy.appPath,
    };
  }

  for (const filePath of args.touchedFiles.map(normalizePath)) {
    if (matchesAnyGlob(filePath, args.contracts.guardrails.blockedFileGlobs)) {
      return {
        allowed: false,
        reason: "file_path_blocked_by_global_guardrail",
        appPath,
        requiredVerifyProfiles,
        matchedPolicyPath: policy.appPath,
        blockedFilePath: filePath,
      };
    }

    if (!matchesAnyGlob(filePath, policy.allowedFileGlobs)) {
      return {
        allowed: false,
        reason: "file_path_not_allowed",
        appPath,
        requiredVerifyProfiles,
        matchedPolicyPath: policy.appPath,
        blockedFilePath: filePath,
      };
    }
  }

  return {
    allowed: true,
    reason: "allowed",
    appPath,
    requiredVerifyProfiles,
    matchedPolicyPath: policy.appPath,
  };
}
