# Data Subject Request (DSR) Handling Guide

Users can exercise their GDPR rights at any time. You have **30 days** to respond (extendable by 2 months for complex requests, but you must inform the user within 30 days).

---

## How DSRs Come In

- Email to `privacy@yourdomain.com`
- In-app via compliance window (data export, account deletion already built)
- Postal mail to your registered address
- Any other communication channel

---

## Step 1: Verify Identity

Before processing any DSR, verify the requester is who they claim to be.

- **Logged-in user using in-app tools:** Identity already verified via session
- **Email request:** Ask them to confirm from the email address associated with their account
- **If uncertain:** Ask for additional verification (e.g., account details, recent activity)
- **Never** ask for government ID unless absolutely necessary

---

## Step 2: Identify the Right & Respond

### Right of Access (Article 15)
**User asks:** "What data do you have about me?"

| Step | Action |
|------|--------|
| 1 | Verify identity |
| 2 | Use the compliance window's data export feature (`convex/compliance.ts`) |
| 3 | Provide all personal data in machine-readable format (JSON) |
| 4 | Include: what data, why you process it, who you share it with, retention periods |
| 5 | Respond within 30 days |

**Response template:**
> Thank you for your request. Attached is a complete export of your personal data in JSON format. This includes your profile information, organization memberships, and all associated records. If you have questions about any of the data, please don't hesitate to ask.

---

### Right to Rectification (Article 16)
**User asks:** "My name/email is wrong, please fix it."

| Step | Action |
|------|--------|
| 1 | Verify identity |
| 2 | Update the data in your system |
| 3 | If data was shared with third parties, notify them of the correction |
| 4 | Confirm the change to the user |

---

### Right to Erasure (Article 17)
**User asks:** "Delete my account and all my data."

| Step | Action |
|------|--------|
| 1 | Verify identity |
| 2 | User can trigger this themselves via the compliance window |
| 3 | 14-day grace period starts (user can undo) |
| 4 | After 14 days: permanent deletion of all user data |
| 5 | Confirm deletion to the user |

**When you can refuse:**
- Legal obligation to keep the data (tax records for 10 years)
- Data needed for legal claims
- Public interest reasons

If refusing, explain why in your response.

---

### Right to Data Portability (Article 20)
**User asks:** "Give me my data in a format I can take to another service."

| Step | Action |
|------|--------|
| 1 | Verify identity |
| 2 | Use the data export feature (already outputs JSON) |
| 3 | Provide in commonly used, machine-readable format |
| 4 | If requested, transmit directly to another controller (if technically feasible) |

---

### Right to Restriction (Article 18)
**User asks:** "Stop processing my data but don't delete it."

| Step | Action |
|------|--------|
| 1 | Verify identity |
| 2 | Flag the account as restricted |
| 3 | Stop all processing except storage |
| 4 | Disable analytics tracking for this user |
| 5 | Stop sending marketing emails |
| 6 | Inform the user when restriction is lifted |

**Note:** This is different from deletion. The data stays but processing stops.

---

### Right to Object (Article 21)
**User asks:** "Stop using my data for marketing" or "Stop tracking me."

| Step | Action |
|------|--------|
| 1 | Verify identity |
| 2 | For marketing: immediately stop all marketing communications |
| 3 | For analytics: opt out of PostHog tracking |
| 4 | For profiling: stop any automated decision-making |
| 5 | Confirm to the user |

**For direct marketing:** You must stop immediately, no exceptions.
**For other processing:** You can continue if you have compelling legitimate grounds that override the user's interests.

---

### Right to Withdraw Consent (Article 7.3)
**User asks:** "I want to withdraw my cookie/tracking consent."

| Step | Action |
|------|--------|
| 1 | User can do this via cookie consent settings (once built) |
| 2 | Immediately stop the relevant processing |
| 3 | Update consent record |
| 4 | Confirm to the user |

---

## Step 3: Log the Request

Record every DSR in your log:

| Field | Value |
|-------|-------|
| Date received | |
| Requester email | |
| Right exercised | |
| Verified identity? | Yes / No |
| Date responded | |
| Outcome | Fulfilled / Partially fulfilled / Refused |
| Notes | |

---

## Deadlines

| Situation | Deadline |
|-----------|----------|
| Standard DSR | 30 calendar days |
| Complex/numerous requests | 60 additional days (90 total), but inform user within 30 days |
| Manifestly unfounded or excessive | Can charge a reasonable fee or refuse, but must justify |

---

## Response Checklist

For every DSR response:
- [ ] Identity verified
- [ ] Request understood correctly (which right?)
- [ ] Action taken within 30 days
- [ ] User informed of outcome
- [ ] Third parties notified if relevant (rectification, erasure)
- [ ] Logged in DSR register
- [ ] Audit trail updated
