#!/usr/bin/env node

import { ElevenLabsClient } from "./lib/elevenlabs-api";
import { loadLandingDemoEnv, requireEnv } from "./lib/env";
import { formatAgent, resolveAgentId } from "./lib/catalog";

const ELEVENLABS_CONVAI_BASE_URL = "https://api.elevenlabs.io/v1/convai";
const SUPPORTED_AGENT_KEYS = ["maren", "jonas", "tobias", "lina", "kai", "nora"] as const;

type SupportedAgentKey = (typeof SUPPORTED_AGENT_KEYS)[number];

type Role = "user" | "assistant";

interface ChatHistoryTurn {
  message: string;
  role: Role;
  time_in_call_secs: number;
}

interface ResponseTestDefinition {
  chat_history: ChatHistoryTurn[];
  failure_examples: Array<{
    response: string;
    type: "failure";
  }>;
  name: string;
  success_condition: string;
  success_examples: Array<{
    response: string;
    type: "success";
  }>;
  type: "llm";
}

interface ToolTestDefinition {
  chat_history: ChatHistoryTurn[];
  check_any_tool_matches: true;
  name: string;
  type: "tool";
}

interface SimulationTestDefinition {
  name: string;
  simulation_scenario: string;
  success_condition: string;
  type: "simulation";
}

type TestDefinition = ResponseTestDefinition | ToolTestDefinition | SimulationTestDefinition;

interface TestSummary {
  id: string;
  name: string;
  type: string;
}

interface AgentTestingAttachment {
  test_id: string;
  workflow_node_id: string | null;
}

