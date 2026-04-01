# Records of Processing Activities (ROPA)

**Organization:** [Your Legal Entity Name]
**DPO/Privacy Contact:** [Name / privacy@yourdomain.com]
**Last Updated:** [Date]

Required by GDPR Article 30. Must be produced on request by your supervisory authority.

---

## Processing Activities

### 1. User Account Management

| Field | Value |
|-------|-------|
| **Purpose** | Creating and managing user accounts on the platform |
| **Legal Basis** | Contract performance (Art 6.1.b) |
| **Data Categories** | Email, first name, last name, timezone, language preference |
| **Data Subjects** | Platform users |
| **Recipients** | Convex (database), Vercel (hosting) |
| **Transfer to Third Country?** | Yes - US (Convex, Vercel) |
| **Transfer Safeguards** | SCCs / DPF |
| **Retention Period** | Until account deleted + 14-day grace period |
| **Security Measures** | Encryption in transit, RBAC, audit logging |

### 2. Authentication

| Field | Value |
|-------|-------|
| **Purpose** | Verifying user identity via OAuth or password |
| **Legal Basis** | Contract performance (Art 6.1.b) |
| **Data Categories** | Email, OAuth tokens, password hashes, passkeys, session tokens |
| **Data Subjects** | Platform users |
| **Recipients** | Google, Microsoft, GitHub, Apple (OAuth providers), Convex |
| **Transfer to Third Country?** | Yes - US (OAuth providers) |
| **Transfer Safeguards** | DPF (Google, Microsoft, Apple), SCCs (others) |
| **Retention Period** | Sessions: 30 days. OAuth tokens: session duration. Passwords: until changed/deleted. |
| **Security Measures** | bcrypt/PBKDF2 hashing, encrypted token storage, HTTPS |

### 3. Payment Processing

| Field | Value |
|-------|-------|
| **Purpose** | Processing subscriptions and one-time payments |
| **Legal Basis** | Contract performance (Art 6.1.b) |
| **Data Categories** | Stripe customer ID, subscription ID, billing info (held by Stripe) |
| **Data Subjects** | Paying users and organizations |
| **Recipients** | Stripe |
| **Transfer to Third Country?** | Yes - US (Stripe) |
| **Transfer Safeguards** | DPF (Stripe certified) |
| **Retention Period** | 10 years (tax law requirement) |
| **Security Measures** | No card data stored locally, Stripe PCI DSS compliance |

### 4. Email Communications

| Field | Value |
|-------|-------|
| **Purpose** | Transactional emails (auth, receipts) and marketing communications |
| **Legal Basis** | Contract (transactional), Consent (marketing) (Art 6.1.a/b) |
| **Data Categories** | Email addresses, email content, delivery metadata |
| **Data Subjects** | Platform users, form respondents |
| **Recipients** | Resend, ActiveCampaign |
| **Transfer to Third Country?** | Yes - US |
| **Transfer Safeguards** | SCCs / DPF |
| **Retention Period** | 90 days for logs, until unsubscribe for marketing |
| **Security Measures** | Unsubscribe links, HTTPS delivery |

### 5. Analytics

| Field | Value |
|-------|-------|
| **Purpose** | Understanding platform usage and improving the product |
| **Legal Basis** | Consent (Art 6.1.a) |
| **Data Categories** | Page views, user events, email (via identify), behavior data |
| **Data Subjects** | Platform users who consent |
| **Recipients** | PostHog (EU) |
| **Transfer to Third Country?** | No (EU hosted) |
| **Transfer Safeguards** | N/A |
| **Retention Period** | 26 months (PostHog default, configurable) |
| **Security Measures** | Consent required before tracking, opt-out available |

### 6. AI Chat / Page Builder

| Field | Value |
|-------|-------|
| **Purpose** | AI-assisted page building and chat functionality |
| **Legal Basis** | Contract performance (Art 6.1.b) |
| **Data Categories** | AI prompts, conversation context (may include user-entered data) |
| **Data Subjects** | Platform users using AI features |
| **Recipients** | OpenRouter (AI API provider) |
| **Transfer to Third Country?** | Yes - US |
| **Transfer Safeguards** | SCCs / DPF |
| **Retention Period** | Session-based (conversations stored until user/org deletes) |
| **Security Measures** | HTTPS, API key authentication |

### 7. Video Hosting

| Field | Value |
|-------|-------|
| **Purpose** | Hosting and streaming webinar/video content |
| **Legal Basis** | Contract performance (Art 6.1.b) |
| **Data Categories** | Video viewing data, viewer metadata, watch time |
| **Data Subjects** | Webinar attendees |
| **Recipients** | Mux |
| **Transfer to Third Country?** | Yes - US |
| **Transfer Safeguards** | SCCs / DPF |
| **Retention Period** | Until content deleted by organization |
| **Security Measures** | Signed playback tokens, HTTPS streaming |

### 8. CRM Management

| Field | Value |
|-------|-------|
| **Purpose** | Managing customer relationships and contacts |
| **Legal Basis** | Legitimate interest (Art 6.1.f) |
| **Data Categories** | Contact info, organization data, interaction history |
| **Data Subjects** | CRM contacts managed by organizations |
| **Recipients** | Convex (database), ActiveCampaign (if integrated) |
| **Transfer to Third Country?** | Yes - US |
| **Transfer Safeguards** | SCCs / DPF |
| **Retention Period** | Until deleted by organization |
| **Security Measures** | RBAC, organization isolation, audit logging |

### 9. Form Submissions

| Field | Value |
|-------|-------|
| **Purpose** | Collecting responses via organization-created forms |
| **Legal Basis** | Consent or Contract (depends on form purpose) |
| **Data Categories** | Form field data (varies per form - name, email, custom fields) |
| **Data Subjects** | Form respondents |
| **Recipients** | Convex (database) |
| **Transfer to Third Country?** | Yes - US (Convex) |
| **Transfer Safeguards** | SCCs / DPF |
| **Retention Period** | Until organization deletes |
| **Security Measures** | Organization-scoped access, HTTPS |

### 10. Maps / Location

| Field | Value |
|-------|-------|
| **Purpose** | Displaying maps and location-based content |
| **Legal Basis** | Legitimate interest (Art 6.1.f) |
| **Data Categories** | Location queries, map interactions |
| **Data Subjects** | Users viewing map content |
| **Recipients** | Radar |
| **Transfer to Third Country?** | Yes - US |
| **Transfer Safeguards** | SCCs / DPF |
| **Retention Period** | Session-based (no persistent storage) |
| **Security Measures** | API key scoping, HTTPS |

---

## Notes

- This document should be reviewed and updated quarterly
- When adding a new third-party service or data processing activity, add a new entry
- Keep this document accessible so it can be produced within 72 hours if requested by a regulator
