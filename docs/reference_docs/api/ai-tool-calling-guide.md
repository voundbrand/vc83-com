# AI Tool Calling Guide - OpenRouter/Anthropic via Amazon Bedrock

## Overview

This guide documents how tool calling works with Anthropic models through OpenRouter, which routes through Amazon Bedrock. This setup requires special handling for tool results.

## Key Learnings

### Tool ID Format Detection

**Problem**: Anthropic models via Amazon Bedrock use a different tool ID format than OpenAI.

**Solution**: Detect tool ID format and adjust message structure accordingly.

```typescript
// Anthropic tool IDs start with "toolu_bdrk_" or "toolu_"
const isAnthropicToolId = toolCallId.startsWith("toolu_");

if (isAnthropicToolId) {
  // Use "user" role with string content
  return {
    role: "user",
    content: JSON.stringify(result)
  };
} else {
  // Use "tool" role with tool_call_id
  return {
    role: "tool",
    content: JSON.stringify(result),
    tool_call_id: toolCallId,
    name: toolName
  };
}
```

### Tool Arguments Parsing

**Problem**: AI sometimes sends invalid JSON like `"undefined"`, `""`, or `"null"` as tool arguments.

**Solution**: Safely parse arguments with fallback to empty object.

```typescript
let parsedArgs = {};
try {
  const argsString = toolCall.function.arguments || "{}";
  if (argsString === "undefined" || argsString === "" || argsString === "null") {
    parsedArgs = {};
  } else {
    parsedArgs = JSON.parse(argsString);
  }
} catch (parseError) {
  console.error(`Failed to parse tool arguments:`, toolCall.function.arguments);
  parsedArgs = {}; // Use empty object if parsing fails
}
```

### System Prompt for Tool Control

**Problem**: AI calls tools for simple greetings or questions.

**Solution**: Explicitly instruct AI when to use tools.

```
Guidelines:
1. ONLY use tools when the user explicitly asks for an action
2. For simple greetings or questions, respond conversationally WITHOUT tools
3. Examples:
   - "Hello" → Just greet (NO TOOLS)
   - "What can you do?" → Explain (NO TOOLS)
   - "List my forms" → Use list_forms tool
```

## Testing Workflow

### 1. Test Simple Conversation (No Tools)
```bash
npx tsx scripts/test-ai-chat.ts "Hello, test the chat"
```

**Expected**: Friendly response without tool calls.

### 2. Test Simple Tool Execution
```bash
npx tsx scripts/test-ai-chat.ts "List my forms"
```

**Expected**:
- ✅ Calls `list_forms` tool
- ✅ Handles empty/undefined arguments
- ✅ Tool result accepted by OpenRouter
- ✅ AI responds with form information

### 3. Test Tool with Parameters
```bash
npx tsx scripts/test-ai-chat.ts "Search for contacts named John"
```

**Expected**:
- ✅ Calls `search_contacts` with `{query: "John"}`
- ✅ Tool executes successfully
- ✅ AI responds with contact information

### 4. Test CRM Tools
```bash
# Contact Sync
npx tsx scripts/test-ai-chat.ts "Sync my Microsoft contacts"

# Bulk Email
npx tsx scripts/test-ai-chat.ts "Send email to VIP segment with subject 'Hello' and message 'Welcome'"
```

**Expected**:
- ✅ Tool parameters extracted correctly
- ⚠️ May show auth errors (expected in CLI)
- ✅ Message flow completes successfully

## Debugging Tool Issues

### Check Tool Call ID Format
Look for the tool ID in error logs:
```
tool_call_id: 'toolu_bdrk_01...'  → Anthropic format, use "user" role
tool_call_id: 'call_abc123...'     → OpenAI format, use "tool" role
```

### Check Tool Arguments
Log the raw arguments:
```typescript
console.log("Raw arguments:", toolCall.function.arguments);
```

Common issues:
- `"undefined"` string instead of `{}`
- Missing required parameters
- Invalid JSON structure

### Check OpenRouter Response
OpenRouter errors show which format was expected:
```
400 Bad Request → Wrong message structure
500 Internal Server Error → Bedrock routing issue
```

## Tool Registry

All tools are defined in `/convex/ai/tools/registry.ts`:

1. **create_form** - Create new forms
2. **create_event** - Create events
3. **search_contacts** - Search CRM contacts
4. **list_forms** - List all forms
5. **list_events** - List all events
6. **sync_contacts** - Sync from Microsoft/Google
7. **send_bulk_crm_email** - Send bulk personalized emails

## Common Patterns

### Tool with Required Parameters
```typescript
{
  name: "search_contacts",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" }
    },
    required: ["query"]
  }
}
```

### Tool with Optional Parameters
```typescript
{
  name: "list_forms",
  parameters: {
    type: "object",
    properties: {
      limit: { type: "number", default: 20 },
      status: { type: "string", enum: ["active", "inactive", "all"], default: "all" }
    }
    // No required array - all parameters optional
  }
}
```

## Next Steps

- [ ] Test all tools systematically
- [ ] Document any tool-specific quirks
- [ ] Add integration tests
- [ ] Implement actual tool execution (currently placeholders)
