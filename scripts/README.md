# AI Chat Testing Scripts

Quick command-line testing for AI chat functionality without using the UI.

For operational AI script entrypoints (including ElevenLabs sync/simulation), see `scripts/ai/README.md`.

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

## Schmitt Demo Office Seed

Use this to bootstrap a synthetic `Schmitt & Partner` law-office demo org with:
- org-level telephony binding preflight seed (provider + from number + webhook secret)
- Clara/Jonas/Maren telephony template deployment
- optional Kanzlei MVP single-agent deployment
- synthetic CRM organizations + leads (idempotent by demo seed keys)

```bash
# Show options
npx tsx scripts/seed-schmitt-partner-demo-office.ts --help

# Fast signup-mode bootstrap
npx tsx scripts/seed-schmitt-partner-demo-office.ts --mode signup

# Force a fake/no-provider-coupling telephony binding for demo-only runs
npx tsx scripts/seed-schmitt-partner-demo-office.ts \
  --mode signup \
  --telephony-provider custom_sip

# Reuse an existing org
npx tsx scripts/seed-schmitt-partner-demo-office.ts \
  --mode existing \
  --session-id <SESSION_ID> \
  --organization-id <ORG_ID>
```

Telephony binding behavior:
- By default, the script seeds org telephony binding before template deployment via `integrations.telephony.saveOrganizationTelephonySettings`.
- If `--telephony-from-number` is not provided, it falls back to `SCHMITT_DEMO_TELEPHONY_FROM_NUMBER`, then `DEMO_TELEPHONY_FROM_NUMBER`, then the fixture number.
- If `--telephony-webhook-secret` is not provided, it falls back to `SCHMITT_DEMO_TELEPHONY_WEBHOOK_SECRET`, then `DEMO_TELEPHONY_WEBHOOK_SECRET`, then a deterministic demo secret derived from `--suffix`.
- Disable auto-binding only if you manage it externally: `--skip-telephony-binding`.
- Core-wedge deploy is dependency-aware and fail-soft: if transfer-role prerequisites are missing in your environment, the script records a `coreWedge.status = "blocked"` warning in the JSON summary and continues with Kanzlei MVP + synthetic CRM seeding.

## Hub-GW OIDC Token Exchange Smoke

Use this to run a deterministic frontend OIDC bridge test end-to-end:
- starts a transaction via Convex `/api/v1/frontend-oidc/start`
- opens provider login in Playwright
- captures `code/state` at callback before NextAuth consumes it
- posts callback to Convex `/api/v1/frontend-oidc/callback`

```bash
# interactive browser (recommended)
npx tsx scripts/hub-gw-oidc-token-exchange-smoke.ts \
  --app-url https://sevenlayers.ngrok.pizza \
  --provider-id gruendungswerft \
  --convex-base-url https://aromatic-akita-723.convex.site

# show options
npx tsx scripts/hub-gw-oidc-token-exchange-smoke.ts --help
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