interface AgentPlatformSettings {
  testing?: {
    attached_tests?: AgentTestingAttachment[];
    referenced_tests_ids?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface SyncOptions {
  agentKeys: SupportedAgentKey[];
  write: boolean;
}

const TEST_CATALOG: Record<SupportedAgentKey, TestDefinition[]> = {
  maren: [
    responseTest(
      "cross-location-fallback",
      "I need a Berlin appointment today, but if Berlin is full I could do Potsdam or tomorrow in Berlin.",
      "Maren should offer a same-day or next-best fallback clearly instead of ending at the first unavailable slot.",
      "Berlin looks full today. I can offer Potsdam this afternoon or Berlin tomorrow morning if that works for you.",
      "Nothing is available today."
    ),
    responseTest(
      "reschedule-after-cancellation",
      "My original appointment was canceled. I just need to reschedule without starting over.",
      "Maren should treat rescheduling as the main job and continue from there without making the caller restart the whole process.",
      "No problem. Let's reschedule directly from the canceled slot and find the next workable option.",
      "Please explain your whole request again from the beginning."
    ),
    responseTest(
      "no-show-recovery",
      "I missed my appointment this morning and need the fastest recovery path.",
      "Maren should offer the fastest recovery path and explain reminder or waitlist logic briefly.",
      "I can look for the fastest replacement slot and, if needed, add you to the waitlist so we can move quickly.",
      "You'll need to call back next week."
    ),
    toolTest("return-to-clara", "Actually I want a different demo now. Please put me back through to Clara."),
    simulationTest(
      "book-slot-demo",
      "The caller wants to book an appointment, needs a fallback if the first location is unavailable, and expects a short recap before the call ends.",
      "Maren should understand the booking need, offer the best slot or fallback, explain the next step, and close cleanly."
    ),
  ],
  jonas: [
    responseTest(
      "hot-lead-qualification",
      "We need this live quickly and I am the owner making the decision. Can you tell me what you need to qualify us?",
      "Jonas should ask focused qualification questions and identify urgency without over-talking.",
      "Absolutely. I'll keep this tight so I can understand urgency, decision ownership, and what outcome you need first.",
      "Great, let me tell you about our whole company history first."
    ),
    responseTest(
      "early-stage-lead",
      "I'm still early and just exploring. I don't want a hard sell.",
      "Jonas should stay helpful, gather enough signal, and avoid forcing a close.",
      "Understood. I can keep this exploratory and help you figure out whether the fit is there before we talk next steps.",
      "If you are not ready to buy today, there is no point continuing."
    ),
    responseTest(
      "unclear-problem",
      "Something in the business is broken, but I cannot describe it cleanly yet.",
      "Jonas should clarify the problem first before assigning fit or temperature.",
      "Let's narrow the problem first. What breaks most often today when a customer or lead reaches out?",
      "You sound like a hot lead already."
    ),
    toolTest("switch-demo", "I want to hear a different demo instead. Please send me back to Clara."),
    simulationTest(
      "qualify-and-summarize",
      "The caller describes a business problem, Jonas qualifies the lead, and then gives a short summary with the next route.",
      "Jonas should understand the need, gather enough qualification detail, assign a reasonable route, and summarize clearly."
    ),
  ],
  tobias: [
    responseTest(
      "rough-voice-note",
      "I just dictated a messy field note about a repair visit. Can you turn it into something structured?",
      "Tobias should turn the rough note into a clear structured summary instead of repeating the mess.",
      "Yes. I'll structure the visit into the job, observed issue, missing inputs, and next drafting step.",
      "I cannot do anything unless the note is already perfectly organized."
    ),
    responseTest(
      "missing-measurements",
      "I have the main issue, but I forgot a few measurements.",
      "Tobias should ask only the highest-impact missing follow-up question.",
      "The main missing detail is the width measurement. Once I have that, the draft gets much more reliable.",
      "Please list every possible missing detail you might ever need."
    ),
    responseTest(
      "user-asks-for-price",
      "Can you just tell me the exact price right now?",
      "Tobias should avoid inventing exact pricing when the required inputs are missing.",
      "I can frame the likely scope, but I should not invent an exact price without the key inputs.",
      "Sure, the exact price is 1,932 euros."
    ),
    toolTest("switch-back-to-clara", "I want a different demo now. Please put me back to Clara."),
    simulationTest(
      "voice-note-to-draft",
      "The caller dictates a job, Tobias structures it, asks only the necessary follow-up, and then summarizes a quote-ready draft with assumptions.",
      "Tobias should understand the note, produce a structured draft, identify missing information cleanly, and explain the next step."
    ),
  ],
  lina: [
    responseTest(
      "post-appointment-check-in",
      "Please draft a warm follow-up after a successful appointment.",
      "Lina should create a warm low-friction follow-up rather than a stiff script.",
      "Absolutely. I would keep it short, appreciative, and easy for the customer to answer.",
      "Send a long formal message demanding detailed feedback."
    ),
    responseTest(
      "open-quote-recovery",
      "The quote has been sitting for a week. We need a gentle recovery message.",
      "Lina should nudge naturally without sounding pushy or desperate.",
      "I would follow up with a short check-in, restate the value briefly, and make the next step easy.",
      "Pressure them hard so they answer today."
    ),
    responseTest(
      "unhappy-customer",
      "The customer sounds frustrated after the appointment.",
      "Lina should prioritize recovery over review or upsell.",
      "In that case I would focus on recovery first, acknowledge the issue, and avoid asking for a review right now.",
      "Great moment to ask for a five-star review."
    ),
    toolTest("back-to-clara", "I want a different demo instead. Please send me back to Clara."),
    simulationTest(
      "choose-scenario-and-draft",
      "The caller describes a follow-up scenario and Lina should pick the right tone, recommend a useful follow-up plan, and close naturally.",
      "Lina should identify the scenario correctly, choose the right tone, and give a practical follow-up plan."
    ),
  ],
  kai: [
    responseTest(
      "vacation-request-impact",
      "A team member asked for vacation during a busy week. What is the impact?",
      "Kai should identify approval and coverage impact clearly.",
      "The main check is coverage on that week. I would confirm who is already out and whether the shift still stays covered.",
      "Approve it immediately without checking anything."
    ),
    responseTest(
      "urgent-shift-gap",
      "Someone called in sick and we have an urgent shift gap today.",
      "Kai should propose the fastest responsible coverage path.",
      "I would identify the urgent gap, check the closest qualified backup, and make the owner plus next action explicit.",
      "Wait until tomorrow and see what happens."
    ),
    responseTest(
      "handoff-summary",
      "We need a clean handoff summary for the next person taking over.",
      "Kai should structure the handoff clearly with owner, urgency, and next action.",
      "I would summarize the situation, who owns it now, what is blocked, and the next concrete action.",
      "Just tell them to read the chat later."
    ),
    toolTest("return-to-clara", "Actually I want a different demo now. Please transfer me back to Clara."),
    simulationTest(
      "coverage-coordination",
      "The caller presents a staffing or escalation issue and Kai should identify the owners, the gap, and the next coordination step.",
      "Kai should identify the operations scenario, set clear ownership, and define a practical next action."
    ),
  ],
  nora: [
    responseTest(
      "low-answer-rate-location",
      "One location has a low answer rate and too many missed calls. What stands out?",
      "Nora should identify likely missed-call leakage and recommend one practical next step.",
      "That pattern usually points to missed-call leakage at that location. I would first check staffing or routing coverage during the weak window.",
      "The business is probably fine. Ignore the metric."
    ),
    responseTest(
      "weak-booking-rate",
      "Bookings are soft even though call volume is healthy. What do you think?",
      "Nora should explain what the metric suggests without overstating certainty.",
      "Healthy call volume with weak booking conversion suggests a handoff or qualification gap, but I would treat that as a hypothesis until we compare locations or scripts.",
      "It definitely means the team is failing."
    ),
    responseTest(
      "caller-has-no-data",
      "I do not have clean data yet. What is the minimum you need from me?",
      "Nora should ask only for the minimum useful metrics.",
      "At minimum I would want call volume, answer rate, and booking rate for the locations you want to compare.",
      "Come back when you have a full dashboard with every metric."
    ),
    toolTest("back-to-clara", "I want a different demo now, so please send me back to Clara."),
    simulationTest(
      "compare-locations",
      "The caller provides rough metrics for two locations and Nora should identify the outlier, explain a likely cause, and recommend one action.",
      "Nora should understand the metrics, identify the main issue, and recommend one practical next action without overstating certainty."
    ),
  ],
};

async function main(): Promise<void> {
  loadLandingDemoEnv();

  const options = parseArgs(process.argv.slice(2));
  const apiKey = requireEnv("ELEVENLABS_API_KEY");
  const client = new ElevenLabsClient(apiKey);

  console.log("ElevenLabs landing-demo test sync");
  console.log(`Mode: ${options.write ? "write" : "dry-run"}`);
  console.log(`Agents: ${options.agentKeys.map((agentKey) => formatAgent(agentKey)).join(", ")}`);
  console.log("");

  const existingTests = await listTests(apiKey);
  const testsByKey = new Map(existingTests.map((test) => [toMapKey(test.name, test.type), test]));

  for (const agentKey of options.agentKeys) {
    const agentId = resolveAgentId(agentKey);
    const remoteAgent = await client.getAgent(agentId);
    const desiredDefinitions = TEST_CATALOG[agentKey];
    const existingAttachments = normalizeAttachedTests(remoteAgent.platform_settings?.testing?.attached_tests);
    const existingReferencedIds = normalizeReferencedTestIds(remoteAgent.platform_settings?.testing?.referenced_tests_ids);

    const desiredTestIds: string[] = [];
    const missingTests: TestDefinition[] = [];

    for (const definition of desiredDefinitions) {
      const existingTest = testsByKey.get(toMapKey(definition.name, definition.type));
      if (existingTest) {
        desiredTestIds.push(existingTest.id);
        continue;
      }
      missingTests.push(definition);
    }

    console.log(`${missingTests.length > 0 || hasMissingAttachments(existingAttachments, desiredTestIds) ? "CHANGE" : "OK"} ${formatAgent(agentKey)} (${agentId})`);
    console.log(`  desired tests: ${desiredDefinitions.length}`);
    console.log(`  existing attachments: ${existingAttachments.length}`);
    console.log(`  missing test records: ${missingTests.length}`);

    if (missingTests.length > 0) {
      console.log(`  missing names: ${missingTests.map((definition) => definition.name).join(", ")}`);
    }

    if (!options.write) {
      console.log("  action: skipped (dry-run)");
      console.log("");
      continue;
    }

    for (const definition of missingTests) {
      const created = await createTest(apiKey, definition);
      testsByKey.set(toMapKey(created.name, created.type), created);
      desiredTestIds.push(created.id);
      console.log(`  created: ${created.name} (${created.id})`);
    }

    const resolvedDesiredIds = desiredDefinitions.map((definition) => {
      const test = testsByKey.get(toMapKey(definition.name, definition.type));
      if (!test) {
        throw new Error(`Failed to resolve test after creation: ${definition.name}`);
      }
      return test.id;
    });

    const mergedAttachmentIds = uniqueStrings([...existingAttachments.map((entry) => entry.test_id), ...resolvedDesiredIds]);
    const mergedReferencedIds = uniqueStrings([...existingReferencedIds, ...resolvedDesiredIds]);

    await client.updateAgent(agentId, {
      platform_settings: {
        ...(remoteAgent.platform_settings as AgentPlatformSettings | undefined),
        testing: {
          ...(remoteAgent.platform_settings?.testing as Record<string, unknown> | undefined),
          attached_tests: mergedAttachmentIds.map((testId) => ({
            test_id: testId,
            workflow_node_id: null,
          })),
          referenced_tests_ids: mergedReferencedIds,
        },
      },
    });

    const verifiedAgent = await client.getAgent(agentId);
    const verifiedAttachments = normalizeAttachedTests(verifiedAgent.platform_settings?.testing?.attached_tests);
    const attachedDesiredCount = verifiedAttachments.filter((entry) => mergedReferencedIds.includes(entry.test_id)).length;

    console.log(`  action: attached ${resolvedDesiredIds.length} desired tests`);
    console.log(`  verified attached desired count: ${attachedDesiredCount}/${resolvedDesiredIds.length}`);
    console.log("");
  }
}

function parseArgs(argv: string[]): SyncOptions {
  const requested = new Set<SupportedAgentKey>();
  let write = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--write") {
      write = true;
      continue;
    }

    if (arg === "--agent") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --agent");
      }
      for (const raw of value.split(",")) {
        const agentKey = raw.trim().toLowerCase();
        if (!isSupportedAgentKey(agentKey)) {
          throw new Error(`Unsupported agent for test sync: ${raw}`);
        }
        requested.add(agentKey);
      }
      index += 1;
      continue;
    }

    if (arg === "--all") {
      for (const agentKey of SUPPORTED_AGENT_KEYS) {
        requested.add(agentKey);
      }
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  const agentKeys = requested.size > 0 ? [...requested] : [...SUPPORTED_AGENT_KEYS];

  return {
    agentKeys,
    write,
  };
}

