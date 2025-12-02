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

    // 8. Handle tool calls
    const toolCalls: any[] = [];
    if (response.choices[0].message.tool_calls) {
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
            tokensUsed: response.usage.total_tokens,
            costUsd: client.calculateCost(response.usage, model),
            executedAt: Date.now(),
            durationMs,
          });

          toolCalls.push({
            id: toolCall.id,
            name: toolCall.function.name,
            arguments: JSON.parse(toolCall.function.arguments),
            result,
            status: "success",
          });

          // Add tool result to messages
          messages.push({
            role: "assistant" as const,
            content: response.choices[0].message.content || "",
            tool_calls: response.choices[0].message.tool_calls,
          });

          messages.push({
            role: "tool" as const,
            content: JSON.stringify(result),
            name: toolCall.function.name,
          } as any);
        } catch (error: any) {
          // Log failed execution
          await ctx.runMutation(api.ai.conversations.logToolExecution, {
            conversationId,
            organizationId: args.organizationId,
            userId: args.userId,
            toolName: toolCall.function.name,
            parameters: JSON.parse(toolCall.function.arguments),
            error: error.message,
            status: "failed",
            tokensUsed: response.usage.total_tokens,
            costUsd: client.calculateCost(response.usage, model),
            executedAt: Date.now(),
            durationMs: Date.now() - startTime,
          });

          toolCalls.push({
            id: toolCall.id,
            name: toolCall.function.name,
            arguments: JSON.parse(toolCall.function.arguments),
            error: error.message,
            status: "failed",
          });

          messages.push({
            role: "tool" as const,
            content: JSON.stringify({ error: error.message }),
            name: toolCall.function.name,
          } as any);
        }
      }

      // Get final response after tool execution
      response = await client.chatCompletion({
        model,
        messages,
        temperature: settings.llm.temperature,
        max_tokens: settings.llm.maxTokens,
      });
    }

    // 9. Save assistant message
    await ctx.runMutation(api.ai.conversations.addMessage, {
      conversationId,
      role: "assistant",
      content: response.choices[0].message.content,
      timestamp: Date.now(),
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    });

    // 10. Update monthly spend
    const cost = client.calculateCost(response.usage, model);
    await ctx.runMutation(api.ai.settings.updateMonthlySpend, {
      organizationId: args.organizationId,
      costUsd: cost,
    });

    return {
      conversationId,
      message: response.choices[0].message.content,
      toolCalls,
      usage: response.usage,
      cost,
    };
  },
});
