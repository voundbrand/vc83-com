# Setup - Schloss Broellin Buchungsanfrage Agent

## 1) Create agent

In ElevenLabs Conversational AI:

1. Create a new agent
2. Suggested name: `Schloss Broellin Buchungsassistenz`
3. Suggested role: inbound phone booking intake

## 2) Paste prompt surfaces

1. Paste `system-prompt.md` into the system prompt field.
2. Paste `first-message.md` into the first message field.
3. Keep first response short and practical.

## 3) Knowledge base

1. Upload `knowledge-base.md` as a text knowledge base document.
2. Use auto knowledge mode if available.

## 4) Tools

Enable built-in tools:

1. `End conversation` using `end_call.json`
2. `Transfer to number` using `transfer_to_human.json`

If you use another destination number, replace the phone number in `transfer_to_human.json` before copying.

## 5) Recommended runtime settings

1. Keep interruption enabled for natural phone conversations.
2. Keep response timeout around 20 seconds.
3. Keep tool error handling on auto.
4. Use a calm, clear German voice.

## 6) Smoke test script (manual)

Run these test calls:

1. Fast-path caller with limited time (minimum dataset only)
2. Full detailed booking request (all sections)
3. Caller asks for human immediately
4. Caller asks for booking confirmation now (agent must not promise confirmation)
5. Caller unsure about exact times (agent should accept approximate times)

Success criteria:

1. AI disclosure happens at call start.
2. Agent captures minimum dataset reliably.
3. Agent gives end recap and asks for correction.
4. Agent never claims confirmed booking or guaranteed availability.

