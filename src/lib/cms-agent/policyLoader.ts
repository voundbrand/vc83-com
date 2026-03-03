import rawOneOfOnePolicy from "../../../config/cms-agent/apps.one-of-one-landing.policy.json";
import rawGlobalGuardrails from "../../../config/cms-agent/global.guardrails.policy.json";
import {
  evaluateCmsPolicyDecision,
  parseCmsAppPolicy,
  parseCmsGlobalGuardrailsPolicy,
  validateCmsPolicyContracts,
  type CmsOperationClass,
  type CmsPolicyContracts,
  type CmsPolicyDecision,
  type CmsRequestRiskTier,
} from "./policyContracts";

let cachedContracts: CmsPolicyContracts | null = null;

export function loadCmsPolicyContracts(): CmsPolicyContracts {
  if (cachedContracts) {
    return cachedContracts;
  }

  const guardrails = parseCmsGlobalGuardrailsPolicy(rawGlobalGuardrails);
  if (!guardrails) {
    throw new Error("Invalid CMS global guardrails policy contract");
  }

  const appPoliciesRaw: unknown[] = [rawOneOfOnePolicy];
  const appPolicies = appPoliciesRaw
    .map((entry) => parseCmsAppPolicy(entry))
    .filter((entry): entry is NonNullable<typeof entry> => !!entry);

  if (appPolicies.length !== appPoliciesRaw.length) {
    throw new Error("Invalid CMS app policy contract");
  }

  const contracts: CmsPolicyContracts = {
    guardrails,
    appPolicies,
  };

  const issues = validateCmsPolicyContracts(contracts);
  if (issues.length > 0) {
    throw new Error(`CMS policy contract validation failed: ${issues.join("; ")}`);
  }

  cachedContracts = contracts;
  return contracts;
}

export function evaluateCmsPolicyForRequest(args: {
  targetAppPath: string;
  operationClass: CmsOperationClass;
  touchedFiles: string[];
  riskTier: CmsRequestRiskTier;
}): CmsPolicyDecision {
  return evaluateCmsPolicyDecision({
    contracts: loadCmsPolicyContracts(),
    targetAppPath: args.targetAppPath,
    operationClass: args.operationClass,
    touchedFiles: args.touchedFiles,
    riskTier: args.riskTier,
  });
}

export function resetCmsPolicyContractCacheForTests(): void {
  cachedContracts = null;
}
