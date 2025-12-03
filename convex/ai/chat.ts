/**
 * AI Chat Action
 *
 * Main entry point for AI conversations using OpenRouter
 */

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import { OpenRouterClient } from "./openrouter";
import { getToolSchemas, executeTool } from "./tools/registry";

export const sendMessage = action({
  args: {
    conversationId: v.optional(v.id("aiConversations")),
    message: v.string(),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{
    conversationId: any;
    message: string;
    toolCalls: any[];
    usage: any;
    cost: number;
  }> => {
    // 1. Get or create conversation
    let conversationId: any = args.conversationId;
    if (!conversationId) {
      conversationId = await ctx.runMutation(api.ai.conversations.createConversation, {
        organizationId: args.organizationId,
        userId: args.userId,
      });
    }

    // 2. Add user message
    await ctx.runMutation(api.ai.conversations.addMessage, {
      conversationId,
      role: "user",
      content: args.message,
      timestamp: Date.now(),
    });

    // 3. Get conversation history
    const conversation: any = await ctx.runQuery(api.ai.conversations.getConversation, {
      conversationId,
    });

    // 4. Get AI settings for model selection
    const settings: any = await ctx.runQuery(api.ai.settings.getAISettings, {
      organizationId: args.organizationId,
    });

    if (!settings?.enabled) {
      throw new Error("AI features not enabled for this organization");
    }

    // Check rate limit
    const rateLimit = await ctx.runQuery(api.ai.settings.checkRateLimit, {
      organizationId: args.organizationId,
    });

    if (rateLimit.exceeded) {
      throw new Error("Rate limit exceeded. Please try again in an hour.");
    }

    // Check budget
    if (settings.monthlyBudgetUsd && settings.currentMonthSpend >= settings.monthlyBudgetUsd) {
      throw new Error("Monthly AI budget exceeded. Please increase your budget or wait until next month.");
    }

    // 5. Get OpenRouter API key
    const apiKey: string = settings.llm.openrouterApiKey || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OpenRouter API key not configured");
    }

    const client: OpenRouterClient = new OpenRouterClient(apiKey);
    const model: string = settings.llm.model || "anthropic/claude-3-5-sonnet";

    // 6. Prepare messages for AI
    const systemPrompt = `You are an AI assistant for l4yercak3, a platform for managing forms, events, contacts, and more.

Available Tools:
- create_form: Create registration forms, surveys, applications
- create_event: Create events with dates and descriptions
- search_contacts: Find contacts by name, email, or company
- list_forms: Get list of forms
- list_events: Get list of events

Guidelines:
1. Be helpful, concise, and action-oriented
2. Use tools to accomplish user tasks
3. Confirm before destructive actions (sending emails, deleting data)
4. Provide clear next steps with actionable buttons
5. If unsure, ask clarifying questions

Current Context:
- Organization: ${args.organizationId}
- User: ${args.userId}`;

    const messages: any[] = [
      { role: "system" as const, content: systemPrompt },
      ...conversation.messages.map((m: any) => ({
        role: m.role,
        content: m.content,
        tool_calls: m.toolCalls,
      })),
    ];

    // 7. Call OpenRouter with tools
    let response: any = await client.chatCompletion({
      model,
      messages,
      tools: getToolSchemas(),
      temperature: settings.llm.temperature,
      max_tokens: settings.llm.maxTokens,
    });

    // Validate response structure
    if (!response.choices || response.choices.length === 0) {
      throw new Error("Invalid response from OpenRouter: no choices returned");
    }

    // 8. Handle tool calls (with maximum 3 rounds to prevent infinite loops)
    const toolCalls: any[] = [];
    let toolCallRounds = 0;
    const maxToolCallRounds = 3;

    while (response.choices[0].message.tool_calls && toolCallRounds < maxToolCallRounds) {
      toolCallRounds++;
      console.log(`[AI Chat] Tool call round ${toolCallRounds}`);

      // Add assistant message with tool calls first
      messages.push({
        role: "assistant" as const,
        content: response.choices[0].message.content || "",
        tool_calls: response.choices[0].message.tool_calls,
      });

      // Execute each tool call
      for (const toolCall of response.choices[0].message.tool_calls) {
        const startTime = Date.now();

        try {
          // Execute tool
          const result = await executeTool(
            {
              ...ctx,
              organizationId: args.organizationId,
              userId: args.userId,
            },
            toolCall.function.name,
            JSON.parse(toolCall.function.arguments)
          );

          const durationMs = Date.now() - startTime;

          // Log execution
          await ctx.runMutation(api.ai.conversations.logToolExecution, {
            conversationId,
            organizationId: args.organizationId,
            userId: args.userId,
            toolName: toolCall.function.name,
            parameters: JSON.parse(toolCall.function.arguments),
            result,
            status: "success",
            tokensUsed: response.usage?.total_tokens || 0,
            costUsd: client.calculateCost(response.usage || { prompt_tokens: 0, completion_tokens: 0 }, model),
            executedAt: Date.now(),
            durationMs,
          });

          toolCalls.push({
            id: toolCall.id,
            name: toolCall.function.name,
            arguments: JSON.parse(toolCall.function.arguments),
            result,
            status: "success",
            round: toolCallRounds,
          });

          // Add tool result to messages (Anthropic format)
          messages.push({
            role: "tool" as const,
            tool_use_id: toolCall.id,
            content: JSON.stringify(result),
          } as any);
        } catch (error: any) {
          console.error(`[AI Chat] Tool execution failed: ${toolCall.function.name}`, error);

          // Log failed execution
          await ctx.runMutation(api.ai.conversations.logToolExecution, {
            conversationId,
            organizationId: args.organizationId,
            userId: args.userId,
            toolName: toolCall.function.name,
            parameters: JSON.parse(toolCall.function.arguments),
            error: error.message,
            status: "failed",
            tokensUsed: response.usage?.total_tokens || 0,
            costUsd: client.calculateCost(response.usage || { prompt_tokens: 0, completion_tokens: 0 }, model),
            executedAt: Date.now(),
            durationMs: Date.now() - startTime,
          });

          toolCalls.push({
            id: toolCall.id,
            name: toolCall.function.name,
            arguments: JSON.parse(toolCall.function.arguments),
            error: error.message,
            status: "failed",
            round: toolCallRounds,
          });

          // Add tool error to messages (Anthropic format)
          messages.push({
            role: "tool" as const,
            tool_use_id: toolCall.id,
            content: JSON.stringify({ error: error.message }),
          } as any);
        }
      }

      // Get next response after tool execution (without tools to force final answer)
      response = await client.chatCompletion({
        model,
        messages,
        temperature: settings.llm.temperature,
        max_tokens: settings.llm.maxTokens,
        // Don't pass tools on subsequent calls to encourage final answer
      });

      // Validate response structure
      if (!response.choices || response.choices.length === 0) {
        throw new Error("Invalid response from OpenRouter after tool execution");
      }
    }

    // If we hit max rounds, log a warning
    if (toolCallRounds >= maxToolCallRounds && response.choices[0].message.tool_calls) {
      console.warn(`[AI Chat] Max tool call rounds (${maxToolCallRounds}) reached, forcing final response`);
    }

    // 9. Save assistant message
    const finalMessage = response.choices[0]?.message;
    if (!finalMessage) {
      throw new Error("No message in final response from OpenRouter");
    }

    const messageContent = finalMessage.content || (toolCalls.length > 0
      ? `Executed ${toolCalls.length} tool(s): ${toolCalls.map(t => t.name).join(", ")}`
      : "I'm here to help, but I didn't generate a response.");

    await ctx.runMutation(api.ai.conversations.addMessage, {
      conversationId,
      role: "assistant",
      content: messageContent,
      timestamp: Date.now(),
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    });

    // 10. Update monthly spend
    const cost = client.calculateCost(
      response.usage || { prompt_tokens: 0, completion_tokens: 0 },
      model
    );
    await ctx.runMutation(api.ai.settings.updateMonthlySpend, {
      organizationId: args.organizationId,
      costUsd: cost,
    });

    return {
      conversationId,
      message: messageContent,
      toolCalls,
      usage: response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      cost,
    };
  },
});
