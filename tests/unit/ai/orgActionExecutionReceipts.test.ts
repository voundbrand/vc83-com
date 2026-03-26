import { describe, expect, it } from "vitest";
import {
  ORG_ACTION_EXECUTION_CONTRACT_VERSION,
  buildOrgActionReceiptCorrelationId,
  buildOrgActionExecutionReceiptIdempotencyKey,
} from "../../../convex/ai/orgActionExecution";

describe("org action execution receipt contract", () => {
  it("publishes a stable execution contract version", () => {
    expect(ORG_ACTION_EXECUTION_CONTRACT_VERSION).toBe("org_action_execution_v1");
  });

  it("builds deterministic idempotency keys", () => {
    expect(
      buildOrgActionExecutionReceiptIdempotencyKey({
        organizationId: "org_1",
        actionItemObjectId: "action_1",
        actionFamily: "create_crm_note",
        attemptNumber: 1,
      }),
    ).toBe("org_action_receipt:org_1:action_1:create_crm_note:1");
  });

  it("normalizes invalid attempt numbers to 1", () => {
    expect(
      buildOrgActionExecutionReceiptIdempotencyKey({
        organizationId: "org_1",
        actionItemObjectId: "action_1",
        actionFamily: "create_crm_note",
        attemptNumber: Number.NaN,
      }),
    ).toBe("org_action_receipt:org_1:action_1:create_crm_note:1");
  });

  it("builds correlation IDs bound to session + action item + attempt", () => {
    expect(
      buildOrgActionReceiptCorrelationId({
        sessionId: "agentSessions_1",
        actionItemObjectId: "objects_action_1",
        attemptNumber: 3,
      }),
    ).toBe("org_action_correlation:agentSessions_1:objects_action_1:3");
  });
});
