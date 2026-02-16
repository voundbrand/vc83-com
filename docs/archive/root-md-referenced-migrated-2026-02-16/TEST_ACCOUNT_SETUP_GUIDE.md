# Test Account Setup Guide

Complete setup instructions for test users across l4yercak3 platform, CRM, and Skool.

---

## 🎯 Purpose

These 4 test accounts will be used for:
1. **CRM Testing** - Sample contacts and data in l4yercak3
2. **Skool Testing** - Community members for auto-add automation
3. **Zapier Beta Testing** - Users who create and run Zaps
4. **Demo/Screenshots** - Realistic data for documentation

---

## 👥 Test User Profiles

### 1. Jennifer Martinez

**Platform Account:**
- **Email:** jennifer@l4yercak3.com
- **Password:** `TestUser2025!Jen`
- **Organization:** BrightWave Digital
- **Plan:** Professional (trial - 14 days)
- **Created:** January 2025

**CRM Profile (as a contact):**
- **Full Name:** Jennifer Martinez
- **Email:** jennifer@l4yercak3.com
- **Phone:** +1 (512) 555-0142
- **Company:** BrightWave Digital
- **Job Title:** Marketing Director
- **Location:** Austin, TX, USA
- **Tags:** `vip`, `marketing`, `agency`, `hot-lead`
- **Source:** Website form
- **Notes:** Interested in marketing automation. Heavy Zapier user. Currently managing 50-person team.

**Skool Profile:**
- **Name:** Jennifer Martinez
- **Email:** jennifer@l4yercak3.com
- **Courses:** Foundations
- **Join Date:** January 15, 2025
- **Status:** Active member
- **Bio:** Marketing director passionate about automation and community building

**Zapier Usage:**
- Creates Zap: Typeform → l4yercak3 Create Contact
- Creates Zap: Community Subscription → Slack notification
- Creates Zap: New Contact → HubSpot sync

---

### 2. Riley Chen

**Platform Account:**
- **Email:** riley@l4yercak3.com
- **Password:** `TestUser2025!Riley`
- **Organization:** TechFlow Solutions
- **Plan:** Starter (€29/mo - active subscription)
- **Created:** October 2024

**CRM Profile (as a contact):**
- **Full Name:** Riley Chen
- **Email:** riley@l4yercak3.com
- **Phone:** +1 (415) 555-0198
- **Company:** TechFlow Solutions
- **Job Title:** Operations Manager
- **Location:** San Francisco, CA, USA
- **Tags:** `customer`, `saas`, `operations`, `power-user`
- **Source:** Referral
- **Notes:** Runs ops for B2B SaaS startup. Uses 15+ tools via Zapier. Monthly recurring customer.

**Skool Profile:**
- **Name:** Riley Chen
- **Email:** riley@l4yercak3.com
- **Courses:** Foundations, Advanced Automation
- **Join Date:** October 20, 2024
- **Status:** Active member
- **Bio:** Operations manager helping startups scale efficiently through automation

**Zapier Usage:**
- Creates Zap: Community Subscription → Skool Add Member
- Creates Zap: New Invoice → Google Sheets
- Creates Zap: Support Ticket → Slack
- Creates Zap: Contact Updated → Webhook
- Creates Zap: New Deal → Email notification

---

### 3. Kate O'Brien

**Platform Account:**
- **Email:** kate@l4yercak3.com
- **Password:** `TestUser2025!Kate`
- **Organization:** Creator Collective
- **Plan:** Community (€9/mo - active subscription)
- **Created:** December 2024

**CRM Profile (as a contact):**
- **Full Name:** Kate O'Brien
- **Email:** kate@l4yercak3.com
- **Phone:** +44 20 7123 4567
- **Company:** Creator Collective
- **Job Title:** Community Manager
- **Location:** London, UK
- **Tags:** `community`, `content-creator`, `beta-tester`, `engaged`
- **Source:** Beta program
- **Notes:** Manages communities for content creators. Very active in Skool. Provides excellent feedback.

**Skool Profile:**
- **Name:** Kate O'Brien
- **Email:** kate@l4yercak3.com
- **Courses:** Foundations
- **Join Date:** December 5, 2024
- **Status:** Active member, Top contributor
- **Bio:** Community manager building engaged online spaces for creators worldwide

**Zapier Usage:**
- Creates Zap: Community Subscription → Welcome email
- Creates Zap: New Member → Skool onboarding
- Creates Zap: Engagement event → Slack
- Creates Zap: Weekly digest → Mailchimp

---

### 4. Amelia Thompson

**Platform Account:**
- **Email:** amelia@l4yercak3.com
- **Password:** `TestUser2025!Amelia`
- **Organization:** Thompson Consulting
- **Plan:** Free (evaluating for upgrade)
- **Created:** January 2025

