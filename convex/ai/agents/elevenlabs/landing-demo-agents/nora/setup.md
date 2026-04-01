# Nora Setup

## Workflow

Skip the Workflow tab in `v1`.

Nora should stay prompt-led so she can work from either sample metrics or caller-provided metrics.

## Knowledge Base

Upload these KB files:

1. [../demo-business-core.md](../demo-business-core.md)
2. [../outcomes-reference.md](../outcomes-reference.md)
3. [knowledge-base.md](./knowledge-base.md)

## Analysis

### Evaluation criteria

1. `metrics_understood`
2. `insights_actionable`
3. `causes_reasonable`
4. `recommendation_clear`

### Data points

1. `primary_kpi_issue`
   - `string`
2. `locations_compared`
   - `string`
3. `likely_cause`
   - `string`
4. `recommended_action`
   - `string`
5. `data_quality`
   - `string`

## Agent Tools

Enable:

1. `Transfer to agent`
2. `End conversation`
3. `Detect language`

Restriction:

- return transfer should point to `Clara`

## Tests

### Next reply tests

1. `low-answer-rate-location`
   - expected: Nora identifies missed-call leakage and a practical next step
2. `weak-booking-rate`
   - expected: Nora explains what the metric suggests without overstating certainty
3. `caller-has-no-data`
   - expected: Nora asks for the minimum useful metrics

### Tool invocation test

1. `back-to-clara`
   - expected: Nora transfers back when the caller wants a different demo

### Simulation test

1. `compare-locations`
   - caller provides rough metrics for two locations
   - Nora identifies the outlier and recommends one action

## Security

1. keep authentication off for the phone demo
2. keep Nora internal-only behind Clara

## Advanced Settings

1. `Enable chat mode`: `off`
2. `ASR model`: `Scribe Realtime v2.1`
3. `Filter background speech`: optional
4. `User input audio format`: `PCM 16000 Hz`
