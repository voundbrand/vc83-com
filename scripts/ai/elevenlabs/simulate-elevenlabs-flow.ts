#!/usr/bin/env tsx

"use node";

import { readdirSync, readFileSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import WebSocket from "ws";
import {
  AGENT_KEYS,
  ELEVENLABS_FIXTURES_ROOT,
  formatAgent,
  resolveAgentId,
  resolveAgentKeyById,
  type LandingDemoAgentKey,
} from "./lib/catalog";
import {
  ElevenLabsClient,
  type ElevenLabsConversation,
  type ElevenLabsConversationTranscriptTurn,
} from "./lib/elevenlabs-api";
import { loadLandingDemoEnv, requireEnv } from "./lib/env";
import { sleep } from "./lib/utils";

interface SimulationOptions {
  fixturePaths: string[];
  idleMs: number;
  handoffSettleMs: number;
  maxTransfersPerTurnWithoutSpeech: number;
  turnTimeoutMs: number;
}

interface ConversationFixture {
  name: string;
  description?: string;
  entryAgent: LandingDemoAgentKey;
  userTurns: Array<{
    text: string;
    label?: string;
    expectTransfer?: boolean;
  }>;
  assertions: {
    expectedTransferSequence?: LandingDemoAgentKey[];
    expectedFinalAgent?: LandingDemoAgentKey;
    requiredAgentsVisited?: LandingDemoAgentKey[];
    forbidUnexpectedTransfers?: boolean;
    requireAgentSpeechAfterTransfer?: boolean;
    enforceTransferSpeakerState?: boolean;
    forbidAgentSelfClaimMismatch?: boolean;
    requiredAssistantSubstrings?: string[];
    forbiddenAssistantSubstrings?: string[];
  };
}

interface RuntimeLogEvent {
  type: string;
  text?: string;
  toolName?: string;
  responseId?: string;
  timestamp: number;
}

interface SimulationRunResult {
  conversationId: string;
  events: RuntimeLogEvent[];
  runtimeFailure?: string;
}

interface TranscriptTransferEvent {
  sourceTurnIndex: number;
  sourceAgentId: string | null;
  targetAgentId: string | null;
  toolName: string;
  resultType: string | null;
}

const FIXTURE_SUITES: Record<string, string[]> = {
  regressions: [
    "clara-callback-intake-smoke",
    "clara-kai-clara-maren-regression",
    "clara-kai-clara-maren-recommendation",
    "clara-nora-ambiguous-affirmation",
  ],
  "callback-smokes": ["clara-callback-intake-smoke"],
  "proof-phase-gating": ["proof-phase-seven-agent-tour"],
  "proof-phase-stress": ["proof-phase-seven-agent-single-call-stress"],
  "specialist-redirects": [
    "clara-maren-cross-lane-redirect",
    "clara-jonas-cross-lane-redirect",
    "clara-tobias-cross-lane-redirect",
    "clara-lina-cross-lane-redirect",
    "clara-kai-cross-lane-redirect",
    "clara-nora-cross-lane-redirect",
  ],
  "specialist-ring": [
    "clara-maren-clara-jonas-handoff",
    "clara-jonas-clara-tobias-handoff",
    "clara-tobias-clara-lina-handoff",
    "clara-lina-clara-kai-handoff",
    "clara-kai-clara-nora-handoff",
    "clara-kai-clara-maren-regression",
  ],
  "specialist-roundtrips": [
    "clara-maren-clara-roundtrip",
    "clara-jonas-clara-roundtrip",
    "clara-tobias-clara-roundtrip",
    "clara-lina-clara-roundtrip",
    "clara-kai-clara-roundtrip",
    "clara-nora-clara-roundtrip",
  ],
  "grand-tour": ["clara-specialist-grand-tour"],
  "all-handoffs": [
    "clara-maren-clara-roundtrip",
    "clara-jonas-clara-roundtrip",
    "clara-tobias-clara-roundtrip",
    "clara-lina-clara-roundtrip",
    "clara-kai-clara-roundtrip",
    "clara-nora-clara-roundtrip",
    "clara-maren-clara-jonas-handoff",
    "clara-jonas-clara-tobias-handoff",
    "clara-tobias-clara-lina-handoff",
    "clara-lina-clara-kai-handoff",
    "clara-kai-clara-nora-handoff",
    "clara-kai-clara-maren-regression",
    "clara-kai-clara-maren-recommendation",
    "clara-nora-ambiguous-affirmation",
  ],
  "clara-v3-demo-proof": [
    "clara-v3-disclosure-and-intake",
    "clara-v3-arbeitsrecht-priority-intake",
    "clara-v3-familienrecht-safety-escalation",
    "clara-v3-mietrecht-checklist-intake",
    "clara-v3-strafrecht-emergency-intake",
    "clara-v3-callback-capture",
    "clara-v3-no-specialist-transfer",
  ],
};

async function main(): Promise<void> {
  loadLandingDemoEnv();

  const options = parseArgs(process.argv.slice(2));
  const client = new ElevenLabsClient(requireEnv("ELEVENLABS_API_KEY"));

  let hasFailure = false;

  for (const fixturePath of options.fixturePaths) {
    const fixture = readFixture(fixturePath);
    console.log(`Fixture: ${fixture.name}`);
    if (fixture.description) {
      console.log(fixture.description);
    }
    console.log(`Entry agent: ${formatAgent(fixture.entryAgent)} (${resolveAgentId(fixture.entryAgent)})`);
    console.log("");

    const simulation = await runConversationFixture(client, fixture, options);
    const conversation = await waitForConversation(client, simulation.conversationId);
    const analysis = analyzeConversation(fixture, conversation, simulation.events);
    if (simulation.runtimeFailure) {
      analysis.failures.unshift(simulation.runtimeFailure);
    }

    printRuntimeSummary(conversation, analysis.transferEvents);
    printAssertionSummary(analysis.failures);
    console.log("");

    if (analysis.failures.length > 0) {
      hasFailure = true;
    }
  }

  if (hasFailure) {
    process.exit(1);
  }
}

async function runConversationFixture(
  client: ElevenLabsClient,
  fixture: ConversationFixture,
  options: SimulationOptions
): Promise<SimulationRunResult> {
  const signedUrl = await client.getSignedUrl(resolveAgentId(fixture.entryAgent));
  return new Promise<SimulationRunResult>((resolveResult, rejectResult) => {
    const ws = new WebSocket(signedUrl);
    const events: RuntimeLogEvent[] = [];
    const streamedAgentResponses = new Map<string, string>();
    const completedAgentResponseIds = new Set<string>();

    let conversationId = "";
    let currentTurnIndex = -1;
    let greetingReceived = false;
    let turnInFlight = false;
    let lastActivityAt = 0;
    let sawAgentResponseForTurn = false;
    let sawTransferForTurn = false;
    let transferCountForTurn = 0;
    let idleTimer: NodeJS.Timeout | null = null;
    let hardTurnTimer: NodeJS.Timeout | null = null;
    let resolved = false;
    let runtimeFailure: string | undefined;

    function cleanup(): void {
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
      if (hardTurnTimer) {
        clearTimeout(hardTurnTimer);
      }
    }

    function fail(error: Error): void {
      if (resolved) {
        return;
      }
      resolved = true;
      cleanup();
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1000, "simulation-error");
      }
      rejectResult(error);
    }

    function finish(): void {
      if (resolved) {
        return;
      }
      if (!conversationId) {
        fail(new Error("ElevenLabs did not return a conversation id."));
        return;
      }
      const completedTurnCount = currentTurnIndex + 1;
      if (!runtimeFailure && completedTurnCount < fixture.userTurns.length) {
        runtimeFailure =
          currentTurnIndex < 0
            ? "Conversation ended before the scripted user turns began."
            : `Conversation ended after ${completedTurnCount} of ${fixture.userTurns.length} scripted user turn(s).`;
      }
      resolved = true;
      cleanup();
      resolveResult({ conversationId, events, runtimeFailure });
    }

    function scheduleIdleCheck(): void {
      if (!turnInFlight) {
        return;
      }
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
      idleTimer = setTimeout(() => {
        completeTurnIfIdle();
      }, options.idleMs);
    }

    function startTurn(text: string): void {
      currentTurnIndex += 1;
      turnInFlight = true;
      lastActivityAt = Date.now();
      sawAgentResponseForTurn = false;
      sawTransferForTurn = false;
      transferCountForTurn = 0;
      console.log(
        `USER ${currentTurnIndex + 1}/${fixture.userTurns.length}: ${fixture.userTurns[currentTurnIndex].label || text}`
      );
      ws.send(JSON.stringify({ type: "user_message", text }));
      hardTurnTimer = setTimeout(() => {
        runtimeFailure = `Timed out waiting for ElevenLabs response on turn ${
          currentTurnIndex + 1
        }: ${fixture.userTurns[currentTurnIndex].text}`;
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1000, "turn-timeout");
          return;
        }
        fail(new Error(runtimeFailure));
      }, options.turnTimeoutMs);
      scheduleIdleCheck();
    }

    function recordAgentResponse(text: string, responseId?: string): void {
      const normalizedResponseId = responseId?.trim();
      if (normalizedResponseId && completedAgentResponseIds.has(normalizedResponseId)) {
        return;
      }
      if (normalizedResponseId) {
        completedAgentResponseIds.add(normalizedResponseId);
      }
      const normalizedText = text.trim();
      events.push({
        type: "agent_response",
        text: normalizedText,
        responseId: normalizedResponseId,
        timestamp: Date.now(),
      });
      lastActivityAt = Date.now();
      console.log(`ASSISTANT: ${normalizedText}`);

      if (!greetingReceived) {
        greetingReceived = true;
        console.log("");
        if (fixture.userTurns.length === 0) {
          ws.close(1000, "simulation-complete");
          return;
        }
        startTurn(fixture.userTurns[0].text);
        return;
      }

      sawAgentResponseForTurn = true;
      scheduleIdleCheck();
    }

    function completeTurnIfIdle(): void {
      if (!turnInFlight) {
        return;
      }
      const currentTurn = fixture.userTurns[currentTurnIndex];

      if (currentTurn?.expectTransfer && !sawTransferForTurn) {
        scheduleIdleCheck();
        return;
      }

      if (sawTransferForTurn && !sawAgentResponseForTurn) {
        scheduleIdleCheck();
        return;
      }
      const elapsed = Date.now() - lastActivityAt;
      const requiredIdleMs = sawAgentResponseForTurn ? options.idleMs : Number.POSITIVE_INFINITY;

      if (elapsed < requiredIdleMs) {
        scheduleIdleCheck();
        return;
      }

      turnInFlight = false;
      if (hardTurnTimer) {
        clearTimeout(hardTurnTimer);
        hardTurnTimer = null;
      }

      if (currentTurnIndex + 1 < fixture.userTurns.length) {
        console.log("");
        startTurn(fixture.userTurns[currentTurnIndex + 1].text);
        return;
      }

      console.log("");
      ws.close(1000, "simulation-complete");
    }

    ws.on("open", () => {
      ws.send(
        JSON.stringify({
          type: "conversation_initiation_client_data",
          conversation_config_override: {
            conversation: {
              text_only: true,
              client_events: ["agent_response", "agent_tool_response", "user_transcript"],
            },
          },
        })
      );
    });

    ws.on("message", (rawMessage: { toString(): string }) => {
      const payload = JSON.parse(rawMessage.toString()) as Record<string, unknown>;
      const eventType = String(payload.type);

      if (eventType === "ping") {
        const pingEvent = payload.ping_event as { event_id: number; ping_ms?: number | null };
        setTimeout(() => {
          ws.send(JSON.stringify({ type: "pong", event_id: pingEvent.event_id }));
        }, pingEvent.ping_ms ?? 0);
        return;
      }

      if (eventType === "conversation_initiation_metadata") {
        const metadata = payload.conversation_initiation_metadata_event as {
          conversation_id?: string;
        };
        conversationId = metadata.conversation_id || "";
        console.log(`Conversation ID: ${conversationId}`);
        console.log("");
        return;
      }

      if (eventType === "agent_chat_response_part") {
        const part = payload.text_response_part as {
          event_id?: number | string;
          text?: string;
          type?: string;
        };
        const responseId = String(part.event_id ?? "");
        const partType = String(part.type ?? "");
        if (partType === "start") {
          streamedAgentResponses.set(responseId, "");
          return;
        }
        if (partType === "delta") {
          streamedAgentResponses.set(responseId, `${streamedAgentResponses.get(responseId) ?? ""}${part.text ?? ""}`);
          return;
        }
        if (partType === "stop") {
          const text = streamedAgentResponses.get(responseId) ?? "";
          streamedAgentResponses.delete(responseId);
          if (text.trim().length > 0) {
            recordAgentResponse(text, responseId);
          }
          return;
        }
      }

      if (eventType === "agent_response") {
        const response = payload.agent_response_event as { agent_response?: string };
        const text = response.agent_response || "";
        const responseId =
          typeof (response as { event_id?: unknown }).event_id === "number" ||
          typeof (response as { event_id?: unknown }).event_id === "string"
            ? String((response as { event_id?: unknown }).event_id)
            : undefined;
        recordAgentResponse(text, responseId);
        return;
      }

      if (eventType === "agent_tool_response") {
        const toolResponse = payload.agent_tool_response as {
          tool_name?: string;
          is_error?: boolean;
          is_called?: boolean;
        };
        const toolName = toolResponse.tool_name ?? "";
        events.push({
          type: eventType,
          toolName,
          timestamp: Date.now(),
        });
        lastActivityAt = Date.now();
        if (isTransferToolName(toolName) && !toolResponse.is_error) {
          sawTransferForTurn = true;
          transferCountForTurn += 1;
        }
        console.log(
          `TOOL: ${toolResponse.tool_name || "unknown"} (${toolResponse.is_error ? "error" : "ok"})`
        );
        if (
          isTransferToolName(toolName) &&
          !toolResponse.is_error &&
          !sawAgentResponseForTurn &&
          transferCountForTurn >= options.maxTransfersPerTurnWithoutSpeech
        ) {
          runtimeFailure = `Detected ${transferCountForTurn} transfer events without an assistant response on turn ${
            currentTurnIndex + 1
          }. Possible handoff loop.`;
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(1000, "transfer-loop-detected");
            return;
          }
        }
        scheduleIdleCheck();
        return;
      }

      if (eventType === "user_transcript") {
        lastActivityAt = Date.now();
        scheduleIdleCheck();
      }
    });

    ws.on("close", (code: number, reason: { toString(): string }) => {
      if (resolved) {
        return;
      }
      if (code !== 1000) {
        if (!conversationId) {
          fail(new Error(`ElevenLabs websocket closed unexpectedly (${code}): ${reason.toString()}`));
          return;
        }
        finish();
        return;
      }
      finish();
    });

    ws.on("error", (error: unknown) => {
      fail(error instanceof Error ? error : new Error(String(error)));
    });
  });
}

