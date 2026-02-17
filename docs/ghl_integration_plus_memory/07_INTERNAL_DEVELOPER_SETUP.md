# INTERNAL ONLY: Developer Setup Guide

**⚠️ IMPORTANT: This document is for INTERNAL team use only. This is proprietary software and source code access is NOT provided to customers.**

**Last Updated:** 2025-02-05
**Prerequisites:** Node.js 18+, npm/pnpm, Convex account

---

## Local Development Setup

### **1. Clone and Install**

```bash
# Clone repository
cd /Users/foundbrand_001/Development/vc83-com

# Install dependencies (if not already)
npm install

# Start Convex dev server
npx convex dev
```

### **2. Environment Variables**

Create `.env.local` if not exists:

```bash
# OpenRouter API (for LLM calls)
OPENROUTER_API_KEY=sk-or-v1-xxxxx

# Convex
CONVEX_DEPLOYMENT=dev:your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Optional: For testing GHL webhooks locally
NGROK_AUTH_TOKEN=your_ngrok_token
```

### **3. Convex Schema Migration**

Add new tables to schema:

```bash
# convex/schemas/memorySchemas.ts
# convex/schemas/ghlSchemas.ts (if needed)

# Push schema changes
npx convex dev --once
# or
npx convex deploy --push-schema
```

### **4. Test GHL Integration Locally**

**Option A: Use ngrok for webhooks**

```bash
# Terminal 1: Start Next.js dev server
npm run dev

# Terminal 2: Start ngrok tunnel
ngrok http 3000

# Copy ngrok URL (e.g., https://abc123.ngrok.io)
# Configure in GHL webhook settings:
# URL: https://abc123.ngrok.io/api/webhooks/ghl
# Header: X-API-Key: {your_test_api_key}
```

**Option B: Use mock webhooks**

```bash
# Create test script: scripts/test-ghl-webhook.js
node scripts/test-ghl-webhook.js
```

---

## File Structure

### **New Files to Create**

```
convex/
├── integrations/
│   └── gohighlevel.ts          # GHL provider implementation
├── channels/
│   └── webhooks.ts             # Add processGHLWebhook action
├── ai/
│   ├── memoryEngine.ts         # Memory engine core logic
│   └── memoryHelpers.ts        # Helper functions
├── schemas/
│   ├── memorySchemas.ts        # Memory snapshot schemas
│   └── ghlSchemas.ts           # GHL-specific schemas (if needed)
└── http.ts                     # Add /webhooks/ghl route

src/
├── components/
│   └── window-content/
│       └── integrations-window/
│           └── ghl-settings.tsx   # Settings UI
├── hooks/
│   └── useGHLIntegration.ts       # React hooks for GHL
└── lib/
    └── ghl-api.ts                 # GHL API client (optional)
```

---

## Step-by-Step Implementation

### **Step 1: Create GHL Provider**

**File:** `convex/integrations/gohighlevel.ts`

```typescript
import { ChannelProvider } from "../channels/types";

export const ghlProvider: ChannelProvider = {
  id: "gohighlevel",
  name: "GoHighLevel",

  capabilities: {
    supportedChannels: ["sms", "email", "whatsapp", "facebook_messenger"],
    supportsInbound: true,
    supportsOutbound: true,
    supportsWebhooks: true,
    supportsAttachments: false,
    supportsTemplates: true,
    supportsConversationThreading: true,
  },

  normalizeInbound(rawPayload, credentials) {
    // Implementation from 03_GHL_API_INTEGRATION.md
  },

  async sendMessage(credentials, message) {
    // Implementation from 03_GHL_API_INTEGRATION.md
  },

  verifyWebhook(body, headers, credentials) {
    // Implementation from 03_GHL_API_INTEGRATION.md
  },

  async testConnection(credentials) {
    // Implementation from 03_GHL_API_INTEGRATION.md
  },
};

// Register provider
import { registerProvider } from "../channels/registry";
registerProvider(ghlProvider);
```

**Test:**
```bash
# Run unit tests
npm test -- gohighlevel.test.ts
```

### **Step 2: Add Webhook Route**

**File:** `convex/http.ts`

```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// ... existing routes ...

// GHL Webhook Handler
http.route({
  path: "/webhooks/ghl",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Implementation from 03_GHL_API_INTEGRATION.md
  }),
});

export default http;
```

**Test:**
```bash
# Send test webhook locally
curl -X POST http://localhost:3000/api/webhooks/ghl \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test_api_key" \
  -H "X-LC-Signature: test_signature" \
  -d '{"type":"InboundMessage","body":"Test message"}'
```

### **Step 3: Create Memory Engine**

**File:** `convex/ai/memoryEngine.ts`

