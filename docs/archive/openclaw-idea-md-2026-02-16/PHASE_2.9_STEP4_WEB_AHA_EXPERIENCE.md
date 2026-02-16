# Phase 2.9 Step 4: Web-Based "Aha" Experience — Try AI Without Login

## Goal

Let visitors experience the AI agent system on the landing page without creating an account, connecting APIs, or installing Telegram. A webchat widget on the marketing site runs the same onboarding interview flow — 5 questions, 2 minutes — then generates a live agent they can talk to immediately. When they want to do real work (connect channels, manage CRM, etc.), we transition them to account creation.

This is the **growth lever** — every visitor who talks to the widget becomes a potential customer, and they've already experienced the product before they decide.

## Depends On

- Phase 2.9 Step 1 (Production Bridge) — agent pipeline works without external processes
- Phase 2.5 (Telegram Onboarding) — interview flow, soul generation, org bootstrap
- Phase 2.9 Step 2 (Agent Management UI) — authenticated users land here after conversion

## What Already Exists

| Component | Status | Location |
|---|---|---|
| Agent execution pipeline | Done | `convex/ai/agentExecution.ts` |
| Interview runner (guided mode) | Done | `convex/ai/interviewRunner.ts` |
| Soul generator (from interview data) | Done | `convex/ai/soulGenerator.ts` |
| Org bootstrap (create org, seed credits) | Done | `convex/onboarding/orgBootstrap.ts` |
| Complete onboarding action (interview → org → agent) | Done | `convex/onboarding/completeOnboarding.ts` |
| System Bot agent (platform org) | Done | `convex/agentOntology.ts` (on platform org) |
| `processInboundMessage` supports `channel: "webchat"` | Done | `convex/ai/agentExecution.ts` |
| Telegram-based onboarding flow | Done | `scripts/telegram-bridge.ts` + resolver |
| Credit seeding for new orgs | Done | `convex/credits/` |

## What's Missing

### 1. Anonymous Session Support

`processInboundMessage` requires an `organizationId`. For anonymous visitors, we need a lightweight session that routes to the System Bot without requiring authentication.

### 2. Webchat Widget Component

No embeddable chat component exists. Need a floating chat bubble that opens into a conversation panel.

### 3. Anonymous → Authenticated Transition

After the interview creates an org and agent, the visitor needs to be prompted to create an account to "claim" their agent. The org exists in the DB but has no owner until they sign up.

### 4. Rate Limiting for Anonymous

Without auth, the widget is vulnerable to abuse. Need per-IP or per-session rate limiting.

### 5. Session Persistence

If a visitor closes the tab and returns, they should be able to resume their conversation (using a session token in localStorage).

## Architecture

```
VISITOR JOURNEY:

┌─────────────────────────────────────────────────────────────────┐
│  LANDING PAGE                                                    │
│                                                                  │
│  ┌─────────────────────────────────────────────────┐            │
│  │                                                   │            │
│  │   "Turn your business into an AI agent            │            │
│  │    in 2 minutes. Try it now."                     │            │
│  │                                                   │            │
│  └─────────────────────────────────────────────────┘            │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 💬 Chat Widget (bottom-right)                                ││
│  │                                                               ││
│  │  System Bot: Hey! I'm going to help you set up               ││
│  │    your own AI agent. Takes about 2 minutes.                 ││
│  │    What's the name of your business?                         ││
│  │                                                               ││
│  │  You: Segelschule am Stettiner Haff                          ││
│  │                                                               ││
│  │  System Bot: Nice! A sailing school.                         ││
│  │    What industry is that?                                    ││
│  │                                                               ││
│  │  [... 3 more questions ...]                                  ││
│  │                                                               ││
│  │  System Bot: Creating your agent now...                      ││
│  │                                                               ││
│  │  System Bot: Done! Meet Haff, your AI agent.                 ││
│  │    Try asking something a customer would ask!                ││
│  │                                                               ││
│  │  ┌─────────────────────────────────────────────────────────┐ ││
│  │  │ 🎉 Your agent is ready!                                 │ ││
│  │  │ Create an account to keep it.                           │ ││
│  │  │ [Sign Up Free] [Continue Chatting]                      │ ││
│  │  └─────────────────────────────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Anonymous visitor opens chat widget
    │
    ▼
Create anonymous webchat session
    │  → Generate sessionToken (UUID)
    │  → Store in localStorage
    │  → Route to System Bot (platform org)
    │
    ▼
System Bot runs onboarding interview
    │  → Same interview template as Telegram
    │  → 5 questions, ~2 minutes
    │  → Extracts business context
    │
    ▼
Interview complete → completeOnboarding()
    │  → Create org (no owner yet)
    │  → Generate soul
    │  → Bootstrap agent
    │  → Seed credits
    │  → Update session: route to new agent
    │
    ▼
Visitor talks to THEIR agent
    │  → Same pipeline as Telegram/WhatsApp
    │  → Agent uses generated soul
    │  → Full tool access (query data, etc.)
    │
    ▼
CTA: "Sign up to keep your agent"
    │
    ├── [Sign Up] → Auth flow → claim org → redirect to /agents
    └── [Continue] → Keep chatting (limited by anonymous credit cap)
```