async function waitForConversation(
  client: ElevenLabsClient,
  conversationId: string
): Promise<ElevenLabsConversation> {
  let latestConversation: ElevenLabsConversation | null = null;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    latestConversation = await client.getConversation(conversationId);
    if (latestConversation.status === "done") {
      return latestConversation;
    }
    await sleep(1000);
  }

  if (!latestConversation) {
    throw new Error(`Unable to load ElevenLabs conversation: ${conversationId}`);
  }

  return latestConversation;
}

function analyzeConversation(
  fixture: ConversationFixture,
  conversation: ElevenLabsConversation,
  runtimeEvents: RuntimeLogEvent[] = []
): { failures: string[]; transferEvents: TranscriptTransferEvent[] } {
  const failures: string[] = [];
  const speechTurns = conversation.transcript
    .map((turn, index) => ({ turn, index }))
    .filter(
      ({ turn }) => turn.role === "agent" && typeof turn.message === "string" && turn.message.trim().length > 0
    );
  const transferEvents = extractTransferEvents(conversation.transcript);
  const transcriptAssistantCorpus = speechTurns.map(({ turn }) => turn.message || "").join("\n");
  const streamedAssistantCorpus = runtimeEvents
    .filter(
      (event): event is RuntimeLogEvent & { text: string } =>
        event.type === "agent_response" && typeof event.text === "string" && event.text.trim().length > 0
    )
    .map((event) => event.text)
    .join("\n");
  const assistantCorpus = `${transcriptAssistantCorpus}\n${streamedAssistantCorpus}`.trim();
  const normalizedAssistantCorpus = normalizeForMatch(assistantCorpus);
  const actualTransferSequence = transferEvents
    .map((event) => resolveAgentKeyById(event.targetAgentId))
    .filter((agentKey): agentKey is LandingDemoAgentKey => agentKey !== null);
  const runtimeTransferToolCalls = runtimeEvents.filter(
    (event): event is RuntimeLogEvent & { toolName: string } =>
      event.type === "agent_tool_response" && typeof event.toolName === "string" && isTransferToolName(event.toolName)
  );

  if (fixture.assertions.expectedTransferSequence) {
    const expectedTransferSequence = fixture.assertions.expectedTransferSequence;
    if (
      expectedTransferSequence.length !== actualTransferSequence.length ||
      expectedTransferSequence.some((expectedAgent, index) => actualTransferSequence[index] !== expectedAgent)
    ) {
      failures.push(
        `Expected transfer sequence ${expectedTransferSequence
          .map((agentKey) => formatAgent(agentKey))
          .join(" -> ")}, got ${actualTransferSequence.map((agentKey) => formatAgent(agentKey)).join(" -> ") || "none"}.`
      );
    }
  }

  if (fixture.assertions.expectedFinalAgent) {
    const lastSpeechTurn = speechTurns[speechTurns.length - 1];
    const actualFinalAgent = resolveAgentKeyById(lastSpeechTurn?.turn.agent_metadata?.agent_id);
    if (actualFinalAgent !== fixture.assertions.expectedFinalAgent) {
      failures.push(
        `Expected final agent ${formatAgent(fixture.assertions.expectedFinalAgent)}, got ${
          actualFinalAgent ? formatAgent(actualFinalAgent) : "unknown"
        }.`
      );
    }
  }

  if (fixture.assertions.requiredAgentsVisited && fixture.assertions.requiredAgentsVisited.length > 0) {
    const visitedAgents = new Set(
      speechTurns
        .map(({ turn }) => resolveAgentKeyById(turn.agent_metadata?.agent_id))
        .filter((agentKey): agentKey is LandingDemoAgentKey => agentKey !== null)
    );

    for (const requiredAgent of fixture.assertions.requiredAgentsVisited) {
      if (!visitedAgents.has(requiredAgent)) {
        failures.push(`Expected ${formatAgent(requiredAgent)} to speak during the conversation.`);
      }
    }
  }

  if (fixture.assertions.forbidUnexpectedTransfers && fixture.assertions.expectedTransferSequence) {
    if (actualTransferSequence.length !== fixture.assertions.expectedTransferSequence.length) {
      failures.push(
        `Expected ${fixture.assertions.expectedTransferSequence.length} transfer(s), got ${actualTransferSequence.length}.`
      );
    }
  }

  if (fixture.assertions.forbidUnexpectedTransfers) {
    const expectedTransfersCount = fixture.assertions.expectedTransferSequence?.length ?? 0;
    if (runtimeTransferToolCalls.length > expectedTransfersCount) {
      failures.push(
        `Unexpected transfer tool call(s) detected: ${runtimeTransferToolCalls
          .map((event) => event.toolName)
          .join(", ")}.`
      );
    }
  }

  if (fixture.assertions.requireAgentSpeechAfterTransfer || fixture.assertions.enforceTransferSpeakerState) {
    const transferIndices = transferEvents.map((event) => event.sourceTurnIndex);

    for (let transferIndex = 0; transferIndex < transferEvents.length; transferIndex += 1) {
      const transferEvent = transferEvents[transferIndex];
      const nextTransferTurnIndex = transferIndices[transferIndex + 1] ?? Number.POSITIVE_INFINITY;
      const nextSpeechTurn = speechTurns.find(({ index }) => index > transferEvent.sourceTurnIndex);
      const expectedTargetAgent = transferEvent.targetAgentId;

      if (fixture.assertions.requireAgentSpeechAfterTransfer) {
        if (!nextSpeechTurn) {
          failures.push(
            `Transfer to ${describeAgent(transferEvent.targetAgentId)} completed without a follow-up agent response.`
          );
          continue;
        }

        if (nextSpeechTurn.turn.agent_metadata?.agent_id !== expectedTargetAgent) {
          failures.push(
            `Expected ${describeAgent(expectedTargetAgent)} to speak after transfer, got ${describeAgent(
              nextSpeechTurn.turn.agent_metadata?.agent_id
            )}.`
          );
        }
      }

      if (fixture.assertions.enforceTransferSpeakerState) {
        const speakerMismatch = speechTurns.find(
          ({ index, turn }) =>
            index > transferEvent.sourceTurnIndex &&
            index < nextTransferTurnIndex &&
            turn.agent_metadata?.agent_id !== expectedTargetAgent
        );

        if (speakerMismatch) {
          failures.push(
            `After transferring to ${describeAgent(expectedTargetAgent)}, ${describeAgent(
              speakerMismatch.turn.agent_metadata?.agent_id
            )} spoke before the next handoff.`
          );
        }
      }
    }
  }

  if (fixture.assertions.forbidAgentSelfClaimMismatch) {
    for (const { turn } of speechTurns) {
      const speaker = resolveAgentKeyById(turn.agent_metadata?.agent_id);
      const claimedAgent = extractSelfClaimedAgent(turn.message || "");
      if (speaker && claimedAgent && !isCompatibleSelfClaim(speaker, claimedAgent)) {
        failures.push(
          `${formatAgent(speaker)} appeared to self-identify as ${formatAgent(claimedAgent)}: "${turn.message}".`
        );
      }
    }
  }

  if (fixture.assertions.requiredAssistantSubstrings?.length) {
    for (const requiredSubstring of fixture.assertions.requiredAssistantSubstrings) {
      if (!normalizedAssistantCorpus.includes(normalizeForMatch(requiredSubstring))) {
        failures.push(
          `Expected assistant transcript to include substring: "${requiredSubstring}".`
        );
      }
    }
  }

  if (fixture.assertions.forbiddenAssistantSubstrings?.length) {
    for (const forbiddenSubstring of fixture.assertions.forbiddenAssistantSubstrings) {
      if (normalizedAssistantCorpus.includes(normalizeForMatch(forbiddenSubstring))) {
        failures.push(
          `Assistant transcript must not include substring: "${forbiddenSubstring}".`
        );
      }
    }
  }

  return { failures, transferEvents };
}

