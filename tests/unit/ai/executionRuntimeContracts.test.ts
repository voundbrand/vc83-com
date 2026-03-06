import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  createAgentRuntimeHooks,
  buildRuntimeCapabilityGapBlockedResponse,
  formatRuntimeCapabilityGapBlockedMessage,
  invokeAgentRuntimeHook,
  issueCollaborationSyncCheckpointContract,
  parseCollaborationSyncCheckpointToken,
  resolveActionCompletionContractEnforcement,
  resolveCollaborationSyncCheckpointTokenValidationError,
  resolveInboundCollaborationSyncCheckpointToken,
  resolveNativeGuestRequiredToolInvariant,
  resolveInboundRuntimeContracts,
  validateAgentRuntimeHookExecutionOrder,
  validateAgentRuntimeHookPayload,
  shouldAllowScopePayloadHashReplayMatch,
} from "../../../convex/ai/agentExecution";
import {
  TOOL_FOUNDRY_RUNTIME_CAPABILITY_GAP_CODE,
  buildCapabilityGapBlockedPayload,
  validateAgentRuntimeToolHookPayload,
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

describe("agent runtime hook contracts", () => {
  it("accepts deterministic hook order including repeated preTool/postTool pairs", () => {
    const validation = validateAgentRuntimeHookExecutionOrder([
      "preRoute",
      "preLLM",
      "postLLM",
      "preTool",
      "postTool",
      "preTool",
      "postTool",
      "completionPolicy",
    ]);
    expect(validation).toEqual({
      valid: true,
      reasonCode: "ok",
    });
  });

  it("fails deterministic hook order check on out-of-sequence payloads", () => {
    const validation = validateAgentRuntimeHookExecutionOrder([
      "preRoute",
      "postLLM",
    ]);
    expect(validation.valid).toBe(false);
    expect(validation.reasonCode).toBe("unexpected_hook");
    expect(validation.index).toBe(1);
    expect(validation.expectedHooks).toEqual(["preLLM"]);
  });

  it("fails closed when runtime hook payload contract is invalid", async () => {
    await expect(
      invokeAgentRuntimeHook({
        hooks: createAgentRuntimeHooks({
          preRoute: () => {
            throw new Error("should_not_run_on_invalid_payload");
          },
        }),
        hookName: "preRoute",
        payload: {
          organizationId: "",
          channel: "webchat",
          externalContactIdentifier: "contact-1",
        },
      })
    ).rejects.toThrow("agent_runtime_hook_payload_invalid");
  });

  it("validates tool hook payload contract fields deterministically", () => {
    const validPayload = validateAgentRuntimeToolHookPayload({
      contractVersion: "agent_runtime_tool_hooks_v1",
      hookName: "preTool",
      organizationId: "org_1",
      agentId: "agent_1",
      sessionId: "session_1",
      toolName: "manage_bookings",
      occurredAt: Date.now(),
      toolArgs: { action: "preview" },
    });
    expect(validPayload).toEqual({
      valid: true,
      reasonCode: "ok",
    });

    const invalidPayload = validateAgentRuntimeToolHookPayload({
      contractVersion: "agent_runtime_tool_hooks_v1",
      hookName: "postTool",
      organizationId: "org_1",
      agentId: "",
      sessionId: "session_1",
      toolName: "manage_bookings",
      occurredAt: Date.now(),
      status: "success",
    });
    expect(invalidPayload.valid).toBe(false);
    expect(invalidPayload.reasonCode).toBe("missing_required_field");
    expect(invalidPayload.field).toBe("agentId");
  });

  it("keeps runtime hook payload validator fail-closed for completion policy context", () => {
    const validation = validateAgentRuntimeHookPayload({
      contractVersion: "agent_runtime_hooks_v1",
      hookName: "completionPolicy",
      organizationId: "org_1",
      channel: "webchat",
      externalContactIdentifier: "contact_1",
      occurredAt: Date.now(),
      sessionId: "session_1",
      turnId: "turn_1",
      agentId: "agent_1",
    });
    expect(validation).toEqual({
      valid: true,
      reasonCode: "ok",
    });
  });
});

describe("native guest replay + required-tool invariants", () => {
  it("allows payload-hash replay matching only for proposal/commit in native_guest", () => {
    expect(
      shouldAllowScopePayloadHashReplayMatch({
        channel: "native_guest",
        intentType: "ingress",
      })
    ).toBe(false);
    expect(
      shouldAllowScopePayloadHashReplayMatch({
        channel: "native_guest",
        intentType: "proposal",
      })
    ).toBe(true);
    expect(
      shouldAllowScopePayloadHashReplayMatch({
        channel: "native_guest",
        intentType: "commit",
      })
    ).toBe(true);
  });

  it("flags missing native_guest deliverable tools from the executable runtime set", () => {
    const invariant = resolveNativeGuestRequiredToolInvariant({
      channel: "native_guest",
      requiredTools: ["generate_audit_workflow_deliverable"],
      effectiveExecutableToolNames: ["request_audit_deliverable_email"],
    });
    expect(invariant.enforced).toBe(true);
    expect(invariant.missingRequiredTools).toEqual(["generate_audit_workflow_deliverable"]);
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
    expect(message).toContain("Reason: Requested capability is blocked");
    expect(message).toContain("Missing: internal_concept, tool_contract, backend_contract");
    expect(message).toContain('reply with: "create request"');
  });

  it("renders language-specific fail-closed copy for DE runtime capability-gaps", () => {
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
    const message = formatRuntimeCapabilityGapBlockedMessage({
      blocked,
      language: "de",
    });

    expect(message).toContain("noch nicht verfuegbar");
    expect(message).toContain("fail-closed");
    expect(message).toContain("Ticket erstellen");
  });
});

describe("action-completion fail-closed localization", () => {
  it("uses DE fail-closed unavailable-tool output when required tools are missing", () => {
    const decision = resolveActionCompletionContractEnforcement({
      authorityConfig: {
        templateRole: "one_of_one_lead_capture_consultant_template",
        language: "de",
      },
      claims: [
        {
          contractVersion: "aoh_action_completion_claim_v1",
          outcome: "audit_workflow_deliverable_email",
          status: "completed",
        },
      ],
      malformedClaimCount: 0,
      toolResults: [],
      availableToolNames: [],
      preferredLanguage: "de",
    });

    expect(decision.enforced).toBe(true);
    expect(decision.payload.reasonCode).toBe("claim_tool_unavailable");
    expect(decision.assistantContent).toContain("Ticket erstellen");
    expect(decision.assistantContent).toContain("Ich kann");
  });
});
