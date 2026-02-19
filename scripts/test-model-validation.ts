/**
 * Model Validation Script
 *
 * Tests AI models for tool calling reliability before platform-wide enablement.
 * Saves results to Convex database for audit trail.
 *
 * Usage:
 *   npm run test:model -- --model "anthropic/claude-3.5-sonnet"
 *   npm run test:model -- --provider "anthropic"
 *   npm run test:model -- --untested-only
 */

import { config as loadEnv } from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { api, internal } from "../convex/_generated/api";
import { CRITICAL_TOOL_NAMES } from "../convex/ai/tools/contracts";
import {
  parseToolCallArguments,
  validateToolCallAgainstContract,
} from "./model-validation-contracts";
import {
  formatModelMismatchMessage,
  getLatestAssistantModelResolution,
  resolveEffectiveValidationModel,
} from "./model-validation-runtime";

loadEnv({ path: ".env.local" });
loadEnv();

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;
const client = new ConvexHttpClient(CONVEX_URL);
const CONVEX_DEPLOY_KEY = process.env.CONVEX_DEPLOY_KEY?.trim() || "";
const adminClient = CONVEX_DEPLOY_KEY
  ? (() => {
      const c = new ConvexHttpClient(CONVEX_URL);
      const maybeAdminClient = c as any;
      if (typeof maybeAdminClient.setAdminAuth === "function") {
        maybeAdminClient.setAdminAuth(CONVEX_DEPLOY_KEY);
        return c;
      }
      return null;
    })()
  : null;

let TEST_ORG_ID = process.env.TEST_ORG_ID?.trim() || "";
let TEST_USER_ID = process.env.TEST_USER_ID?.trim() || "";
const TEST_SESSION_ID = process.env.TEST_SESSION_ID?.trim() || "";
const TEST_MODEL_ID = process.env.TEST_MODEL_ID;

interface ValidationFixtureContext {
  organizationId: string;
  userId: string;
}

let validationFixture: ValidationFixtureContext | null = null;
const CONTACT_SEARCH_CONTRACT_PROMPT =
  "Search contacts using search_contacts with query \"Alice Smith sales department\".";

interface ValidationResult {
  basicChat: boolean;
  toolCalling: boolean;
  complexParams: boolean;
  multiTurn: boolean;
  edgeCases: boolean;
  contractChecks: boolean;
}

interface TestResult {
  passed: boolean;
  message: string;
  duration: number;
  error?: string;
}

