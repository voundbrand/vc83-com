# Clara GermanClaw MVP Workflow

Canvas shape:

```text
Start
  -> Clara Intake + Reassurance
      -> Callback Capture (if callback-only requested)
      -> End (if intake complete)
```

Rules:
1. No specialist telephony transfer nodes.
2. No live backend execution claims.
3. Callback branch is only for callers who cannot continue live intake.
4. Post-call async workers handle structuring/triage/planning.
