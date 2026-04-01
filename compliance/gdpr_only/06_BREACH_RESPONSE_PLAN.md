# Data Breach Response Plan

GDPR Article 33 requires notifying your supervisory authority within **72 hours** of becoming aware of a personal data breach. Article 34 requires notifying affected individuals if the breach is "likely to result in a high risk" to their rights.

---

## Roles

| Role | Person | Contact |
|------|--------|---------|
| Incident Response Lead | [Name] | [Email / Phone] |
| DPO / Privacy Contact | [Name] | privacy@yourdomain.com |
| Engineering Lead | [Name] | [Email] |
| Legal Counsel | [Name / Firm] | [Email] |

---

## Phase 1: Detection & Initial Response (0-4 hours)

**Triggered by:** Security alert, user report, monitoring anomaly, third-party notification

1. **Contain the breach immediately:**
   - Revoke compromised credentials/tokens
   - Block suspicious IP addresses or accounts
   - Take affected systems offline if necessary
   - Preserve evidence (logs, screenshots, affected data)

2. **Assess initial scope:**
   - What type of data was affected? (email, names, payment info, etc.)
   - How many users are potentially impacted?
   - Is the breach still ongoing?
   - How did it happen? (vulnerability, insider, third-party compromise)

3. **Notify the Incident Response Lead and DPO**

---

## Phase 2: Full Assessment (4-24 hours)

1. **Determine severity:**

| Severity | Criteria | Action |
|----------|----------|--------|
| LOW | No personal data exposed, or data was encrypted | Document internally, no notification required |
| MEDIUM | Limited personal data exposed (e.g., emails only), small number of users | Notify supervisory authority within 72 hours |
| HIGH | Sensitive data exposed (payment, health) OR large number of users | Notify authority AND affected users |
| CRITICAL | Widespread exposure of sensitive data, active exploitation | Notify authority AND users immediately, consider public disclosure |

2. **Document everything:**
   - Timeline of events
   - Data categories affected
   - Number of users affected (exact or estimated)
   - Root cause analysis
   - Containment measures taken

---

## Phase 3: Authority Notification (Within 72 hours)

**Required if:** The breach is likely to result in a risk to individuals' rights and freedoms (basically anything beyond LOW severity).

**How to notify:**
- Use your supervisory authority's online breach notification form
- If you don't have one yet, bookmark it now:
  - Ireland DPC: https://forms.dataprotection.ie/
  - UK ICO: https://ico.org.uk/for-organisations/report-a-breach/
  - France CNIL: https://notifications.cnil.fr/notifications/index
  - Germany: Varies by state

**Information to include:**
- [ ] Nature of the breach (what happened)
- [ ] Categories of personal data affected
- [ ] Approximate number of data subjects affected
- [ ] Approximate number of data records affected
- [ ] Name and contact of DPO
- [ ] Likely consequences of the breach
- [ ] Measures taken or proposed to address the breach
- [ ] Measures to mitigate possible adverse effects

**If you don't have all information within 72 hours:** Submit what you have and provide updates as information becomes available. The 72-hour clock starts when you become "aware" of the breach.

---

## Phase 4: User Notification (If HIGH/CRITICAL)

**Required if:** The breach is "likely to result in a high risk to the rights and freedoms" of individuals.

**Not required if:**
- Data was encrypted and the key was not compromised
- You've taken measures that ensure the risk is no longer likely
- It would involve disproportionate effort (use public communication instead)

**Notification must include:**
- [ ] Clear, plain language description of what happened
- [ ] Name and contact of DPO
- [ ] Likely consequences
- [ ] What you're doing about it
- [ ] What users should do (change passwords, monitor accounts, etc.)

**How to notify:**
- Direct email to affected users
- Use your breach notification email template
- If email compromised: in-app notification, website banner, or postal mail

---

## Phase 5: Remediation (1-30 days)

1. **Fix the root cause:**
   - Patch the vulnerability
   - Update access controls
   - Rotate all potentially compromised secrets

2. **Verify the fix:**
   - Test that the vulnerability is closed
   - Review related code for similar issues
   - Run security scan

3. **Improve defenses:**
   - What monitoring would have caught this sooner?
   - What access controls would have prevented it?
   - Do you need additional security measures?

4. **Update documentation:**
   - Record the incident in your breach register
   - Update your ROPA if processing activities changed
   - Update your risk assessment

---

## Phase 6: Post-Incident Review (Within 30 days)

Hold a post-mortem meeting:
- [ ] What happened and why?
- [ ] Was the response timely and effective?
- [ ] What can be improved?
- [ ] Do policies or procedures need updating?
- [ ] Is additional training needed?
- [ ] Document lessons learned

---

## Breach Register

Maintain a register of all breaches (even minor ones). Required by GDPR Article 33(5).

| # | Date Detected | Description | Severity | Users Affected | Authority Notified? | Users Notified? | Status |
|---|--------------|-------------|----------|---------------|--------------------|--------------------|--------|
| 1 | | | | | | | |

---

## Tabletop Exercise

Test this plan at least annually with a simulated scenario:

**Example scenario:** "An engineer's laptop was stolen. It had an active session to the Convex dashboard and a local copy of .env.local with all API keys."

Walk through:
1. What's the first thing you do?
2. Who do you call?
3. What credentials need rotating?
4. How many users are affected?
5. Do you need to notify the authority?
6. What do you tell users?

**Action items:**
- [ ] Schedule first tabletop exercise
- [ ] Document results and improvements
