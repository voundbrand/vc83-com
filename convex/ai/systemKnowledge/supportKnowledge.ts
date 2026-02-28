export const SUPPORT_KNOWLEDGE_CONTENT: Record<string, string> = {
  "support-troubleshooting-playbook": `# Support Troubleshooting Playbook

Use this playbook when a customer reports product issues, bugs, or degraded behavior.

## Response Contract

1. Confirm the issue in the customer's own words.
2. Ask for the minimum missing diagnostic inputs:
   - product area
   - account/workspace
   - expected behavior
   - actual behavior
   - when it started
3. Provide deterministic steps with explicit verification checks.
4. If verification fails repeatedly, escalate with a support case reference.

## Troubleshooting Sequence

1. Scope:
   - Is this account-specific, org-wide, or platform-wide?
   - Is this reproducible now?
2. Validate access/configuration:
   - role permissions
   - required integrations
   - environment mismatch (sandbox vs production)
3. Validate recent changes:
   - model/config updates
   - integration credential changes
   - deployment/publish activity
4. Provide next best action with a check:
   - "After step X, verify Y."
5. If unresolved after 2 verification cycles, escalate.

## Safety Rules

- Never invent platform status or backend state.
- Never claim a fix is applied unless confirmed.
- Never ask for secrets (passwords, private keys, full tokens).
- If logs or diagnostics are unavailable, say that explicitly and escalate when needed.`,
  "support-pricing-billing-reference": `# Support Pricing and Billing Reference

Use this for billing, credits, invoices, subscriptions, and payment lifecycle questions.

## Grounding Rules

1. Only state pricing/billing facts that are present in trusted docs or system data.
2. If plan or invoice details are unavailable, say "I need to escalate this to billing support."
3. Do not make refund, credit, or chargeback commitments autonomously.

## Deterministic Billing Handling

1. Classify request:
   - plan question
   - credit usage question
   - invoice/payment status
   - refund/dispute request
2. If it is informational and grounded, answer directly with sources.
3. If it changes money, legal status, or account entitlement, escalate to a human case.
4. Include ticket reference in all escalated billing responses.

## Required Escalation Cases

- refund requests
- charge disputes/chargebacks
- duplicate charge claims
- payment failures impacting active service
- account lockout tied to billing status`,
  "support-case-escalation-contract": `# Support Case Escalation Contract

Escalation must be deterministic and auditable.

## Escalate Immediately When Any Condition Is True

1. Customer explicitly requests a human.
2. Security/account access risk is present.
3. Billing dispute, refund, or chargeback request is present.
4. The issue remains unresolved after 2 troubleshooting verification cycles.
5. Legal or compliance-sensitive guidance is requested.

## Required Escalation Payload

- concise issue summary
- product area
- account/workspace identifier
- customer impact/severity
- troubleshooting steps already attempted
- unresolved blocker

## Ticket Path

1. Create or reference a support ticket.
2. Attach escalation metadata and conversation summary.
3. Return the case reference to the customer in the same response.

## Guardrails

- Never claim "escalated" without a case reference.
- Never continue speculative troubleshooting after escalation criteria are met.
- Never drop escalation context; preserve full handoff summary.`,
  "support-agent-selection-recommender": `# Agent Selection Recommender Playbook

Use this when an operator asks, "Which agent do I need now?"

## Deterministic Selection Contract

1. Start from the requested outcome, not from tool inventory.
2. Evaluate capability coverage:
   - covered now by active specialists
   - available now but not yet activated
   - planned capability (not shippable yet)
3. Evaluate integration readiness for that outcome before activation suggestions.
4. Explain all gaps first, then suggest activation steps.

## Outcome Routing Baseline

1. Appointment booking:
   - Specialist: Appointment Booking Specialist + Personal Schedule Coordinator
   - Integration minimum: Google Calendar or Microsoft Calendar
2. Provider outreach:
   - Specialist: Provider Outreach Specialist
   - Integration minimum: Telegram, WhatsApp, or Slack
3. Medical follow-up coordination:
   - Specialist: Appointment Booking Specialist + Medical Compliance Reviewer
   - Integration minimum: calendar + messaging readiness

## Gap Explanation Requirements

- Tool gap examples:
  - specialist is not active
  - specialist path is still planned
- Integration gap examples:
  - no connected calendar
  - no connected outreach channel

## Safety and Compliance

- Do not recommend autonomous outbound calling when the path is marked planned or blocked.
- Require explicit HITL and compliance artifacts for call fallback workflows.
- Keep recommendations additive and idempotent: never mutate integrations automatically.`,
};
