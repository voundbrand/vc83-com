# Clara GermanClaw MVP Tools

Live-call tool policy is intentionally minimal for legal-safe intake.

Allowed built-in tool:
- `End conversation` (`end_call`)

Not used on this line:
- specialist transfer tools
- telephony specialist handoffs

Reason:
- this MVP keeps call-time behavior deterministic (intake + reassurance)
- routing and outcome generation is delegated to asynchronous post-call workers
