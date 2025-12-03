/**
 * Test Mistral and Llama Models
 */

import "dotenv/config";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const TEST_ORG_ID = process.env.TEST_ORG_ID!;
const TEST_USER_ID = process.env.TEST_USER_ID!;

const MODELS = [
  "mistralai/mistral-large-2512",
  "mistralai/mistral-medium-3.1",
  "nvidia/llama-3.3-nemotron-super-49b-v1.5",
  "meta-llama/llama-3.3-70b-instruct",
];

async function testModel(modelName: string) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`🧪 Testing: ${modelName}`);

  try {
    const startTime = Date.now();
    const response: any = await client.action(api.ai.chat.sendMessage, {
      message: "List my forms",
      organizationId: TEST_ORG_ID as any,
      userId: TEST_USER_ID as any,
      selectedModel: modelName
    });

    const duration = Date.now() - startTime;
    const toolCalls = response.toolCalls || [];
    const cost = `$${response.cost.toFixed(6)}`;

    if (toolCalls.some((tc: any) => tc.name === "list_forms" && tc.status === "success")) {
      console.log(`   ✅ WORKING - ${duration}ms - ${cost}`);
      return { model: modelName, status: "✅ Works", speed: duration, cost };
    } else if (toolCalls.length > 0) {
      console.log(`   ⚠️  PARTIAL - Tool called but failed`);
      return { model: modelName, status: "⚠️ Partial", speed: duration, cost };
    } else {
      console.log(`   ⚠️  NO TOOLS - AI didn't use tools`);
      return { model: modelName, status: "⚠️ No Tools", speed: duration, cost };
    }
  } catch (error: any) {
    console.log(`   ❌ FAILED - ${error.message}`);
    return { model: modelName, status: "❌ Failed", error: error.message };
  }
}

async function main() {
  console.log("\n🚀 Testing Mistral & Llama Models\n");
  console.log(`${"=".repeat(60)}\n`);

  const results = [];
  for (let i = 0; i < MODELS.length; i++) {
    const result = await testModel(MODELS[i]);
    results.push(result);
    if (i < MODELS.length - 1) {
      console.log("\n⏳ Waiting 3 seconds...");
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  console.log(`\n\n${"=".repeat(60)}`);
  console.log(`📊 RESULTS\n`);

  results.forEach((r: any) => {
    const provider = r.model.split("/")[0].toUpperCase();
    const modelName = r.model.split("/")[1];
    console.log(`${r.status} ${provider}: ${modelName}`);
    if (r.speed) console.log(`   Speed: ${r.speed}ms | Cost: ${r.cost}`);
    if (r.error) console.log(`   Error: ${r.error.substring(0, 100)}...`);
  });

  console.log(`\n${"=".repeat(60)}\n`);

  const working = results.filter((r: any) => r.status === "✅ Works").length;
  console.log(`Success Rate: ${working}/${MODELS.length} (${((working/MODELS.length)*100).toFixed(1)}%)\n`);
}

main().catch(console.error);
