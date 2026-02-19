import { describe, expect, it, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { resolvePlatformSessionForClaim } from "../../../convex/api/v1/accountLinkingInternal";

type MockDb = {
  normalizeId: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
};

function makeDb(): MockDb {
  return {
    normalizeId: vi.fn(),
    get: vi.fn(),
  };
}

describe("resolvePlatformSessionForClaim", () => {
  it("returns invalid_session_id for malformed or wrong-table ids", async () => {
    const db = makeDb();
    db.normalizeId.mockReturnValue(null);

    const result = await resolvePlatformSessionForClaim(db as never, "not-a-session-id");

    expect(result).toEqual({ status: "invalid_session_id" });
    expect(db.get).not.toHaveBeenCalled();
  });

  it("returns invalid_or_expired for valid ids that do not exist", async () => {
    const db = makeDb();
    db.normalizeId.mockReturnValue("sess_123" as Id<"sessions">);
    db.get.mockResolvedValue(null);

    const result = await resolvePlatformSessionForClaim(db as never, "sess_123");

    expect(result).toEqual({ status: "invalid_or_expired" });
  });

  it("returns invalid_or_expired for expired sessions", async () => {
    const db = makeDb();
    db.normalizeId.mockReturnValue("sess_456" as Id<"sessions">);
    db.get.mockResolvedValue({
      _id: "sess_456" as Id<"sessions">,
      userId: "user_1" as Id<"users">,
      organizationId: "org_1" as Id<"organizations">,
      expiresAt: 1000,
    });

    const result = await resolvePlatformSessionForClaim(db as never, "sess_456", 2000);

    expect(result).toEqual({ status: "invalid_or_expired" });
  });

  it("returns active with session for valid live session ids", async () => {
    const db = makeDb();
    const sessionDoc = {
      _id: "sess_789" as Id<"sessions">,
      userId: "user_2" as Id<"users">,
      organizationId: "org_2" as Id<"organizations">,
      expiresAt: 9000,
    };
    db.normalizeId.mockReturnValue("sess_789" as Id<"sessions">);
    db.get.mockResolvedValue(sessionDoc);

    const result = await resolvePlatformSessionForClaim(db as never, "sess_789", 5000);

    expect(result).toEqual({
      status: "active",
      session: sessionDoc,
    });
  });
});
