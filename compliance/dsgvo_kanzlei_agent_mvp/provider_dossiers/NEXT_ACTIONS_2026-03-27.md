# Next Actions After Automated Public Capture

Date: 2026-03-27

## What is complete

Public legal pages were automatically fetched into each provider dossier and checksummed in:

- `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/CAPTURE_MANIFEST_2026-03-27.md`

Upload-ready Evidence Vault metadata rows were generated in:

- `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/EVIDENCE_VAULT_UPLOAD_ROWS_2026-03-27.csv`
- `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/<provider>/EVIDENCE_VAULT_UPLOAD_ROWS.md`

## What still requires your account/manual action

1. Signed acceptance proof where provider requires account click-through or enterprise signature flow.
2. Portal screenshot showing acceptance state, tenant, and date.
3. Any downloadable signed PDF not publicly available.
4. Internal approval note for each provider in Compliance Center before status transition.

## Provider-specific manual gaps

- `convex`: confirm account-level acceptance state and capture portal proof in `intake/`.
- `stripe`: capture account DPA acceptance proof and export current account-relevant subprocessors.
- `resend`: capture org/account acceptance proof and any region/deletion commitments.
- `openrouter`: retrieve direct DPA URL or signed document from support/contact channel; terms currently only reference DPA.
- `openai_direct`: verify account-level DPA applicability and download/rendered copy; raw curl capture is lightweight and should be replaced by official PDF/downloaded view.
- `twilio`: capture account acceptance proof and note product scope (Twilio, SendGrid if used).
- `mux`: capture signed/accepted DPA proof tied to your account.
- `radar`: capture accepted DPA proof and subprocessor notice mechanism evidence.
- `posthog`: capture accepted DPA proof and environment scope (EU/US project routing).
- `vercel_analytics`: confirm whether this provider is in-scope for your current production org, then capture accepted DPA/subprocessor proof.

## Fast execution pattern per provider

1. Put account proof into `<provider>/intake/`.
2. Put signed/downloaded legal artifact into `<provider>/contract/`.
3. Update `<provider>/CHECKLIST.md` artifact manifest rows.
4. Upload artifacts in Compliance Center Evidence Vault.
5. Link in AVV outreach dossier and then update workboard status.
