# Kai Setup

## Workflow

Skip the Workflow tab in `v1`.

Kai's demo should stay flexible across vacation, coverage, escalation, and handoff scenarios.

## Knowledge Base

Upload these KB files:

1. [../demo-business-core.md](../demo-business-core.md)
2. [../outcomes-reference.md](../outcomes-reference.md)
3. [knowledge-base.md](./knowledge-base.md)

## Analysis

### Evaluation criteria

1. `scenario_identified`
2. `ownership_clear`
3. `coordination_plan_practical`
4. `next_action_defined`

### Data points

1. `operations_scenario`
   - `string`
2. `location_scope`
   - `string`
3. `urgency_level`
   - `string`
4. `manager_involvement_needed`
   - `boolean`
5. `coverage_gap_present`
   - `boolean`

## Agent Tools

Enable:

1. `Transfer to agent`
2. `End conversation`
3. `Detect language`

Restriction:

- return transfer should point to `Clara`

## Tests

### Next reply tests

1. `vacation-request-impact`
   - expected: Kai identifies approval and coverage impact
2. `urgent-shift-gap`
   - expected: Kai proposes the fastest responsible coverage path
3. `handoff-summary`
   - expected: Kai structures the handoff cleanly

### Tool invocation test

1. `return-to-clara`
   - expected: Kai transfers back when the caller asks for another demo

### Simulation test

1. `coverage-coordination`
   - caller presents a staffing issue
   - Kai identifies owners and next steps

## Security

1. keep authentication off for the phone demo
2. keep Kai internal-only behind Clara

## Advanced Settings

1. `Enable chat mode`: `off`
2. `ASR model`: `Scribe Realtime v2.1`
3. `Filter background speech`: optional
4. `User input audio format`: `PCM 16000 Hz`
