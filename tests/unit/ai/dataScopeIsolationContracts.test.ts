import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { buildOrgDataQueryScopeContract } from "../../../convex/ai/tools/dataQueryInternal";
import { buildKnowledgeRetrievalScopeContract } from "../../../convex/organizationMedia";
import { resolveScopedOrgTarget } from "../../../convex/lib/layerScope";

describe("AOH-010 data-scope isolation contracts", () => {
  const VIEWER_ORG = "org_viewer" as Id<"organizations">;
  const OTHER_ORG = "org_other" as Id<"organizations">;

  it("keeps query_org_data bound to org scope via by_org_type index", () => {
    const contract = buildOrgDataQueryScopeContract({
      organizationId: VIEWER_ORG,
      objectType: "crm_contact",
    });
    expect(contract).toEqual({
      contractVersion: "aoh_org_data_scope_v1",
      scopeType: "org",
      scopeOrganizationId: VIEWER_ORG,
      objectType: "crm_contact",
      enforcedBy: "objects.by_org_type",
    });
  });

  it("keeps semantic chunk retrieval bound to org scope via by_organization index", () => {
    const contract = buildKnowledgeRetrievalScopeContract({
      organizationId: VIEWER_ORG,
      surface: "semantic_chunks",
    });
    expect(contract.scopeType).toBe("org");
    expect(contract.scopeOrganizationId).toBe(VIEWER_ORG);
    expect(contract.enforcedBy).toBe("organizationKnowledgeChunks.by_organization");
  });

  it("keeps knowledge-base doc retrieval bound to org scope via by_organization index", () => {
    const contract = buildKnowledgeRetrievalScopeContract({
      organizationId: VIEWER_ORG,
      surface: "knowledge_base_docs",
    });
    expect(contract.scopeType).toBe("org");
    expect(contract.scopeOrganizationId).toBe(VIEWER_ORG);
    expect(contract.enforcedBy).toBe("organizationMedia.by_organization");
  });

  it("rejects cross-org scope escalation for non-cross-org sessions", () => {
    expect(() =>
      resolveScopedOrgTarget({
        viewerOrganizationId: VIEWER_ORG,
        requestedScope: "layer",
        requestedScopeOrganizationId: OTHER_ORG,
        allowCrossOrg: false,
      })
    ).toThrow("Unauthorized: cross-org scope requires a super-admin session.");
  });
});
