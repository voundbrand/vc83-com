# 05 — Webchat Widget

> The bridge between the builder and the agent platform. Embed a chat widget on any v0-generated landing page.
>
> **UPDATE 2026-02-03:** Webchat configuration can happen during the builder setup mode session — the same session where the agency owner sets up their agent. The builder AI asks "Which channels do you want to enable?" and webchat gets wired in the connect step. See [09-GUIDED-SETUP-WIZARD.md](09-GUIDED-SETUP-WIZARD.md).

---

## Why This Matters

The builder generates beautiful landing pages via v0. The agent handles conversations via the execution pipeline. Today these are disconnected. The webchat widget connects them:

- Visitor lands on v0-generated page
- Chat bubble appears in bottom-right
- Visitor types a question
- Message goes to agent execution pipeline
- Agent responds using knowledge base + tools
- Visitor books an appointment without leaving the page

This is how the agency sells the "AI employee + website" premium package (399 EUR/mo instead of 199 EUR/mo).

---

## Architecture

### Component 1: Public API Endpoint

Add to `convex/http.ts`:

```
POST /api/v1/webchat/message
  Body: { organizationId, agentId, sessionToken?, message, visitorInfo? }
  Response: { sessionToken, response, agentName, agentAvatar }
```

```
GET /api/v1/webchat/config/:agentId
  Response: { agentName, brandColor, welcomeMessage, avatar, language }
```

**Security:**
- Rate limited (30 req/min per IP for free, 60 for pro)
- No auth required (public-facing)
- Session token issued on first message, required for subsequent
- Organization and agent must be active
- Agent must have webchat channel enabled

### Component 2: React Chat Widget

A self-contained React component that embeds on any page:

```tsx
<ChatWidget
  agentId="abc123"
  organizationId="org456"
  brandColor="#2563eb"
  position="bottom-right"
  welcomeMessage="Hallo! Wie können wir Ihnen helfen?"
  language="de"
/>
```

**Features:**
- Floating bubble with unread count badge
- Expandable chat panel (400px wide, 600px tall)
- Message input with send button
- Agent typing indicator
- Markdown rendering in messages
- Link detection (booking links, phone numbers)
- Mobile responsive (full-screen on mobile)
- Remembers session via localStorage
- Customizable brand color, position, welcome message

### Component 3: Scaffold Integration

The builder's scaffold generator already creates Next.js apps. Add the widget to the generated scaffold:

In `scaffold/components/ChatWidget.tsx`:
```tsx
"use client";
import { useEffect, useState } from "react";
// ... self-contained widget component
// Config loaded from environment variables:
//   NEXT_PUBLIC_L4YERCAK3_AGENT_ID
//   NEXT_PUBLIC_L4YERCAK3_ORG_ID
```

In `scaffold/app/layout.tsx`:
```tsx
import { ChatWidget } from "@/components/ChatWidget";
// ... added to layout, appears on every page
```

---

## Data Flow

```
Visitor types message
    ↓
ChatWidget → POST /api/v1/webchat/message
    ↓
HTTP handler → validate org + agent + rate limit
    ↓
Schedule processInboundMessage (existing pipeline)
  channel = "webchat"
  externalContactIdentifier = sessionToken
    ↓
Agent processes (LLM + tools + knowledge base)
    ↓
Response returned to HTTP handler
    ↓
JSON response → ChatWidget renders message
```

### Session Management
- First message: no sessionToken → create new session → return token
- Subsequent messages: include sessionToken → resume session
- Token stored in visitor's localStorage
- Session expires after 24h of inactivity
- CRM contact created if visitor provides name/email/phone during conversation

---

## Widget Embed Options

### Option A: Script Tag (Simplest)
```html
<script src="https://app.l4yercak3.com/widget.js"
  data-agent-id="abc123"
  data-org-id="org456"
  data-color="#2563eb">
</script>
```

### Option B: React Component (Builder Apps)
```tsx
import { ChatWidget } from "@l4yercak3/webchat";
<ChatWidget agentId="abc123" organizationId="org456" />
```

### Option C: iFrame (Any Website)
```html
<iframe src="https://app.l4yercak3.com/chat/abc123"
  style="position:fixed;bottom:20px;right:20px;width:400px;height:600px;border:none;">
</iframe>
```

---

## Configuration (Agent Config UI)

Add a "Webchat" section to the agent channels config:

| Field | Type | Default |
|-------|------|---------|
| Enable webchat | toggle | off |
| Welcome message | text | "Hallo! Wie können wir Ihnen helfen?" |
| Brand color | color picker | org primary color |
| Widget position | select | bottom-right |
| Collect name/email | toggle | on |
| Bubble text | text | "Chat" |
| Offline message | text | "Wir sind gerade nicht erreichbar..." |

---

## Build Effort

| Component | Effort | Files |
|-----------|--------|-------|
| Public API endpoints | Small | `convex/http.ts` (add 2 routes) |
| Webchat message handler | Small | `convex/api/v1/webchatApi.ts` (~150 lines) |
| React chat widget | Medium | `src/components/webchat/ChatWidget.tsx` (~500 lines) |
| Widget embed script | Small | `public/widget.js` (~100 lines) |
| Scaffold integration | Small | Add to scaffold generator (~50 lines) |
| Agent config UI update | Small | Add webchat section (~100 lines) |
| **Total** | **~900 lines** | |
