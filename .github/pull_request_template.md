## Summary

Describe the functional change and why it is needed.

## Validation

Describe how you validated this change (tests, manual checks, logs, etc.).

## Diagram Impact (Required Contract)

Use the exact keys below so CI can parse this section.
If mapped critical flow paths changed, `impact` must be `minor` or `major` (not `none`).

impact: minor
affected_flows: [F2]
updated_docs: [docs/platform/codebase_atlas/flows/F2-ai-conversation-runtime.md]
justification: n/a

## Diagram Impact Example

```text
impact: minor
affected_flows: [F2, F5]
updated_docs: [docs/platform/codebase_atlas/flows/F2-ai-conversation-runtime.md, docs/platform/codebase_atlas/flows/F5-external-webhooks-and-channels.md]
justification: n/a
```

```text
impact: none
affected_flows: []
updated_docs: []
justification: docs-only change, no mapped runtime paths touched
```
