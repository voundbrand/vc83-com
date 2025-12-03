/**
 * Test Newest Models (Dec 2025)
 * - Amazon Nova 2 Lite (FREE!)
 * - Mistral Large 3 2512
 */

import "dotenv/config";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const TEST_ORG_ID = process.env.TEST_ORG_ID!;
const TEST_USER_ID = process.env.TEST_USER_ID!;

const NEWEST_MODELS = [
  "amazon/nova-2-lite",
  "mistralai/mistral-large-2512",
];

async function testModel(modelName: string) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`🧪 Testing: ${modelName}`);

  try {
    const startTime = Date.now();
    const response: any = await client.action(api.ai.chat.sendMessage, {
      message: "List my forms please",
      organizationId: TEST_ORG_ID as any,
      userId: TEST_USER_ID as any,
      selectedModel: modelName
    });

    const duration = Date.now() - startTime;
    const toolCalls = response.toolCalls || [];
    const cost = `$${response.cost.toFixed(6)}`;

    if (toolCalls.some((tc: any) => tc.name === "list_forms" && tc.status === "success")) {
      console.log(`   ✅ WORKING`);
      console.log(`   Speed: ${duration}ms`);
      console.log(`   Cost: ${cost} ${cost === "$0.000000" ? "💰 FREE!" : ""}`);
      console.log(`   Tokens: ${response.usage.total_tokens}`);
      return { model: modelName, working: true, speed: duration, cost };
    } else {
      console.log(`   ⚠️  Tool calling failed`);
      return { model: modelName, working: false };
    }
  } catch (error: any) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return { model: modelName, working: false, error: error.message };
  }
}

async function main() {
  console.log("\n🚀 Testing Newest Models (Dec 2025)\n");
  console.log(`${"=".repeat(60)}\n`);

  for (const model of NEWEST_MODELS) {
    await testModel(model);
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n${"=".repeat(60)}\n`);
}

main().catch(console.error);
