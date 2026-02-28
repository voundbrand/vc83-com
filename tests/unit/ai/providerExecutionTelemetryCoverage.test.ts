import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type NonChatProviderCoverageCase = {
  filePath: string;
  providerCallPattern: RegExp;
  meteringCallPattern: RegExp;
};

const NON_CHAT_PROVIDER_COVERAGE: NonChatProviderCoverageCase[] = [
  {
    filePath: "convex/ai/interviewRunner.ts",
    providerCallPattern: /await\s+client\.chatCompletion\(/g,
    meteringCallPattern: /await\s+meterNonChatAiUsage\(/g,
  },
  {
    filePath: "convex/ai/soulGenerator.ts",
    providerCallPattern: /await\s+client\.chatCompletion\(/g,
    meteringCallPattern: /await\s+meterSoulGenerationUsage\(/g,
  },
  {
    filePath: "convex/ai/soulEvolution.ts",
    providerCallPattern: /await\s+client\.chatCompletion\(/g,
    meteringCallPattern: /await\s+meterSoulReflectionUsage\(/g,
  },
  {
    filePath: "convex/integrations/selfHealDeploy.ts",
    providerCallPattern: /await\s+client\.chatCompletion\(/g,
    meteringCallPattern: /await\s+meterSelfHealAnalyzeUsage\(/g,
  },
];

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function countMatches(source: string, pattern: RegExp): number {
  return [...source.matchAll(pattern)].length;
}

function sectionBetween(source: string, startMarker: string, endMarker?: string): string {
  const start = source.indexOf(startMarker);
  expect(start).toBeGreaterThanOrEqual(0);

  const end =
    endMarker === undefined ? source.length : source.indexOf(endMarker, start + startMarker.length);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
}

describe("provider execution telemetry coverage", () => {
  it("keeps uncovered non-chat provider callsites paired with telemetry writes", () => {
    for (const coverageCase of NON_CHAT_PROVIDER_COVERAGE) {
      const source = readWorkspaceFile(coverageCase.filePath);
      const providerCalls = countMatches(source, coverageCase.providerCallPattern);
      const meteringCalls = countMatches(source, coverageCase.meteringCallPattern);

      expect(providerCalls).toBeGreaterThan(0);
      expect(meteringCalls).toBe(providerCalls);
      expect(source).toContain("billingSource:");
      expect(source).toContain("success:");
    }
  });

  it("requires usage telemetry across all v0 provider execution entrypoints", () => {
    const source = readWorkspaceFile("convex/integrations/v0.ts");

    const createChatSection = sectionBetween(
      source,
      "export const createChat = action({",
      "export const sendMessage = action({",
    );
    expect(createChatSection).toContain("v0Request<V0ChatResponse>");
    expect(createChatSection).toContain("recordV0PlatformUsage");
    expect(createChatSection).toContain('action: "create_chat"');
    expect(createChatSection).toContain("success: true");
    expect(createChatSection).toContain("success: false");
    expect(createChatSection).toContain("billingSource: apiBinding.billingSource");
    expect(createChatSection).toContain("credentialSource: apiBinding.credentialSource");

    const sendMessageSection = sectionBetween(
      source,
      "export const sendMessage = action({",
      "export const getChat = action({",
    );
    expect(sendMessageSection).toContain("v0Request<V0ChatResponse>");
    expect(sendMessageSection).toContain("recordV0PlatformUsage");
    expect(sendMessageSection).toContain('action: "followup_message"');
    expect(sendMessageSection).toContain("success: true");
    expect(sendMessageSection).toContain("success: false");
    expect(sendMessageSection).toContain("billingSource: apiBinding.billingSource");
    expect(sendMessageSection).toContain("credentialSource: apiBinding.credentialSource");

    const getChatSection = sectionBetween(
      source,
      "export const getChat = action({",
      "export const getChatHistory = query({",
    );
    expect(getChatSection).toContain("v0Request<V0ChatResponse>");
    expect(getChatSection).toContain("recordV0PlatformUsage");
    expect(getChatSection).toContain('action: "get_chat"');
    expect(getChatSection).toContain("success: true");
    expect(getChatSection).toContain("success: false");
    expect(getChatSection).toContain("billingSource: apiBinding.billingSource");
    expect(getChatSection).toContain("credentialSource: apiBinding.credentialSource");

    const builderChatSection = sectionBetween(
      source,
      "export const builderChat = action({",
      "// LEGACY SUPPORT - Keep old function signatures working",
    );
    expect(builderChatSection).toContain("v0Request<V0ChatResponse>");
    expect(builderChatSection).toContain("recordV0PlatformUsage");
    expect(builderChatSection).toContain('action: "create_chat"');
    expect(builderChatSection).toContain('action: "followup_message"');
    expect(builderChatSection).toContain("success: true");
    expect(builderChatSection).toContain("success: false");
    expect(builderChatSection).toContain("billingSource: apiBinding.billingSource");
    expect(builderChatSection).toContain("credentialSource: apiBinding.credentialSource");
  });

  it("requires direct-runtime model validation probes to persist platform usage telemetry", () => {
    const source = readWorkspaceFile("convex/ai/platformModelManagement.ts");
    const directRuntimeValidationSection = sectionBetween(
      source,
      "async function sendModelValidationMessageViaDirectRuntime(args: {",
      "export function deriveLifecycleState(",
    );

    expect(directRuntimeValidationSection).toContain(
      "generatedApi.api.ai.billing.recordUsage",
    );
    expect(directRuntimeValidationSection).toContain('action: "model_validation_probe"');
    expect(directRuntimeValidationSection).toContain('billingSource: "platform"');
    expect(directRuntimeValidationSection).toContain('requestSource: "llm"');
    expect(directRuntimeValidationSection).toContain('creditLedgerAction: "model_validation_probe"');
    expect(directRuntimeValidationSection).toContain('source: "platform_model_validation"');
    expect(directRuntimeValidationSection).toContain('transport: "direct_runtime"');
  });

  it("requires agent session summary generation to persist usage telemetry", () => {
    const source = readWorkspaceFile("convex/ai/agentSessions.ts");
    const sessionSummarySection = sectionBetween(
      source,
      "export const generateSessionSummary = internalAction({",
      "export const getAgentStats = query({",
    );

    expect(sessionSummarySection).toContain("client.chatCompletion(");
    expect(sessionSummarySection).toContain("generatedApi.api.ai.billing.recordUsage");
    expect(sessionSummarySection).toContain('action: "session_summary_generation"');
    expect(sessionSummarySection).toContain('billingSource: "platform"');
    expect(sessionSummarySection).toContain('requestSource: "llm"');
    expect(sessionSummarySection).toContain('creditLedgerAction: "session_summary_generation"');
    expect(sessionSummarySection).toContain('source: "agent_session_summary"');
  });
});
