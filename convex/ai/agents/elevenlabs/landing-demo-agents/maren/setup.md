# Maren Setup

## Workflow

Skip the Workflow tab in `v1`.

Maren should stay prompt-led and linear:

1. understand appointment need
2. offer best slot or fallback
3. explain reminder / no-show / waitlist logic
4. close cleanly

## Knowledge Base

Upload these KB files:

1. [../demo-business-core.md](../demo-business-core.md)
2. [../outcomes-reference.md](../outcomes-reference.md)
3. [knowledge-base.md](./knowledge-base.md)

## Analysis

### Evaluation criteria

1. `request_understood`
2. `best_slot_or_fallback_provided`
3. `cross_location_reasoning_clear`
4. `next_step_explained`

### Data points

1. `appointment_type`
   - `string`
2. `preferred_location`
   - `string`
3. `fallback_location_offered`
   - `boolean`
4. `reschedule_requested`
   - `boolean`
5. `waitlist_offered`
   - `boolean`
6. `caller_urgency`
   - `string`

## Agent Tools

Enable:

1. `Transfer to agent`
2. `End conversation`
3. `Detect language`

Restriction:

- `Transfer to agent` should go back to `Clara`, not to other specialists

## Tests

### Next reply tests

1. `cross-location-fallback`
   - caller wants Berlin but nothing is available today
   - expected: Maren offers Potsdam or next-day Berlin clearly
2. `reschedule-after-cancellation`
   - expected: Maren treats rescheduling as the main task and does not make the caller restart the process
3. `no-show-recovery`
   - expected: Maren offers the fastest recovery path and explains reminder logic

### Tool invocation test

1. `return-to-clara`
   - caller asks for a different demo
   - expected: Maren transfers back to Clara

### Simulation test

1. `book-slot-demo`
   - book request
   - fallback location
   - recap

## Security

1. keep `Enable authentication` off for the phone demo
2. keep specialists non-public in `v1`
3. only expose Maren through Clara's transfer flow

## Advanced Settings

1. `Enable chat mode`: `off`
2. `ASR model`: `Scribe Realtime v2.1`
3. `Filter background speech`: optional, turn on if mobile audio is noisy
4. `User input audio format`: `PCM 16000 Hz`