## Implementation

### 1. Anonymous Session Backend

**New file:** `convex/onboarding/webchatSession.ts`

```typescript
/**
 * WEBCHAT SESSION MANAGER
 *
 * Handles anonymous webchat sessions for the "try before you buy" experience.
 * Creates lightweight sessions that route to the System Bot for onboarding,
 * then switch to the visitor's generated agent post-interview.
 */

/**
 * Create or resume an anonymous webchat session.
 * Returns a session token and the current routing target.
 */
export const getOrCreateWebchatSession = action({
  args: {
    sessionToken: v.optional(v.string()),  // From localStorage (resume)
  },
  handler: async (ctx, args) => {
    const PLATFORM_ORG_ID = getPlatformOrgId();

    // Resume existing session
    if (args.sessionToken) {
      const existing = await (ctx.runQuery as Function)(
        internalApi.onboarding.webchatSession.getByToken,
        { token: args.sessionToken }
      );

      if (existing) {
        return {
          sessionToken: existing.token,
          organizationId: existing.currentOrganizationId,
          status: existing.status,
          agentName: existing.agentName,
        };
      }
    }

    // Create new session
    const token = generateSessionToken();
    await (ctx.runMutation as Function)(
      internalApi.onboarding.webchatSession.create,
      {
        token,
        currentOrganizationId: PLATFORM_ORG_ID,
        status: "onboarding",
        createdAt: Date.now(),
        messageCount: 0,
      }
    );

    return {
      sessionToken: token,
      organizationId: PLATFORM_ORG_ID,
      status: "onboarding",
      agentName: null,
    };
  },
});

/**
 * Send a message in a webchat session.
 * Handles routing, rate limiting, and credit checks.
 */
export const sendWebchatMessage = action({
  args: {
    sessionToken: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Look up session
    const session = await (ctx.runQuery as Function)(
      internalApi.onboarding.webchatSession.getByToken,
      { token: args.sessionToken }
    );

    if (!session) return { error: "Invalid session" };

    // 2. Rate limit check (max 50 messages per anonymous session)
    if (session.messageCount >= 50) {
      return {
        error: "rate_limited",
        message: "You've reached the message limit. Create an account to continue.",
        ctaType: "signup",
      };
    }

    // 3. Process through agent pipeline
    const result = await (ctx.runAction as Function)(
      api.ai.agentExecution.processInboundMessage,
      {
        organizationId: session.currentOrganizationId,
        channel: "webchat",
        externalContactIdentifier: `webchat:${args.sessionToken}`,
        message: args.message,
        metadata: {
          providerId: "webchat",
          source: "landing-page-widget",
          isAnonymous: true,
          webchatSessionToken: args.sessionToken,
        },
      }
    );

    // 4. Increment message count
    await (ctx.runMutation as Function)(
      internalApi.onboarding.webchatSession.incrementMessageCount,
      { token: args.sessionToken }
    );

    // 5. Check if onboarding just completed (session org switched)
    // The completeOnboarding action updates the webchat session when done

    return result;
  },
});

/**
 * Claim an anonymous org by linking it to a newly created user account.
 */
export const claimAnonymousOrg = action({
  args: {
    sessionToken: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const session = await (ctx.runQuery as Function)(
      internalApi.onboarding.webchatSession.getByToken,
      { token: args.sessionToken }
    );

    if (!session || session.status !== "active") {
      return { error: "No claimable org" };
    }

    // Add user as org owner
    await (ctx.runMutation as Function)(
      internalApi.organizations.addOrgMember,
      {
        organizationId: session.currentOrganizationId,
        userId: args.userId,
        role: "owner",
      }
    );

    // Mark session as claimed
    await (ctx.runMutation as Function)(
      internalApi.onboarding.webchatSession.updateStatus,
      { token: args.sessionToken, status: "claimed" }
    );

    return {
      success: true,
      organizationId: session.currentOrganizationId,
    };
  },
});
```