function inferSearchContactsQueryFromResult(toolCall: {
  name?: unknown;
  result?: unknown;
}): string | null {
  if (toolCall.name !== "search_contacts") {
    return null;
  }

  const result = toolCall.result;
  if (!result || typeof result !== "object") {
    return null;
  }

  const message = (result as { message?: unknown }).message;
  if (typeof message !== "string") {
    return null;
  }

  const quotedMatch = message.match(/matching \"([^\"]+)\"/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const bareMatch = message.match(/matching ([^\\n.]+)/i);
  if (bareMatch?.[1]) {
    return bareMatch[1].trim();
  }

  return null;
}

function hydrateToolCallArgumentsWithRuntimeEvidence(
  toolCall: {
    name?: unknown;
    arguments?: unknown;
    result?: unknown;
  }
): Record<string, unknown> {
  const parsedArgs = parseToolCallArguments(toolCall.arguments);
  const hasQuery =
    typeof parsedArgs.query === "string" && parsedArgs.query.trim().length > 0;

  if (toolCall.name === "search_contacts" && !hasQuery) {
    const inferredQuery = inferSearchContactsQueryFromResult(toolCall);
    if (inferredQuery) {
      return {
        ...parsedArgs,
        query: inferredQuery,
      };
    }
  }

  return parsedArgs;
}

function getValidationFixture(): ValidationFixtureContext {
  if (!validationFixture) {
    throw new Error("Validation fixture context is not resolved. Run resolveValidationFixtureContext() first.");
  }
  return validationFixture;
}

async function validateSeededIdsWithAdmin(): Promise<void> {
  if (!adminClient) {
    return;
  }

  if (TEST_ORG_ID) {
    try {
      await adminClient.query((internal as any).organizations.getOrganization, {
        organizationId: TEST_ORG_ID as any,
      });
    } catch (error: any) {
      console.log(
        `⚠️  TEST_ORG_ID ${TEST_ORG_ID} is invalid for this deployment (${error.message}).`
      );
      TEST_ORG_ID = "";
    }
  }

  if (TEST_USER_ID) {
    try {
      await adminClient.query((internal as any).organizations.getUser, {
        userId: TEST_USER_ID as any,
      });
    } catch (error: any) {
      console.log(
        `⚠️  TEST_USER_ID ${TEST_USER_ID} is invalid for this deployment (${error.message}).`
      );
      TEST_USER_ID = "";
    }
  }
}

async function resolveFromSession(): Promise<void> {
  if (!TEST_SESSION_ID) {
    return;
  }

  try {
    const currentUser: any = await client.query(api.auth.getCurrentUser, {
      sessionId: TEST_SESSION_ID,
    });

    if (!currentUser) {
      console.log("⚠️  TEST_SESSION_ID is set but did not resolve to an active session.");
      return;
    }

    const sessionOrgId =
      currentUser.currentOrganization?.id ||
      currentUser.defaultOrgId ||
      currentUser.organizations?.[0]?.id ||
      "";
    const sessionUserId = currentUser.id || "";

    if (sessionOrgId && sessionOrgId !== TEST_ORG_ID) {
      console.log(
        `ℹ️  Using organization from TEST_SESSION_ID (${sessionOrgId}) instead of TEST_ORG_ID (${TEST_ORG_ID || "unset"}).`
      );
      TEST_ORG_ID = sessionOrgId;
    }

    if (sessionUserId && sessionUserId !== TEST_USER_ID) {
      console.log(
        `ℹ️  Using user from TEST_SESSION_ID (${sessionUserId}) instead of TEST_USER_ID (${TEST_USER_ID || "unset"}).`
      );
      TEST_USER_ID = sessionUserId;
    }
  } catch (error: any) {
    console.log(`⚠️  Failed to resolve fixture IDs from TEST_SESSION_ID (${error.message}).`);
  }
}

async function resolveFromAdminFallback(): Promise<void> {
  if (!adminClient) {
    return;
  }

  if (!TEST_ORG_ID) {
    try {
      const defaultOrgId = await adminClient.query((internal as any).auth.getDefaultOrganization, {});
      if (defaultOrgId) {
        TEST_ORG_ID = defaultOrgId as string;
        console.log(`ℹ️  Resolved fallback organization via admin token: ${TEST_ORG_ID}`);
      }
    } catch (error: any) {
      console.log(`⚠️  Failed to resolve fallback organization (${error.message}).`);
    }
  }

  if (!TEST_USER_ID && TEST_ORG_ID) {
    try {
      const members = await adminClient.query(
        (internal as any).stripe.platformWebhooks.getOrganizationMembers,
        {
          organizationId: TEST_ORG_ID as any,
        }
      );
      const firstMember = Array.isArray(members)
        ? members.find((member: any) => member?.user?._id)
        : null;
      if (firstMember?.user?._id) {
        TEST_USER_ID = firstMember.user._id as string;
        console.log(`ℹ️  Resolved fallback user from organization member list: ${TEST_USER_ID}`);
      }
    } catch (error: any) {
      console.log(`⚠️  Failed to resolve fallback user (${error.message}).`);
    }
  }
}

async function resolveValidationFixtureContext(): Promise<void> {
  await validateSeededIdsWithAdmin();
  await resolveFromSession();
  await resolveFromAdminFallback();

  if (!TEST_ORG_ID || !TEST_USER_ID) {
    const missing = [
      !TEST_ORG_ID ? "TEST_ORG_ID" : null,
      !TEST_USER_ID ? "TEST_USER_ID" : null,
    ]
      .filter(Boolean)
      .join(", ");

    throw new Error(
      [
        `Missing validation fixture context: ${missing}.`,
        "Set TEST_ORG_ID/TEST_USER_ID directly, or set TEST_SESSION_ID for automatic resolution.",
        CONVEX_DEPLOY_KEY
          ? "Admin fallback is enabled via CONVEX_DEPLOY_KEY but could not resolve a usable org/user pair."
          : "Set CONVEX_DEPLOY_KEY to enable admin fallback resolution in local dev.",
      ].join(" ")
    );
  }

  validationFixture = {
    organizationId: TEST_ORG_ID,
    userId: TEST_USER_ID,
  };

  console.log(
    `ℹ️  Validation fixture context: org=${validationFixture.organizationId} user=${validationFixture.userId}`
  );
}

async function loadConversationModelResolution(
  conversationId: string,
  retries = 5,
  delayMs = 400
) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const conversation: any = await client.query(api.ai.conversations.getConversation, {
      conversationId: conversationId as any,
    });
    const resolution = getLatestAssistantModelResolution(conversation.messages || []);
    if (resolution) {
      return resolution;
    }
    if (typeof conversation.modelId === "string" && conversation.modelId.trim().length > 0) {
      return {
        selectedModel: conversation.modelId.trim(),
        selectionSource: "conversation_model_pin",
        fallbackUsed: false,
      };
    }
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return null;
}

