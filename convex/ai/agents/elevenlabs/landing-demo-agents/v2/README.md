# Landing Demo Agents V2 Reference

This `v2/` folder is the git-tracked migration and continuity layer for the current landing-demo agent system.

It is not the canonical runtime definition for the product.

The canonical seven-agent source of truth now lives in:

- `../../PLATFORM_NATIVE_SEVEN_AGENT_CONTRACT.md`
- `./agent-matrix.md`

The parent-folder Eleven assets remain important, but only as:

1. proof-demo continuity runtime inputs,
2. migration source material,
3. sync targets for the current Eleven telephony binding.

Those current demo assets are:

- prompts in `../*/system-prompt.md`
- Clara routing tools in `../clara/tools.json`
- Clara workflow in `../clara/workflow.json`
- shared transfer tools in `../transfer_to_clara.json`, `../transfer_to_human.json`, and `../end_call.json`

The sync harness still reads those parent files directly for the demo branch:

- `scripts/ai/elevenlabs/sync-elevenlabs-agent.ts`
- `scripts/ai/elevenlabs/simulate-elevenlabs-flow.ts`

## Policy

1. Change platform-owned role, tool, data, memory, trust, and channel definitions in the platform contract and matrix first.
2. Change the parent-folder Eleven assets only when a founder-demo blocker or migration-learning need requires it.
3. Keep `v2/` focused on migration mapping, ownership notes, routing expectations, and coverage evidence.
4. If a demo-runtime change is still required, update both the affected demo asset and the relevant `v2/` mapping doc.
5. Validate with the harness whenever demo-runtime inputs change.

## Reference Docs

- [Platform-Native Seven-Agent Contract](../../PLATFORM_NATIVE_SEVEN_AGENT_CONTRACT.md)
- [Agent Matrix](./agent-matrix.md)
- [Shared Tools](./shared-tools.md)
- [Test Coverage](./test-coverage.md)
- [Clara](./clara.md)
- [Maren](./maren.md)
- [Jonas](./jonas.md)
- [Tobias](./tobias.md)
- [Lina](./lina.md)
- [Kai](./kai.md)
- [Nora](./nora.md)
- [Samantha](./samantha.md)

## Common Commands

```bash
npm run landing:elevenlabs:sync -- --all
npm run landing:elevenlabs:sync -- --all --write
npm run landing:elevenlabs:simulate -- --suite all-handoffs
```