**Schema addition:**

```typescript
// convex/schema.ts
webchatSessions: defineTable({
  token: v.string(),
  currentOrganizationId: v.id("organizations"),
  status: v.union(
    v.literal("onboarding"),   // Talking to System Bot
    v.literal("active"),       // Has generated agent, chatting
    v.literal("claimed"),      // User signed up and claimed the org
    v.literal("expired"),      // Session timed out
  ),
  agentName: v.optional(v.string()),
  messageCount: v.number(),
  createdAt: v.number(),
  lastMessageAt: v.optional(v.number()),
  claimedByUserId: v.optional(v.id("users")),
})
  .index("by_token", ["token"])
  .index("by_status", ["status"]),
```

### 2. Update `completeOnboarding` for Webchat

**File:** `convex/onboarding/completeOnboarding.ts` (extend existing)

When the interview completes via webchat, also update the webchat session:

```typescript
// After org creation + agent bootstrap + credit seeding:

// If this was a webchat session, switch its routing to the new org
if (args.metadata?.webchatSessionToken) {
  await ctx.runMutation(
    internalApi.onboarding.webchatSession.switchOrg,
    {
      token: args.metadata.webchatSessionToken,
      organizationId: orgId,
      agentName: result.soul?.name || "Agent",
      status: "active",
    }
  );
}
```

### 3. Webchat Widget Component

**New file:** `src/components/webchat/webchat-widget.tsx`