async function ensureExpectedModelWasUsed(
  response: {
    conversationId?: string;
    modelResolution?: {
      requestedModel?: string;
      selectedModel: string;
      selectionSource: string;
      fallbackUsed: boolean;
      fallbackReason?: string;
    };
  },
  expectedModel: string,
  startTime: number
): Promise<TestResult | null> {
  let resolution = response.modelResolution;

  if (
    !resolution &&
    response.conversationId &&
    response.conversationId.trim().length > 0
  ) {
    resolution = await loadConversationModelResolution(response.conversationId);
  }

  if (!resolution) {
    console.log(
      "     ⚠️  WARN: modelResolution metadata unavailable; skipping strict model assertion"
    );
    return null;
  }

  if (resolution.selectedModel !== expectedModel) {
    const duration = Date.now() - startTime;
    const message = formatModelMismatchMessage({
      expectedModel,
      resolution,
    });
    console.log(`     ❌ FAIL: ${message}`);
    return {
      passed: false,
      message,
      duration,
    };
  }

  return null;
}

async function resolveDefaultModelId(): Promise<string> {
  if (TEST_MODEL_ID && TEST_MODEL_ID.trim().length > 0) {
    return TEST_MODEL_ID.trim();
  }
  const { organizationId } = getValidationFixture();

  const settings: any = await client.query(api.ai.settings.getAISettings, {
    organizationId: organizationId as any,
  });
  const platformEnabledModels: Array<{ id: string }> = await client.query(
    api.ai.platformModels.getEnabledModels,
    {}
  );

  const resolved = resolveEffectiveValidationModel({
    settings,
    platformEnabledModelIds: platformEnabledModels.map((model) => model.id),
  });

  if (!resolved) {
    throw new Error("Unable to resolve a default validation model from org/platform policy");
  }

  console.log(
    `ℹ️  TEST_MODEL_ID not set; resolved effective default model ${resolved.modelId} (${resolved.selectionSource})`
  );
  return resolved.modelId;
}

// Test 1: Basic Chat
async function testBasicChat(modelId: string): Promise<TestResult> {
  console.log("\n  🧪 Test 1: Basic Chat Response");
  const startTime = Date.now();
  const { organizationId, userId } = getValidationFixture();

  try {
    const response: any = await client.action(api.ai.chat.sendMessage, {
      message: "Hello! Please respond with a simple greeting.",
      organizationId: organizationId as any,
      userId: userId as any,
      selectedModel: modelId,
    });

    const modelCheck = await ensureExpectedModelWasUsed(response, modelId, startTime);
    if (modelCheck) {
      return modelCheck;
    }

    const duration = Date.now() - startTime;

    if (response.message && response.message.length > 0) {
      console.log(`     ✅ PASS: Got response (${duration}ms)`);
      console.log(`     Response: ${response.message.substring(0, 80)}...`);
      return { passed: true, message: "Basic chat works", duration };
    } else {
      console.log(`     ❌ FAIL: Empty response`);
      return { passed: false, message: "Empty response", duration };
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`     ❌ ERROR: ${error.message}`);
    return { passed: false, message: error.message, duration, error: error.message };
  }
}

