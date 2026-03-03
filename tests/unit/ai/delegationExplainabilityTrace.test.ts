import { describe, expect, it } from "vitest";
import {
  buildDelegationExplainabilityTrace,
  type DelegationExplainabilityActionRecord,
  type DelegationExplainabilityExecutionEdgeRecord,
} from "../../../convex/ai/agentSessions";

const ORG_ID = "org_1";
const SESSION_ID = "session_1";
const TURN_ID = "turn_1";
const AUTHORITY_AGENT_ID = "agent_authority";

function buildAction(
  actionType: string,
  overrides: Partial<DelegationExplainabilityActionRecord> = {}
): DelegationExplainabilityActionRecord {
  return {
    _id: `${actionType}_${Math.random().toString(36).slice(2, 8)}`,
    organizationId: ORG_ID,
    objectId: AUTHORITY_AGENT_ID,
    actionType,
    performedAt: 1000,
    actionData: {
      sessionId: SESSION_ID,
      turnId: TURN_ID,
    },
    ...overrides,
  };
}

function buildEdge(
  transition: string,
  overrides: Partial<DelegationExplainabilityExecutionEdgeRecord> = {}
): DelegationExplainabilityExecutionEdgeRecord {
  return {
    _id: `${transition}_${Math.random().toString(36).slice(2, 8)}`,
    organizationId: ORG_ID,
    sessionId: SESSION_ID,
    turnId: TURN_ID,
    transition,
    occurredAt: 1000,
    edgeOrdinal: 1,
    metadata: {},
    ...overrides,
  };
}

