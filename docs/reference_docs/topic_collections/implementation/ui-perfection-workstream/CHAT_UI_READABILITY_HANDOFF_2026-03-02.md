# Chat UI Readability Handoff (2026-03-02)

## Copy/Paste Prompt For A New Chat

```text
You are continuing an in-progress chat UI hardening task in:
/Users/foundbrand_001/Development/vc83-com

Primary goal:
Fix chat readability and scrolling for long messages across all AI chat layouts.

Current user-reported defects:
1) Long messages are unreadable.
2) Long content pushes beyond message/window limits.
3) Long content is not reliably scrollable.

Important constraints already agreed:
1) Store handoff must open normal desktop AI chat window, not fullscreen /chat.
2) Store handoff should pre-activate warm Samantha for upsell readiness.
3) User should see a thinking notification bubble while kickoff is being sent.
4) Commercial kickoff contract must be passed as structured metadata, not shown as raw prompt text in transcript.
5) Internal kickoff contract content should remain hidden from visible message list.

Implement now (do not just propose):
1) Add a shared message content style contract for long text:
   - enforce wrapping of very long tokens (`overflow-wrap:anywhere` / equivalent),
   - preserve intentional line breaks,
   - prevent bubble overflow in flex rows (`min-w-0` where required),
   - provide horizontal fallback for true no-wrap content (code/log lines) without breaking layout.
2) Apply the same contract to slick, single-pane, and four-pane chat renderers.
3) Ensure message list containers remain vertically scrollable in all layouts (desktop + narrower widths).
4) Keep existing kickoff routing + warm Samantha structured metadata behavior intact.
5) Verify with `npm run typecheck` and summarize exactly what changed.

Use these files first:
- /Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/slick-pane/slick-chat-messages.tsx
- /Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/slick-pane/slick-pane-layout.tsx
- /Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/single-pane/message-types/user-message.tsx
- /Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/single-pane/message-types/assistant-message.tsx
- /Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/four-pane/chat-messages-redesign.tsx

Do not regress these files/behaviors:
- /Users/foundbrand_001/Development/vc83-com/src/components/window-content/store-window.tsx (store chat handoff path)
- /Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/index.tsx (kickoff bootstrap + structured kickoffContract send)
- /Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/kickoff-message-visibility.ts (hide internal kickoff messages)
- /Users/foundbrand_001/Development/vc83-com/src/hooks/use-ai-chat.ts (kickoffContract send options)
- /Users/foundbrand_001/Development/vc83-com/convex/ai/chat.ts (kickoffContract ingestion)
- /Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts (commercial kickoff runtime context reconstruction)

Acceptance criteria:
1) A single long paragraph (5k+ chars) stays inside bubble width and remains readable.
2) A single unbroken token (1k+ chars) does not push viewport width.
3) Multi-line contract/log text keeps line breaks and stays navigable.
4) Chat timeline scroll works reliably with long conversations.
5) Store-origin handoff still routes to warm Samantha using structured kickoff metadata.
```

## Current UI Notes

### Confirmed current behavior (already implemented)

1. Store commercial handoff opens the normal AI assistant window (not forced fullscreen) and passes `openContext=store_commercial_handoff`.
   - `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/store-window.tsx:970`
2. Warm/cold Samantha routing metadata is built in chat bootstrap and sent via structured `kickoffContract`.
   - `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/index.tsx:180`
   - `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/index.tsx:392`
3. Kickoff metadata channel is wired through frontend send options and backend ingestion.
   - `/Users/foundbrand_001/Development/vc83-com/src/hooks/use-ai-chat.ts:186`
   - `/Users/foundbrand_001/Development/vc83-com/src/hooks/use-ai-chat.ts:833`
   - `/Users/foundbrand_001/Development/vc83-com/convex/ai/chat.ts:1409`
   - `/Users/foundbrand_001/Development/vc83-com/convex/ai/chat.ts:1893`
4. Backend reconstructs runtime commercial context from metadata (instead of relying on visible raw kickoff text).
   - `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts:9805`
   - `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts:9871`
5. Internal kickoff messages are hidden from visible transcript when detected.
   - `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/kickoff-message-visibility.ts:26`
6. Thinking bubble is shown in slick mode when sending (including empty state).
   - `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/slick-pane/slick-chat-messages.tsx:365`
   - `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/slick-pane/slick-chat-messages.tsx:625`

### Known readability/scroll risk points to fix next

1. Message content wrappers rely on `whitespace-pre-wrap break-words` but do not enforce stronger wrapping for extreme unbroken strings.
   - `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/slick-pane/slick-chat-messages.tsx:564`
   - `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/slick-pane/slick-chat-messages.tsx:619`
   - `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/single-pane/message-types/user-message.tsx:22`
   - `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/single-pane/message-types/assistant-message.tsx:35`
   - `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/four-pane/chat-messages-redesign.tsx:20`
2. Some message rows are flex-based and should explicitly enforce shrinking (`min-w-0`) to prevent content-induced overflow.
   - `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/slick-pane/slick-chat-messages.tsx:563`
   - `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/single-pane/message-types/user-message.tsx:21`
   - `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/single-pane/message-types/assistant-message.tsx:30`
3. Slick pane layout still uses `overflow-visible` at higher wrappers; needs careful validation so long content cannot escape viewport while drawers still behave.
   - `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/slick-pane/slick-pane-layout.tsx:99`
   - `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/slick-pane/slick-pane-layout.tsx:125`

## Quick Repro Script (manual)

1. Open store, trigger commercial `chat_handoff` offer.
2. In chat, send:
   - one 5k-character paragraph,
   - one 1k-character no-space token,
   - one multi-line contract/log block.
3. Verify no horizontal viewport blowout, no clipped text, and vertical timeline scroll remains usable.
4. Confirm kickoff raw contract is not shown to user, and warm Samantha routing still occurs.
