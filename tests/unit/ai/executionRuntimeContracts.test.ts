import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  buildRuntimeCapabilityGapBlockedResponse,
  formatRuntimeCapabilityGapBlockedMessage,
  issueCollaborationSyncCheckpointContract,
  parseCollaborationSyncCheckpointToken,
  resolveCollaborationSyncCheckpointTokenValidationError,
  resolveInboundCollaborationSyncCheckpointToken,
  resolveInboundRuntimeContracts,
} from "../../../convex/ai/agentExecution";
import {
  TOOL_FOUNDRY_RUNTIME_CAPABILITY_GAP_CODE,
  buildCapabilityGapBlockedPayload,
} from "../../../convex/ai/agentToolOrchestration";

const ORG_ID = "org_1" as Id<"organizations">;

describe("execution runtime contracts", () => {
  it("derives route+workflow queue/idempotency contracts for legacy ingress", () => {
    const contracts = resolveInboundRuntimeContracts({
      organizationId: ORG_ID,
      channel: "slack",
      message: "Hello from queue contract coverage",
      metadata: {
        providerId: "slack",
        providerInstallationId: "T123",
      },
      routeIdentity: {
        providerId: "slack",
        providerInstallationId: "T123",
        routeKey: "slack:T123",
      },
      collaboration: {},
    });

    expect(contracts.queueContract).toMatchObject({
      contractVersion: "tcg_turn_queue_v1",
      tenantId: ORG_ID,
      routeKey: "route:slack:T123",
      workflowKey: "message_ingress",
      conflictLabel: "conflict_turn_in_progress",
    });
    expect(contracts.queueContract.concurrencyKey).toBe(
      `${ORG_ID}:route:slack:T123:message_ingress`
    );
    expect(contracts.idempotencyContract.scopeKind).toBe("route_workflow");
    expect(contracts.idempotencyContract.intentType).toBe("ingress");
    expect(
      contracts.idempotencyContract.expiresAt - contracts.idempotencyContract.issuedAt
    ).toBe(30 * 60_000);
  });

  it("derives lineage-aware collaboration contracts for commit intents", () => {
    const contracts = resolveInboundRuntimeContracts({
      organizationId: ORG_ID,
      channel: "slack",
      message: "Commit this merged specialist proposal",
      metadata: {
        intentType: "commit",
        payloadHash: "payload_123",
      },
      routeIdentity: {
        providerId: "slack",
        providerInstallationId: "T123",
        routeKey: "slack:T123",
      },
      collaboration: {
        lineageId: "lineage:abc",
        threadId: "group:1",
        authorityIntentType: "commit",
      },
    });

    expect(contracts.queueContract.concurrencyKey).toBe(
      `${ORG_ID}:lineage:abc:group:1:commit`
    );
    expect(contracts.queueContract.conflictLabel).toBe(
      "conflict_commit_in_progress"
    );
    expect(contracts.idempotencyContract.scopeKind).toBe("collaboration");
    expect(contracts.idempotencyContract.intentType).toBe("commit");
    expect(contracts.idempotencyContract.replayOutcome).toBe(
      "replay_previous_result"
    );
    expect(contracts.idempotencyContract.payloadHash).toBe("payload_123");
  });
});

