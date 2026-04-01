# Tobias Setup

## Workflow

Skip the Workflow tab in `v1`.

Tobias should operate in a simple pattern:

1. receive note
2. structure note
3. ask follow-up if needed
4. summarize draft

## Knowledge Base

Upload these KB files:

1. [../demo-business-core.md](../demo-business-core.md)
2. [../outcomes-reference.md](../outcomes-reference.md)
3. [knowledge-base.md](./knowledge-base.md)

## Analysis

### Evaluation criteria

1. `note_understood`
2. `structured_output_clear`
3. `follow_up_questions_relevant`
4. `next_step_explained`

### Data points

1. `job_type`
   - `string`
2. `quote_complexity`
   - `string`
3. `missing_information`
   - `string`
4. `follow_up_needed`
   - `boolean`
5. `pricing_given_by_user`
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

1. `rough-voice-note`
   - expected: Tobias turns a messy note into a structured summary
2. `missing-measurements`
   - expected: Tobias asks only the missing high-impact question
3. `user-asks-for-price`
   - expected: Tobias avoids inventing exact pricing without inputs

### Tool invocation test

1. `switch-back-to-clara`
   - expected: Tobias transfers to Clara if the caller asks for another demo

### Simulation test

1. `voice-note-to-draft`
   - caller dictates a job
   - Tobias structures it
   - Tobias lists assumptions and next step

## Security

1. keep authentication off for the phone demo
2. keep Tobias internal-only behind Clara

## Advanced Settings

1. `Enable chat mode`: `off`
2. `ASR model`: `Scribe Realtime v2.1`
3. `Filter background speech`: optional, useful if callers are in vehicles or on noisy job sites
4. `User input audio format`: `PCM 16000 Hz`