function isSupportedAgentKey(value: string): value is SupportedAgentKey {
  return SUPPORTED_AGENT_KEYS.includes(value as SupportedAgentKey);
}

async function listTests(apiKey: string): Promise<TestSummary[]> {
  const response = await fetch(`${ELEVENLABS_CONVAI_BASE_URL}/agent-testing?page_size=100`, {
    headers: {
      "xi-api-key": apiKey,
    },
  });

  const body = await parseJson(response);
  if (!response.ok) {
    throw new Error(`Failed to list tests (${response.status}): ${stringifyErrorBody(body)}`);
  }

  return Array.isArray((body as { tests?: unknown }).tests)
    ? ((body as { tests: TestSummary[] }).tests ?? [])
    : [];
}

async function createTest(apiKey: string, definition: TestDefinition): Promise<TestSummary> {
  const response = await fetch(`${ELEVENLABS_CONVAI_BASE_URL}/agent-testing/create`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify(definition),
  });

  const body = await parseJson(response);
  if (!response.ok) {
    throw new Error(`Failed to create test ${definition.name} (${response.status}): ${stringifyErrorBody(body)}`);
  }

  const created = body as { id?: unknown };
  if (typeof created.id !== "string" || created.id.trim().length === 0) {
    throw new Error(`ElevenLabs did not return a valid test id for ${definition.name}`);
  }

  return {
    id: created.id,
    name: definition.name,
    type: definition.type,
  };
}