describe("collaboration sync checkpoint token contract", () => {
  it("issues parseable DM-to-group sync tokens with deterministic payload invariants", () => {
    const contract = issueCollaborationSyncCheckpointContract({
      lineageId: "lineage:abc",
      dmThreadId: "dm:123",
      groupThreadId: "group:123",
      issuedForEventId: "event:proposal:1",
      now: 1700000000000,
      ttlMs: 120000,
    });

    const parsed = parseCollaborationSyncCheckpointToken(contract.token);
    expect(parsed).toEqual({
      contractVersion: "tcg_dm_group_sync_v1",
      tokenId: contract.tokenId,
      lineageId: "lineage:abc",
      dmThreadId: "dm:123",
      groupThreadId: "group:123",
      issuedForEventId: "event:proposal:1",
      issuedAt: 1700000000000,
      expiresAt: 1700000120000,
    });
  });

  it("fails closed on mismatch and expiry", () => {
    const contract = issueCollaborationSyncCheckpointContract({
      lineageId: "lineage:abc",
      dmThreadId: "dm:123",
      groupThreadId: "group:123",
      issuedForEventId: "event:proposal:1",
      now: 1700000000000,
      ttlMs: 120000,
    });

    expect(
      resolveCollaborationSyncCheckpointTokenValidationError({
        contract,
        providedToken: `${contract.token}-tampered`,
        lineageId: "lineage:abc",
        dmThreadId: "dm:123",
        groupThreadId: "group:123",
        issuedForEventId: "event:proposal:1",
        now: 1700000005000,
      })
    ).toBe("waitpoint_token_mismatch");
    expect(
      resolveCollaborationSyncCheckpointTokenValidationError({
        contract,
        providedToken: contract.token,
        lineageId: "lineage:abc",
        dmThreadId: "dm:123",
        groupThreadId: "group:123",
        issuedForEventId: "event:proposal:1",
        now: contract.expiresAt + 1,
      })
    ).toBe("waitpoint_token_expired");
  });

  it("extracts inbound sync tokens from flat and nested metadata", () => {
    expect(
      resolveInboundCollaborationSyncCheckpointToken({
        collaborationSyncToken: "flat-sync-token",
      })
    ).toBe("flat-sync-token");
    expect(
      resolveInboundCollaborationSyncCheckpointToken({
        collaborationSyncCheckpoint: {
          token: "nested-sync-token",
        },
      })
    ).toBe("nested-sync-token");
    expect(resolveInboundCollaborationSyncCheckpointToken({})).toBeUndefined();
  });
});

describe("runtime capability-gap blocked contract", () => {
  it("builds deterministic blocked payload with explicit unblocking steps and ToolSpec draft artifact", () => {
    const capabilityGap = buildCapabilityGapBlockedPayload({
      requestedToolName: "manage_quantum_invoices",
      parsedArgs: {
        amount: 100,
        currency: "USD",
      },
      organizationId: ORG_ID,
      agentId: "agent_1" as Id<"objects">,
      sessionId: "session_1" as Id<"agentSessions">,
      now: 1700000000000,
    });
    const blocked = buildRuntimeCapabilityGapBlockedResponse({
      capabilityGap,
    });

    expect(blocked).toMatchObject({
      contractVersion: "tool_foundry_runtime_blocked_response_v1",
      status: "blocked",
      reasonCode: TOOL_FOUNDRY_RUNTIME_CAPABILITY_GAP_CODE,
      missing: {
        requestedToolName: "manage_quantum_invoices",
        missingKinds: ["internal_concept", "tool_contract", "backend_contract"],
      },
      proposalArtifact: {
        artifactType: "tool_spec_proposal",
        contractVersion: "tool_spec_proposal_draft_v1",
        proposalKey: "toolspec:manage_quantum_invoices:org_1:session_1",
        stage: "draft",
      },
    });
    expect(blocked.unblockingSteps.length).toBeGreaterThanOrEqual(4);
    expect(blocked.proposalArtifact.draft.inputFields).toEqual([
      {
        name: "amount",
        inferredType: "number",
        required: true,
      },
      {
        name: "currency",
        inferredType: "string",
        required: true,
      },
    ]);
  });

  it("renders a non-hidden blocked message with machine-readable code and proposal artifact payload", () => {
    const capabilityGap = buildCapabilityGapBlockedPayload({
      requestedToolName: "future_tool",
      parsedArgs: {},
      organizationId: ORG_ID,
      agentId: "agent_1" as Id<"objects">,
      sessionId: "session_1" as Id<"agentSessions">,
      now: 1700000000000,
    });
    const blocked = buildRuntimeCapabilityGapBlockedResponse({
      capabilityGap,
    });
    const message = formatRuntimeCapabilityGapBlockedMessage({ blocked });

    expect(message).toContain(`Reason code: ${TOOL_FOUNDRY_RUNTIME_CAPABILITY_GAP_CODE}`);
    expect(message).toContain("Unblocking steps:");
    expect(message).toContain("ToolSpec proposal artifact (draft metadata):");
    expect(message).toContain("\"artifactType\": \"tool_spec_proposal\"");
    expect(message).toContain("\"suggestedToolName\": \"future_tool\"");
  });
});