**CRM Profile (as a contact):**
- **Full Name:** Amelia Thompson
- **Email:** amelia@l4yercak3.com
- **Phone:** +1 (416) 555-0173
- **Company:** Thompson Consulting
- **Job Title:** Freelance Business Consultant
- **Location:** Toronto, ON, Canada
- **Tags:** `consultant`, `freelancer`, `trial`, `referrer`
- **Source:** Google search
- **Notes:** Independent consultant. Referred 3 new users. Likely to upgrade after trial. CRM implementation specialist.

**Skool Profile:**
- **Name:** Amelia Thompson
- **Email:** amelia@l4yercak3.com
- **Courses:** Foundations
- **Join Date:** January 10, 2025
- **Status:** New member
- **Bio:** Business consultant helping SMBs implement CRM and automation strategies

**Zapier Usage:**
- Creates Zap: Contact form → l4yercak3 Create Contact
- Creates Zap: Calendar booking → CRM update

---

## 🛠️ Setup Instructions

### Step 1: Create Platform Accounts

For each user, run these commands in your l4yercak3 platform:

```typescript
// In Convex dashboard or via mutation
await ctx.runMutation(api.auth.createTestAccount, {
  email: "jennifer@l4yercak3.com",
  password: "TestUser2025!Jen",
  firstName: "Jennifer",
  lastName: "Martinez",
  organizationName: "BrightWave Digital",
  plan: "professional",
  isTrial: true
});

await ctx.runMutation(api.auth.createTestAccount, {
  email: "riley@l4yercak3.com",
  password: "TestUser2025!Riley",
  firstName: "Riley",
  lastName: "Chen",
  organizationName: "TechFlow Solutions",
  plan: "starter"
});

await ctx.runMutation(api.auth.createTestAccount, {
  email: "kate@l4yercak3.com",
  password: "TestUser2025!Kate",
  firstName: "Kate",
  lastName: "O'Brien",
  organizationName: "Creator Collective",
  plan: "community"
});

await ctx.runMutation(api.auth.createTestAccount, {
  email: "amelia@l4yercak3.com",
  password: "TestUser2025!Amelia",
  firstName: "Amelia",
  lastName: "Thompson",
  organizationName: "Thompson Consulting",
  plan: "free"
});
```

### Step 2: Add CRM Contacts

Add each user as a contact in THEIR OWN CRM:

**Jennifer's CRM (25 contacts):**
```javascript
// Sample contacts for Jennifer
contacts = [
  { email: "sarah.wilson@acmecorp.com", firstName: "Sarah", lastName: "Wilson", company: "Acme Corp", tags: ["lead", "qualified"] },
  { email: "michael.brown@techstart.io", firstName: "Michael", lastName: "Brown", company: "TechStart", tags: ["customer", "vip"] },
  // ... 23 more contacts
];
```

**Riley's CRM (42 contacts):**
```javascript
// More contacts for power user
contacts = [
  { email: "lisa.anderson@startup.com", firstName: "Lisa", lastName: "Anderson", company: "Startup Co", tags: ["hot-lead"] },
  // ... 41 more contacts
];
```

**Kate's CRM (18 contacts):**
```javascript
// Community-focused contacts
contacts = [
  { email: "creator1@example.com", firstName: "Alex", lastName: "Rivera", company: "Content Studio", tags: ["creator", "community"] },
  // ... 17 more contacts
];
```

**Amelia's CRM (65 contacts):**
```javascript
// Consultant's client list
contacts = [
  { email: "client1@business.com", firstName: "John", lastName: "Smith", company: "Smith Industries", tags: ["client", "active"] },
  // ... 64 more contacts
];
```

### Step 3: Create Skool Members

In your Skool community, add each user:

1. Go to your Skool group
2. Add members manually OR
3. Use Zapier automation to test (subscribe them to Community tier)

**Skool Member Data:**
```javascript
[
  {
    email: "jennifer@l4yercak3.com",
    firstName: "Jennifer",
    lastName: "Martinez",
    courses: ["Foundations"],
    joinDate: "2025-01-15"
  },
  {
    email: "riley@l4yercak3.com",
    firstName: "Riley",
    lastName: "Chen",
    courses: ["Foundations", "Advanced Automation"],
    joinDate: "2024-10-20"
  },
  {
    email: "kate@l4yercak3.com",
    firstName: "Kate",
    lastName: "O'Brien",
    courses: ["Foundations"],
    joinDate: "2024-12-05"
  },
  {
    email: "amelia@l4yercak3.com",
    firstName: "Amelia",
    lastName: "Thompson",
    courses: ["Foundations"],
    joinDate: "2025-01-10"
  }
]
```

