import { describe, expect, it } from "vitest";
import {
  assertCollaborationAuthorityContract,
  assertCollaborationKernelContract,
  assertCollaborationRuntimeContract,
} from "../../../convex/schemas/aiSchemas";

describe("collaboration runtime contract", () => {
  it("accepts valid group_thread kernel contract with shared lineage", () => {
    expect(() =>
      assertCollaborationKernelContract({
        threadType: "group_thread",
        threadId: "group:123",
        groupThreadId: "group:123",
        lineageId: "lineage:abc",
        visibilityScope: "group",
      }),
    ).not.toThrow();
  });

  it("rejects orphan dm_thread kernel contracts", () => {
    expect(() =>
      assertCollaborationKernelContract({
        threadType: "dm_thread",
        threadId: "dm:456",
        groupThreadId: "group:123",
        lineageId: "lineage:abc",
        visibilityScope: "dm",
      }),
    ).toThrow(/dm_thread kernel contract requires dmThreadId/);
  });

  it("requires orchestrator authority for mutating commit intents", () => {
    expect(() =>
      assertCollaborationAuthorityContract({
        authorityRole: "specialist",
        intentType: "commit",
        mutatesState: true,
        commitSourceThreadId: "group:123",
        proposalRefs: ["proposal:1"],
      }),
    ).toThrow(/specialist authority cannot mutate state directly|commit intent requires orchestrator authority role/);

    expect(() =>
      assertCollaborationAuthorityContract({
        authorityRole: "orchestrator",
        intentType: "commit",
        mutatesState: true,
        commitSourceThreadId: "group:123",
        proposalRefs: ["proposal:1"],
      }),
    ).not.toThrow();
  });

  it("fails closed when commit source thread mismatches kernel group thread", () => {
    expect(() =>
      assertCollaborationRuntimeContract({
        kernel: {
          threadType: "group_thread",
          threadId: "group:123",
          groupThreadId: "group:123",
          lineageId: "lineage:abc",
          visibilityScope: "group",
        },
        authority: {
          authorityRole: "orchestrator",
          intentType: "commit",
          mutatesState: true,
          commitSourceThreadId: "group:other",
          proposalRefs: ["proposal:1"],
        },
      }),
    ).toThrow(/commitSourceThreadId must match groupThreadId/);
  });
});
