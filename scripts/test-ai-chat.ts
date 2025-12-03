#!/usr/bin/env tsx
/**
 * CLI Test Script for AI Chat
 *
 * Usage:
 *   npx tsx scripts/test-ai-chat.ts "your message here"
 *   npx tsx scripts/test-ai-chat.ts "sync contacts from Microsoft"
 *
 * This script allows you to test AI chat functionality from the command line
 * without needing to use the UI or deploy to production.
 */

// Load environment variables from .env.local
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local") });

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

// Configuration - update these with your values
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://your-deployment.convex.cloud";
const ORG_ID = process.env.TEST_ORG_ID || ""; // Your organization ID
const USER_ID = process.env.TEST_USER_ID || ""; // Your user ID
const MODEL = process.env.TEST_MODEL || "anthropic/claude-3-5-sonnet";

async function testAIChat(message: string) {
  console.log("🤖 AI Chat CLI Test");
  console.log("==================");
  console.log(`Message: ${message}`);
  console.log(`Model: ${MODEL}`);
  console.log("");

  if (!ORG_ID || !USER_ID) {
    console.error("❌ Error: TEST_ORG_ID and TEST_USER_ID must be set");
    console.log("\nSet them in your .env.local:");
    console.log("  TEST_ORG_ID=your_org_id");
    console.log("  TEST_USER_ID=your_user_id");
    console.log("\nYou can find these IDs in the Convex dashboard.");
    process.exit(1);
  }

  // Create Convex client
  const client = new ConvexHttpClient(CONVEX_URL);

  try {
    console.log("📤 Sending message to AI...\n");

    // Call the sendMessage action
    const result = await client.action(api.ai.chat.sendMessage, {
      message,
      organizationId: ORG_ID as any,
      userId: USER_ID as any,
      selectedModel: MODEL,
    });

    console.log("✅ Response received!");
    console.log("==================");
    console.log(`\n🤖 Assistant: ${result.message}\n`);

    if (result.toolCalls && result.toolCalls.length > 0) {
      console.log("🔧 Tool Calls:");
      console.log("==============");
      for (const toolCall of result.toolCalls) {
        console.log(`\n📍 ${toolCall.name} (round ${toolCall.round})`);
        console.log(`   Arguments: ${JSON.stringify(toolCall.arguments, null, 2)}`);
        if (toolCall.result) {
          console.log(`   ✅ Result: ${JSON.stringify(toolCall.result, null, 2)}`);
        }
        if (toolCall.error) {
          console.log(`   ❌ Error: ${toolCall.error}`);
        }
      }
    }

    console.log("\n📊 Usage:");
    console.log("=========");
    console.log(`Tokens: ${result.usage.total_tokens}`);
    console.log(`Cost: $${result.cost.toFixed(6)}`);
    console.log(`Conversation ID: ${result.conversationId}`);

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    if (error.data) {
      console.error("Error details:", JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

// Get message from command line
const message = process.argv[2];

if (!message) {
  console.log("Usage: npx tsx scripts/test-ai-chat.ts \"your message here\"");
  console.log("\nExamples:");
  console.log('  npx tsx scripts/test-ai-chat.ts "Hello, how are you?"');
  console.log('  npx tsx scripts/test-ai-chat.ts "What forms do we have?"');
  console.log('  npx tsx scripts/test-ai-chat.ts "Search for contacts named John"');
  process.exit(1);
}

testAIChat(message);
