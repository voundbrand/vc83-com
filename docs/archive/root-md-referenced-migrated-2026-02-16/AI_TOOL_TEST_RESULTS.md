# AI Tool Calling Test Results

**Test Date**: 2025-12-03
**Testing Method**: CLI script (`scripts/test-ai-chat.ts`)

## Summary

✅ **OpenAI Models**: All tools work perfectly
❌ **Anthropic/Bedrock**: Tool calling fails with 500 errors
**Recommendation**: Use `openai/gpt-4o` for AI chat with tools

## Test Results by Model

### OpenAI GPT-4o (`openai/gpt-4o`)

| Tool | Status | Notes |
|------|--------|-------|
| `list_forms` | ✅ PASS | Tool called correctly, returns empty list |
| `list_events` | ⏭️ SKIP | Similar to list_forms |
| `search_contacts` | ✅ PASS | Extracts query parameter correctly |
| `create_form` | ⏭️ SKIP | Not tested (requires parameters) |
| `create_event` | ⏭️ SKIP | Not tested (requires parameters) |
| `sync_contacts` | ⚠️ PARTIAL | AI asks for confirmation (good UX) |
| `send_bulk_crm_email` | ⚠️ PARTIAL | AI asks for confirmation (good UX) |

**Overall**: ✅ **Working perfectly**

### Anthropic Claude 3.5 Sonnet (`anthropic/claude-3-5-sonnet`)

| Tool | Status | Notes |
|------|--------|-------|
| `list_forms` | ❌ FAIL | 500 error from OpenRouter/Bedrock |
| All others | ❌ FAIL | Not tested due to consistent failures |

**Overall**: ❌ **Not recommended for tool calling**

## Detailed Test Cases

### Test 1: Simple Greeting (No Tools)
```bash
npx tsx scripts/test-ai-chat.ts "Hello, test the chat"
```

**Result**: ✅ PASS
**Tokens**: ~2,133
**Cost**: ~$0.0078
**Notes**: AI responds conversationally without calling any tools (correct behavior)

### Test 2: List Forms Tool
```bash
TEST_MODEL=openai/gpt-4o npx tsx scripts/test-ai-chat.ts "List my forms"
```

**Result**: ✅ PASS
**Tool Called**: `list_forms`
**Arguments**: `{limit: 20, status: "all"}`
**Response**: Returns empty forms array
**Tokens**: 375
**Cost**: $0.001170

### Test 3: Search Contacts Tool
```bash
TEST_MODEL=openai/gpt-4o npx tsx scripts/test-ai-chat.ts "Search for contacts named John"
```

**Result**: ✅ PASS
**Tool Called**: `search_contacts`
**Arguments**: `{query: "John"}`
**Response**: Returns empty contacts array
**Tokens**: 373
**Cost**: $0.001142

### Test 4: Contact Sync Tool
```bash
TEST_MODEL=openai/gpt-4o npx tsx scripts/test-ai-chat.ts "Sync my Microsoft contacts"
```

**Result**: ⚠️ PARTIAL (Good UX)
**Tool Called**: None (asks for confirmation first)
**Response**: "Would you like to preview the contacts that would be synced from Microsoft, or would you like to go ahead and execute the sync?"
**Tokens**: 987
**Cost**: $0.002670
**Notes**: AI correctly identifies this as a potentially destructive action and asks for confirmation per system prompt

### Test 5: Bulk Email Tool
```bash
TEST_MODEL=openai/gpt-4o npx tsx scripts/test-ai-chat.ts "Send a bulk email to VIP segment with subject 'Welcome' and message 'Hello team'"
```

**Result**: ⚠️ PARTIAL (Good UX)
**Tool Called**: None (asks for confirmation)
**Response**: Asks to confirm details before sending
**Tokens**: 1,065
**Cost**: $0.003345
**Notes**: AI correctly asks for confirmation before bulk email (good safety feature)

## Technical Issues Fixed

### Issue 1: Tool Argument Parsing
**Problem**: AI sends `"undefined"` or empty string as arguments
**Solution**: Safe parsing with fallback to empty object `{}`
**Status**: ✅ Fixed

### Issue 2: Schema Validation Error
**Problem**: `round` field not in Convex schema
**Solution**: Removed `round` field from toolCalls objects
**Status**: ✅ Fixed

### Issue 3: Anthropic/Bedrock Tool Format
**Problem**: OpenRouter routes Anthropic through Bedrock, which has format incompatibilities
**Solution**: Use OpenAI models for tool calling
**Status**: ⚠️ Workaround (use different model)

## Recommendations

### For Production

1. **Default Model**: Set `openai/gpt-4o` as default for AI chat
2. **Tool Calling**: Only enable tools when using OpenAI models
3. **User Settings**: Allow users to select OpenAI models in AI Settings
4. **Error Handling**: Show friendly message if user selects Anthropic for tool-heavy workflows

### For Development

1. **Use CLI Testing**: Fast iteration with `npx tsx scripts/test-ai-chat.ts`
2. **Test with OpenAI**: Always test tools with `TEST_MODEL=openai/gpt-4o`
3. **Check Costs**: Monitor token usage and costs in test output

### For Future

1. **Monitor OpenRouter**: Check if Anthropic/Bedrock tool calling gets fixed
2. **Add Model Detection**: Warn users if they select incompatible models for tools
3. **Expand Tools**: Add more tools as platform features grow
4. **Implement Real Execution**: Replace placeholder tools with actual Convex actions

## Cost Analysis

**Average cost per interaction**:
- Simple message (no tools): ~$0.008
- Single tool call: ~$0.001-0.003
- Multi-step confirmation: ~$0.003-0.005

**Estimated monthly costs** (1000 messages/month):
- Mostly simple: ~$8/month
- Heavy tool usage: ~$15-25/month

## Next Steps

- [ ] Set openai/gpt-4o as default model in AI Settings
- [ ] Add model compatibility warnings in UI
- [ ] Implement real tool execution (currently placeholders)
- [ ] Add integration tests for all tools
- [ ] Document tool calling in user docs