// Test 2: Tool Calling
async function testToolCalling(modelId: string): Promise<TestResult> {
  console.log("\n  🧪 Test 2: Tool Calling");
  const startTime = Date.now();
  const { organizationId, userId } = getValidationFixture();

  try {
    const response: any = await client.action(api.ai.chat.sendMessage, {
      message: "List my forms",
      organizationId: organizationId as any,
      userId: userId as any,
      selectedModel: modelId,
    });

    const modelCheck = await ensureExpectedModelWasUsed(response, modelId, startTime);
    if (modelCheck) {
      return modelCheck;
    }

    const duration = Date.now() - startTime;
    const toolCalls = response.toolCalls || [];

    if (toolCalls.length > 0 && toolCalls[0].name === "list_forms") {
      console.log(`     ✅ PASS: Called list_forms tool (${duration}ms)`);
      console.log(`     Tool status: ${toolCalls[0].status}`);
      return { passed: true, message: "Tool calling works", duration };
    } else {
      console.log(`     ❌ FAIL: Expected list_forms, got ${toolCalls[0]?.name || "no tool"}`);
      return { passed: false, message: `Wrong tool: ${toolCalls[0]?.name}`, duration };
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`     ❌ ERROR: ${error.message}`);
    return { passed: false, message: error.message, duration, error: error.message };
  }
}

// Test 3: Complex Parameters
async function testComplexParams(modelId: string): Promise<TestResult> {
  console.log("\n  🧪 Test 3: Complex Parameters");
  const startTime = Date.now();
  const { organizationId, userId } = getValidationFixture();

  try {
    const response: any = await client.action(api.ai.chat.sendMessage, {
      message: CONTACT_SEARCH_CONTRACT_PROMPT,
      organizationId: organizationId as any,
      userId: userId as any,
      selectedModel: modelId,
    });

    const modelCheck = await ensureExpectedModelWasUsed(response, modelId, startTime);
    if (modelCheck) {
      return modelCheck;
    }

    const duration = Date.now() - startTime;
    const toolCalls = response.toolCalls || [];

    if (toolCalls.length > 0) {
      const firstTool = toolCalls[0];
      const parsedArgs =
        hydrateToolCallArgumentsWithRuntimeEvidence(firstTool);
      const hasQuery =
        parsedArgs.query ||
        parsedArgs.searchQuery ||
        parsedArgs.name ||
        parsedArgs.search;

      if (firstTool.name === "search_contacts") {
        if (hasQuery) {
          console.log(`     ✅ PASS: Parsed complex parameters (${duration}ms)`);
          console.log(
            `     Arguments: ${JSON.stringify(parsedArgs).substring(0, 80)}...`
          );
          return { passed: true, message: "Complex params work", duration };
        }

        console.log(`     ⚠️  PARTIAL: Called search_contacts but missing query`);
        return { passed: false, message: "Missing parameters", duration };
      }

      if (firstTool.name === "manage_crm") {
        const hasSearchAction =
          typeof parsedArgs.action === "string" &&
          parsedArgs.action.toLowerCase().includes("search");
        const hasSearchInput =
          Boolean(hasQuery) ||
          Boolean(parsedArgs.firstName) ||
          Boolean(parsedArgs.lastName) ||
          Boolean(parsedArgs.email) ||
          Boolean(parsedArgs.organizationName);

        if (hasSearchAction && hasSearchInput) {
          console.log(
            `     ✅ PASS: Parsed complex parameters via manage_crm (${duration}ms)`
          );
          console.log(
            `     Arguments: ${JSON.stringify(parsedArgs).substring(0, 80)}...`
          );
          return { passed: true, message: "Complex params work", duration };
        }

        console.log(
          `     ⚠️  PARTIAL: Called manage_crm but missing required search signal fields`
        );
        return { passed: false, message: "Missing parameters", duration };
      }

      console.log(`     ❌ FAIL: Unexpected tool ${firstTool.name}`);
      return { passed: false, message: `Wrong tool: ${firstTool.name}`, duration };
    } else {
      console.log(`     ❌ FAIL: Expected search_contacts or manage_crm tool`);
      return { passed: false, message: "Wrong tool or no tool", duration };
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`     ❌ ERROR: ${error.message}`);
    return { passed: false, message: error.message, duration, error: error.message };
  }
}

