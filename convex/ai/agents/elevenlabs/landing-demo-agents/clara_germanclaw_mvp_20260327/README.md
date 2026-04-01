# Clara GermanClaw MVP (OpenClaw/Hetzner, DSGVO-first)

This folder is the source-of-truth pack for the **OpenClaw/Hetzner Germany-first Clara MVP variant**.

Scope:
- live-call behavior: intake + reassurance + callback capture
- no specialist telephony handoffs (no Jonas/Maren/Tobias/Lina/Kai/Nora routing)
- no legal advice
- no fabricated live backend side effects

Post-call behavior:
- async worker pipeline builds operator-ready outcome packets
- worker definitions and JSON contracts live in `workers/` and `contracts/`

Use this variant with a dedicated ElevenLabs agent id and sync it explicitly.
