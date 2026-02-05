# Phase 2: Create Test Zaps

**Time:** 1-2 hours
**Status:** Not Started
**Prerequisites:** Phase 1 complete (code pushed)

---

## 🎯 Goal

Create and run at least 4 live Zaps to satisfy Zapier's testing requirements:
1. Community Subscription → Skool (REST Hook trigger)
2. New Contact → Action (Polling trigger)
3. Trigger → Create Contact (Action)
4. Trigger → Find Contact (Search)

This will resolve ALL "T001" and "S002" warnings.

---

## 📋 Pre-Flight Checklist

Before creating Zaps, ensure:

- [ ] Zapier app is pushed (`zapier push` completed)
- [ ] You have a l4yercak3 account (your production account)
- [ ] You have a Skool account (for Community → Skool Zap)
- [ ] Your production Convex deployment is running
- [ ] OAuth endpoints are live at: `https://agreeable-lion-828.convex.site/oauth/authorize`

---

## 🔐 Step 1: Connect Your l4yercak3 Account

### 1.1 Go to Zapier

```bash
open https://zapier.com/app/zaps
```

### 1.2 Create New Zap

1. Click **"Create Zap"**
2. In the trigger search, type **"l4yercak3"**
3. You should see your private app (shows "Private" badge)

### 1.3 Connect Account

1. Click **"Connect l4yercak3"**
2. You'll be redirected to: `https://agreeable-lion-828.convex.site/oauth/authorize`
3. **Log in** with your l4yercak3 credentials
4. **Approve** access
5. You'll be redirected back to Zapier
6. Connection successful! ✅

**✅ Completion:** You now have 1 connected account (resolves A001 warning)

---

## 🎯 Step 2: Create Community → Skool Zap

**Purpose:** Test the REST Hook trigger (instant notification)

### 2.1 Configure Trigger

1. **App:** l4yercak3
2. **Trigger:** New Community Subscription
3. **Account:** Select your connected account
4. Click **"Continue"**

### 2.2 Test Trigger

Zapier will ask you to test the trigger. Since you likely don't have recent Community subscriptions:

**Option A:** Create a test subscription
- Go to your landing page
- Subscribe to Community tier (€9/mo)
- Use test credit card: `4242 4242 4242 4242`
- Zapier should receive the webhook!

**Option B:** Use sample data
- Click **"Skip test"**
- Use the sample data provided
- Continue to action step

### 2.3 Configure Action (Skool)

1. **App:** Skool
2. **Action:** Add Member to Group
3. **Account:** Connect your Skool account
4. **Map Fields:**
   - Email → `{{email}}` (from trigger)
   - First Name → `{{firstName}}`
   - Last Name → `{{lastName}}`
   - Group → Select your Skool group
   - Courses → Map `{{customCourseAccess}}` if available

### 2.4 Test & Turn On

1. Click **"Test action"**
2. Check Skool - member should be added!
3. Turn on the Zap
4. **Name it:** "Community Subscription → Skool Auto-Add"

**✅ Completion:** You now have 1 live Zap using `community_subscription_created` trigger!

---

## 📞 Step 3: Create New Contact → Action Zap

**Purpose:** Test the polling trigger

### 3.1 Configure Trigger

1. Create new Zap
2. **App:** l4yercak3
3. **Trigger:** New Contact
4. **Account:** Your connected account
5. Click **"Test trigger"**

**Note:** This polls your CRM for new contacts. If you don't have any:
- Add a test contact in your l4yercak3 CRM
- OR use sample data and skip test

### 3.2 Configure Action (Example: Slack)

1. **App:** Slack (or any app)
2. **Action:** Send Channel Message
3. **Map Fields:**
   - Message → `New contact: {{email}} ({{firstName}} {{lastName}})`
   - Channel → #notifications

### 3.3 Test & Turn On

1. Test action
2. Turn on Zap
3. **Name it:** "New l4yercak3 Contact → Slack Notification"

**✅ Completion:** You now have 1 live Zap using `new_contact` trigger!

---

## ➕ Step 4: Create Action Zap (Create Contact)

**Purpose:** Test the create contact action

### 4.1 Configure Trigger (Example: Typeform)

1. Create new Zap
2. **App:** Typeform (or Google Forms, Calendly, etc.)
3. **Trigger:** New Entry
4. Set up and test

### 4.2 Configure Action (l4yercak3)

1. **App:** l4yercak3
2. **Action:** Create Contact
3. **Account:** Your connected account
4. **Map Fields:**
   - Email → From trigger
   - First Name → From trigger
   - Last Name → From trigger
   - Company → From trigger (optional)
   - Tags → "lead,typeform"

### 4.3 Test & Turn On

1. Test action - should create contact in your CRM
2. Turn on Zap
3. **Name it:** "Typeform → l4yercak3 Contact"

**✅ Completion:** You now have 1 live Zap using `create_contact` action!

---

## 🔍 Step 5: Create Search Zap (Find Contact)

**Purpose:** Test the find contact search

### 5.1 Configure Trigger

1. Create new Zap
2. **App:** Any app (e.g., Gmail, Webhook)
3. **Trigger:** New Email / Webhook received

### 5.2 Configure Search (l4yercak3)

1. **App:** l4yercak3
2. **Action:** Find Contact
3. **Account:** Your connected account
4. **Search Field:**
   - Email → From trigger

### 5.3 Configure Subsequent Action

1. Add another action based on search result
2. Example: Send Slack message if found

### 5.4 Test & Turn On

1. Test search - should find existing contact
2. Turn on Zap
3. **Name it:** "Email → Find l4yercak3 Contact"

**✅ Completion:** You now have 1 live Zap using `find_contact` search!

---

## 📊 Validation Check

After creating all 4 Zaps, run:

```bash
cd ~/Development/l4yercak3-zapier
zapier validate
```

**Expected Results:**

✅ **Resolved:**
- A001 (requires at least one connected account) ← Should be GONE
- T001 for all triggers/actions ← Should be GONE
- S002 for community_subscription_created ← Should be GONE
- S002 for new_contact ← Should be GONE
- S002 for create_contact ← Should be GONE
- S002 for find_contact ← Should be GONE

❌ **Still Present:**
- S001 (must have 3 users) ← Need 2 more users
- M005 (no users match domain) ← Need users with your email domain
- Other warnings about date/time formats ← Will resolve with live data

---

## ✅ Completion Criteria

- [ ] l4yercak3 account connected to Zapier
- [ ] Community → Skool Zap created and ON
- [ ] New Contact → Action Zap created and ON
- [ ] Trigger → Create Contact Zap created and ON
- [ ] Trigger → Find Contact Zap created and ON
- [ ] All 4 Zaps tested successfully
- [ ] Validation shows fewer warnings

---

## 🎯 Next Steps

Once all Zaps are live, move to: **[03-BETA-TESTING.md](./03-BETA-TESTING.md)**

You need 2 more users to create and run Zaps (total 3 users required).
