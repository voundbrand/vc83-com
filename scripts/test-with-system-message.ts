/**
 * Test Anthropic Tool Calling WITH System Message
 */

import "dotenv/config";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;

async function testWithSystemMessage() {
  console.log("\n🧪 Testing with SYSTEM message\n");

  // Test 1: WITH system message
  const request1 = {
    model: "anthropic/claude-3-5-sonnet",
    messages: [
      { role: "system", content: "You are a helpful calculator assistant. Always use the calculator tool when asked to do math." },
      { role: "user", content: "What is 10 + 5?" }
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "calculator",
          description: "Calculate a math expression",
          parameters: {
            type: "object",
            properties: {
              expression: { type: "string" }
            },
            required: ["expression"]
          }
        }
      }
    ]
  };

  console.log("Step 1: Sending WITH system message...");
  const response1 = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request1)
  });

  const data1 = await response1.json();
  console.log("Response 1:", JSON.stringify(data1, null, 2));

  const toolCalls = data1.choices?.[0]?.message?.tool_calls;
  if (!toolCalls) {
    console.log("❌ No tool calls");
    return;
  }

  // Step 2: Send tool result
  console.log("\nStep 2: Sending tool result...");
  const request2 = {
    model: "anthropic/claude-3-5-sonnet",
    messages: [
      { role: "system", content: "You are a helpful calculator assistant." },
      { role: "user", content: "What is 10 + 5?" },
      {
        role: "assistant",
        content: data1.choices[0].message.content || "",
        tool_calls: toolCalls
      },
      {
        role: "tool",
        tool_call_id: toolCalls[0].id,
        name: "calculator",
        content: JSON.stringify({ result: 15 })
      }
    ]
  };

  const response2 = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request2)
  });

  if (!response2.ok) {
    const error = await response2.text();
    console.log("❌ Step 2 failed:", error);
    return;
  }

  const data2 = await response2.json();
  console.log("✅ Step 2 Success!");
  console.log("Response 2:", JSON.stringify(data2, null, 2));
}

testWithSystemMessage().catch(console.error);