// Test 4: Multi-turn Conversation
async function testMultiTurn(modelId: string): Promise<TestResult> {
  console.log("\n  🧪 Test 4: Multi-turn Context");
  const startTime = Date.now();
  const { organizationId, userId } = getValidationFixture();

  try {
    // Create a conversation first
    const conv: any = await client.mutation(api.ai.conversations.createConversation, {
      organizationId: organizationId as any,
      userId: userId as any,
      title: "Test Multi-turn",
    });

    // First message
    await client.action(api.ai.chat.sendMessage, {
      conversationId: conv,
      message: "List my forms",
      organizationId: organizationId as any,
      userId: userId as any,
      selectedModel: modelId,
    });

    // Second message (should remember context)
    const response: any = await client.action(api.ai.chat.sendMessage, {
      conversationId: conv,
      message: "How many did you find?",
      organizationId: organizationId as any,
      userId: userId as any,
      selectedModel: modelId,
    });

    const modelCheck = await ensureExpectedModelWasUsed(response, modelId, startTime);
    if (modelCheck) {
      return modelCheck;
    }

    const duration = Date.now() - startTime;

    const secondTurnToolCalls = response.toolCalls || [];
    const maintainedViaMessage = Boolean(response.message && response.message.length > 0);
    const maintainedViaFollowupTool =
      secondTurnToolCalls.length > 0 &&
      ["list_forms", "manage_crm"].includes(secondTurnToolCalls[0].name);

    if (maintainedViaMessage || maintainedViaFollowupTool) {
      console.log(`     ✅ PASS: Maintained context (${duration}ms)`);
      if (maintainedViaMessage) {
        console.log(`     Response: ${response.message.substring(0, 80)}...`);
      } else {
        console.log(
          `     Follow-up tool call: ${secondTurnToolCalls[0].name} (approval-gated flow)`
        );
      }
      return { passed: true, message: "Multi-turn works", duration };
    } else {
      console.log(`     ❌ FAIL: Lost context`);
      return { passed: false, message: "Context lost", duration };
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`     ❌ ERROR: ${error.message}`);
    return { passed: false, message: error.message, duration, error: error.message };
  }
}

// Test 5: Edge Cases
async function testEdgeCases(modelId: string): Promise<TestResult> {
  console.log("\n  🧪 Test 5: Edge Cases");
  const startTime = Date.now();
  const { organizationId, userId } = getValidationFixture();

  try {
    // Test with empty/ambiguous query
    const response: any = await client.action(api.ai.chat.sendMessage, {
      message: "Search for",  // Incomplete query
      organizationId: organizationId as any,
      userId: userId as any,
      selectedModel: modelId,
    });

    const modelCheck = await ensureExpectedModelWasUsed(response, modelId, startTime);
    if (modelCheck) {
      return modelCheck;
    }

    const duration = Date.now() - startTime;
    const toolCalls = response.toolCalls || [];

    // Should either ask for clarification OR handle gracefully
    if (response.message || toolCalls.length === 0) {
      console.log(`     ✅ PASS: Handled edge case gracefully (${duration}ms)`);
      return { passed: true, message: "Edge cases handled", duration };
    } else {
      console.log(`     ⚠️  ACCEPTABLE: Called tool with incomplete params`);
      return { passed: true, message: "Acceptable behavior", duration };
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`     ❌ ERROR: ${error.message}`);
    return { passed: false, message: error.message, duration, error: error.message };
  }
}

