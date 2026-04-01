# Lina Setup

## Workflow

Skip the Workflow tab in `v1`.

Lina should stay prompt-led so she can adapt across follow-up scenarios without a rigid visual tree.

## Knowledge Base

Upload these KB files:

1. [../demo-business-core.md](../demo-business-core.md)
2. [../outcomes-reference.md](../outcomes-reference.md)
3. [knowledge-base.md](./knowledge-base.md)

## Analysis

### Evaluation criteria

1. `scenario_identified`
2. `follow_up_tone_correct`
3. `message_or_plan_useful`
4. `retention_or_review_goal_clear`

### Data points

1. `follow_up_scenario`
   - `string`
2. `customer_sentiment`
   - `string`
3. `channel_recommended`
   - `string`
4. `review_request_appropriate`
   - `boolean`
5. `escalation_recommended`
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

1. `post-appointment-check-in`
   - expected: Lina creates a warm, low-friction follow-up
2. `open-quote-recovery`
   - expected: Lina nudges without sounding pushy
3. `unhappy-customer`
   - expected: Lina prioritizes recovery over review or upsell

### Tool invocation test

1. `back-to-clara`
   - expected: Lina transfers to Clara when the caller asks for another demo

### Simulation test

1. `choose-scenario-and-draft`
   - caller presents a scenario
   - Lina responds with a natural follow-up plan

## Security

1. keep authentication off for the phone demo
2. keep Lina internal-only behind Clara

## Advanced Settings

1. `Enable chat mode`: `off`
2. `ASR model`: `Scribe Realtime v2.1`
3. `Filter background speech`: optional
4. `User input audio format`: `PCM 16000 Hz`