```tsx
"use client";

/**
 * WEBCHAT WIDGET
 *
 * Floating chat bubble for the landing page.
 * Anonymous sessions — no login required.
 * Runs onboarding interview → generates agent → user tests it.
 */

interface WebchatWidgetProps {
  /** Position on screen */
  position?: "bottom-right" | "bottom-left";
  /** Auto-open after delay (ms). 0 = don't auto-open */
  autoOpenDelay?: number;
  /** Initial greeting override */
  greeting?: string;
}

export function WebchatWidget({
  position = "bottom-right",
  autoOpenDelay = 5000,
  greeting,
}: WebchatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [showSignupCTA, setShowSignupCTA] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize session on first open
  useEffect(() => {
    if (isOpen && !sessionToken) {
      initSession();
    }
  }, [isOpen]);

  // Auto-open after delay
  useEffect(() => {
    if (autoOpenDelay > 0) {
      const timer = setTimeout(() => setIsOpen(true), autoOpenDelay);
      return () => clearTimeout(timer);
    }
  }, [autoOpenDelay]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function initSession() {
    const stored = localStorage.getItem("webchat_session_token");
    const result = await convexClient.action(
      api.onboarding.webchatSession.getOrCreateWebchatSession,
      { sessionToken: stored || undefined }
    );

    setSessionToken(result.sessionToken);
    localStorage.setItem("webchat_session_token", result.sessionToken);

    if (result.agentName) setAgentName(result.agentName);

    // Show initial greeting
    if (result.status === "onboarding") {
      setMessages([{
        role: "assistant",
        content: greeting || "Hey! I'm going to help you set up your own AI agent. It takes about 2 minutes — just answer a few questions about your business and I'll build you something great.\n\nWhat's the name of your business?",
        agentName: "Setup Assistant",
      }]);
    } else if (result.status === "active" && result.agentName) {
      setMessages([{
        role: "assistant",
        content: `Welcome back! I'm ${result.agentName}, your AI agent. What can I help with?`,
        agentName: result.agentName,
      }]);
    }
  }

  async function handleSend() {
    if (!input.trim() || !sessionToken || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const result = await convexClient.action(
        api.onboarding.webchatSession.sendWebchatMessage,
        { sessionToken, message: userMessage }
      );

      if (result.error === "rate_limited") {
        setShowSignupCTA(true);
        setMessages((prev) => [...prev, {
          role: "system",
          content: result.message,
        }]);
      } else if (result.response) {
        // Check if agent name changed (onboarding completed)
        if (result.agentName && result.agentName !== agentName) {
          setAgentName(result.agentName);
          setShowSignupCTA(true);
        }

        setMessages((prev) => [...prev, {
          role: "assistant",
          content: result.response,
          agentName: result.agentName || agentName || "Assistant",
        }]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, {
        role: "system",
        content: "Something went wrong. Please try again.",
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* Chat bubble button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            "fixed z-50 w-14 h-14 rounded-full bg-emerald-500 text-white shadow-lg",
            "hover:bg-emerald-400 transition-all hover:scale-110",
            "flex items-center justify-center",
            position === "bottom-right" ? "bottom-6 right-6" : "bottom-6 left-6"
          )}
        >
          <MessageCircleIcon className="w-6 h-6" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className={cn(
          "fixed z-50 w-96 h-[500px] rounded-xl shadow-2xl overflow-hidden",
          "bg-zinc-900 border border-zinc-700 flex flex-col",
          position === "bottom-right" ? "bottom-6 right-6" : "bottom-6 left-6"
        )}>
          {/* Header */}
          <div className="px-4 py-3 bg-zinc-800 border-b border-zinc-700 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-zinc-200">
                {agentName || "Setup Assistant"}
              </div>
              <div className="text-xs text-zinc-400">
                {agentName ? "Your AI Agent" : "Let's build your agent"}
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-zinc-200">
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Signup CTA (shows after agent is created) */}
          {showSignupCTA && (
            <div className="px-4 py-2 bg-emerald-900/30 border-t border-emerald-700/50">
              <div className="text-xs text-emerald-300 mb-1">
                Your agent is ready! Create an account to keep it.
              </div>
              <div className="flex gap-2">
                <a href="/signup?claim=true" className="text-xs bg-emerald-500 text-white px-3 py-1 rounded hover:bg-emerald-400">
                  Sign Up Free
                </a>
                <button
                  onClick={() => setShowSignupCTA(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-300"
                >
                  Later
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-zinc-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type a message..."
                className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200
                  placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="bg-emerald-500 text-white rounded-lg px-3 py-2
                  hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SendIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

### 4. Embed Widget on Landing Page

**File:** `src/app/page.tsx` or `src/app/layout.tsx`

```tsx
import { WebchatWidget } from "@/components/webchat/webchat-widget";

// Add to the landing page layout:
<WebchatWidget
  autoOpenDelay={8000}
  greeting="Hey! I'm going to help you create your own AI agent. It takes about 2 minutes. What's the name of your business?"
/>
```

### 5. Signup Claim Flow

**File:** `src/app/signup/page.tsx` (extend existing)

When the URL has `?claim=true`, check localStorage for a webchat session token and claim the org after account creation:

```tsx
useEffect(() => {
  if (searchParams.get("claim") === "true" && user) {
    const token = localStorage.getItem("webchat_session_token");
    if (token) {
      claimOrg(token, user._id);
    }
  }
}, [user]);

async function claimOrg(token: string, userId: string) {
  const result = await convex.action(
    api.onboarding.webchatSession.claimAnonymousOrg,
    { sessionToken: token, userId }
  );

  if (result.success) {
    // Redirect to agent management
    router.push("/agents");
    localStorage.removeItem("webchat_session_token");
  }
}
```

### 6. Session Cleanup Cron

**File:** `convex/crons.ts` (extend existing)

Clean up expired anonymous sessions:

```typescript
// Run daily: expire unclaimed webchat sessions older than 7 days
crons.interval(
  "cleanup-webchat-sessions",
  { hours: 24 },
  internal.onboarding.webchatSession.cleanupExpired,
  { maxAgeDays: 7 }
);
```

```typescript
// convex/onboarding/webchatSession.ts
export const cleanupExpired = internalMutation({
  args: { maxAgeDays: v.number() },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.maxAgeDays * 24 * 60 * 60 * 1000;
    const expired = await ctx.db
      .query("webchatSessions")
      .withIndex("by_status", (q) => q.eq("status", "onboarding"))
      .filter((q) => q.lt(q.field("createdAt"), cutoff))
      .collect();

    for (const session of expired) {
      await ctx.db.patch(session._id, { status: "expired" });
    }

    // Also clean up "active" unclaimed sessions older than 30 days
    const activeCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const activeExpired = await ctx.db
      .query("webchatSessions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .filter((q) => q.lt(q.field("createdAt"), activeCutoff))
      .collect();

    for (const session of activeExpired) {
      await ctx.db.patch(session._id, { status: "expired" });
      // Optionally delete the unclaimed org + agent to free resources
    }

    return { cleaned: expired.length + activeExpired.length };
  },
});
```

## Security & Abuse Prevention

| Risk | Mitigation |
|---|---|
| Spam org creation | Max 3 orgs per IP per day (check via metadata). Sessions rate-limited to 50 messages. |
| Credit drain | Anonymous sessions get 10 credits (not 50). Enough for onboarding + ~20 messages. |
| Bot/scraper abuse | Simple proof-of-work: require minimum 2 seconds between messages. |
| Data harvesting | Anonymous agents have no real data to query — only test/demo data. |
| Session hijacking | Tokens are UUIDs, not guessable. No sensitive data in session. |
| Storage bloat | Cron cleans up unclaimed sessions after 7-30 days. |

## The Full Journey (End-to-End)

```
1. Visitor lands on vc83.com
2. After 8 seconds, chat widget opens with greeting
3. System Bot asks 5 questions about their business (2 min)
4. Soul generated → agent bootstrapped → session switches to new agent
5. Visitor talks to their own agent — tests questions, adjusts tone
6. CTA appears: "Sign up to keep your agent"
7. Visitor clicks "Sign Up Free" → auth flow
8. On signup complete, org is claimed → redirect to /agents dashboard
9. Visitor is now a customer with a configured agent

Time from landing to "wow": ~3 minutes
Time from landing to customer: ~5 minutes
```

## Files Summary

| File | Change | Risk |
|---|---|---|
| `convex/onboarding/webchatSession.ts` | **New** — session manager, send, claim, cleanup | Low |
| `convex/schema.ts` | Add `webchatSessions` table | Low |
| `convex/onboarding/completeOnboarding.ts` | Switch webchat session org on interview completion | Low |
| `convex/crons.ts` | Add session cleanup cron | Low |
| `src/components/webchat/webchat-widget.tsx` | **New** — floating chat widget | None (new component) |
| `src/components/webchat/message-bubble.tsx` | **New** — message display component | None |
| `src/components/webchat/typing-indicator.tsx` | **New** — loading animation | None |
| `src/app/page.tsx` | Embed `<WebchatWidget />` | Low |
| `src/app/signup/page.tsx` | Add `?claim=true` flow to link org to new user | Low |

## Verification

1. **Widget opens**: Landing page shows chat bubble, opens after delay
2. **Onboarding flow**: System Bot asks 5 questions, extracts data correctly
3. **Agent creation**: Soul generated, agent bootstrapped, session switches
4. **Agent interaction**: Visitor talks to generated agent, gets relevant responses
5. **CTA display**: "Sign up to keep your agent" appears after agent is ready
6. **Signup claim**: New account successfully links to the anonymous org
7. **Session resume**: Close tab, reopen → conversation resumes from localStorage
8. **Rate limiting**: 51st message shows signup prompt
9. **Cleanup**: Sessions older than 7 days are marked expired by cron
10. **No auth required**: Entire flow works without login until signup CTA

## Estimated Effort

| Task | Effort |
|------|--------|
| Webchat session backend (create, send, claim) | 0.5 session |
| Schema additions | 0.15 session |
| Update completeOnboarding for webchat | 0.25 session |
| Widget component (UI + interaction) | 1 session |
| Message bubble + typing indicator | 0.25 session |
| Landing page embed | 0.15 session |
| Signup claim flow | 0.25 session |
| Session cleanup cron | 0.15 session |
| Testing + edge cases | 0.5 session |
| **Total** | **~3 sessions** |
