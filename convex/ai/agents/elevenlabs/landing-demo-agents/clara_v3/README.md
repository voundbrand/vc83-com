# Clara V3 Candidate

This folder is the managed source for a parallel Clara law-firm variant.

Safety boundary:
- It must use a dedicated ElevenLabs agent ID via `CLARA_V3_ELEVENLABS_AGENT_ID`.
- It is intentionally excluded from default active sync runs.
- Baseline `clara` stays untouched unless explicitly selected.
- Intake-only topology: no specialist workflow, no live transfer behavior, and only `end_call` is managed.
- Promise posture: capture now, backend follow-up in the second step.

Sync this candidate only with:

```bash
npm run ai:elevenlabs:sync -- --agent clara_v3 --write
```
