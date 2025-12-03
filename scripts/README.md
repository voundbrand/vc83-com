# AI Chat Testing Scripts

Quick command-line testing for AI chat functionality without using the UI.

## Setup

1. **Get your test IDs** from the Convex dashboard:
   ```bash
   # Go to https://dashboard.convex.dev
   # → Select your project
   # → Data tab
   # → Find your user ID in 'users' table
   # → Find your org ID in 'organizations' table
   ```

2. **Add to `.env.local`**:
   ```bash
   TEST_ORG_ID=your_org_id_here
   TEST_USER_ID=your_user_id_here
   ```

## Usage

### Test AI Chat
```bash
# Simple message
npx tsx scripts/test-ai-chat.ts "Hello, how are you?"

# Test with different model
TEST_MODEL=openai/gpt-4o npx tsx scripts/test-ai-chat.ts "What's the weather?"

# Test tool calling
npx tsx scripts/test-ai-chat.ts "What forms do we have?"
npx tsx scripts/test-ai-chat.ts "Search for contacts named John"
```

### Output Example
```
🤖 AI Chat CLI Test
==================
Message: What forms do we have?
Model: anthropic/claude-3-5-sonnet

📤 Sending message to AI...

✅ Response received!
==================

🤖 Assistant: Here are the forms in your organization...

🔧 Tool Calls:
==============

📍 list_forms (round 1)
   Arguments: {}
   ✅ Result: { "forms": [...] }

📊 Usage:
=========
Tokens: 1234
Cost: $0.004567
Conversation ID: j57abc...
```

## Benefits

✅ **Fast iteration** - No UI, no production deploy
✅ **Direct testing** - Test AI and tools immediately
✅ **Debug output** - See exactly what's happening
✅ **Model switching** - Test different models easily
✅ **Works in dev** - Use with `npx convex dev`

## Development Workflow

```bash
# Terminal 1: Run Convex dev server
npx convex dev

# Terminal 2: Test your changes
npx tsx scripts/test-ai-chat.ts "test message"
```

## Environment Variables

- `NEXT_PUBLIC_CONVEX_URL` - Your Convex deployment URL (auto-loaded from .env.local)
- `TEST_ORG_ID` - Your organization ID for testing
- `TEST_USER_ID` - Your user ID for testing
- `TEST_MODEL` - Override default model (optional)

## Testing Tool Execution

The script shows detailed tool execution info:

```bash
# Test contact sync (will show tool call even if it needs Microsoft auth)
npx tsx scripts/test-ai-chat.ts "sync my Microsoft contacts"

# Test bulk email (will show what parameters AI extracted)
npx tsx scripts/test-ai-chat.ts "send an email to all contacts in segment 'VIP'"
```

## Tips

- Start with simple messages to verify the fix works
- Then test tool calling to see the full workflow
- Check the tool result format in the output
- If you get auth errors for Microsoft tools, that's expected in CLI - we're just testing the message flow
