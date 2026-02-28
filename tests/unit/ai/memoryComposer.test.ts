import { describe, expect, it } from "vitest";
import {
  SESSION_CONTACT_MEMORY_CONTRACT_VERSION,
  SESSION_CONTACT_MEMORY_SOURCE_POLICY,
  SESSION_CONTACT_MEMORY_PROVENANCE_VERSION,
  SESSION_CONTACT_MEMORY_TRUST_EVENT_NAME,
  buildSessionReactivationMemorySnapshot,
  buildRollingSessionMemorySnapshot,
  composeSessionContactMemoryContext,
  composeAdaptiveRecentContextWindow,
  composeOperatorPinnedNotesContext,
  composeSessionReactivationMemoryContext,
  composeRollingSessionMemoryContext,
  composeSpecialistMemoryContext,
  composeKnowledgeContext,
  estimateTokensFromText,
  extractSessionContactMemoryCandidates,
  planSessionContactMemoryMerge,
  rankSemanticRetrievalChunks,
  sortOperatorPinnedNotesForPrompt,
  tokenizeSemanticRetrievalText,
} from "../../../convex/ai/memoryComposer";

describe("memoryComposer", () => {
  it("estimates token usage from text length", () => {
    expect(estimateTokensFromText("")).toBe(0);
    expect(estimateTokensFromText("abcd")).toBe(1);
    expect(estimateTokensFromText("abcde")).toBe(2);
  });

  it("keeps all docs when the budget can fit them", () => {
    const composed = composeKnowledgeContext({
      documents: [
        {
          filename: "pricing.md",
          content: "Pricing is fixed for 2026.",
          tags: ["Pricing", "Sales"],
          source: "layercake_document",
        },
        {
          filename: "faq.md",
          content: "Opening hours are Monday to Friday from 9 to 5.",
          tags: ["FAQ"],
          source: "layercake_document",
        },
      ],
      modelContextLength: 2000,
      budgetRatio: 0.4,
      minBudgetTokens: 50,
      maxBudgetTokens: 500,
    });

    expect(composed.documents).toHaveLength(2);
    expect(composed.droppedDocumentCount).toBe(0);
    expect(composed.truncatedDocumentCount).toBe(0);
    expect(composed.estimatedTokensUsed).toBeGreaterThan(0);
    expect(composed.sourceTags).toContain("pricing");
    expect(composed.sourceTags).toContain("faq");
    expect(composed.sourceTags).toContain("layercake_document");
  });

  it("truncates long content when the document exceeds the remaining budget", () => {
    const composed = composeKnowledgeContext({
      documents: [
        {
          filename: "long.md",
          content: "x".repeat(6000),
          source: "layercake_document",
        },
      ],
      modelContextLength: 200,
      budgetRatio: 0.1,
      minBudgetTokens: 5,
      maxBudgetTokens: 20,
    });

    expect(composed.documents).toHaveLength(1);
    expect(composed.truncatedDocumentCount).toBe(1);
    expect(composed.documents[0].content).toContain("[Truncated for context budget]");
  });

  it("drops overflow docs after budget is consumed", () => {
    const composed = composeKnowledgeContext({
      documents: [
        { filename: "doc-1.md", content: "a".repeat(500), source: "layercake_document" },
        { filename: "doc-2.md", content: "b".repeat(500), source: "layercake_document" },
        { filename: "doc-3.md", content: "c".repeat(500), source: "layercake_document" },
      ],
      modelContextLength: 300,
      budgetRatio: 0.1,
      minBudgetTokens: 10,
      maxBudgetTokens: 30,
    });

    expect(composed.documents.length).toBeLessThan(3);
    expect(composed.droppedDocumentCount).toBeGreaterThan(0);
  });

  it("tokenizes retrieval text with stop-word filtering", () => {
    const tokens = tokenizeSemanticRetrievalText(
      "What are the emergency plumbing prices in Berlin?"
    );
    expect(tokens).toContain("emergency");
    expect(tokens).toContain("plumbing");
    expect(tokens).toContain("prices");
    expect(tokens).not.toContain("what");
    expect(tokens).not.toContain("are");
  });

  it("ranks semantic chunks with confidence metadata", () => {
    const ranked = rankSemanticRetrievalChunks({
      queryText: "emergency plumbing prices",
      candidates: [
        {
          chunkId: "c-1",
          chunkText: "Emergency plumbing prices start at $199 for same-day callouts.",
          sourceFilename: "pricing.md",
          sourceTags: ["pricing", "plumbing"],
          sourceUpdatedAt: Date.now(),
        },
        {
          chunkId: "c-2",
          chunkText: "Our office opening hours are Monday to Friday.",
          sourceFilename: "hours.md",
          sourceTags: ["hours"],
          sourceUpdatedAt: Date.now(),
        },
      ],
      limit: 5,
    });

    expect(ranked).toHaveLength(1);
    expect(ranked[0].chunkId).toBe("c-1");
    expect(ranked[0].semanticScore).toBeGreaterThan(0.1);
    expect(ranked[0].confidence).toBeCloseTo(ranked[0].semanticScore, 4);
    expect(["low", "medium", "high"]).toContain(ranked[0].confidenceBand);
    expect(ranked[0].matchedTokens).toContain("emergency");
  });

  it("composes invisible specialist context without switching visible voice", () => {
    const context = composeSpecialistMemoryContext({
      teamAccessMode: "invisible",
      specialistName: "The Strategist",
      reason: "Need market positioning insight",
      summary: "Prospect needs clear differentiation language for the homepage",
      goal: "Recommend a concise value proposition angle",
    });

    expect(context).toContain("[Specialist routing mode: invisible]");
    expect(context).toContain("Specialist: The Strategist");
    expect(context).toContain("Invisible mode: specialist advice remains internal");
  });

  it("composes meeting specialist context while keeping primary visible", () => {
    const context = composeSpecialistMemoryContext({
      teamAccessMode: "meeting",
      specialistName: "The CFO",
      reason: "Pricing strategy review",
      summary: "Operator requested margin-sensitive packaging guidance",
      goal: "Produce pricing options with risk notes",
      priorSharedContext: "Customer has asked for annual plan pricing.",
    });

    expect(context).toContain("[Specialist routing mode: meeting]");
    expect(context).toContain("Customer has asked for annual plan pricing.");
    expect(context).toContain("primary agent remains visible");
  });

  it("sorts pinned notes deterministically for L3 prompt injection", () => {
    const sorted = sortOperatorPinnedNotesForPrompt([
      {
        noteId: "z-note",
        title: "Escalation",
        note: "Escalate billing disputes after two failed retries.",
        sortOrder: 20,
        pinnedAt: 1_700_000_100_000,
        updatedAt: 1_700_000_200_000,
      },
      {
        noteId: "a-note",
        title: "Tone",
        note: "Keep replies concise and owner-first.",
        sortOrder: 10,
        pinnedAt: 1_700_000_000_000,
        updatedAt: 1_700_000_050_000,
      },
      {
        noteId: "b-note",
        title: "Tone variant",
        note: "Never expose hidden specialist routing.",
        sortOrder: 10,
        pinnedAt: 1_700_000_000_000,
        updatedAt: 1_700_000_070_000,
      },
    ]);

    expect(sorted.map((note) => note.noteId)).toEqual([
      "b-note",
      "a-note",
      "z-note",
    ]);
  });

  it("renders pinned notes in a dedicated L3 prompt block", () => {
    const context = composeOperatorPinnedNotesContext([
      {
        noteId: "a-note",
        title: "Owner preference",
        note: "Use one visible operator voice and hide specialist internals.",
        sortOrder: 5,
      },
      {
        noteId: "b-note",
        note: "Confirm before any mutating action.",
        sortOrder: 10,
      },
    ]);

    expect(context).toContain("--- OPERATOR PINNED NOTES (L3) ---");
    expect(context).toContain("[L3-1] Owner preference (priority 5)");
    expect(context).toContain("[L3-2] Pinned note 2 (priority 10)");
    expect(context).toContain("Confirm before any mutating action.");
    expect(context).toContain("--- END OPERATOR PINNED NOTES (L3) ---");
  });

  it("builds rolling L2 memory from user signals and verified tool outputs only", () => {
    const snapshot = buildRollingSessionMemorySnapshot({
      messages: [
        {
          role: "assistant",
          content: "I think this should probably be done tomorrow.",
        },
        {
          role: "assistant",
          content: "Tool call completed.",
          toolCalls: [
            { tool: "query_org_data", status: "success", result: { segment: "vip", count: 12 } },
            { tool: "send_email_from_template", status: "error", error: "smtp down" },
          ],
        },
        {
          role: "user",
          content: "Please prioritize VIP contacts and draft follow-up copy.",
        },
      ],
      now: 1_740_000_000_000,
    });

    expect(snapshot).not.toBeNull();
    expect(snapshot?.summary).toContain("Recent user signals:");
    expect(snapshot?.summary).toContain("prioritize VIP contacts");
    expect(snapshot?.summary).toContain("Verified tool outcomes:");
    expect(snapshot?.summary).toContain("query_org_data:");
    expect(snapshot?.summary).not.toContain("smtp down");
    expect(snapshot?.verifiedToolResultCount).toBe(1);

    const context = composeRollingSessionMemoryContext(snapshot);
    expect(context).toContain("--- ROLLING SESSION MEMORY (L2) ---");
    expect(context).toContain("verified tool outputs");
  });

  it("fails closed when no user or verified tool evidence exists", () => {
    const snapshot = buildRollingSessionMemorySnapshot({
      messages: [
        {
          role: "assistant",
          content: "Let me think through this strategy.",
        },
        {
          role: "assistant",
          content: "Attempted tool call.",
          toolCalls: [
            { tool: "send_email_from_template", status: "error", error: "permission denied" },
          ],
        },
      ],
    });

    expect(snapshot).toBeNull();
    expect(composeRollingSessionMemoryContext(snapshot)).toBeNull();
  });

  it("builds cached L5 reactivation memory with explicit provenance", () => {
    const rollingSnapshot = buildRollingSessionMemorySnapshot({
      messages: [
        {
          role: "user",
          content: "Please keep my replies concise and owner-first.",
        },
        {
          role: "assistant",
          content: "Tool call completed.",
          toolCalls: [
            { tool: "query_org_data", status: "success", result: { segment: "vip" } },
          ],
        },
      ],
      now: 1_740_000_000_000,
    });

    const reactivation = buildSessionReactivationMemorySnapshot({
      sourceSessionId: "session_prev",
      sourceOrganizationId: "org_a",
      sourceChannel: "slack",
      sourceExternalContactIdentifier: "slack:C123:user:U456",
      sourceSessionRoutingKey: "route:slack:T123",
      sourceCloseReason: "idle_timeout",
      sourceClosedAt: 1_740_000_100_000,
      sourceLastMessageAt: 1_740_000_000_000,
      inactivityGapMs: 100_000,
      rollingSummaryMemory: rollingSnapshot,
      sessionSummary: "Previously agreed to finalize the founder demo checklist.",
      now: 1_740_000_100_000,
    });

    expect(reactivation).not.toBeNull();
    expect(reactivation?.provenance.derivedFromRollingSummary).toBe(true);
    expect(reactivation?.provenance.derivedFromSessionSummary).toBe(true);
    expect(reactivation?.cachedContext).toContain("Reactivation context generated");
    expect(reactivation?.cachedContext).toContain("Closed-session summary");
  });

  it("renders L5 reactivation context with provenance and continuity boundary", () => {
    const context = composeSessionReactivationMemoryContext({
      contractVersion: "session_reactivation_memory_v1",
      sourcePolicy: "rolling_summary_close_summary_v1",
      trigger: "inactivity_reactivation_v1",
      cachedContext: "Carry forward owner's VIP contact prioritization guidance.",
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
        derivedFromSessionSummary: false,
      },
    });

    expect(context).toContain("--- REACTIVATION MEMORY (L5) ---");
    expect(context).toContain("source_org=org_a");
    expect(context).toContain("Continuity boundary:");
    expect(context).toContain("--- END REACTIVATION MEMORY (L5) ---");
  });

  it("fails closed for L5 cache generation when no rolling or summary source exists", () => {
    const reactivation = buildSessionReactivationMemorySnapshot({
      sourceSessionId: "session_prev",
      sourceOrganizationId: "org_a",
      sourceChannel: "slack",
      sourceExternalContactIdentifier: "slack:C123:user:U456",
      sourceSessionRoutingKey: "route:slack:T123",
      sourceCloseReason: "idle_timeout",
      sourceClosedAt: 1_740_000_100_000,
      sourceLastMessageAt: 1_740_000_000_000,
      inactivityGapMs: 100_000,
      now: 1_740_000_100_000,
    });

    expect(reactivation).toBeNull();
  });

  it("extracts L4 candidates only from explicit user statements and verified tool outputs", () => {
    const candidates = extractSessionContactMemoryCandidates({
      userMessage:
        "My name is Alex Rivera. My email is alex@example.com. Text me at +1 (555) 111-2222. I prefer WhatsApp.",
      toolResults: [
        {
          tool: "crm_lookup_contact",
          status: "success",
          result: {
            contact: {
              timezone: "America/New_York",
              email: "ALEX@EXAMPLE.COM",
            },
          },
        },
        {
          tool: "crm_lookup_contact",
          status: "error",
          result: {
            contact: {
              email: "ignored@example.com",
            },
          },
        },
      ],
    });

    expect(candidates.map((candidate) => candidate.field)).toEqual([
      "preferred_name",
      "email",
      "phone",
      "timezone",
      "communication_preference",
    ]);
    expect(candidates.find((candidate) => candidate.field === "email")?.value).toBe(
      "alex@example.com"
    );
    expect(candidates.find((candidate) => candidate.field === "phone")?.value).toBe(
      "+15551112222"
    );
    expect(candidates.find((candidate) => candidate.field === "timezone")?.value).toBe(
      "America/New_York"
    );
    expect(
      candidates.every(
        (candidate) =>
          candidate.sourceKind === "user_message"
          || candidate.sourceKind === "verified_tool_result"
      )
    ).toBe(true);
  });

  it("fails closed merge planning when multiple values exist for the same field", () => {
    const mergePlan = planSessionContactMemoryMerge({
      existingRecords: [],
      candidates: [
        {
          field: "email",
          value: "one@example.com",
          normalizedValue: "one@example.com",
          dedupeKey: "email:one@example.com",
          sourceKind: "user_message",
          sourceExcerpt: "user:my email is one@example.com",
        },
        {
          field: "email",
          value: "two@example.com",
          normalizedValue: "two@example.com",
          dedupeKey: "email:two@example.com",
          sourceKind: "verified_tool_result",
          sourceExcerpt: "tool:contact.email=two@example.com",
          sourceToolName: "crm_lookup_contact",
        },
      ],
    });

    expect(mergePlan.candidates).toHaveLength(0);
    expect(mergePlan.operations).toHaveLength(0);
    expect(mergePlan.ambiguousFields).toEqual(["email"]);
  });

  it("plans deterministic supersede and revert operations for L4 contact memory", () => {
    const provenance = {
      contractVersion: SESSION_CONTACT_MEMORY_PROVENANCE_VERSION,
      sourceKind: "user_message" as const,
      sourceSessionId: "session_prev",
      sourceTurnId: "turn_prev",
      sourceMessageRole: "user" as const,
      sourceExcerpt: "user:my email is old@example.com",
      sourceTimestamp: 1_740_000_000_000,
      actor: "agent_execution_pipeline" as const,
      trustEventName: SESSION_CONTACT_MEMORY_TRUST_EVENT_NAME,
      trustEventId: "trust.memory.consent_decided.v1:session_prev:turn_prev:email:old",
    };
    const mergePlan = planSessionContactMemoryMerge({
      existingRecords: [
        {
          memoryId: "mem_active",
          contractVersion: SESSION_CONTACT_MEMORY_CONTRACT_VERSION,
          sourcePolicy: SESSION_CONTACT_MEMORY_SOURCE_POLICY,
          field: "email",
          value: "new@example.com",
          normalizedValue: "new@example.com",
          dedupeKey: "email:new@example.com",
          status: "active",
          provenance: {
            ...provenance,
            sourceExcerpt: "user:my email is new@example.com",
            trustEventId: "trust.memory.consent_decided.v1:session_prev:turn_prev:email:new",
          },
          createdAt: 1_740_000_010_000,
          updatedAt: 1_740_000_010_000,
        },
        {
          memoryId: "mem_old",
          contractVersion: SESSION_CONTACT_MEMORY_CONTRACT_VERSION,
          sourcePolicy: SESSION_CONTACT_MEMORY_SOURCE_POLICY,
          field: "email",
          value: "old@example.com",
          normalizedValue: "old@example.com",
          dedupeKey: "email:old@example.com",
          status: "superseded",
          supersededByMemoryId: "mem_active",
          provenance,
          createdAt: 1_739_000_000_000,
          updatedAt: 1_739_000_000_000,
        },
      ],
      candidates: [
        {
          field: "email",
          value: "old@example.com",
          normalizedValue: "old@example.com",
          dedupeKey: "email:old@example.com",
          sourceKind: "user_message",
          sourceExcerpt: "user:my email is old@example.com",
        },
      ],
    });

    expect(mergePlan.ambiguousFields).toHaveLength(0);
    expect(mergePlan.operations).toHaveLength(1);
    expect(mergePlan.operations[0]).toMatchObject({
      mergeKind: "revert",
      supersedesMemoryId: "mem_active",
      revertedFromMemoryId: "mem_old",
    });
  });

  it("renders L4 structured contact memory context in field order", () => {
    const context = composeSessionContactMemoryContext([
      {
        memoryId: "m2",
        contractVersion: SESSION_CONTACT_MEMORY_CONTRACT_VERSION,
        sourcePolicy: SESSION_CONTACT_MEMORY_SOURCE_POLICY,
        field: "phone",
        value: "+15551112222",
        normalizedValue: "+15551112222",
        dedupeKey: "phone:+15551112222",
        status: "active",
        provenance: {
          contractVersion: SESSION_CONTACT_MEMORY_PROVENANCE_VERSION,
          sourceKind: "user_message",
          sourceSessionId: "session_now",
          sourceTurnId: "turn_now",
          sourceMessageRole: "user",
          sourceExcerpt: "user:text me at +1 (555) 111-2222",
          sourceTimestamp: 1_740_000_000_000,
          actor: "agent_execution_pipeline",
          trustEventName: SESSION_CONTACT_MEMORY_TRUST_EVENT_NAME,
          trustEventId: "trust.memory.consent_decided.v1:session_now:turn_now:phone:+15551112222",
        },
        createdAt: 1_740_000_000_000,
        updatedAt: 1_740_000_000_000,
      },
      {
        memoryId: "m1",
        contractVersion: SESSION_CONTACT_MEMORY_CONTRACT_VERSION,
        sourcePolicy: SESSION_CONTACT_MEMORY_SOURCE_POLICY,
        field: "email",
        value: "alex@example.com",
        normalizedValue: "alex@example.com",
        dedupeKey: "email:alex@example.com",
        status: "active",
        provenance: {
          contractVersion: SESSION_CONTACT_MEMORY_PROVENANCE_VERSION,
          sourceKind: "verified_tool_result",
          sourceSessionId: "session_now",
          sourceTurnId: "turn_now",
          sourceToolName: "crm_lookup_contact",
          sourceExcerpt: "crm_lookup_contact:contact.email=alex@example.com",
          sourceTimestamp: 1_740_000_000_000,
          actor: "agent_execution_pipeline",
          trustEventName: SESSION_CONTACT_MEMORY_TRUST_EVENT_NAME,
          trustEventId: "trust.memory.consent_decided.v1:session_now:turn_now:email:alex@example.com",
        },
        createdAt: 1_740_000_000_000,
        updatedAt: 1_740_000_000_000,
      },
    ]);

    expect(context).toContain("--- STRUCTURED CONTACT MEMORY (L4) ---");
    expect(context).toContain("Email: alex@example.com");
    expect(context).toContain("Phone: +15551112222");
    expect(context!.indexOf("Email:")).toBeLessThan(context!.indexOf("Phone:"));
    expect(context).toContain("--- END STRUCTURED CONTACT MEMORY (L4) ---");
  });

  it("adapts L1 recent context window by selected model context length", () => {
    const longHistory = Array.from({ length: 24 }).map((_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: `Message ${index + 1}: ${"context ".repeat(50)}`,
    }));

    const smallWindow = composeAdaptiveRecentContextWindow({
      messages: longHistory,
      modelContextLength: 4_096,
      reservedTokens: 2_600,
    });
    const largeWindow = composeAdaptiveRecentContextWindow({
      messages: longHistory,
      modelContextLength: 128_000,
      reservedTokens: 2_600,
    });

    expect(smallWindow.messages.length).toBeLessThan(largeWindow.messages.length);
    expect(smallWindow.messages[smallWindow.messages.length - 1]?.content).toContain("Message 24");
    expect(smallWindow.droppedMessageCount).toBeGreaterThan(0);
    expect(largeWindow.droppedMessageCount).toBe(0);
  });
});
