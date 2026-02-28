import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  assembleRuntimeSystemMessages,
} from "../../../convex/ai/agentExecution";
import {
  evaluateOperatorPinnedNotesAccess,
  evaluateSessionContactMemoryWriteScope,
  evaluateSessionReactivationMemoryReadScope,
  evaluateSessionRollingMemoryWriteScope,
} from "../../../convex/ai/agentSessions";
import {
  composeSessionContactMemoryContext,
  composeOperatorPinnedNotesContext,
  composeSessionReactivationMemoryContext,
} from "../../../convex/ai/memoryComposer";

describe("operator pinned notes prompting integration", () => {
  it("injects pinned notes ahead of composer/plan contexts in deterministic order", () => {
    const pinnedNotesContext = composeOperatorPinnedNotesContext([
      {
        noteId: "second",
        title: "Escalation",
        note: "Escalate payment retries after two failures.",
        sortOrder: 20,
        pinnedAt: 1_700_000_050_000,
      },
      {
        noteId: "first",
        title: "Voice",
        note: "Keep one visible operator voice at all times.",
        sortOrder: 10,
        pinnedAt: 1_700_000_000_000,
      },
    ]);

    const messages = assembleRuntimeSystemMessages({
      systemPrompt: "BASE SYSTEM PROMPT",
      pinnedNotesContext,
      rollingSummaryContext: "--- ROLLING SESSION MEMORY (L2) ---",
      composerRuntimeContext: "--- COMPOSER RUNTIME CONTROLS ---",
      planFeasibilityContext: "--- PLAN FEASIBILITY ---",
    });

    expect(messages).toHaveLength(5);
    expect(messages[0].content).toContain("BASE SYSTEM PROMPT");
    expect(messages[1].content).toContain("--- OPERATOR PINNED NOTES (L3) ---");
    expect(messages[1].content.indexOf("Voice")).toBeLessThan(
      messages[1].content.indexOf("Escalation")
    );
    expect(messages[2].content).toContain("--- ROLLING SESSION MEMORY (L2) ---");
    expect(messages[3].content).toContain("--- COMPOSER RUNTIME CONTROLS ---");
    expect(messages[4].content).toContain("--- PLAN FEASIBILITY ---");
  });

  it("fails closed on cross-org read access for non-super-admin session scope", () => {
    const decision = evaluateOperatorPinnedNotesAccess({
      action: "read",
      sessionOrganizationId: "org_a" as Id<"organizations">,
      requestedOrganizationId: "org_b" as Id<"organizations">,
      isSuperAdmin: false,
      hasPermission: true,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("session_org_mismatch");
  });

  it("fails closed for rolling memory writes when organization scope mismatches", () => {
    const decision = evaluateSessionRollingMemoryWriteScope({
      sessionOrganizationId: "org_a" as Id<"organizations">,
      requestedOrganizationId: "org_b" as Id<"organizations">,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("session_org_mismatch");
  });

  it("injects L5 reactivation context in deterministic prompt order on first-turn continuity", () => {
    const pinnedNotesContext = composeOperatorPinnedNotesContext([
      {
        noteId: "voice",
        title: "Voice",
        note: "Keep one visible operator voice.",
        sortOrder: 10,
      },
    ]);
    const reactivationMemoryContext = composeSessionReactivationMemoryContext({
      contractVersion: "session_reactivation_memory_v1",
      sourcePolicy: "rolling_summary_close_summary_v1",
      trigger: "inactivity_reactivation_v1",
      cachedContext: "User asked to keep daily summaries concise and action-first.",
      generatedAt: 1_740_000_100_000,
      cacheExpiresAt: 1_740_021_700_000,
      inactivityGapMs: 120_000,
      source: {
        sessionId: "session_prev",
        organizationId: "org_a",
        channel: "slack",
        externalContactIdentifier: "slack:C123:user:U456",
        sessionRoutingKey: "route:slack:T123",
        closeReason: "idle_timeout",
        closedAt: 1_740_000_100_000,
        lastMessageAt: 1_740_000_000_000,
      },
      provenance: {
        derivedFromRollingSummary: true,
        derivedFromSessionSummary: true,
      },
    });
    const contactMemoryContext = composeSessionContactMemoryContext([
      {
        memoryId: "mem_email",
        contractVersion: "session_contact_memory_v1",
        sourcePolicy: "explicit_user_verified_tool_v1",
        field: "email",
        value: "owner@example.com",
        normalizedValue: "owner@example.com",
        dedupeKey: "email:owner@example.com",
        status: "active",
        provenance: {
          contractVersion: "contact_memory_provenance_v1",
          sourceKind: "user_message",
          sourceSessionId: "session_prev",
          sourceTurnId: "turn_prev",
          sourceMessageRole: "user",
          sourceExcerpt: "user:my email is owner@example.com",
          sourceTimestamp: 1_740_000_050_000,
          actor: "agent_execution_pipeline",
          trustEventName: "trust.memory.consent_decided.v1",
          trustEventId: "trust.memory.consent_decided.v1:session_prev:turn_prev:email:owner@example.com",
        },
        createdAt: 1_740_000_050_000,
        updatedAt: 1_740_000_050_000,
      },
    ]);

    const messages = assembleRuntimeSystemMessages({
      systemPrompt: "BASE SYSTEM PROMPT",
      pinnedNotesContext,
      rollingSummaryContext: "--- ROLLING SESSION MEMORY (L2) ---",
      reactivationMemoryContext,
      contactMemoryContext,
      composerRuntimeContext: "--- COMPOSER RUNTIME CONTROLS ---",
      planFeasibilityContext: "--- PLAN FEASIBILITY ---",
    });

    expect(messages).toHaveLength(7);
    expect(messages[2].content).toContain("--- ROLLING SESSION MEMORY (L2) ---");
    expect(messages[3].content).toContain("--- REACTIVATION MEMORY (L5) ---");
    expect(messages[4].content).toContain("--- STRUCTURED CONTACT MEMORY (L4) ---");
    expect(messages[5].content).toContain("--- COMPOSER RUNTIME CONTROLS ---");
  });

  it("fails closed for L5 reactivation scope on cross-route mismatches", () => {
    const decision = evaluateSessionReactivationMemoryReadScope({
      sessionOrganizationId: "org_a" as Id<"organizations">,
      requestedOrganizationId: "org_a" as Id<"organizations">,
      sessionChannel: "slack",
      requestedChannel: "slack",
      sessionExternalContactIdentifier: "slack:C123:user:U456",
      requestedExternalContactIdentifier: "slack:C123:user:U456",
      sessionRoutingKey: "route:slack:T123",
      requestedSessionRoutingKey: "route:slack:T999",
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("route_mismatch");
  });

  it("fails closed for L4 contact memory writes on cross-channel scope mismatches", () => {
    const decision = evaluateSessionContactMemoryWriteScope({
      sessionOrganizationId: "org_a" as Id<"organizations">,
      requestedOrganizationId: "org_a" as Id<"organizations">,
      sessionChannel: "slack",
      requestedChannel: "webchat",
      sessionExternalContactIdentifier: "slack:C123:user:U456",
      requestedExternalContactIdentifier: "slack:C123:user:U456",
      sessionRoutingKey: "route:slack:T123",
      requestedSessionRoutingKey: "route:slack:T123",
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("channel_mismatch");
  });
});
