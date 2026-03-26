# Knowledge Base Bundle - David Ogilvy Agent

This folder is ready for setup/connect import.

## Files

- `agent-config.json`: agent creation payload.
- `kb/*.md`: retrievable knowledge docs.

## Recommended Import Behavior

1. Import all `kb/*.md` as Layer Cake documents.
2. Tag every imported document with:
   - `agent:david-ogilvy`
   - `copywriting`
   - `direct-response`
   - `research-first`
3. Create or update target agent using `agent-config.json` values.
4. Keep autonomy at `draft_only` until rubric scores are stable in production.
