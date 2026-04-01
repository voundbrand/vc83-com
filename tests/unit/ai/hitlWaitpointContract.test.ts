import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  issueHitlWaitpointContract,
  parseHitlWaitpointToken,
  resolveHitlWaitpointTokenValidationError,
  resolveInboundHitlWaitpointToken,
  toPublicHitlWaitpointState,
} from "../../../convex/ai/kernel/agentExecution";

const SESSION_ID = "agent_session_1" as Id<"agentSessions">;
const TURN_ID = "agent_turn_1" as Id<"agentTurns">;

describe("HITL waitpoint token contract", () => {
  it("issues parseable tokens with deterministic payload invariants", () => {
    const contract = issueHitlWaitpointContract({
      sessionId: SESSION_ID,
      turnId: TURN_ID,
      checkpoint: "session_pending",
      now: 1700000000000,
      ttlMs: 120000,
    });

    const parsed = parseHitlWaitpointToken(contract.token);
    expect(parsed).toEqual({
      contractVersion: "tcg_hitl_waitpoint_v1",
      tokenId: contract.tokenId,
      sessionId: SESSION_ID,
      issuedForTurnId: TURN_ID,
      checkpoint: "session_pending",
      issuedAt: 1700000000000,
      expiresAt: 1700000120000,
    });
  });

  it("fails closed on token mismatch or expiry", () => {
    const contract = issueHitlWaitpointContract({
      sessionId: SESSION_ID,
      turnId: TURN_ID,
      checkpoint: "session_taken_over",
      now: 1700000000000,
      ttlMs: 120000,
    });

    expect(
      resolveHitlWaitpointTokenValidationError({
        contract,
        providedToken: `${contract.token}-tampered`,
        sessionId: SESSION_ID,
        now: 1700000005000,
      }),
    ).toBe("waitpoint_token_mismatch");

    expect(
      resolveHitlWaitpointTokenValidationError({
        contract,
        providedToken: contract.token,
        sessionId: SESSION_ID,
        now: contract.expiresAt + 1,
      }),
    ).toBe("waitpoint_token_expired");
  });

  it("accepts valid token and surfaces public waitpoint payload", () => {
    const contract = issueHitlWaitpointContract({
      sessionId: SESSION_ID,
      turnId: TURN_ID,
      checkpoint: "session_pending",
      now: 1700000000000,
      ttlMs: 120000,
    });

    expect(
      resolveHitlWaitpointTokenValidationError({
        contract,
        providedToken: contract.token,
        sessionId: SESSION_ID,
        now: 1700000001000,
      }),
    ).toBeNull();

    expect(toPublicHitlWaitpointState(contract)).toEqual({
      tokenId: contract.tokenId,
      token: contract.token,
      checkpoint: "session_pending",
      status: "issued",
      issuedAt: 1700000000000,
      expiresAt: 1700000120000,
    });
  });

  it("extracts inbound token from flat and nested metadata fields", () => {
    expect(resolveInboundHitlWaitpointToken({ hitlWaitpointToken: "flat-token" })).toBe(
      "flat-token",
    );
    expect(
      resolveInboundHitlWaitpointToken({
        hitlWaitpoint: {
          token: "nested-token",
        },
      }),
    ).toBe("nested-token");
    expect(resolveInboundHitlWaitpointToken({})).toBeUndefined();
  });
});
