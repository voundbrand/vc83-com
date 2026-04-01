# GDPR/DSGVO System Mastery Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only`

---

## Lane gating and concurrency

1. At most one row may be `IN_PROGRESS`.
2. Complete lane `A` before lane `B` and lane `C`.
3. Lane `D` starts only after topology baseline (`GDPRSYS-003`, `GDPRSYS-004`) is complete.
4. Lane `E` starts only after all prior `P0` rows are `DONE` or explicitly `BLOCKED` with owner and mitigation.
5. Execute each row's `Verify` commands before marking `DONE`.
6. Maintain fail-closed release posture while any active-path legal/transfer blocker remains unresolved.

---

## Deterministic execution contract

1. Select `P0` rows before any `P1` row.
2. Among dependency-satisfied rows, select the lowest numeric task ID.
3. Move exactly one row to `IN_PROGRESS`.
4. Apply required changes.
5. Run listed `Verify` commands exactly as written.
6. Mark `DONE` on pass.
7. Mark `BLOCKED` on failure and record owner + mitigation.
8. Recompute dependency promotions immediately after each transition.

---

## Prompt A (Baseline lane)

You are executing lane `A` for GDPR/DSGVO system mastery.

Tasks:

1. Keep edits in `GDPR_ONLY` docs.
2. Freeze stack inventory, active provider set, and baseline decision assumptions.
3. Ensure no claim is presented without a traceable source or code evidence.
4. Run `npm run docs:guard`.

---

## Prompt B (Topology lane)

You are executing lane `B` for region and topology verification.

Tasks:

1. Confirm Convex production region and evidence linkage.
2. Confirm Vercel function-region configuration and residual processing posture.
3. Update transfer and provider matrices with explicit decisions.
4. If Convex migration is ongoing, keep Convex row `BLOCKED` until post-cutover EU snapshot is documented.
5. Run `npm run docs:guard`.

---

## Prompt C (Runtime controls lane)

You are executing lane `C` for consent and legal-surface technical controls.

Tasks:

1. Enforce analytics fail-closed defaults before consent.
2. Mount cookie-consent UI in runtime shell and persist decisions.
3. Add/verify legal route surfaces (`privacy`, `terms`, `cookies`) as required.
4. Run `npm run typecheck`, `npm run test:unit`, `npm run docs:guard`.

---

## Prompt D (Contracts lane)

You are executing lane `D` for legal and transfer evidence closure.

Tasks:

1. Resolve AVV checklist decisions for active providers.
2. Resolve transfer-impact and TOM evidence rows.
3. Ensure every mandatory row has owner, timestamp, and evidence link.
4. Run `npm run docs:guard`.

---

## Prompt E (Release lane)

You are executing lane `E` for release-gate closeout.

Tasks:

1. Re-run validation suite and capture evidence logs.
2. Update release gate documents with owner signoff decisions.
3. Keep `NO_GO` if any mandatory evidence remains unresolved.
4. Run `npm run docs:guard`, `npm run typecheck`, `npm run test:unit`, `npm run test:integration`.
