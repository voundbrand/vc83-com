import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { assertOperatorMediaRetentionOrgScope } from "../../../convex/ai/mediaRetention";

describe("operator media retention authorization", () => {
  const VIEWER_ORG = "org_retention_viewer_1" as Id<"organizations">;
  const OTHER_ORG = "org_retention_other_1" as Id<"organizations">;

  it("allows same-org scoped access", () => {
    expect(() =>
      assertOperatorMediaRetentionOrgScope({
        authenticatedOrganizationId: VIEWER_ORG,
        requestedOrganizationId: VIEWER_ORG,
        recordOrganizationId: VIEWER_ORG,
      }),
    ).not.toThrow();
  });

  it("fails closed for cross-org requested scope", () => {
    expect(() =>
      assertOperatorMediaRetentionOrgScope({
        authenticatedOrganizationId: VIEWER_ORG,
        requestedOrganizationId: OTHER_ORG,
      }),
    ).toThrow("Unauthorized: media retention organization scope mismatch.");
  });

  it("fails closed when a record belongs to another org", () => {
    expect(() =>
      assertOperatorMediaRetentionOrgScope({
        authenticatedOrganizationId: VIEWER_ORG,
        recordOrganizationId: OTHER_ORG,
      }),
    ).toThrow("Unauthorized: media retention record belongs to another organization.");
  });
});
