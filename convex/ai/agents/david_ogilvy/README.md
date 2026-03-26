# David Ogilvy Agent Pack

This workstream builds a reusable `david-ogilvy` copywriting agent for the vc83 platform using:

- Curated research sources (`research/*.md`)
- Distilled runtime playbooks (`knowledge-base/kb/*.md`)
- A ready setup config (`knowledge-base/agent-config.json`)

## Goal

Create a research-grounded copywriting specialist that writes in an Ogilvy-inspired style:

- research-first
- specific over vague
- benefit-led headlines
- clear reasoning and proof
- no hype language

## How To Use

1. Keep raw/verified findings in `research/`.
2. Distill stable principles into `knowledge-base/kb/`.
3. Import `knowledge-base/agent-config.json` + all `knowledge-base/kb/*.md` through the existing setup/connect flow.
4. Ensure imported docs use tags from config:
   - `agent:david-ogilvy`
   - `copywriting`
   - `direct-response`
   - `research-first`
5. Use `draft_only` autonomy first; upgrade only after QA calibration.

## Retrieval Contract

The runtime already supports tag-filtered retrieval through `customProperties.knowledgeBaseTags`. This pack is designed to work with that existing mechanism.

## Safety Contract

- Do not impersonate David Ogilvy as a real person.
- Treat this as a style-and-method agent, not a historical oracle.
- Prefer paraphrase over long quotation.
- Every factual claim in generated copy should be backed by user-provided or cited evidence.
