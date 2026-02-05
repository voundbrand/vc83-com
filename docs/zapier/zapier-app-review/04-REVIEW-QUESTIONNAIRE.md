# Phase 4: Review Questionnaire

**Time:** 1 hour
**Status:** Not Started
**Prerequisites:** Phase 3 complete (3 users with live Zaps)

---

## 🎯 Goal

Complete the Zapier review questionnaire with accurate information to submit for publication.

This document provides **pre-filled answers** based on your l4yercak3 platform.

---

## 📋 Questionnaire Sections

### **Section 1: Integration Readiness & API Ownership**

#### Q1: Are you using any APIs hosted on a domain you do not own?

**Answer:** `No`

**Explanation:** All API endpoints use `agreeable-lion-828.convex.site` which is your Convex deployment.

---

#### Q2: Does the integration use production API endpoints?

**Answer:** `Yes`

**Checklist:**
- [x] OAuth endpoints: `https://agreeable-lion-828.convex.site/oauth/authorize`
- [x] Webhook endpoints: `https://agreeable-lion-828.convex.site/api/v1/webhooks/subscribe`
- [x] CRM endpoints: `https://agreeable-lion-828.convex.site/api/v1/crm/contacts`
- [x] All endpoints are production (not staging/dev)

**Explanation:** Yes, all endpoints point to production Convex deployment.

---

#### Q3: Do your users need to pay anything additional in order to use this Zapier/API app?

**Answer:** `No additional payment required for API access`

**Explanation:**
- l4yercak3 platform has paid tiers (Free, Community, Starter, Professional, etc.)
- BUT: Zapier integration works on ALL tiers (including Free)
- Users don't need to upgrade specifically to use Zapier
- API access is included in their existing plan

**Alternative Answer (if you want to limit to paid tiers):**
`Users must have a paid l4yercak3 plan (Starter or above) to access the API`

---

### **Section 2: Test Account Credentials**

#### Create Test Account

**CRITICAL:** You MUST create this account for Zapier reviewers.

**Steps:**