describe("delegation explainability trace", () => {
  it("returns authority/speaker/provenance/outcome for delegated turn success", () => {
    const result = buildDelegationExplainabilityTrace({
      organizationId: ORG_ID,
      sessionId: SESSION_ID,
      turnId: TURN_ID,
      authorityAgentId: AUTHORITY_AGENT_ID,
      sessionTeamState: { activeAgentId: "agent_specialist" },
      actions: [
        buildAction("team_handoff", {
          _id: "action_handoff",
          performedAt: 1002,
          actionData: {
            sessionId: SESSION_ID,
            fromAgentId: AUTHORITY_AGENT_ID,
            toAgentId: "agent_specialist",
            teamAccessMode: "direct",
            handoffProvenance: {
              selectionStrategy: "fallback_subtype",
              requestedSpecialistType: "sales_assistant",
              matchedBy: "fallback_subtype",
              candidateCount: 2,
              catalogSize: 4,
            },
          },
        }),
        buildAction("required_scope_fallback_delegation", {
          _id: "action_fallback",
          performedAt: 1003,
          actionData: {
            sessionId: SESSION_ID,
            turnId: TURN_ID,
            fallback: {
              outcome: "delegated",
              reasonCode: "fallback_delegated",
              reason: "Delegated through Dream Team specialist handoff.",
              requestedSpecialistType: "sales_assistant",
              selectedSpecialistId: "agent_specialist",
              teamAccessMode: "direct",
            },
          },
        }),
        buildAction("message_processed", {
          _id: "action_processed",
          performedAt: 1010,
          actionData: {
            sessionId: SESSION_ID,
            turnId: TURN_ID,
            authorityAgentId: AUTHORITY_AGENT_ID,
            speakerAgentId: "agent_specialist",
            toolScoping: {
              requiredScopeFallback: {
                outcome: "delegated",
                reasonCode: "fallback_delegated",
                reason: "Delegated through Dream Team specialist handoff.",
              },
            },
          },
        }),
      ],
      executionEdges: [
        buildEdge("handoff_completed", {
          _id: "edge_handoff_completed",
          edgeOrdinal: 3,
          occurredAt: 1004,
          metadata: {
            fromAgentId: AUTHORITY_AGENT_ID,
            toAgentId: "agent_specialist",
            activeAgentId: "agent_specialist",
            authorityAgentId: AUTHORITY_AGENT_ID,
            teamAccessMode: "direct",
            handoffNumber: 1,
            handoffProvenance: {
              selectionStrategy: "fallback_subtype",
              requestedSpecialistType: "sales_assistant",
              matchedBy: "fallback_subtype",
              candidateCount: 2,
              catalogSize: 4,
            },
          },
        }),
      ],
    });

    expect(result.authority.agentId).toBe(AUTHORITY_AGENT_ID);
    expect(result.speaker.agentId).toBe("agent_specialist");
    expect(result.handoffProvenance.source).toBe("execution_edge.handoff_completed");
    expect(result.handoffProvenance.selectionStrategy).toBe("fallback_subtype");
    expect(result.handoffProvenance.requestedSpecialistType).toBe("sales_assistant");
    expect(result.outcome).toEqual({
      status: "success",
      reasonCode: "fallback_delegated",
      reason: "Delegated through Dream Team specialist handoff.",
      source: "message_processed",
    });
  });

  it("returns deterministic blocked outcome when fallback cannot select specialist", () => {
    const result = buildDelegationExplainabilityTrace({
      organizationId: ORG_ID,
      sessionId: SESSION_ID,
      turnId: TURN_ID,
      authorityAgentId: AUTHORITY_AGENT_ID,
      actions: [
        buildAction("required_scope_fallback_delegation", {
          _id: "action_fallback_blocked",
          performedAt: 1001,
          actionData: {
            sessionId: SESSION_ID,
            turnId: TURN_ID,
            fallback: {
              outcome: "blocked",
              reasonCode: "fallback_no_specialist_candidate",
              reason:
                "No subtype profile provides deterministic coverage for missing required scope tools.",
            },
          },
        }),
        buildAction("required_scope_contract_blocked", {
          _id: "action_contract_blocked",
          performedAt: 1002,
          actionData: {
            sessionId: SESSION_ID,
            turnId: TURN_ID,
            gap: {
              reasonCode: "required_scope_contract_missing",
              reason: "Required specialist scope was missing required tools.",
            },
          },
        }),
      ],
      executionEdges: [],
    });

    expect(result.authority.agentId).toBe(AUTHORITY_AGENT_ID);
    expect(result.speaker.agentId).toBe(AUTHORITY_AGENT_ID);
    expect(result.handoffProvenance.source).toBe("not_available");
    expect(result.outcome).toEqual({
      status: "blocked",
      reasonCode: "fallback_no_specialist_candidate",
      reason:
        "No subtype profile provides deterministic coverage for missing required scope tools.",
      source: "required_scope_contract_blocked",
    });
  });

  it("keeps output ordering deterministic across repeated calls", () => {
    const actions = [
      buildAction("message_processed", {
        _id: "action_c",
        performedAt: 3000,
        actionData: {
          sessionId: SESSION_ID,
          turnId: TURN_ID,
          authorityAgentId: AUTHORITY_AGENT_ID,
          speakerAgentId: AUTHORITY_AGENT_ID,
        },
      }),
      buildAction("required_scope_fallback_delegation", {
        _id: "action_a",
        performedAt: 1000,
        actionData: {
          sessionId: SESSION_ID,
          turnId: TURN_ID,
          fallback: {
            outcome: "delegated",
            reasonCode: "fallback_delegated",
            reason: "Delegated.",
          },
        },
      }),
      buildAction("team_handoff", {
        _id: "action_b",
        performedAt: 1000,
        actionData: { sessionId: SESSION_ID },
      }),
    ];
    const edges = [
      buildEdge("handoff_completed", {
        _id: "edge_b",
        edgeOrdinal: 2,
        occurredAt: 1002,
      }),
      buildEdge("handoff_initiated", {
        _id: "edge_a",
        edgeOrdinal: 1,
        occurredAt: 1001,
      }),
    ];

    const first = buildDelegationExplainabilityTrace({
      organizationId: ORG_ID,
      sessionId: SESSION_ID,
      turnId: TURN_ID,
      authorityAgentId: AUTHORITY_AGENT_ID,
      actions,
      executionEdges: edges,
    });
    const second = buildDelegationExplainabilityTrace({
      organizationId: ORG_ID,
      sessionId: SESSION_ID,
      turnId: TURN_ID,
      authorityAgentId: AUTHORITY_AGENT_ID,
      actions: [...actions].reverse(),
      executionEdges: [...edges].reverse(),
    });

    expect(first.trace.actionIds).toEqual(["action_b", "action_a", "action_c"]);
    expect(first.trace.edgeIds).toEqual(["edge_a", "edge_b"]);
    expect(second).toEqual(first);
  });

  it("uses team_handoff turnId when present to avoid cross-turn handoff ambiguity", () => {
    const result = buildDelegationExplainabilityTrace({
      organizationId: ORG_ID,
      sessionId: SESSION_ID,
      turnId: TURN_ID,
      authorityAgentId: AUTHORITY_AGENT_ID,
      actions: [
        buildAction("team_handoff", {
          _id: "action_handoff_other_turn",
          performedAt: 1000,
          actionData: {
            sessionId: SESSION_ID,
            turnId: "turn_other",
            toAgentId: "agent_other",
            handoffProvenance: {
              selectionStrategy: "fallback_subtype",
              requestedSpecialistType: "booking_agent",
              matchedBy: "fallback_subtype",
              candidateCount: 1,
              catalogSize: 3,
            },
          },
        }),
        buildAction("team_handoff", {
          _id: "action_handoff_in_turn",
          performedAt: 1001,
          actionData: {
            sessionId: SESSION_ID,
            turnId: TURN_ID,
            toAgentId: "agent_specialist",
            handoffProvenance: {
              selectionStrategy: "fallback_subtype",
              requestedSpecialistType: "sales_assistant",
              matchedBy: "fallback_subtype",
              candidateCount: 2,
              catalogSize: 4,
            },
          },
        }),
        buildAction("message_processed", {
          _id: "action_processed",
          performedAt: 1002,
          actionData: {
            sessionId: SESSION_ID,
            turnId: TURN_ID,
            authorityAgentId: AUTHORITY_AGENT_ID,
            speakerAgentId: "agent_specialist",
          },
        }),
      ],
      executionEdges: [],
    });

    expect(result.trace.actionIds).toEqual([
      "action_handoff_in_turn",
      "action_processed",
    ]);
    expect(result.handoffProvenance.toAgentId).toBe("agent_specialist");
    expect(result.handoffProvenance.requestedSpecialistType).toBe("sales_assistant");
  });

  it("fails closed on org/session scope and prevents trace leakage", () => {
    const result = buildDelegationExplainabilityTrace({
      organizationId: ORG_ID,
      sessionId: SESSION_ID,
      turnId: TURN_ID,
      authorityAgentId: AUTHORITY_AGENT_ID,
      actions: [
        buildAction("message_processed", {
          _id: "action_in_scope",
          performedAt: 1000,
          actionData: {
            sessionId: SESSION_ID,
            turnId: TURN_ID,
            authorityAgentId: AUTHORITY_AGENT_ID,
            speakerAgentId: "agent_specialist",
          },
        }),
        buildAction("required_scope_contract_blocked", {
          _id: "action_wrong_session",
          organizationId: ORG_ID,
          performedAt: 1001,
          actionData: {
            sessionId: "session_other",
            turnId: TURN_ID,
            gap: { reasonCode: "required_scope_contract_missing" },
          },
        }),
        buildAction("required_scope_contract_blocked", {
          _id: "action_wrong_org",
          organizationId: "org_other",
          performedAt: 1002,
          actionData: {
            sessionId: SESSION_ID,
            turnId: TURN_ID,
            gap: { reasonCode: "required_scope_contract_missing" },
          },
        }),
      ],
      executionEdges: [],
    });

    expect(result.outcome.status).toBe("success");
    expect(result.trace.actionIds).toEqual(["action_in_scope"]);
    expect(result.trace.actionCount).toBe(1);
  });
});