function extractTransferEvents(
  transcript: ElevenLabsConversationTranscriptTurn[]
): TranscriptTransferEvent[] {
  const events: TranscriptTransferEvent[] = [];
  const dedupeKeys = new Set<string>();

  transcript.forEach((turn, turnIndex) => {
    const sourceAgentId = turn.agent_metadata?.agent_id || null;
    collectNestedTransferResults(turn.tool_results || [], turnIndex, sourceAgentId, events, dedupeKeys);
  });

  return events;
}

function collectNestedTransferResults(
  value: unknown,
  turnIndex: number,
  sourceAgentId: string | null,
  events: TranscriptTransferEvent[],
  dedupeKeys: Set<string>
): void {
  if (Array.isArray(value)) {
    value.forEach((item) => {
      collectNestedTransferResults(item, turnIndex, sourceAgentId, events, dedupeKeys);
    });
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  const record = value as Record<string, unknown>;
  const toolName = typeof record.tool_name === "string" ? record.tool_name : null;
  const result = parsePossibleJson(record.result) ?? parsePossibleJson(record.result_value);
  const resultRecord =
    result && typeof result === "object" ? (result as Record<string, unknown>) : ({} as Record<string, unknown>);
  const targetAgentId =
    typeof resultRecord.to_agent === "string" ? resultRecord.to_agent : null;
  const resultType =
    typeof resultRecord.result_type === "string" ? resultRecord.result_type : null;

  if (toolName === "transfer_to_agent" && targetAgentId) {
    const dedupeKey = `${turnIndex}:${sourceAgentId || "unknown"}:${targetAgentId}:${resultType || "transfer"}`;
    if (!dedupeKeys.has(dedupeKey)) {
      dedupeKeys.add(dedupeKey);
      events.push({
        sourceTurnIndex: turnIndex,
        sourceAgentId,
        targetAgentId,
        toolName,
        resultType,
      });
    }
  }

  const nestedKeys = ["result", "result_value", "steps", "results", "requests"];
  for (const nestedKey of nestedKeys) {
    if (nestedKey in record) {
      collectNestedTransferResults(record[nestedKey], turnIndex, sourceAgentId, events, dedupeKeys);
    }
  }
}

function parsePossibleJson(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function isTransferToolName(toolName: string): boolean {
  return toolName === "transfer_to_agent" || toolName === "transfer_to_number";
}

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isCompatibleSelfClaim(
  speaker: LandingDemoAgentKey,
  claimed: LandingDemoAgentKey
): boolean {
  if (speaker === claimed) {
    return true;
  }

  return speaker.startsWith(`${claimed}_`);
}

function extractSelfClaimedAgent(message: string): LandingDemoAgentKey | null {
  const normalized = message.toLowerCase();
  for (const agentKey of AGENT_KEYS) {
    const agentName = formatAgent(agentKey).toLowerCase();
    const patterns = [
      new RegExp(`\\bi am ${agentName}\\b`, "i"),
      new RegExp(`\\bi'm ${agentName}\\b`, "i"),
      new RegExp(`\\bich bin ${agentName}\\b`, "i"),
      new RegExp(`\\bthis is ${agentName}\\b`, "i"),
      new RegExp(`\\bhier ist ${agentName}\\b`, "i"),
    ];
    if (patterns.some((pattern) => pattern.test(normalized))) {
      return agentKey;
    }
  }
  return null;
}

function printRuntimeSummary(
  conversation: ElevenLabsConversation,
  transferEvents: TranscriptTransferEvent[]
): void {
  console.log("Trace:");
  console.log(`  status: ${conversation.status}`);
  console.log(`  transcript turns: ${conversation.transcript.length}`);
  console.log(
    `  speaker path: ${conversation.transcript
      .filter((turn) => turn.role === "agent" && typeof turn.message === "string" && turn.message.trim().length > 0)
      .map((turn) => describeAgent(turn.agent_metadata?.agent_id))
      .join(" -> ")}`
  );

  if (transferEvents.length === 0) {
    console.log("  transfers: none");
    return;
  }

  console.log("  transfers:");
  transferEvents.forEach((event, index) => {
    console.log(
      `    ${index + 1}. ${describeAgent(event.sourceAgentId)} -> ${describeAgent(event.targetAgentId)} (${event.toolName})`
    );
  });
}

function printAssertionSummary(failures: string[]): void {
  if (failures.length === 0) {
    console.log("Assertions: PASS");
    return;
  }

  console.log("Assertions: FAIL");
  failures.forEach((failure) => {
    console.log(`  - ${failure}`);
  });
}

function describeAgent(agentId: string | null | undefined): string {
  const agentKey = resolveAgentKeyById(agentId);
  return agentKey ? formatAgent(agentKey) : agentId || "unknown";
}

function readFixture(fixturePath: string): ConversationFixture {
  const parsed = JSON.parse(readFileSync(fixturePath, "utf8")) as Partial<ConversationFixture>;

  if (!parsed.name || typeof parsed.name !== "string") {
    throw new Error(`Invalid fixture at ${fixturePath}: missing name`);
  }

  if (!parsed.entryAgent || !isAgentKey(parsed.entryAgent)) {
    throw new Error(`Invalid fixture at ${fixturePath}: invalid entryAgent`);
  }

  if (!Array.isArray(parsed.userTurns) || parsed.userTurns.length === 0) {
    throw new Error(`Invalid fixture at ${fixturePath}: userTurns must contain at least one turn`);
  }

  return {
    name: parsed.name,
    description: parsed.description,
    entryAgent: parsed.entryAgent,
    userTurns: parsed.userTurns.map((turn, index) => {
      if (!turn || typeof turn.text !== "string" || turn.text.trim().length === 0) {
        throw new Error(`Invalid fixture at ${fixturePath}: userTurns[${index}] is missing text`);
      }
      return {
        text: turn.text,
        label: typeof turn.label === "string" ? turn.label : undefined,
        expectTransfer: turn.expectTransfer === true,
      };
    }),
    assertions: {
      expectedTransferSequence: Array.isArray(parsed.assertions?.expectedTransferSequence)
        ? parsed.assertions?.expectedTransferSequence.filter(isAgentKey)
        : undefined,
      expectedFinalAgent:
        parsed.assertions?.expectedFinalAgent && isAgentKey(parsed.assertions.expectedFinalAgent)
          ? parsed.assertions.expectedFinalAgent
          : undefined,
      requiredAgentsVisited: Array.isArray(parsed.assertions?.requiredAgentsVisited)
        ? parsed.assertions?.requiredAgentsVisited.filter(isAgentKey)
        : undefined,
      forbidUnexpectedTransfers: parsed.assertions?.forbidUnexpectedTransfers ?? false,
      requireAgentSpeechAfterTransfer: parsed.assertions?.requireAgentSpeechAfterTransfer ?? false,
      enforceTransferSpeakerState: parsed.assertions?.enforceTransferSpeakerState ?? false,
      forbidAgentSelfClaimMismatch: parsed.assertions?.forbidAgentSelfClaimMismatch ?? false,
      requiredAssistantSubstrings: Array.isArray(parsed.assertions?.requiredAssistantSubstrings)
        ? parsed.assertions.requiredAssistantSubstrings
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
            .filter((value) => value.length > 0)
        : undefined,
      forbiddenAssistantSubstrings: Array.isArray(parsed.assertions?.forbiddenAssistantSubstrings)
        ? parsed.assertions.forbiddenAssistantSubstrings
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
            .filter((value) => value.length > 0)
        : undefined,
    },
  };
}

function parseArgs(argv: string[]): SimulationOptions {
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const fixturePaths = new Set<string>();
  let idleMs = 1500;
  let handoffSettleMs = 2500;
  let maxTransfersPerTurnWithoutSpeech = 6;
  let turnTimeoutMs = 20000;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--list-fixtures") {
      listFixtures().forEach((fixturePath) => {
        console.log(basename(fixturePath, extname(fixturePath)));
      });
      process.exit(0);
    }

    if (token === "--list-suites") {
      Object.keys(FIXTURE_SUITES)
        .sort()
        .forEach((suiteName) => {
          console.log(suiteName);
        });
      process.exit(0);
    }

    if (token === "--all") {
      listFixtures().forEach((fixturePath) => fixturePaths.add(fixturePath));
      continue;
    }

    if (token === "--fixture") {
      const rawValue = argv[index + 1];
      if (!rawValue) {
        throw new Error("Missing value for --fixture");
      }
      index += 1;
      fixturePaths.add(resolveFixturePath(rawValue));
      continue;
    }

    if (token === "--suite") {
      const rawValue = argv[index + 1];
      if (!rawValue) {
        throw new Error("Missing value for --suite");
      }
      index += 1;
      for (const suiteName of rawValue.split(",")) {
        resolveSuiteFixturePaths(suiteName).forEach((fixturePath) => fixturePaths.add(fixturePath));
      }
      continue;
    }

    if (token === "--idle-ms") {
      const rawValue = argv[index + 1];
      if (!rawValue) {
        throw new Error("Missing value for --idle-ms");
      }
      index += 1;
      idleMs = Number(rawValue);
      continue;
    }

    if (token === "--turn-timeout-ms") {
      const rawValue = argv[index + 1];
      if (!rawValue) {
        throw new Error("Missing value for --turn-timeout-ms");
      }
      index += 1;
      turnTimeoutMs = Number(rawValue);
      continue;
    }

    if (token === "--handoff-settle-ms") {
      const rawValue = argv[index + 1];
      if (!rawValue) {
        throw new Error("Missing value for --handoff-settle-ms");
      }
      index += 1;
      handoffSettleMs = Number(rawValue);
      continue;
    }

    if (token === "--max-transfers-per-turn-without-speech") {
      const rawValue = argv[index + 1];
      if (!rawValue) {
        throw new Error("Missing value for --max-transfers-per-turn-without-speech");
      }
      index += 1;
      maxTransfersPerTurnWithoutSpeech = Number(rawValue);
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  if (fixturePaths.size === 0) {
    fixturePaths.add(resolveFixturePath("clara-kai-clara-maren-regression"));
  }

  return {
    fixturePaths: Array.from(fixturePaths),
    idleMs,
    handoffSettleMs,
    maxTransfersPerTurnWithoutSpeech,
    turnTimeoutMs,
  };
}

function listFixtures(): string[] {
  return readdirSync(ELEVENLABS_FIXTURES_ROOT)
    .filter((fileName) => fileName.endsWith(".json"))
    .map((fileName) => resolve(ELEVENLABS_FIXTURES_ROOT, fileName))
    .sort();
}

function resolveFixturePath(value: string): string {
  if (value.endsWith(".json")) {
    return resolve(value);
  }
  return resolve(ELEVENLABS_FIXTURES_ROOT, `${value}.json`);
}

function resolveSuiteFixturePaths(value: string): string[] {
  const normalized = value.trim().toLowerCase();
  const fixtureNames = FIXTURE_SUITES[normalized];
  if (!fixtureNames) {
    throw new Error(`Unknown fixture suite: ${value}`);
  }
  return fixtureNames.map((fixtureName) => resolveFixturePath(fixtureName));
}

function isAgentKey(value: unknown): value is LandingDemoAgentKey {
  return typeof value === "string" && (AGENT_KEYS as string[]).includes(value);
}

function printHelp(): void {
  console.log(`Usage:
  npx tsx scripts/ai/elevenlabs/simulate-elevenlabs-flow.ts [--fixture clara-kai-clara-maren-regression] [--suite all-handoffs] [--all]

Examples:
  npx tsx scripts/ai/elevenlabs/simulate-elevenlabs-flow.ts
  npx tsx scripts/ai/elevenlabs/simulate-elevenlabs-flow.ts --fixture clara-kai-clara-maren-regression
  npx tsx scripts/ai/elevenlabs/simulate-elevenlabs-flow.ts --suite all-handoffs
  npm run landing:elevenlabs:simulate -- --fixture clara-kai-clara-maren-regression

Options:
  --list-fixtures
  --list-suites
  --suite <suite-name[,suite-name]>
  --idle-ms <ms>
  --handoff-settle-ms <ms>
  --max-transfers-per-turn-without-speech <count>
  --turn-timeout-ms <ms>`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
