import { describe, expect, it } from "vitest";
import {
  assertCmsTerminalTransitionAuthority,
  canTransitionCmsRequestStatus,
  normalizeCmsRequestApprovalState,
  validateCmsIdempotencyReplay,
} from "../../../convex/cmsAgentRequestContracts";

describe("cmsAgentRequestContracts", () => {
  it("allows only configured status transitions", () => {
    expect(canTransitionCmsRequestStatus("queued", "planning")).toBe(true);
    expect(canTransitionCmsRequestStatus("planning", "awaiting_approval")).toBe(true);
    expect(canTransitionCmsRequestStatus("awaiting_approval", "applying")).toBe(true);
    expect(canTransitionCmsRequestStatus("merged", "rolled_back")).toBe(true);

    expect(canTransitionCmsRequestStatus("queued", "merged")).toBe(false);
    expect(canTransitionCmsRequestStatus("failed", "planning")).toBe(false);
    expect(canTransitionCmsRequestStatus("rolled_back", "applying")).toBe(false);
  });

  it("accepts idempotency replay with same payload", () => {
    expect(() =>
      validateCmsIdempotencyReplay(
        {
          idempotencyKey: "cms-123",
          intentPayload: { kind: "copy", path: "hero.headline", value: "A" },
          riskTier: "low",
          lineage: {
            targetAppPath: "apps/site-a",
            targetRepo: "org/repo",
            targetBranch: "main",
          },
          target: {
            targetSite: "site-a",
          },
        },
        {
          idempotencyKey: "cms-123",
          intentPayload: { kind: "copy", path: "hero.headline", value: "A" },
          riskTier: "low",
          lineage: {
            targetAppPath: "apps/site-a",
            targetRepo: "org/repo",
            targetBranch: "main",
          },
          target: {
            targetSite: "site-a",
          },
        }
      )
    ).not.toThrow();
  });

  it("rejects idempotency replay with changed payload", () => {
    expect(() =>
      validateCmsIdempotencyReplay(
        {
          idempotencyKey: "cms-123",
          intentPayload: { kind: "copy", value: "A" },
          riskTier: "low",
          lineage: {
            targetAppPath: "apps/site-a",
          },
          target: {
            targetSite: "site-a",
          },
        },
        {
          idempotencyKey: "cms-123",
          intentPayload: { kind: "copy", value: "B" },
          riskTier: "low",
          lineage: {
            targetAppPath: "apps/site-a",
          },
          target: {
            targetSite: "site-a",
          },
        }
      )
    ).toThrowError(/already used with different CMS request payload/);
  });

  it("normalizes missing approval state to fail-closed defaults", () => {
    expect(normalizeCmsRequestApprovalState(undefined)).toEqual({
      status: "not_requested",
      required: false,
    });
  });

  it("requires publish authority for terminal transitions", () => {
    expect(() =>
      assertCmsTerminalTransitionAuthority({
        toStatus: "merged",
        canPublishTerminalTransition: false,
        approvalState: {
          status: "approved",
          required: true,
        },
      })
    ).toThrowError(/publish_pages required/);
  });

  it("blocks merged transition when approval is required but not approved", () => {
    expect(() =>
      assertCmsTerminalTransitionAuthority({
        toStatus: "merged",
        canPublishTerminalTransition: true,
        approvalState: {
          status: "pending",
          required: true,
        },
      })
    ).toThrowError(/without approved approval state/);
  });
});
