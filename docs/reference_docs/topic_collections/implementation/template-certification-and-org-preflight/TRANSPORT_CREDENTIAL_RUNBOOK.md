# Template Certification Transport Credential Runbook

**Last updated:** 2026-03-25  
**Scope:** Template certification alert worker external adapters (`slack`, `pagerduty`, `email`).

## Purpose

This runbook defines fail-closed credential governance for certification alert dispatch transports.
It is referenced directly by adapter failure messages and super-admin alert operations status.

## Governance controls

`TemplateCertificationAlertDispatchControl.policy.credentialGovernance` now governs each channel:

- `requireDedicatedCredentials`: require template-certification-specific env credentials instead of shared fallback env credentials.
- `allowInlineTargetCredentials`: allow or block inline target secrets (Slack webhook URLs, PagerDuty `routing_key:` targets).
- `runbookUrl`: operator link surfaced in failures and status payloads.

`TemplateCertificationAlertDispatchControl.policy.strictMode` controls rollout posture:

- `enabled`: turns strict-mode governance rollout on/off for transport channels.
- `rolloutMode`: `manual` or `auto_promote_ready_channels`.
- `guardrailMode`: `advisory` or `enforced` (enforced writes strict governance immediately for active channels).
- `notifyOnPolicyDrift`: emits `policy_drift_detected` alert recommendations when strict-governance or requirement-authoring drift exists.

Default runbook links:

- Slack: `.../TRANSPORT_CREDENTIAL_RUNBOOK.md#slack`
- PagerDuty: `.../TRANSPORT_CREDENTIAL_RUNBOOK.md#pagerduty`
- Email: `.../TRANSPORT_CREDENTIAL_RUNBOOK.md#email`

## Strict-mode rollout + drift notifications

1. Strict baseline governance by channel:
   - Slack: `requireDedicatedCredentials=true` and `allowInlineTargetCredentials=false`
   - PagerDuty: `allowInlineTargetCredentials=false`
   - Email: `requireDedicatedCredentials=true`
2. `auto_promote_ready_channels` promotes only channels that are credential-ready under strict settings.
3. `advisory` guardrails preserve current policy and surface drift issues.
4. `enforced` guardrails persist strict policy for active channels immediately and fail closed if credentials are not ready.

Policy drift issue codes:

- `<channel>_credential_governance_drift` when strict governance is not yet fully enforced for an active channel.
- `<tier>_foundational_requirement_drift` when `manifest_integrity` or `risk_assessment` is missing.
- `<tier>_operational_requirement_drift` when tier operational evidence requirements are missing.

Alert recommendation code:

- `policy_drift_detected`

## Slack

### Supported credential modes

1. Inline webhook target in dispatch control `channels.slack.target`.
2. Bot token mode (`TEMPLATE_CERTIFICATION_ALERT_SLACK_BOT_TOKEN`, fallback `SLACK_BOT_TOKEN`).

### Required checks

1. Confirm target is configured and channel is enabled.
2. If bot-token mode is used and `requireDedicatedCredentials=true`, set `TEMPLATE_CERTIFICATION_ALERT_SLACK_BOT_TOKEN`.
3. If `allowInlineTargetCredentials=false`, do not use webhook URLs as the target.

### Failure codes

- `slack_target_missing`
- `slack_transport_not_configured`
- `slack_inline_target_disallowed`
- `slack_transport_credential_policy_violation`

## PagerDuty

### Supported credential modes

1. Inline `routing_key:<key>` target.
2. Routing map env `TEMPLATE_CERTIFICATION_ALERT_PAGERDUTY_ROUTING_MAP_JSON`.
3. Global env `TEMPLATE_CERTIFICATION_ALERT_PAGERDUTY_ROUTING_KEY`.

### Required checks

1. Confirm target is configured and channel is enabled.
2. If `allowInlineTargetCredentials=false`, do not use inline routing keys.
3. Ensure route map JSON parses correctly and keys resolve for configured targets.

### Failure codes

- `pagerduty_target_missing`
- `pagerduty_transport_not_configured`
- `pagerduty_inline_target_disallowed`

## Email (Resend)

### Supported credential modes

1. Dedicated credentials:
   - `TEMPLATE_CERTIFICATION_ALERT_EMAIL_API_KEY`
   - `TEMPLATE_CERTIFICATION_ALERT_EMAIL_FROM`
2. Fallback credentials:
   - `RESEND_API_KEY`
   - `AUTH_RESEND_FROM`

### Required checks

1. Confirm target recipients are present in `channels.email.target`.
2. Confirm API key and sender are configured.
3. If `requireDedicatedCredentials=true`, set dedicated env vars and do not rely on fallback env vars.

### Failure codes

- `email_target_missing`
- `email_target_invalid`
- `email_transport_not_configured`
- `email_transport_credential_policy_violation`

## Requirement authoring standards

Risk-policy requirement authoring is normalized to deterministic fail-closed standards:

1. Every tier always includes `manifest_integrity` and `risk_assessment`.
2. `medium` and `high` tiers always include at least one operational evidence requirement:
   `wae_eval`, `behavioral_eval`, `tool_contract_eval`, or `policy_compliance_eval`.
3. Requirement ordering is canonical and deterministic for auditability.

Audit surface:

- `getTemplateCertificationRiskPolicy` and current-template status now expose `requirementAuthoring` coverage.
- Evidence recording summaries include `requirementAuthoring` snapshot details.

## Verification checklist

1. `npm run typecheck`
2. `npx vitest run tests/unit/ai/templateCertificationPolicyAndEvidence.test.ts tests/unit/ai/agentCatalogAdmin.waeRolloutGateControl.test.ts tests/unit/ai/agentControlCenterWaeGateCard.alertOperations.dom.test.ts`
3. `npm run docs:guard`
