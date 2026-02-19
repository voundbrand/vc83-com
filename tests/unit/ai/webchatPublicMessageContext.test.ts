import { describe, expect, it, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  resolvePublicMessageContextFromDb,
  type PublicMessageContextResolutionDb,
} from "../../../convex/api/v1/webchatApi";

type MockSessionRecord = {
  organizationId: Id<"organizations">;
  agentId: Id<"objects">;
  channel?: "webchat" | "native_guest";
} | null;

type MockAgentRecord = {
  type: string;
  organizationId: Id<"organizations">;
  customProperties?: Record<string, unknown>;
  deletedAt?: number;
} | null;

type MockDb = PublicMessageContextResolutionDb & {
  eq: ReturnType<typeof vi.fn>;
  first: ReturnType<typeof vi.fn>;
  withIndex: ReturnType<typeof vi.fn>;
  query: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
};

function makeDb({ session, agent }: { session?: MockSessionRecord; agent?: MockAgentRecord }): MockDb {
  const eq = vi.fn();
  const first = vi.fn().mockResolvedValue(session ?? null);
  const withIndex = vi.fn().mockImplementation(
    (
      _indexName: "by_session_token",
      callback: (q: { eq: (fieldName: "sessionToken", value: string) => unknown }) => unknown
    ) => {
      callback({ eq });
      return { first };
    }
  );
  const query = vi.fn().mockReturnValue({ withIndex });
  const get = vi.fn().mockResolvedValue(agent ?? null);

  return {
    eq,
    first,
    withIndex,
    query,
    get,
  } as MockDb;
}

const ORG_PRIMARY = "org_primary" as Id<"organizations">;
const ORG_LEGACY = "org_legacy" as Id<"organizations">;
const AGENT_PRIMARY = "agent_primary" as Id<"objects">;
const AGENT_OTHER = "agent_other" as Id<"objects">;

function makeEnabledAgent(
  channelBindings: Array<{ channel: string; enabled: boolean }>
): NonNullable<MockAgentRecord> {
  return {
    type: "org_agent",
    organizationId: ORG_PRIMARY,
    customProperties: {
      channelBindings,
    },
  };
}

describe("resolvePublicMessageContextFromDb", () => {
  it("resolves from session when organizationId is missing from client payload", async () => {
    const db = makeDb({
      session: {
        organizationId: ORG_PRIMARY,
        agentId: AGENT_PRIMARY,
        channel: "webchat",
      },
    });

    const result = await resolvePublicMessageContextFromDb(db, {
      sessionToken: "wc_session_123",
      channel: "webchat",
    });

    expect(result).toEqual({
      organizationId: ORG_PRIMARY,
      agentId: AGENT_PRIMARY,
      channel: "webchat",
      source: "session",
      organizationIdStatus: "resolved",
    });
    expect(db.get).not.toHaveBeenCalled();
  });

  it("keeps session resolution and marks legacy organizationId mismatch as overridden", async () => {
    const db = makeDb({
      session: {
        organizationId: ORG_PRIMARY,
        agentId: AGENT_PRIMARY,
        channel: "webchat",
      },
    });

    const result = await resolvePublicMessageContextFromDb(db, {
      organizationId: ORG_LEGACY,
      sessionToken: "wc_session_456",
      channel: "webchat",
    });

    expect(result?.organizationId).toBe(ORG_PRIMARY);
    expect(result?.organizationIdStatus).toBe("overrode_legacy");
    expect(result?.source).toBe("session");
  });

  it("returns null when session context and payload agentId disagree", async () => {
    const db = makeDb({
      session: {
        organizationId: ORG_PRIMARY,
        agentId: AGENT_PRIMARY,
        channel: "webchat",
      },
    });

    const result = await resolvePublicMessageContextFromDb(db, {
      agentId: AGENT_OTHER,
      sessionToken: "wc_session_789",
      channel: "webchat",
    });

    expect(result).toBeNull();
  });

  it("resolves from agent and handles missing or legacy organizationId hints", async () => {
    const db = makeDb({
      agent: makeEnabledAgent([{ channel: "webchat", enabled: true }]),
    });

    const withoutOrg = await resolvePublicMessageContextFromDb(db, {
      agentId: AGENT_PRIMARY,
      channel: "webchat",
    });
    const mismatchedLegacyOrg = await resolvePublicMessageContextFromDb(db, {
      agentId: AGENT_PRIMARY,
      organizationId: ORG_LEGACY,
      channel: "webchat",
    });

    expect(withoutOrg).toMatchObject({
      organizationId: ORG_PRIMARY,
      agentId: AGENT_PRIMARY,
      source: "agent",
      organizationIdStatus: "resolved",
    });
    expect(mismatchedLegacyOrg).toMatchObject({
      organizationId: ORG_PRIMARY,
      agentId: AGENT_PRIMARY,
      source: "agent",
      organizationIdStatus: "overrode_legacy",
    });
  });

  it("returns null when agent channel binding is not enabled", async () => {
    const db = makeDb({
      agent: makeEnabledAgent([{ channel: "webchat", enabled: false }]),
    });

    const result = await resolvePublicMessageContextFromDb(db, {
      agentId: AGENT_PRIMARY,
      channel: "webchat",
    });

    expect(result).toBeNull();
  });

  it("allows native_guest channel to reuse webchat bindings when session token prefix is invalid", async () => {
    const db = makeDb({
      session: {
        organizationId: ORG_LEGACY,
        agentId: AGENT_OTHER,
        channel: "webchat",
      },
      agent: makeEnabledAgent([{ channel: "webchat", enabled: true }]),
    });

    const result = await resolvePublicMessageContextFromDb(db, {
      agentId: AGENT_PRIMARY,
      sessionToken: "wc_wrong_prefix_for_native_guest",
      channel: "native_guest",
    });

    expect(result).toEqual({
      organizationId: ORG_PRIMARY,
      agentId: AGENT_PRIMARY,
      channel: "native_guest",
      source: "agent",
      organizationIdStatus: "resolved",
    });
    expect(db.query).not.toHaveBeenCalled();
  });
});
