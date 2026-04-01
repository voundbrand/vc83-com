import { describe, expect, it } from "vitest";
import {
  resolveCrossOrgEnrichmentCandidateDecision,
  resolveCrossOrgEnrichmentRequestDecision,
  buildCrossOrgEnrichmentTelemetryLabels,
} from "../../../convex/lib/layerScope";
import { resolveCrossOrgPersonalWorkspaceEnrichmentOptIn } from "../../../convex/ai/kernel/agentExecution";

describe("cross-org enrichment policy hardening", () => {
  it("allows personal-workspace enrichment only when explicit opt-in is enabled", () => {
    const optInEnabled = resolveCrossOrgPersonalWorkspaceEnrichmentOptIn({
      crossOrgEnrichment: { personalWorkspaceReadOnlyOptIn: true },
    });
    const decision = resolveCrossOrgEnrichmentRequestDecision({
      workspaceType: "personal",
      operatorUserIdResolved: true,
      hasActiveViewerMembership: true,
      optInEnabled,
    });
    expect(decision).toEqual({
      requested: true,
      allowed: true,
      reasonCode: "allowed",
    });
  });

  it("fails closed deterministically when opt-in is absent", () => {
    const optInEnabled = resolveCrossOrgPersonalWorkspaceEnrichmentOptIn({});
    const decision = resolveCrossOrgEnrichmentRequestDecision({
      workspaceType: "personal",
      operatorUserIdResolved: true,
      hasActiveViewerMembership: true,
      optInEnabled,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("opt_in_required");
  });

  it("keeps cross-tenant candidate paths blocked with stable reason codes", () => {
    const decision = resolveCrossOrgEnrichmentCandidateDecision({
      viewerOrganization: {
        _id: "org_viewer",
        parentOrganizationId: "org_tenant_a",
      },
      candidateOrganization: {
        _id: "org_other_tenant",
        parentOrganizationId: "org_tenant_b",
      },
      candidateIsActive: true,
      candidateIsPersonalWorkspace: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("candidate_tenant_mismatch");
  });

  it("emits deterministic tenant-safe telemetry labels without org/session leakage", () => {
    const requestDecision = resolveCrossOrgEnrichmentRequestDecision({
      workspaceType: "personal",
      operatorUserIdResolved: true,
      hasActiveViewerMembership: true,
      optInEnabled: true,
    });
    const telemetryA = buildCrossOrgEnrichmentTelemetryLabels({
      requestDecision,
      viewerOrganization: {
        _id: "org_viewer",
        parentOrganizationId: "org_tenant",
      },
      candidateOrganizations: [
        { _id: "org_z", parentOrganizationId: "org_tenant" },
        { _id: "org_a", parentOrganizationId: "org_other_tenant" },
      ],
    });
    const telemetryB = buildCrossOrgEnrichmentTelemetryLabels({
      requestDecision,
      viewerOrganization: {
        _id: "org_viewer",
        parentOrganizationId: "org_tenant",
      },
      candidateOrganizations: [
        { _id: "org_z", parentOrganizationId: "org_tenant" },
        { _id: "org_a", parentOrganizationId: "org_other_tenant" },
      ],
    });

    expect(telemetryA).toEqual(telemetryB);
    expect(telemetryA.orgLabels.candidateOrgs).toEqual(["candidate_org_1", "candidate_org_2"]);
    expect(telemetryA.orgLabels.candidateTenants).toEqual([
      "external_tenant",
      "viewer_tenant",
    ]);

    const serialized = JSON.stringify(telemetryA);
    expect(serialized).not.toContain("org_viewer");
    expect(serialized).not.toContain("org_tenant");
    expect(serialized).not.toContain("session_");
  });
});
