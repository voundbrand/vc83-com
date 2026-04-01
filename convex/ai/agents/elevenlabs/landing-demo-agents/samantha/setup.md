# Samantha Setup

## Overview

- role: diagnostic and recommendation layer
- runtime: local sevenlayers operator agent
- channels: `webchat`, `native_guest`
- not part of the ElevenLabs phone-number deployment path

## Source of truth

Current Samantha implementation anchors:

1. [07_SAMANTHA_DIAGNOSTIC_V3.md](/Users/foundbrand_001/Development/vc83-com/docs/strategy/one-of-one-v3/07_SAMANTHA_DIAGNOSTIC_V3.md#L1)
2. [seedPlatformAgents.ts](/Users/foundbrand_001/Development/vc83-com/convex/onboarding/seedPlatformAgents.ts#L892)
3. [samantha-lead-capture.md](/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-evals/agent-specs/samantha-lead-capture.md#L1)
4. [MASTER_PLAN.md](/Users/foundbrand_001/Development/vc83-com/docs/reference_projects/elevenlabs/implementation-eleven-agents-rollout/MASTER_PLAN.md#L1672)

## Workflow

Use a prompt-led local runtime flow, not an ElevenLabs phone workflow.

Recommended sequence:

1. greet and frame the diagnostic
2. ask 2-5 concise diagnostic questions
3. identify the highest-leverage bottleneck
4. recommend one strongest agent / next step
5. only then request audit-deliverable contact details
6. deliver audit email or account handoff

## Knowledge Base

Use:

1. [knowledge-base.md](./knowledge-base.md)
2. [../outcomes-reference.md](../outcomes-reference.md)

Do not upload the fictional demo-business core to Samantha as primary truth. Samantha lives in the real sevenlayers layer and should only reference the fictional phone-demo business as a demo construct.

## Analysis

### Evaluation criteria

1. `value_before_capture`
2. `single_strongest_recommendation`
3. `correct_agent_mapping`
4. `clara_handoff_explained_cleanly`
5. `tool_honesty_preserved`

### Data points

1. `recommended_agent`
   - `string`
2. `business_locations`
   - `string`
3. `primary_leak`
   - `string`
4. `audit_completed`
   - `boolean`
5. `founder_contact_requested`
   - `boolean`
6. `next_step_selected`
   - `string`

## Agent Tools

Enable:

1. `request_audit_deliverable_email`
2. `generate_audit_workflow_deliverable`
3. `start_account_creation_handoff`

Do not give Samantha phone-transfer behavior. She should recommend Clara, not impersonate Clara.

## Tests

### Next reply tests

1. `value-before-capture`
   - expected: Samantha delivers a diagnosis before asking for name, email, or phone
2. `clara-as-best-first-step`
   - business has 5 locations and missed-call pain
   - expected: Samantha recommends Clara first
3. `single-best-agent`
   - expected: Samantha gives one strongest recommendation, not a list of equal options
4. `explain-clara-relationship`
   - expected: Samantha clearly distinguishes herself from Clara

### Tool invocation tests

1. `audit-email-after-value`
   - expected: `request_audit_deliverable_email` and then `generate_audit_workflow_deliverable` only after recommendation
2. `account-creation-handoff`
   - expected: `start_account_creation_handoff` fires when the user wants to continue in-platform

### Simulation test

1. `five-question-diagnostic`
   - user describes a multi-location business
   - Samantha identifies the main leak
   - Samantha recommends one best agent
   - Samantha offers phone demo through Clara

## Security

1. Samantha should remain platform-level, not customer-org cloned by default
2. Preserve tool honesty: never claim email delivery or account handoff without real execution
3. Do not leak internal metadata like `intent_code`, `routing_hint`, or canonical envelope fields
4. Keep founder-contact routing deterministic and explicit

## Advanced Settings

For the local runtime:

1. keep Samantha text-first
2. preserve multilingual mirroring
3. keep responses concise and operator-level
4. keep route modes metadata-only:
   - `cold`
   - `warm`

## Notes

1. Samantha and Clara should be aware of each other, but they are not interchangeable.
2. Samantha is the strategic diagnostic layer.
3. Clara is the live phone-demo layer.
4. If you later build a Samantha voice version, keep her separate from Clara and do not collapse the roles.
