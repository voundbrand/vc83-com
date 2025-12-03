/**
 * Test to match EXACT structure from our failing implementation
 */

import "dotenv/config";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;

async function testExactMatch() {
  console.log("\n🧪 Testing EXACT structure from our implementation\n");

  // Step 1
  const request1 = {
    model: "anthropic/claude-3-5-sonnet",
    messages: [
      {
        role: "system",
        content: "You are an AI assistant for l4yercak3. Use the list_forms tool when asked to list forms."
      },
      {
        role: "user",
        content: "List my forms"
      }
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "list_forms",
          description: "Get list of forms",
          parameters: {
            type: "object",
            properties: {
              limit: { type: "number" },
              status: { type: "string" }
            }
          }
        }
      }
    ]
  };

  console.log("Step 1: Initial request");
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

  // Step 2: Exact structure from our implementation
  console.log("\nStep 2: Sending tool result with exact structure from our code");

  // Notice: tool_calls in assistant message has NO arguments field!
  // That's what our code sends based on the log
  const request2 = {
    model: "anthropic/claude-3-5-sonnet",
    messages: [
      {
        role: "system",
        content: "You are an AI assistant for l4yercak3. Use the list_forms tool when asked to list forms."
      },
      {
        role: "user",
        content: "List my forms"
      },
      {
        role: "assistant",
        content: data1.choices[0].message.content || "",
        tool_calls: toolCalls.map((tc: any) => ({
          ...tc,
          function: {
            ...tc.function,
            arguments: tc.function.arguments || "{}"  // ← Add empty arguments if missing!
          }
        }))
      },
      {
        role: "tool",
        tool_call_id: toolCalls[0].id,
        name: "list_forms",
        content: JSON.stringify({ success: true, message: "Retrieved forms", forms: [] })
      }
    ]
  };

  console.log("Request 2:", JSON.stringify(request2, null, 2));

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
    console.log("\n❌ FAILED:", error);
    return;
  }

  const data2 = await response2.json();
  console.log("\n✅ SUCCESS!");
  console.log("Response 2:", JSON.stringify(data2, null, 2));
}

testExactMatch().catch(console.error);