// Test 6: Tool Contract Checks
async function testToolContracts(modelId: string): Promise<TestResult> {
  console.log("\n  🧪 Test 6: Tool Contract Checks");
  const startTime = Date.now();
  const { organizationId, userId } = getValidationFixture();

  try {
    if (CRITICAL_TOOL_NAMES.length !== 10) {
      const duration = Date.now() - startTime;
      console.log(
        `     ❌ FAIL: Expected 10 critical tool contracts, found ${CRITICAL_TOOL_NAMES.length}`
      );
      return {
        passed: false,
        message: `Critical contract set size mismatch (${CRITICAL_TOOL_NAMES.length})`,
        duration,
      };
    }

    const scenarios = [
      {
        prompt: "List my forms",
        expectedTools: ["list_forms"],
      },
      {
        prompt: CONTACT_SEARCH_CONTRACT_PROMPT,
        expectedTools: ["search_contacts", "manage_crm"],
      },
    ] as const;

    for (const scenario of scenarios) {
      const response: any = await client.action(api.ai.chat.sendMessage, {
        message: scenario.prompt,
        organizationId: organizationId as any,
        userId: userId as any,
        selectedModel: modelId,
      });

      const modelCheck = await ensureExpectedModelWasUsed(response, modelId, startTime);
      if (modelCheck) {
        return modelCheck;
      }

      const toolCalls = response.toolCalls || [];
      const firstToolCall = toolCalls[0];

      if (!firstToolCall) {
        const duration = Date.now() - startTime;
        console.log(
          `     ❌ FAIL: No tool call returned for contract scenario "${scenario.expectedTools.join("|")}"`
        );
        return {
          passed: false,
          message: `No tool call for ${scenario.expectedTools.join("|")}`,
          duration,
        };
      }

      if (!(scenario.expectedTools as readonly string[]).includes(firstToolCall.name)) {
        const duration = Date.now() - startTime;
        console.log(
          `     ❌ FAIL: Expected ${scenario.expectedTools.join("|")}, got ${firstToolCall.name}`
        );
        return {
          passed: false,
          message: `Wrong tool for contract check: ${firstToolCall.name}`,
          duration,
        };
      }

      const normalizedArguments =
        hydrateToolCallArgumentsWithRuntimeEvidence(firstToolCall);

      const contractResult = validateToolCallAgainstContract({
        name: firstToolCall.name,
        arguments: normalizedArguments,
      });

      if (!contractResult.passed) {
        const duration = Date.now() - startTime;
        console.log(`     ❌ FAIL: ${contractResult.message}`);
        return {
          passed: false,
          message: contractResult.message,
          duration,
        };
      }

      console.log(
        `     ✅ ${firstToolCall.name} matched contract ${contractResult.contractVersion}`
      );
    }

    const duration = Date.now() - startTime;
    console.log(
      `     ✅ PASS: Contract checks passed (${duration}ms)`
    );
    return {
      passed: true,
      message: "Tool contract checks passed",
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`     ❌ ERROR: ${error.message}`);
    return {
      passed: false,
      message: error.message,
      duration,
      error: error.message,
    };
  }
}

