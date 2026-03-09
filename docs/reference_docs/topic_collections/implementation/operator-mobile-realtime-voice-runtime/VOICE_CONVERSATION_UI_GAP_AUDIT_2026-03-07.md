# Voice Conversation UI Gap Audit (Web + iPhone)

Date: 2026-03-07

## Scope
- Web AI chat voice conversation stage (`slick-chat-input` + `slick-conversation-stage`)
- iPhone voice conversation modal (`VoiceModeModal`)

## Reported Experience
- After initial greeting, the voice conversation UI drops back to main chat.
- Orb shows waiting while "thinking" appears elsewhere.
- Conversation continues in background, but transcript is not visible in conversation UI.
- Stop controls are duplicated (orb + separate stop button).

## Gaps Found
1. Web stage continuity gap:
- Conversation stage was reset on `currentConversationId` changes, including runtime-driven ID transitions during active voice flow.
- This could close stage UI mid-session.

2. Web transcript visibility gap:
- No live transcript rail inside the active conversation stage.

3. Control duplication:
- Dedicated stop/end button existed alongside orb controls.

4. Orb status language mismatch:
- `THINKING` state rendered as `WAIT` in orb labels.

5. Docked control placement:
- Active-session orb was not bottom-right and was larger than desired.

## Implemented Fixes
1. Keep web conversation UI active until operator stop:
- Added active-session guard around conversation reset flow in:
  - `src/components/window-content/ai-chat-window/slick-pane/slick-chat-input.tsx`
- Added synchronous start/end refs to close race windows during session boot/teardown.

2. Added live transcript rail in active web stage (top-left):
- Added live user + assistant transcript props and rendering in:
  - `src/components/window-content/ai-chat-window/slick-pane/slick-conversation-stage.tsx`
- Added transcript source wiring in:
  - `src/components/window-content/ai-chat-window/slick-pane/slick-chat-input.tsx`

3. Docked orb redesign for active sessions:
- Web: smaller orb moved to bottom-right; orb remains primary stop control.
- iPhone: smaller orb moved to bottom-right; removed separate stop button.

4. Orb status label update:
- `THINKING` now maps to `THINK` (instead of `WAIT`) on both web and iPhone.

## Verification Targets
- Voice stage stays open across first greeting and first captured user turn.
- Live transcript remains visible in-stage (not only in main chat).
- No standalone stop button in docked active UI.
- Orb remains the stop trigger in active session.
