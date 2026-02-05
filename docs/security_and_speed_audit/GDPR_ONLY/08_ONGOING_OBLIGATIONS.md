# Ongoing GDPR Obligations

GDPR compliance is not a one-time project. These are recurring tasks you must maintain.

---

## Recurring Schedule

### Monthly

| Task | Owner | Details |
|------|-------|---------|
| Review subprocessor list | DPO / Engineering | Check if any new third-party services were added. Update list and notify customers if needed. |
| Process any pending DSRs | Privacy contact | Check `privacy@` inbox. Ensure all requests answered within 30 days. |
| Review consent opt-in rates | Product / DPO | Check cookie consent analytics. Investigate if consent rates drop significantly. |
| Security incident review | Engineering | Review logs for unusual access patterns, failed auth spikes, etc. |

### Quarterly

| Task | Owner | Details |
|------|-------|---------|
| Review and update privacy policy | DPO / Legal | Check if any data practices changed. Update version number and date if modified. |
| Update ROPA | DPO | Add/remove processing activities. Verify retention periods are still accurate. |
| Cookie consent audit | Engineering | Verify tracking actually respects user choices (test with consent denied). |
| Review data retention compliance | Engineering | Verify automated cleanup jobs are running. Check for stale data that should have been deleted. |

### Annually

| Task | Owner | Details |
|------|-------|---------|
| Penetration test | Engineering / External | Full security assessment including GDPR-relevant controls. |
| DPA review with subprocessors | Legal | Verify all DPAs are still valid. Check for updated terms. |
| Staff GDPR awareness training | DPO | All team members who handle personal data. Document who was trained. |
| Check DPF certifications of US subprocessors | Legal | Verify providers are still certified at dataprivacyframework.gov. |
| Review insurance coverage | Legal / Finance | Ensure cyber liability coverage matches current risk profile. |
| Tabletop breach exercise | DPO / Engineering | Simulate a breach scenario. Test response plan. Document results. |
| Privacy policy translations | Product | If supporting new languages, ensure privacy docs are translated. |

### On Every Change

| Trigger | Action |
|---------|--------|
| New third-party service added | Update subprocessor list, sign DPA, notify B2B customers (30 days advance), update ROPA |
| New data collection added | Update privacy policy, update ROPA, check if consent needed |
| New feature processing personal data | Privacy impact assessment, update ROPA |
| Data breach detected | Follow breach response plan (see `06_BREACH_RESPONSE_PLAN.md`) |
| User submits DSR | Follow DSR handling guide (see `07_DSR_HANDLING_GUIDE.md`) |
| Privacy policy updated | Notify users, update version number, consider if re-consent is needed |
| Employee joins/leaves | Train new employees, revoke access for departing ones |

---

## Compliance Calendar Template

Copy this into your project management tool:

```
JANUARY
- [ ] Monthly: Review subprocessor list
- [ ] Monthly: Process DSRs
- [ ] Monthly: Review consent rates
- [ ] Quarterly: Review privacy policy
- [ ] Annual: Staff GDPR training

FEBRUARY
- [ ] Monthly: Review subprocessor list
- [ ] Monthly: Process DSRs
- [ ] Monthly: Security incident review

MARCH
- [ ] Monthly: Review subprocessor list
- [ ] Monthly: Process DSRs
- [ ] Quarterly: Cookie consent audit
- [ ] Quarterly: Update ROPA

APRIL
- [ ] Monthly: Review subprocessor list
- [ ] Monthly: Process DSRs
- [ ] Quarterly: Review privacy policy
- [ ] Quarterly: Review data retention

[Continue for remaining months...]

DECEMBER
- [ ] Monthly: Review subprocessor list
- [ ] Monthly: Process DSRs
- [ ] Annual: Penetration test
- [ ] Annual: DPA review
- [ ] Annual: Check DPF certifications
- [ ] Annual: Review insurance
- [ ] Annual: Tabletop breach exercise
```

---

## Record Keeping

Maintain these records at all times:

| Record | Location | Retention |
|--------|----------|-----------|
| ROPA | `docs/security_and_speed_audit/GDPR_ONLY/05_ROPA_TEMPLATE.md` | Current + previous version |
| Signed DPAs | `legal/signed-dpas/` (your storage) | Duration of relationship + 3 years |
| DSR log | Internal spreadsheet or tool | 3 years |
| Consent records | `consentRecords` table in Convex | Duration of relationship + 1 year |
| Breach register | See `06_BREACH_RESPONSE_PLAN.md` | 5 years |
| Training records | Internal HR/docs | 3 years |
| Privacy policy versions | Git history or versioned docs | Indefinite |
