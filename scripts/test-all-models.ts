/**
 * Comprehensive Model Testing
 * Tests all available models in the UI with tool calling
 */

import "dotenv/config";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const TEST_ORG_ID = process.env.TEST_ORG_ID!;
const TEST_USER_ID = process.env.TEST_USER_ID!;

// All models from model-selector.tsx
const MODELS = [
  "anthropic/claude-3-5-sonnet",
  "anthropic/claude-3-opus",
  "openai/gpt-4o",
  "openai/gpt-4-turbo",
  "google/gemini-pro-1.5",
];

async function testModel(modelName: string): Promise<{
  model: string;
  provider: string;
  toolCalling: "✅ Works" | "❌ Failed" | "⚠️ Partial" | "⏭️ Skipped";
  speed: string;
  cost: string;
  error?: string;
}> {
  const provider = modelName.split("/")[0];

  console.log(`\n${"─".repeat(60)}`);
  console.log(`🧪 Testing: ${modelName}`);
  console.log(`   Provider: ${provider}`);

  try {
    const startTime = Date.now();

    // Test with a simple tool-requiring message
    const response: any = await client.action(api.ai.chat.sendMessage, {
      message: "List my forms",
      organizationId: TEST_ORG_ID as any,
      userId: TEST_USER_ID as any,
      selectedModel: modelName
    });

    const duration = Date.now() - startTime;
    const toolCalls = response.toolCalls || [];
    const cost = `$${response.cost.toFixed(6)}`;
    const speedMs = `${duration}ms`;

    // Check if tool was called
    const calledListForms = toolCalls.some((tc: any) => tc.name === "list_forms");

    if (calledListForms && toolCalls[0].status === "success") {
      console.log(`   ✅ Tool calling works!`);
      console.log(`   Speed: ${speedMs}`);
      console.log(`   Cost: ${cost}`);
      console.log(`   Tokens: ${response.usage.total_tokens}`);

      return {
        model: modelName,
        provider,
        toolCalling: "✅ Works",
        speed: speedMs,
        cost
      };
    } else if (toolCalls.length > 0) {
      console.log(`   ⚠️ Tool called but status: ${toolCalls[0].status}`);
      return {
        model: modelName,
        provider,
        toolCalling: "⚠️ Partial",
        speed: speedMs,
        cost
      };
    } else {
      console.log(`   ⚠️ No tools called (AI chose not to use tools)`);
      return {
        model: modelName,
        provider,
        toolCalling: "⚠️ Partial",
        speed: speedMs,
        cost
      };
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
    return {
      model: modelName,
      provider,
      toolCalling: "❌ Failed",
      speed: "N/A",
      cost: "N/A",
      error: error.message
    };
  }
}

async function main() {
  console.log("\n🚀 Comprehensive Model Testing\n");
  console.log(`Testing ${MODELS.length} models with tool calling\n`);
  console.log(`${"=".repeat(60)}\n`);

  const results: Awaited<ReturnType<typeof testModel>>[] = [];

  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i];
    const result = await testModel(model);
    results.push(result);

    // Wait between tests to avoid rate limits
    if (i < MODELS.length - 1) {
      console.log("\n⏳ Waiting 3 seconds before next model...");
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Final summary table
  console.log(`\n\n${"=".repeat(60)}`);
  console.log(`📊 FINAL RESULTS`);
  console.log(`${"=".repeat(60)}\n`);

  // Group by provider
  const byProvider = results.reduce((acc, r) => {
    if (!acc[r.provider]) acc[r.provider] = [];
    acc[r.provider].push(r);
    return acc;
  }, {} as Record<string, typeof results>);

  // Print results by provider
  for (const [provider, models] of Object.entries(byProvider)) {
    console.log(`\n${provider.toUpperCase()}:`);
    console.log(`${"─".repeat(60)}`);

    for (const model of models) {
      const modelName = model.model.split("/")[1];
      console.log(`${model.toolCalling} ${modelName}`);
      console.log(`   Speed: ${model.speed} | Cost: ${model.cost}`);
      if (model.error) {
        console.log(`   Error: ${model.error}`);
      }
    }
  }

  // Summary stats
  const working = results.filter(r => r.toolCalling === "✅ Works").length;
  const partial = results.filter(r => r.toolCalling === "⚠️ Partial").length;
  const failed = results.filter(r => r.toolCalling === "❌ Failed").length;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`📈 SUMMARY:`);
  console.log(`   ✅ Working: ${working}/${MODELS.length} models`);
  console.log(`   ⚠️ Partial: ${partial}/${MODELS.length} models`);
  console.log(`   ❌ Failed: ${failed}/${MODELS.length} models`);
  console.log(`   Success Rate: ${((working / MODELS.length) * 100).toFixed(1)}%`);
  console.log(`${"=".repeat(60)}\n`);

  // Recommendations
  console.log(`\n💡 RECOMMENDATIONS:\n`);

  const workingModels = results.filter(r => r.toolCalling === "✅ Works");
  if (workingModels.length > 0) {
    // Find fastest and cheapest
    const fastest = workingModels.reduce((a, b) =>
      parseInt(a.speed) < parseInt(b.speed) ? a : b
    );
    const cheapest = workingModels.reduce((a, b) =>
      parseFloat(a.cost.replace("$", "")) < parseFloat(b.cost.replace("$", "")) ? a : b
    );

    console.log(`   ⚡ Fastest: ${fastest.model} (${fastest.speed})`);
    console.log(`   💰 Cheapest: ${cheapest.model} (${cheapest.cost})`);

    if (fastest.model === cheapest.model) {
      console.log(`   🏆 Best Overall: ${fastest.model} (fastest AND cheapest!)`);
    }
  }

  const failedModels = results.filter(r => r.toolCalling === "❌ Failed");
  if (failedModels.length > 0) {
    console.log(`\n   ⚠️  Avoid for tool calling:`);
    failedModels.forEach(m => {
      console.log(`      - ${m.model}: ${m.error}`);
    });
  }

  console.log("\n");

  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
