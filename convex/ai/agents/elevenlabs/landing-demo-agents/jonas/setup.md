# Jonas Setup

## Workflow

Skip the Workflow tab in `v1`.

Jonas performs best as a compact consultative conversation driven by the prompt and tests.

## Knowledge Base

Upload these KB files:

1. [../demo-business-core.md](../demo-business-core.md)
2. [../outcomes-reference.md](../outcomes-reference.md)
3. [knowledge-base.md](./knowledge-base.md)

## Analysis

### Evaluation criteria

1. `need_understood`
2. `qualification_complete_enough`
3. `lead_temperature_assigned_reasonably`
4. `next_route_clear`

### Data points

1. `lead_temperature`
   - `string`
   - enum: `hot`, `warm`, `cold`, `unknown`
2. `timeline`
   - `string`
3. `decision_role`
   - `string`
4. `scope_size`
   - `string`
5. `next_route`
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

1. `hot-lead-qualification`
   - expected: Jonas asks focused questions and identifies urgency
2. `early-stage-lead`
   - expected: Jonas stays helpful and does not force the close
3. `unclear-problem`
   - expected: Jonas first clarifies the problem before classifying fit

### Tool invocation test

1. `switch-demo`
   - expected: Jonas transfers back to Clara when the caller asks for another specialist

### Simulation test

1. `qualify-and-summarize`
   - caller describes a business problem
   - Jonas qualifies
   - Jonas gives a short summary and route

## Security

1. keep authentication off for the phone-demo rollout
2. keep Jonas internal-only behind Clara

## Advanced Settings

1. `Enable chat mode`: `off`
2. `ASR model`: `Scribe Realtime v2.1`
3. `Filter background speech`: optional
4. `User input audio format`: `PCM 16000 Hz`