```typescript
import { internalQuery, internalAction, internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const buildMemoryContext = internalQuery({
  args: {
    sessionId: v.id("agentSessions"),
    crmContactId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    // Implementation from docs/platform/MEMORY_ENGINE_DESIGN.md
  },
});

export const generateSessionSummary = internalAction({
  args: { sessionId: v.id("agentSessions") },
  handler: async (ctx, args) => {
    // Implementation from docs/platform/MEMORY_ENGINE_DESIGN.md
  },
});

export const extractContactFacts = internalAction({
  args: {
    sessionId: v.id("agentSessions"),
    crmContactId: v.id("objects"),
    conversationContent: v.string(),
  },
  handler: async (ctx, args) => {
    // Implementation from docs/platform/MEMORY_ENGINE_DESIGN.md
  },
});
```

**Test:**
```bash
# Create test conversation
npm run test:memory-engine
```

### **Step 4: Integrate Memory into Agent Pipeline**

**File:** `convex/ai/agentExecution.ts`

```typescript
// Add to processInboundMessage action

// ... existing code ...

// NEW: Step 5 - Build memory context
const memoryContext = await ctx.runQuery(
  internal.ai.memoryEngine.buildMemoryContext,
  {
    sessionId: session._id,
    crmContactId: session.crmContactId,
  }
);

// Step 6: Build system prompt (inject memory context)
const systemPrompt = buildAgentSystemPrompt(config, knowledgeBaseDocs, interviewContext)
  + "\n\n"
  + memoryContext.contextText;

// ... rest of pipeline ...

// NEW: Step 10 - Update memory after response
if (shouldExtractFacts(assistantContent)) {
  await ctx.runAction(internal.ai.memoryEngine.extractContactFacts, {
    sessionId: session._id,
    crmContactId: session.crmContactId!,
    conversationContent: assistantContent,
  });
}

// Check if summarization needed
const needsSummary = await ctx.runQuery(
  internal.ai.memoryEngine.checkSummarizationNeeded,
  { sessionId: session._id }
);

if (needsSummary) {
  // Schedule async (don't block response)
  ctx.scheduler.runAfter(
    5 * 60 * 1000,
    internal.ai.memoryEngine.generateSessionSummary,
    { sessionId: session._id }
  );
}
```

### **Step 5: Create Settings UI**

**File:** `src/components/window-content/integrations-window/ghl-settings.tsx`

```typescript
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function GHLSettings({ organizationId }: { organizationId: string }) {
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  const settings = useQuery(api.integrations.ghl.getSettings, { organizationId });
  const saveSettings = useMutation(api.integrations.ghl.saveSettings);
  const testConnection = useMutation(api.integrations.ghl.testConnection);

  const handleSave = async () => {
    await saveSettings({
      organizationId,
      ghlApiKey: apiKey,
      webhookSecret,
    });
  };

  const handleTest = async () => {
    const result = await testConnection({ organizationId });
    if (result.success) {
      alert(`Connected to: ${result.accountName}`);
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">GoHighLevel Integration</h2>

      {/* API Key Section */}
      <div>
        <label className="block text-sm font-medium mb-2">
          GHL API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          placeholder="sk_live_..."
        />
        <p className="text-xs text-gray-500 mt-1">
          Generate from GHL Settings → API → Create API Key
        </p>
      </div>

      {/* Webhook Secret Section */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Webhook Secret
        </label>
        <input
          type="password"
          value={webhookSecret}
          onChange={(e) => setWebhookSecret(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          placeholder="whsec_..."
        />
        <p className="text-xs text-gray-500 mt-1">
          From GHL webhook configuration
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={handleTest}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test Connection
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Save Settings
        </button>
      </div>

      {/* Status */}
      {settings?.enabled && (
        <div className="p-4 bg-green-50 border border-green-200 rounded">
          ✅ Connected to GHL
        </div>
      )}
    </div>
  );
}
```

---

## Testing Strategy

### **Unit Tests**

**File:** `convex/integrations/gohighlevel.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { ghlProvider } from "./gohighlevel";

describe("GHL Provider", () => {
  it("should normalize inbound SMS webhook", () => {
    const webhook = {
      type: "InboundMessage",
      messageType: "SMS",
      body: "Test message",
      contactId: "contact_123",
    };

    const result = ghlProvider.normalizeInbound(webhook, {
      organizationId: "org_test",
    });

    expect(result).not.toBeNull();
    expect(result?.channel).toBe("sms");
    expect(result?.message).toBe("Test message");
  });

  it("should verify webhook signature", () => {
    const body = '{"type":"InboundMessage"}';
    const secret = "test_secret";
    const signature = createHmac("sha256", secret).update(body).digest("hex");

    const isValid = ghlProvider.verifyWebhook(
      body,
      { "x-lc-signature": signature },
      { webhookSecret: secret }
    );

    expect(isValid).toBe(true);
  });
});
```

### **Integration Tests**

**File:** `scripts/test-ghl-integration.ts`

