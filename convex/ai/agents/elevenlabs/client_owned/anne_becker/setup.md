# Anne Becker Setup

`Anne Becker` is a real two-week live demo agent for `Marcus Engel Immobilien`.

The repo-managed surfaces for this agent are:

1. `system-prompt.md`
2. `first-message.md`
3. `knowledge-base.md`
4. `transfer_to_human.json`

## Tool stance

Keep the tool surface conservative for the first live pass:

1. `End conversation` enabled
2. `Transfer to number` present but with no active destination
3. no agent-to-agent routing

This keeps the agent safe while the line is proving itself on real calls.

## Operating model

Anne is not a fictional landing-page sandbox.
She is a real inbound assistant for a live brokerage trial.

That means:

1. no fake bookings
2. no fake expose sends
3. no fake CRM writes
4. no invented live listing stock
5. callback capture is preferable to bluffing

## Knowledge-base intent

The KB is designed to answer:

1. who the company is
2. what services it offers
3. how buyers and sellers should be qualified
4. which questions require a Marcus callback instead of an immediate answer

## Sync

Dry run:

```bash
node --import tsx scripts/ai/elevenlabs/sync-elevenlabs-agent.ts --agent anne_becker
```

Write:

```bash
node --import tsx scripts/ai/elevenlabs/sync-elevenlabs-agent.ts --agent anne_becker --write
```