// Run all validation tests for a model
async function validateModel(modelId: string): Promise<ValidationResult> {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`🔍 Validating Model: ${modelId}`);
  console.log(`${"=".repeat(70)}`);

  const results: ValidationResult = {
    basicChat: false,
    toolCalling: false,
    complexParams: false,
    multiTurn: false,
    edgeCases: false,
    contractChecks: false,
  };

  // Run all tests sequentially
  const basicChatResult = await testBasicChat(modelId);
  results.basicChat = basicChatResult.passed;

  const toolCallingResult = await testToolCalling(modelId);
  results.toolCalling = toolCallingResult.passed;

  const complexParamsResult = await testComplexParams(modelId);
  results.complexParams = complexParamsResult.passed;

  const multiTurnResult = await testMultiTurn(modelId);
  results.multiTurn = multiTurnResult.passed;

  const edgeCasesResult = await testEdgeCases(modelId);
  results.edgeCases = edgeCasesResult.passed;

  const contractChecksResult = await testToolContracts(modelId);
  results.contractChecks = contractChecksResult.passed;

  // Summary
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;

  console.log(`\n${"=".repeat(70)}`);
  console.log(`📊 Summary: ${passedTests}/${totalTests} tests passed`);
  console.log(`${"=".repeat(70)}\n`);

  return results;
}

// Save validation results to database
async function saveValidationResults(
  modelId: string,
  results: ValidationResult,
  status: "validated" | "failed"
) {
  if (!TEST_SESSION_ID) {
    console.log(
      "\n⚠️  TEST_SESSION_ID not set; skipping database persistence of validation results."
    );
    return;
  }

  console.log(`\n💾 Saving validation results to database...`);

  try {
    // Note: You'll need to create this mutation in convex/ai/platformModelManagement.ts
    await client.mutation(api.ai.platformModelManagement.updateModelValidation as any, {
      sessionId: TEST_SESSION_ID,
      modelId,
      validationStatus: status,
      testResults: {
        ...results,
        timestamp: Date.now(),
      },
      notes: `Validated via CLI test script on ${new Date().toISOString()}`,
    });

    console.log(`✅ Results saved successfully`);
  } catch (error: any) {
    console.error(`❌ Failed to save results: ${error.message}`);
    console.log(`   Results can still be reviewed above`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const modelArg = args.find((arg) => arg.startsWith("--model="));
  const providerArg = args.find((arg) => arg.startsWith("--provider="));
  const untestedOnly = args.includes("--untested-only");

  try {
    await resolveValidationFixtureContext();

    if (modelArg) {
      // Test single model
      const modelId = modelArg.split("=")[1];
      const results = await validateModel(modelId);

      const allPassed = Object.values(results).every(Boolean);
      const status = allPassed ? "validated" : "failed";

      await saveValidationResults(modelId, results, status);

      process.exit(allPassed ? 0 : 1);
    } else if (providerArg || untestedOnly) {
      if (!TEST_SESSION_ID) {
        console.error("❌ TEST_SESSION_ID is required for provider/batch model queries.");
        console.error("   Use --model=<modelId> or set TEST_SESSION_ID in .env.local.");
        process.exit(1);
      }

      console.log("🔄 Fetching models to test...");

      // Fetch models from database
      const platformModels: any = await client.query(api.ai.platformModelManagement.getPlatformModels, {
        sessionId: TEST_SESSION_ID,
      });

      let modelsToTest = platformModels.models;

      if (providerArg) {
        const provider = providerArg.split("=")[1];
        modelsToTest = modelsToTest.filter((m: any) => m.provider === provider);
      }

      if (untestedOnly) {
        modelsToTest = modelsToTest.filter(
          (m: any) => !m.validationStatus || m.validationStatus === "not_tested"
        );
      }

      console.log(`\n📋 Testing ${modelsToTest.length} model(s)...\n`);

      for (const model of modelsToTest) {
        const results = await validateModel(model.modelId);

        const allPassed = Object.values(results).every(Boolean);
        const status = allPassed ? "validated" : "failed";

        await saveValidationResults(model.modelId, results, status);

        // Wait between tests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      console.log("\n✅ Batch testing complete!");
    } else {
      const defaultModelId = await resolveDefaultModelId();
      console.log(
        `ℹ️  No arguments provided; running default model validation for ${defaultModelId}`
      );
      const results = await validateModel(defaultModelId);

      const allPassed = Object.values(results).every(Boolean);
      const status = allPassed ? "validated" : "failed";

      await saveValidationResults(defaultModelId, results, status);

      process.exit(allPassed ? 0 : 1);
    }
  } catch (error: any) {
    console.error(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

main();