1. Go to your l4yercak3 platform
2. Create new account:
   - **Email:** `integration-testing@zapier.com`
   - **Password:** (Generate strong password, you'll share it below)
   - **Organization:** "Zapier Test Account"
   - **Plan:** Professional or Agency (give them full access)

3. Add sample data:
   - Create 5-10 test contacts
   - Create test Community subscription (if possible)
   - Ensure all features are accessible

4. Test login:
   - Log in with `integration-testing@zapier.com`
   - Verify you can access all features
   - Test OAuth flow works

---

#### Test Account Form Fields

**Username:**
```
integration-testing@zapier.com
```

**Password:**
```
[Generate and paste secure password here]
Example: Zap!3r2025SecureP@ss
```

**SSO login only:**
```
☐ Unchecked (we support email/password login)
```

**Notes:**
```
Test Account Details:
- Email: integration-testing@zapier.com
- Organization: Zapier Test Account
- Plan: Professional (full API access)
- Sample Data: 10 test contacts added
- OAuth: Tested and working
- All triggers and actions are functional

How to use:
1. Log in at https://app.l4yercak3.com
2. Navigate to Settings → Integrations → Zapier
3. Connect Zapier account using OAuth
4. Create Zaps using sample data

Contact: [your email] for any access issues
```

---

### **Section 3: App Details**

#### Q4: Application has been publicly launched

**Answer:** `Yes`

**Explanation:** l4yercak3 is live at https://app.l4yercak3.com

---

#### Q5: Is this integration a replacement for an existing one?

**Answer:** `No`

**Explanation:** This is a new integration, not replacing anything.

---

#### Q6: Are you already managing a public Zapier integration using the same API/authentication?

**Answer:** `No`

**Explanation:** This is our first Zapier integration.

---

#### Q7: Homepage URL

**Answer:**
```
https://l4yercak3.com
```

or

```
https://app.l4yercak3.com
```

(Use your main marketing site URL, NOT the login page)

---

#### Q8: API documentation URL

**Answer:**
```
https://docs.l4yercak3.com/api
```

**OR** (if you don't have public API docs yet):

```
Available via test account at:
https://app.l4yercak3.com/docs/api

Login required (use integration-testing@zapier.com account)
```

**IMPORTANT:** If you don't have API docs yet, you MUST create them before submitting!

**Minimum API docs should include:**

1. **Authentication**
   - OAuth 2.0 flow
   - Scopes: `crm:read`, `crm:write`, `webhooks:trigger`
   - Endpoints: `/oauth/authorize`, `/oauth/token`, `/oauth/revoke`

2. **Webhooks**
   - Subscribe: `POST /api/v1/webhooks/subscribe`
   - Unsubscribe: `DELETE /api/v1/webhooks/:id`
   - Events: `community_subscription_created`, `new_contact`

3. **CRM Endpoints**
   - List contacts: `GET /api/v1/crm/contacts`
   - Get contact: `GET /api/v1/crm/contacts/:id`
   - Create contact: `POST /api/v1/crm/contacts`
   - Find contact: `GET /api/v1/crm/contacts?email=...`

4. **Rate Limits**
   - How many requests per minute?
   - Any throttling?

5. **Error Codes**
   - 400: Bad Request
   - 401: Unauthorized
   - 403: Forbidden
   - 404: Not Found
   - 429: Rate Limit Exceeded
   - 500: Server Error

---

#### Q9: API documentation notes

**Answer:**
```
API documentation is accessible via the test account:
1. Log in with integration-testing@zapier.com
2. Navigate to Settings → Developer → API Docs
3. Full OpenAPI 3.0 spec available

All endpoints use OAuth 2.0 (Authorization Code flow).
Rate limit: 100 requests/minute per organization.

Contact [your email] for any questions.
```

---

#### Q10: Primary color (HEX)

**Answer:**
```
#6B46C1
```

(Your l4yercak3 purple color - adjust if different)

---

#### Q11: Twitter username

**Answer:**
```
l4yercak3
```

or leave blank if you don't have Twitter

---

### **Section 4: Contacts**

#### Q12: Marketing contact email

**Answer:**
```
[Your email - the person who handles marketing/announcements]
```

Example: `founder@l4yercak3.com`

**Explanation:** Zapier will contact this person for launch announcements, blog posts, co-marketing opportunities.

---

#### Q13: Technical contact email

**Answer:**
```
[Your email - the person who handles technical issues]
```

Example: `dev@l4yercak3.com` or your personal email

**Explanation:** Zapier will contact this person for bug reports, technical questions, integration issues.

---

#### Q14: Expected response time (hours)

**Answer:**
```
24 hours (business days)
```

or

```
48 hours
```

**Explanation:** Be realistic. Zapier wants to know how quickly you'll respond to urgent issues.

---

### **Section 5: Compliance & Platform Rules**

#### Q15: What country is your company based in?

**Answer:**
```
[Your country]
```

Example: `United States` or `Netherlands` or `Germany`

---

#### Q16: Does your integration transmit any sensitive values (e.g., passwords, tokens) via input fields?

**Answer:** `No`

**Explanation:**
- Authentication uses OAuth (secure)
- No passwords or tokens in input fields
- All sensitive data transmitted via secure headers

---

#### Q17: Does your integration collect financial information (e.g., credit card numbers or CVV)?

**Answer:** `No`

**Explanation:**
- We don't handle credit card processing in the integration
- Stripe handles all payments (separate from Zapier)
- No financial data transmitted via Zapier

---

#### Q18: Do you use any third-party APIs in your app/product?

**Answer:** `Yes - Stripe for payment processing`

**Explanation:**
- We use Stripe API for subscriptions
- But Zapier integration doesn't directly call Stripe
- All data comes from our platform API

**OR**

**Answer:** `No - all data comes from l4yercak3 platform only`

---

#### Q19: Do you use Zapier's branding on your website?

**Answer:** `Yes` (if you plan to add "Connect with Zapier" badges)

**OR**

**Answer:** `No` (if not yet added)

**Explanation:** If Yes, provide URL where branding appears (e.g., https://l4yercak3.com/integrations)

---

## ✅ Completion Checklist

Before submitting:

- [ ] Created `integration-testing@zapier.com` account
- [ ] Tested login with test account credentials
- [ ] Added sample data to test account
- [ ] Verified OAuth flow works with test account
- [ ] Created API documentation (or made existing docs accessible)
- [ ] Filled out ALL questionnaire fields
- [ ] Double-checked all URLs are correct
- [ ] Verified contact emails are monitored
- [ ] Test account has Professional/Agency plan access

---

## 🎯 Next Steps

Once questionnaire is complete, move to: **[05-SUBMIT-AND-REVIEW.md](./05-SUBMIT-AND-REVIEW.md)**

You're ready to submit for Zapier review!
