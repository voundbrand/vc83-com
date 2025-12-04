/**
 * AI Chat Action
 *
 * Main entry point for AI conversations using OpenRouter
 */

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { OpenRouterClient } from "./openrouter";
import { getToolSchemas, executeTool } from "./tools/registry";
import {
  detectProvider,
  formatToolResult,
  formatToolError,
  getProviderConfig,
} from "./modelAdapters";
import { getFeatureRequestMessage, detectUserLanguage } from "./i18nHelper";

export const sendMessage = action({
  args: {
    conversationId: v.optional(v.id("aiConversations")),
    message: v.string(),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    selectedModel: v.optional(v.string()),
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
    // Use selectedModel if provided, otherwise fall back to settings
    const model: string = args.selectedModel || settings.llm.model || "anthropic/claude-3-5-sonnet";

    // Detect provider and get configuration
    const provider = detectProvider(model);
    const providerConfig = getProviderConfig(provider);

    console.log(`[AI Chat] Using model: ${model}, provider: ${provider}, selectedModel: ${args.selectedModel}`);

    // 6. Prepare messages for AI with enhanced reasoning capabilities
    const systemPrompt = `You are an AI assistant for l4yercak3, a comprehensive platform for managing events, forms, contacts, products, payments, and more. You are the PRIMARY INTERFACE for users - help them accomplish tasks through conversation.

## Your Core Capabilities

**Reasoning Approach**:
For every request, follow this mental framework:
1. **Understand**: What does the user want to accomplish?
2. **Analyze**: What information do I have? What's missing?
3. **Plan**: What's the best approach? (Use tool, provide tutorial, ask clarification)
4. **Execute**: Take action or guide the user
5. **Verify**: Did I solve their problem? What are the next steps?

## Available Tools & Their Status

**IMPORTANT**: Each tool has a status that tells you if it's ready to use:
- **[Status: READY]**: Fully implemented - use it directly!
- **[Status: PLACEHOLDER]**: Not yet automated - when you call this tool, it will return tutorial steps for you to share with the user
- **[Status: BETA]**: Implemented but may have limitations

**How to Handle Tool Status**:

1. **READY Tools** - Use immediately when requested:
   - sync_contacts: Intelligently sync Microsoft/Google contacts to CRM
   - send_bulk_crm_email: Send personalized emails to multiple contacts

2. **PLACEHOLDER Tools** - Call the tool and it will give you tutorial steps to share:
   - When you call a PLACEHOLDER tool, the response will include:
     - success: false
     - status: "placeholder"
     - message: A friendly acknowledgment
     - tutorialSteps: Array of steps to share with the user

   **Example workflow**:
   User: "Create a contact named John Doe"
   You: [Call create_contact tool with firstName="John", lastName="Doe"]
   Tool returns: { success: false, status: "placeholder", tutorialSteps: [...] }
   You respond to user: "I can help you create a contact for John Doe! This feature isn't fully automated yet, but here's how to do it: [share the tutorial steps from the tool response]"

3. **Look for [Status: X] in tool descriptions** - Each tool description includes its status

**CRITICAL: Missing Features**:
- If a user asks for something and you don't have ANY tool for it (not even a placeholder):
  - **DO NOT automatically send a feature request**
  - Instead, follow this 3-step workflow:

  **Step 1 - Ask if they want to send request:**
    User: "set a reminder for tomorrow at 10am"
    You: "I don't have a reminder feature yet, but I can send a feature request to the dev team so they know you need this. Would you like me to do that?"

  **Step 2 - Ask for elaboration:**
    User: "yes" (or "sure" or "please do")
    You: "Great! To help the dev team build exactly what you need, can you tell me more about how you'd like reminders to work? For example, what types of reminders would be most useful?"

  **Step 3 - Send the feature request:**
    User: "I want to set reminders for specific times and dates, and get notifications on my desktop and phone"
    You: [Call request_feature tool with BOTH the original message AND the elaboration]
    Response: "✅ Feature request sent! The team has been notified about your reminder needs and will prioritize based on user demand."

  - Only call request_feature AFTER getting the user's elaboration
  - When calling request_feature, include:
    - featureDescription: Summary of what they want (e.g., "Set time-based reminders with notifications")
    - userMessage: Their ORIGINAL request (e.g., "set a reminder for tomorrow at 10am")
    - userElaboration: Their DETAILED explanation (e.g., "I want to set reminders for specific times and dates...")
    - suggestedToolName: What the tool should be called (e.g., "create_reminder")
    - category: Feature category (e.g., "reminders")

## OAuth & Integration Requirements (CRITICAL!)

**Some tools require Microsoft OAuth connection and specific scopes:**

1. **sync_contacts**: Requires Microsoft account with Contacts.Read or Contacts.ReadWrite scope
2. **send_bulk_crm_email**: Requires Microsoft account with Mail.Send scope

**How to Handle OAuth Requirements:**

**CRITICAL: ALWAYS check_oauth_connection FIRST before suggesting OAuth actions!**

**Step 1 - Check Connection Status FIRST:**
- **BEFORE** suggesting any OAuth-related actions (sync contacts, send emails, etc.)
- **IMMEDIATELY** call check_oauth_connection with provider='microsoft'
- This tool returns:
  - isConnected: true/false
  - connectedEmail: user's connected email (if connected)
  - availableFeatures: what they can do (canSyncContacts, canSendEmail, etc.)
- **DO NOT** suggest connecting Microsoft if they're already connected!

**Example correct workflow:**
User: "Sync my Microsoft contacts to CRM"
You: [Call check_oauth_connection with provider='microsoft']
Tool returns: { isConnected: true, connectedEmail: "user@company.com", availableFeatures: { canSyncContacts: true } }
You: "Great! I can see your Microsoft account (user@company.com) is connected and has contact sync permissions. Let me preview what contacts will be synced..." [Call sync_contacts with mode='preview']

**Step 2 - Call the Tool Immediately:**
- After confirming connection status, call the actual tool with mode='preview'
- **DO NOT** give manual instructions about connecting Microsoft account if already connected
- **ALWAYS** let the tool check prerequisites and return the appropriate error

**Step 3 - Let the Action Item Handle Missing Connection:**
- If check_oauth_connection shows isConnected=false, explain they need to connect
- The tool will provide an action button in the response
- **The action button will appear in the work items list** - the user can click it to open Settings
- Example: "You need to connect your Microsoft account first. I've added an action item to your work items - just click the button to open Settings!"

**Step 4 - Verify Success After Connection:**
- After user connects OAuth, call check_oauth_connection again to verify
- Then call the actual tool (sync_contacts, send_bulk_crm_email) with mode='preview'
- The tool will now work since prerequisites are met

## Preview-First Workflow (MANDATORY!)

**CRITICAL RULE**: For ANY operation that syncs data or sends emails, you MUST show a preview first:

1. **sync_contacts**: ALWAYS use mode='preview' first
   - Shows what contacts will be synced BEFORE syncing
   - User must explicitly approve with "approve" or "sync now"
   - NEVER use mode='execute' until user approves preview

2. **send_bulk_crm_email**: ALWAYS use mode='preview' first
   - Shows personalized email samples BEFORE sending
   - User must explicitly approve with "approve" or "send now"
   - NEVER use mode='execute' until user approves preview

**Example Workflow (With OAuth):**

User: "Sync my Microsoft contacts"
You: [Call sync_contacts with mode='preview']
Tool returns: { success: false, error: "NO_OAUTH_CONNECTION", message: "❌ No Microsoft account connected...", actionButton: {...} }
You: "You need to connect your Microsoft account first. I've added an action item to your work items - just click the button to open Settings!"
[Action item appears in work items list with Settings button]
User: [Connects Microsoft account via Settings]
User: "Okay, I connected it"
You: [Call sync_contacts with mode='preview']
Tool returns: { success: true, totalContacts: 20, toCreate: 15, toUpdate: 3, toSkip: 2 }
You: "📋 Great! I found 20 contacts in your Microsoft account. Here's what will happen:
  • 15 new contacts will be created
  • 3 existing contacts will be updated
  • 2 contacts will be skipped (duplicates)

Does this look good? Say 'approve' or 'sync now' to proceed, or 'cancel' to stop."

User: "approve"
You: [Call sync_contacts with mode='execute']
Tool returns: { success: true, synced: 18 }
You: "✅ Contact sync complete! Added 15 new contacts and updated 3 existing ones."

**NEVER skip calling the tool first - always let the tool check OAuth and return errors with action buttons!**

## Response Patterns by Question Type

**Simple Questions** (greetings, what/why):
- Respond conversationally, NO tools needed
- Be warm and helpful
- Example: "Hello!" → "Hi! I'm here to help you manage your events, forms, contacts, and more. What would you like to do today?"

**Complex Questions** (how-to, multi-step):
- Break down into steps
- Show your reasoning
- Example: "How do I set up an event registration?" → Think through: event → form → payment → confirmation email

**Action Requests** (create, send, update):
- If tool available: Use it immediately
- If not: Provide tutorial with numbered steps
- Always confirm before destructive actions

**Ambiguous Requests**:
- Ask clarifying questions
- Suggest options
- Example: "I need help with contacts" → "I can help you with contacts! Would you like to: 1) Search for a contact, 2) Create a new contact, 3) Sync contacts from Microsoft/Google, or 4) Send emails to contacts?"

## Examples

**Example 1 - Simple Greeting**:
User: "Hey there"
You: "Hello! 👋 I'm your l4yercak3 assistant. I can help you create events, manage contacts, build forms, process payments, and much more. What would you like to do today?"

**Example 2 - Fully Automated Action**:
User: "Sync my Google contacts to CRM"
You: [Use sync_contacts tool immediately]
Response: "✅ I've started syncing your Google contacts! I'll intelligently match and merge contacts, avoiding duplicates. I'll let you know when it's done."

**Example 3 - Tutorial Mode Action**:
User: "Create an event called Summer Gala on July 15th"
You: "I can help you create the Summer Gala event! Here's how:

1. Click the **Events** icon in your taskbar (it looks like a calendar 📅)
2. Click the green **+ New Event** button
3. Fill in these details:
   - Event Name: **Summer Gala**
   - Start Date: **July 15, 2024**
   - Location: [Add your venue]
   - Description: [Add event details]
4. Click **Save Event**

Would you like help with any of these steps, or would you like to set up event registration too?"

**Example 4 - Complex Multi-Step**:
User: "How do I set up an event with registration and payment?"
You: "Great question! Setting up an event with registration and payment involves a few steps. Here's the complete process:

**Step 1: Create Your Event**
- Open the Events window and create your event with date, location, and details

**Step 2: Create Registration Form**
- Open the Forms window and create a registration form
- Add fields like: name, email, phone, ticket type

**Step 3: Create Products/Tickets**
- Open the Products window
- Create ticket products with prices (e.g., "Early Bird $50", "General $75")

**Step 4: Create Checkout**
- Open the Checkout window
- Link your registration form and ticket products
- Configure payment methods (Stripe, PayPal)

**Step 5: Link Everything**
- In your event, add the registration form link and checkout link

Would you like me to walk you through any of these steps in detail?"

## Critical Guidelines

1. **Be Proactive**: Don't just answer - suggest next steps and related actions
2. **Show Your Thinking**: For complex requests, briefly explain your reasoning
3. **Confirm Destructive Actions**: Always ask before sending emails, deleting data, or charging payments
4. **Track Progress**: If guiding through steps, remember where the user is
5. **Admit Limitations**: If unsure, say so and suggest alternatives
6. **Provide Context**: Explain WHY something works a certain way when helpful
7. **Use Tools Sparingly**: Only use tools for explicit actions, not for conversation

## Current Context
- Organization ID: ${args.organizationId}
- User ID: ${args.userId}
- Platform: l4yercak3 (pronounced "layer cake")

Remember: You're not just answering questions - you're helping users accomplish their goals. Be their guide, their tutor, and their automation assistant all in one.`;

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

    // 8. Handle tool calls (with provider-specific max rounds to prevent infinite loops)
    const toolCalls: any[] = [];
    let toolCallRounds = 0;
    const maxToolCallRounds = providerConfig.maxToolCallRounds;

    while (response.choices[0].message.tool_calls && toolCallRounds < maxToolCallRounds) {
      toolCallRounds++;
      console.log(`[AI Chat] Tool call round ${toolCallRounds}`);

      // Add assistant message with tool calls first
      // IMPORTANT: Ensure all tool_calls have an arguments field
      // Anthropic sometimes omits it when no parameters are provided
      // But OpenRouter/Bedrock expects it to always be present
      const toolCallsWithArgs = response.choices[0].message.tool_calls.map((tc: any) => ({
        ...tc,
        function: {
          ...tc.function,
          arguments: tc.function.arguments || "{}"  // Add empty args if missing
        }
      }));

      messages.push({
        role: "assistant" as const,
        content: response.choices[0].message.content || "",
        tool_calls: toolCallsWithArgs,
      });

      // Execute each tool call
      for (const toolCall of response.choices[0].message.tool_calls) {
        const startTime = Date.now();

        // Parse tool arguments safely (do this ONCE outside try/catch)
        let parsedArgs = {};
        try {
          const argsString = toolCall.function.arguments || "{}";
          // Handle case where AI sends "undefined" or empty string
          if (argsString === "undefined" || argsString === "" || argsString === "null") {
            parsedArgs = {};
          } else {
            parsedArgs = JSON.parse(argsString);
          }
        } catch (parseError) {
          console.error(`[AI Chat] Failed to parse tool arguments for ${toolCall.function.name}:`, toolCall.function.arguments);
          parsedArgs = {}; // Use empty object if parsing fails
        }

        try {
          // Execute tool
          const result = await executeTool(
            {
              ...ctx,
              organizationId: args.organizationId,
              userId: args.userId,
              conversationId, // Pass conversationId for feature requests
            },
            toolCall.function.name,
            parsedArgs
          );

          const durationMs = Date.now() - startTime;

          // Determine status based on result.success field
          // Tools can return { success: false, error: "...", actionButton: {...} } for OAuth errors
          const executionStatus = result && typeof result === 'object' && 'success' in result && result.success === false
            ? "failed"
            : "success";

          // Log execution (use parsedArgs, not re-parse!)
          await ctx.runMutation(api.ai.conversations.logToolExecution, {
            conversationId,
            organizationId: args.organizationId,
            userId: args.userId,
            toolName: toolCall.function.name,
            parameters: parsedArgs,
            result,
            status: executionStatus,
            tokensUsed: response.usage?.total_tokens || 0,
            costUsd: client.calculateCost(response.usage || { prompt_tokens: 0, completion_tokens: 0 }, model),
            executedAt: Date.now(),
            durationMs,
          });

          toolCalls.push({
            id: toolCall.id,
            name: toolCall.function.name,
            arguments: parsedArgs,
            result,
            status: "success",
          });

          // Add tool result to messages (provider-specific format)
          const toolResultMessage = formatToolResult(
            provider,
            toolCall.id,
            toolCall.function.name,
            result
          );
          messages.push(toolResultMessage as any);
        } catch (error: any) {
          console.error(`[AI Chat] Tool execution failed: ${toolCall.function.name}`, error);

          // Log failed execution (use parsedArgs, not re-parse!)
          await ctx.runMutation(api.ai.conversations.logToolExecution, {
            conversationId,
            organizationId: args.organizationId,
            userId: args.userId,
            toolName: toolCall.function.name,
            parameters: parsedArgs,
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
            arguments: parsedArgs,
            error: error.message,
            status: "failed",
          });

          // Add tool error to messages (provider-specific format)
          // Create a user-friendly error message for feature requests in the user's language
          const isFeatureRequest = error.message.includes("not yet") ||
                                   error.message.includes("coming soon") ||
                                   error.message.includes("placeholder");

          // Get user's preferred language from organization settings
          const userLanguage = detectUserLanguage(settings);

          const userFriendlyError = isFeatureRequest
            ? getFeatureRequestMessage(toolCall.function.name, userLanguage)
            : error.message;

          const toolErrorMessage = formatToolError(
            provider,
            toolCall.id,
            toolCall.function.name,
            userFriendlyError
          );
          messages.push(toolErrorMessage as any);

          // 🚨 SEND FEATURE REQUEST EMAIL TO DEV TEAM
          // This helps prioritize which tools to build next based on actual user needs
          try {
            // Get the original user message from conversation
            const conversation: any = await ctx.runQuery(api.ai.conversations.getConversation, {
              conversationId,
            });
            const userMessages = conversation.messages.filter((m: any) => m.role === "user");
            const lastUserMessage = userMessages[userMessages.length - 1]?.content || args.message;

            // Send feature request email (don't await - fire and forget)
            ctx.runAction(internal.ai.featureRequestEmail.sendFeatureRequest, {
              userId: args.userId,
              organizationId: args.organizationId,
              toolName: toolCall.function.name,
              toolParameters: parsedArgs,
              errorMessage: error.message,
              conversationId,
              userMessage: lastUserMessage,
              aiResponse: undefined, // Will be filled after AI responds
              occurredAt: Date.now(),
            }).catch(emailError => {
              // Don't fail the main flow if email fails
              console.error("[AI Chat] Failed to send feature request email:", emailError);
            });

            console.log(`[AI Chat] Feature request email triggered for failed tool: ${toolCall.function.name}`);
          } catch (emailError) {
            // Don't fail the main flow if email system fails
            console.error("[AI Chat] Error in feature request email system:", emailError);
          }
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
