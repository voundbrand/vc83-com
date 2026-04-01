# Provider Dossiers (Local Intake Staging)

Purpose: local staging area for provider AVV/DPA evidence before manual upload to the Compliance Evidence Vault.

## Folder layout

Use one provider folder per service under:

- `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/<provider>/`

Recommended subfolders you create per provider while collecting:

- `contract/` (signed AVV/DPA, contractual annexes)
- `transfer/` (SCC, DPF screenshot/export, TIA notes)
- `security/` (TOM/security docs, ISO/SOC evidence)
- `subprocessors/` (current subprocessor list and change notice policy)
- `intake/` (portal screenshots, email confirmations, notes)

## Filename convention

Use sortable, audit-friendly names:

- `YYYY-MM-DD_<provider>_<artifact>_<version>.pdf`
- `YYYY-MM-DD_<provider>_<artifact>_screenshot.png`
- `YYYY-MM-DD_<provider>_intake_notes.md`

Examples:

- `2026-03-27_stripe_dpa_v1.pdf`
- `2026-03-27_stripe_subprocessors_export.pdf`
- `2026-03-27_stripe_portal_acceptance_screenshot.png`

## Important

1. Do not commit secrets or credentials.
2. This folder is intake staging only; final control status is tracked in Compliance Inbox/Evidence Vault.
3. Keep the same artifact references in `AVV_PROVIDER_COLLECTION_RUNBOOK.md` for traceability.
4. Use `WORKBOARD.md` in this folder as the execution tracker.
5. Use `<provider>/CHECKLIST.md` to validate closure package completeness before any dossier status transition.
6. Use `EVIDENCE_VAULT_UPLOAD_ROWS_<date>.csv` and `<provider>/EVIDENCE_VAULT_UPLOAD_ROWS.md` for upload-ready metadata rows.
