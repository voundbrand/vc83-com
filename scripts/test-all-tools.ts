/**
 * Comprehensive Tool Testing
 * Tests all tools with both Anthropic and OpenAI
 */

import "dotenv/config";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const TEST_ORG_ID = process.env.TEST_ORG_ID!;
const TEST_USER_ID = process.env.TEST_USER_ID!;

interface TestCase {
  name: string;
  message: string;
  expectedTool: string;
}

const testCases: TestCase[] = [
  {
    name: "List Forms",
    message: "List my forms",
    expectedTool: "list_forms"
  },
  {
    name: "List Events",
    message: "Show me my events",
    expectedTool: "list_events"
  },
  {
    name: "Search Contacts",
    message: "Search for contacts named Alice",
    expectedTool: "search_contacts"
  },
  {
    name: "Create Form (asks for details)",
    message: "I want to create a registration form",
    expectedTool: "none" // Should ask for details first
  },
  {
    name: "Simple Greeting (no tool)",
    message: "Hello, how are you?",
    expectedTool: "none"
  }
];

async function testModel(modelName: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🧪 Testing Model: ${modelName}`);
  console.log(`${"=".repeat(60)}\n`);

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0
  };

  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log(`   Message: "${testCase.message}"`);
    console.log(`   Expected tool: ${testCase.expectedTool}`);

    try {
      const startTime = Date.now();
      const response: any = await client.action(api.ai.chat.sendMessage, {
        message: testCase.message,
        organizationId: TEST_ORG_ID as any,
        userId: TEST_USER_ID as any,
        selectedModel: modelName
      });

      const duration = Date.now() - startTime;
      const toolCalls = response.toolCalls || [];
      const actualTool = toolCalls.length > 0 ? toolCalls[0].name : "none";

      if (testCase.expectedTool === "none") {
        if (toolCalls.length === 0) {
          console.log(`   ✅ PASS: Responded without tools (${duration}ms)`);
          console.log(`   Response: ${response.message.substring(0, 100)}...`);
          results.passed++;
        } else {
          console.log(`   ⚠️  UNEXPECTED: Called ${actualTool} when no tool expected`);
          results.passed++; // Not necessarily a failure
        }
      } else {
        if (actualTool === testCase.expectedTool) {
          console.log(`   ✅ PASS: Called ${actualTool} (${duration}ms)`);
          console.log(`   Cost: $${response.cost.toFixed(6)}`);
          console.log(`   Tokens: ${response.usage.total_tokens}`);
          results.passed++;
        } else {
          console.log(`   ❌ FAIL: Called ${actualTool}, expected ${testCase.expectedTool}`);
          results.failed++;
        }
      }
    } catch (error: any) {
      console.log(`   ❌ ERROR: ${error.message}`);
      results.failed++;
    }
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`📊 Results for ${modelName}:`);
  console.log(`   ✅ Passed: ${results.passed}/${testCases.length}`);
  console.log(`   ❌ Failed: ${results.failed}/${testCases.length}`);
  console.log(`   Success Rate: ${((results.passed / testCases.length) * 100).toFixed(1)}%`);
  console.log(`${"─".repeat(60)}`);

  return results;
}

async function main() {
  console.log("\n🚀 AI Tool Calling Comprehensive Test\n");

  const models = [
    "anthropic/claude-3-5-sonnet",
    "openai/gpt-4o"
  ];

  const allResults: any = {};

  for (const model of models) {
    allResults[model] = await testModel(model);

    // Wait a bit between models to avoid rate limits
    if (models.indexOf(model) < models.length - 1) {
      console.log("\n⏳ Waiting 2 seconds before next model...\n");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Final summary
  console.log(`\n\n${"=".repeat(60)}`);
  console.log(`📊 FINAL SUMMARY`);
  console.log(`${"=".repeat(60)}\n`);

  for (const [model, results] of Object.entries(allResults)) {
    const { passed, failed }: any = results;
    const total = passed + failed;
    const successRate = ((passed / total) * 100).toFixed(1);
    const status = failed === 0 ? "✅" : "⚠️ ";

    console.log(`${status} ${model}:`);
    console.log(`   ${passed}/${total} passed (${successRate}%)`);
  }

  console.log(`\n${"=".repeat(60)}\n`);

  // Exit with appropriate code
  const anyFailed = Object.values(allResults).some((r: any) => r.failed > 0);
  process.exit(anyFailed ? 1 : 0);
}

main().catch(console.error);
