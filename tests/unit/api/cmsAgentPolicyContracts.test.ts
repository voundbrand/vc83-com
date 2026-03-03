import { describe, expect, it } from "vitest";
import {
  evaluateCmsPolicyForRequest,
  loadCmsPolicyContracts,
  resetCmsPolicyContractCacheForTests,
} from "../../../src/lib/cms-agent/policyLoader";

describe("cms agent policy contracts", () => {
  it("loads policy contracts with deny-by-default global guardrails", () => {
    resetCmsPolicyContractCacheForTests();
    const contracts = loadCmsPolicyContracts();

    expect(contracts.guardrails.defaultAction).toBe("deny");
    expect(contracts.appPolicies.length).toBeGreaterThan(0);
    expect(
      contracts.guardrails.allowedVerifyProfiles.includes("V-CMS-LINT")
    ).toBe(true);
  });

  it("allows a request only when app path, operation class, and touched files are policy-compliant", () => {
    const decision = evaluateCmsPolicyForRequest({
      targetAppPath: "apps/one-of-one-landing",
      operationClass: "content_copy",
      touchedFiles: ["apps/one-of-one-landing/content/landing.en.json"],
      riskTier: "medium",
    });

    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe("allowed");
    expect(decision.requiredVerifyProfiles).toEqual([
      "V-TYPE",
      "V-UNIT",
      "V-CMS-LINT",
    ]);
  });

  it("fails closed when app policy is missing", () => {
    const decision = evaluateCmsPolicyForRequest({
      targetAppPath: "apps/new-customer-site",
      operationClass: "content_copy",
      touchedFiles: ["apps/new-customer-site/content/home.json"],
      riskTier: "low",
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("missing_app_policy");
  });

  it("fails closed when file paths are outside app allowlist or blocked globally", () => {
    const outOfPolicyDecision = evaluateCmsPolicyForRequest({
      targetAppPath: "apps/one-of-one-landing",
      operationClass: "content_copy",
      touchedFiles: ["apps/one-of-one-landing/package.json"],
      riskTier: "low",
    });

    expect(outOfPolicyDecision.allowed).toBe(false);
    expect(outOfPolicyDecision.reason).toBe("file_path_not_allowed");

    const globallyBlockedDecision = evaluateCmsPolicyForRequest({
      targetAppPath: "apps/one-of-one-landing",
      operationClass: "content_copy",
      touchedFiles: ["apps/one-of-one-landing/.env.local"],
      riskTier: "low",
    });

    expect(globallyBlockedDecision.allowed).toBe(false);
    expect(globallyBlockedDecision.reason).toBe(
      "file_path_blocked_by_global_guardrail"
    );
  });
});