### Step 4: Invite to Zapier (Beta Testing)

```bash
cd ~/Development/l4yercak3-zapier

# Invite for beta testing
zapier invite kate@l4yercak3.com 1.0.0
zapier invite riley@l4yercak3.com 1.0.0

# (Keep Jennifer and Amelia as backups)
```

---

## 📊 Testing Scenarios

### Scenario 1: Community → Skool Automation

**User:** Kate O'Brien

**Flow:**
1. Kate subscribes to Community tier (€9/mo)
2. Stripe webhook fires: `customer.subscription.created`
3. Platform triggers: `triggerCommunitySubscriptionCreated`
4. Zapier receives webhook
5. YOUR Zap runs (you created it in Phase 2)
6. Kate is added to Skool with "Foundations" course access

**Test:**
```bash
# In your platform, manually trigger Community subscription
await ctx.runMutation(api.stripe.createTestSubscription, {
  email: "kate@l4yercak3.com",
  tier: "community"
});

# Check Skool - Kate should appear as new member
```

---

### Scenario 2: Contact Sync Automation

**User:** Riley Chen

**Flow:**
1. Riley creates Zap: "New l4yercak3 Contact → Google Sheets"
2. New contact added to Riley's CRM
3. Zapier polls and finds new contact
4. Adds row to Riley's Google Sheet

**Test:**
```bash
# Add contact to Riley's CRM
await ctx.runMutation(api.crm.contacts.create, {
  organizationId: rileyOrgId,
  email: "newlead@example.com",
  firstName: "New",
  lastName: "Lead"
});

# Check Google Sheet - should have new row
```

---

### Scenario 3: Multi-User Demo

**All Users:**

Show realistic usage across plans:
- **Free (Amelia):** Basic CRM usage, exploring features
- **Community (Kate):** Active in Skool, moderate CRM usage
- **Starter (Riley):** Heavy automation user, many Zaps
- **Professional (Jennifer):** Full features, team collaboration

**Demo Script:**
1. Show Amelia's account (Free plan limits)
2. Show Kate's Community access (Skool integration)
3. Show Riley's automation (5+ active Zaps)
4. Show Jennifer's team features (Professional plan)

---

## 🔐 Security Notes

**IMPORTANT:** These are test accounts with public credentials.

- ✅ Use ONLY in development/staging environments
- ✅ Never use in production with real customer data
- ✅ Delete after testing is complete
- ✅ Passwords follow pattern: `TestUser2025![Name]`
- ❌ Do NOT use these emails for real communication
- ❌ Do NOT connect to real payment methods

---

## 📝 Quick Reference

| User | Email | Password | Plan | Contacts | Skool | Zaps |
|------|-------|----------|------|----------|-------|------|
| Jennifer | jennifer@l4yercak3.com | TestUser2025!Jen | Professional (trial) | 25 | ✅ | 3 |
| Riley | riley@l4yercak3.com | TestUser2025!Riley | Starter (€29/mo) | 42 | ✅ | 5 |
| Kate | kate@l4yercak3.com | TestUser2025!Kate | Community (€9/mo) | 18 | ✅ Top | 4 |
| Amelia | amelia@l4yercak3.com | TestUser2025!Amelia | Free | 65 | ✅ | 2 |

---

## ✅ Setup Checklist

### Platform Accounts
- [ ] Jennifer account created
- [ ] Riley account created
- [ ] Kate account created
- [ ] Amelia account created
- [ ] All can log in successfully

### CRM Data
- [ ] Jennifer has 25 contacts
- [ ] Riley has 42 contacts
- [ ] Kate has 18 contacts
- [ ] Amelia has 65 contacts

### Skool Members
- [ ] Jennifer added to Skool
- [ ] Riley added to Skool (2 courses)
- [ ] Kate added to Skool (top contributor)
- [ ] Amelia added to Skool

### Zapier Beta
- [ ] Kate invited and accepted
- [ ] Riley invited and accepted
- [ ] Both created live Zaps
- [ ] Both Zaps are running

### Testing
- [ ] Community → Skool automation tested
- [ ] Contact sync tested
- [ ] All profiles look realistic
- [ ] Ready for demo/screenshots

---

## 🎯 Next Steps

1. **Create accounts** using setup instructions above
2. **Add CRM contacts** for realistic data
3. **Invite to Skool** for community testing
4. **Send Zapier invites** to Kate & Riley
5. **Test automations** end-to-end
6. **Take screenshots** for documentation
7. **Use for demos** and presentations

These profiles give you everything you need for comprehensive testing! 🚀