function normalizeAttachedTests(value: unknown): AgentTestingAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is AgentTestingAttachment => {
    if (!entry || typeof entry !== "object") {
      return false;
    }
    const candidate = entry as AgentTestingAttachment;
    return typeof candidate.test_id === "string" && candidate.test_id.trim().length > 0;
  });
}

function normalizeReferencedTestIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function hasMissingAttachments(existing: AgentTestingAttachment[], desiredIds: string[]): boolean {
  const attachedIds = new Set(existing.map((entry) => entry.test_id));
  return desiredIds.some((id) => !attachedIds.has(id));
}

function toMapKey(name: string, type: string): string {
  return `${type}:${name}`;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

async function parseJson(response: Response): Promise<unknown> {
  const raw = await response.text();
  if (raw.trim().length === 0) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function stringifyErrorBody(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function responseTest(
  name: string,
  userMessage: string,
  successCondition: string,
  successResponse: string,
  failureResponse: string
): ResponseTestDefinition {
  return {
    name,
    type: "llm",
    chat_history: [userTurn(userMessage)],
    success_condition: successCondition,
    success_examples: [
      {
        response: successResponse,
        type: "success",
      },
    ],
    failure_examples: [
      {
        response: failureResponse,
        type: "failure",
      },
    ],
  };
}

function toolTest(name: string, userMessage: string): ToolTestDefinition {
  return {
    name,
    type: "tool",
    chat_history: [userTurn(userMessage)],
    check_any_tool_matches: true,
  };
}

function simulationTest(
  name: string,
  simulationScenario: string,
  successCondition: string
): SimulationTestDefinition {
  return {
    name,
    type: "simulation",
    simulation_scenario: simulationScenario,
    success_condition: successCondition,
  };
}

function userTurn(message: string): ChatHistoryTurn {
  return {
    role: "user",
    message,
    time_in_call_secs: 1,
  };
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
