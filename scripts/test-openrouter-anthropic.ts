/**
 * Test OpenRouter Anthropic Tool Calling
 *
 * Direct API test to see exact request/response format
 */

import "dotenv/config";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;

async function testAnthropicToolCalling() {
  console.log("\n🧪 Testing Anthropic Tool Calling on OpenRouter\n");
  console.log("=" .repeat(50));

  // Step 1: Initial request with tools
  console.log("\n📤 Step 1: Sending initial message with tools...\n");

  const initialRequest = {
    model: "anthropic/claude-3-5-sonnet",
    messages: [
      {
        role: "user",
        content: "What is 5 + 3? Use the calculator tool."
      }
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
              expression: { type: "string", description: "Math expression to calculate" }
            },
            required: ["expression"]
          }
        }
      }
    ]
  };

  console.log("Request:", JSON.stringify(initialRequest, null, 2));

  const response1 = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(initialRequest)
  });

  if (!response1.ok) {
    const errorText = await response1.text();
    console.error(`❌ Step 1 failed: ${response1.status} ${response1.statusText}`);
    console.error("Error body:", errorText);
    return;
  }

  const data1 = await response1.json();
  console.log("\n✅ Step 1 Response:");
  console.log(JSON.stringify(data1, null, 2));

  // Check if tool was called
  const toolCalls = data1.choices?.[0]?.message?.tool_calls;
  if (!toolCalls || toolCalls.length === 0) {
    console.log("\n⚠️  No tool calls in response - AI didn't use the tool");
    return;
  }

  console.log("\n🔧 Tool calls detected:", toolCalls);

  // Step 2: Send tool result back
  console.log("\n📤 Step 2: Sending tool result...\n");

  const toolCall = toolCalls[0];
  const toolCallId = toolCall.id;

  console.log(`Tool ID format: ${toolCallId}`);
  console.log(`Tool ID prefix: ${toolCallId.substring(0, 6)}`);

  // Try OpenAI format first
  const followUpRequest = {
    model: "anthropic/claude-3-5-sonnet",
    messages: [
      {
        role: "user",
        content: "What is 5 + 3? Use the calculator tool."
      },
      {
        role: "assistant",
        content: data1.choices[0].message.content || "",
        tool_calls: toolCalls
      },
      {
        role: "tool",
        tool_call_id: toolCallId,
        name: "calculator",
        content: JSON.stringify({ result: 8 })
      }
    ]
  };

  console.log("Request:", JSON.stringify(followUpRequest, null, 2));

  const response2 = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(followUpRequest)
  });

  if (!response2.ok) {
    const errorText = await response2.text();
    console.error(`\n❌ Step 2 failed with OpenAI format: ${response2.status} ${response2.statusText}`);
    console.error("Error body:", errorText);

    // Try Anthropic format as fallback
    console.log("\n📤 Step 3: Trying Anthropic native format...\n");

    const anthropicRequest = {
      model: "anthropic/claude-3-5-sonnet",
      messages: [
        {
          role: "user",
          content: "What is 5 + 3? Use the calculator tool."
        },
        {
          role: "assistant",
          content: data1.choices[0].message.content || "",
          tool_calls: toolCalls
        },
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: toolCallId,
              content: JSON.stringify({ result: 8 })
            }
          ]
        }
      ]
    };

    console.log("Request:", JSON.stringify(anthropicRequest, null, 2));

    const response3 = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(anthropicRequest)
    });

    if (!response3.ok) {
      const errorText3 = await response3.text();
      console.error(`\n❌ Step 3 also failed: ${response3.status} ${response3.statusText}`);
      console.error("Error body:", errorText3);
      return;
    }

    const data3 = await response3.json();
    console.log("\n✅ Step 3 Success with Anthropic format!");
    console.log(JSON.stringify(data3, null, 2));
    return;
  }

  const data2 = await response2.json();
  console.log("\n✅ Step 2 Success with OpenAI format!");
  console.log(JSON.stringify(data2, null, 2));
}

testAnthropicToolCalling().catch(console.error);