```typescript
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.CONVEX_URL!);

async function testGHLIntegration() {
  console.log("Testing GHL Integration...");

  // 1. Test webhook processing
  const webhookResult = await fetch("http://localhost:3000/api/webhooks/ghl", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": "test_key",
    },
    body: JSON.stringify({
      type: "InboundMessage",
      messageType: "SMS",
      body: "Test message",
      contactId: "contact_test",
    }),
  });

  console.log("Webhook status:", webhookResult.status);

  // 2. Wait for processing
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 3. Check if agent responded
  // ... verify response logic ...

  console.log("✅ Integration test passed!");
}

testGHLIntegration();
```

**Run:**
```bash
npm run test:ghl-integration
```

### **Manual Testing Checklist**

```
[ ] Set up test GHL sub-account
[ ] Configure API key in settings
[ ] Configure webhook in GHL
[ ] Send test SMS from GHL
[ ] Verify webhook received (check logs)
[ ] Verify agent responded (check GHL inbox)
[ ] Test memory layers (send 15+ messages)
[ ] Verify summarization triggered
[ ] Verify fact extraction working
[ ] Test reactivation (wait 7+ days or mock)
[ ] Test contact sync (update in GHL, verify in l4yercak3)
[ ] Test error handling (invalid API key, rate limit)
```

---

## Debugging Tips

### **1. Webhook Not Received**

```bash
# Check Convex logs
npx convex logs --tail

# Check ngrok traffic
# Visit: http://127.0.0.1:4040 (ngrok dashboard)

# Test webhook signature locally
node scripts/verify-signature.js
```

### **2. Memory Engine Not Working**

```bash
# Check if memory context being built
console.log("[Memory]", memoryContext);

# Check token usage
console.log("[Tokens]", memoryContext.tokensEstimate);

# Check if layers included
console.log("[Layers]", memoryContext.layersUsed);
```

### **3. LLM API Errors**

```bash
# Check OpenRouter API key
echo $OPENROUTER_API_KEY

# Test API directly
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"anthropic/claude-sonnet-4-20250514","messages":[{"role":"user","content":"test"}]}'
```

### **4. Database Issues**

```bash
# Check if tables exist
npx convex run debug:listTables

# Check if data inserted
npx convex run debug:countRecords --table agentSessions

# Clear test data
npx convex run debug:clearTestData --prefix "test_"
```

---

## Deployment

### **Production Deployment**

```bash
# 1. Deploy Convex functions
npx convex deploy --prod

# 2. Set production environment variables
npx convex env set OPENROUTER_API_KEY "sk-or-v1-prod-xxxxx" --prod

# 3. Deploy Next.js app
vercel --prod

# 4. Update GHL webhook URL
# Change from: https://abc123.ngrok.io/api/webhooks/ghl
# To: https://app.l4yercak3.com/api/webhooks/ghl
```

### **Monitoring**

```bash
# Watch Convex logs
npx convex logs --tail --prod

# Check error rate
npx convex dashboard --prod
# Navigate to: Functions → agentExecution.processInboundMessage
# Look at: Error rate, latency, invocations

# Set up alerts (Sentry, LogRocket, etc.)
```

---

## Troubleshooting Common Issues

### **Issue: "API key not configured"**

**Solution:**
```bash
# Check environment variable
echo $OPENROUTER_API_KEY

# If missing, add to .env.local
echo 'OPENROUTER_API_KEY=sk-or-v1-xxxxx' >> .env.local

# Restart dev server
npm run dev
```

### **Issue: "Webhook signature verification failed"**

**Solution:**
```typescript
// Add debug logging
console.log("Received signature:", headers["x-lc-signature"]);
console.log("Expected signature:", expectedSignature);
console.log("Body:", body);

// Verify secret is correct
const settings = await ctx.runQuery(internal.integrations.ghl.getSettings, {
  organizationId,
});
console.log("Webhook secret:", settings.webhookSecret);
```

### **Issue: "Memory context too large (token overflow)"**

**Solution:**
```typescript
// Implement dynamic layer prioritization
if (tokensUsed > MAX_TOKENS) {
  // Truncate recent context
  layer1 = truncateToTokenLimit(layer1, MAX_TOKENS * 0.6);

  // Drop session summary if needed
  if (tokensUsed > MAX_TOKENS * 0.8) {
    layer2 = "";
  }
}
```

---

## Useful Commands

```bash
# Start development
npm run dev
npx convex dev

# Run tests
npm test
npm run test:integration

# Check types
npm run typecheck

# Lint code
npm run lint

# Deploy
npm run deploy

# View logs
npx convex logs --tail

# Database queries (dev mode)
npx convex run debug:query --table agentSessions
npx convex run debug:count --table agentSessionMessages

# Clear cache
npx convex clear-cache
```

---

## Additional Resources

**Convex Documentation:**
- https://docs.convex.dev

**GHL API Documentation:**
- https://highlevel.stoplight.io

**OpenRouter API:**
- https://openrouter.ai/docs

**Next.js Documentation:**
- https://nextjs.org/docs

---

**Congratulations!** You now have everything you need to build, test, and deploy the GHL Memory Engine integration.

If you encounter issues not covered here, check the GitHub issues or reach out to the team on Slack.
