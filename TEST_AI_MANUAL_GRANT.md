# AI Manual Grant Flow - Testing Checklist

## Prerequisites

- [ ] You are logged in as a super admin
- [ ] You have a test customer organization created
- [ ] Environment variable `OPENROUTER_API_KEY` is set in Convex dashboard

## Step 1: Grant AI Subscription (Super Admin)

1. **Navigate to Super Admin Panel**
   - Open Super Admin → Organizations window
   - Find your test customer organization
   - Click to view organization details

2. **Go to Licensing Tab**
   - Click "Licensing" tab
   - Scroll to "Grant AI Subscription Manually" section

3. **Grant Standard Subscription (Free)**
   - Tier: Select "Standard (€49/month - 500K tokens)"
   - Custom Price: Enter `0` (for free beta access)
   - Internal Notes: Enter `"Beta tester - free access for onboarding"`
   - Click "Grant Subscription"

4. **Verify Grant Success**
   - [ ] Should see green success message: "Subscription granted successfully!"
   - [ ] "Current Status" section should update to show:
     - Tier: Standard
     - Status: ACTIVE
     - Price: €0.00/month
     - Period End: ~30 days from now

## Step 2: Enable AI (Customer Organization)

1. **Switch to Customer Org**
   - Log out of super admin
   - Log in as a user in the test customer organization
   - (Or use your org switcher if available)

2. **Navigate to AI Settings**
   - Open "Manage" window
   - Click "AI Settings" tab

3. **Verify Subscription Banner**
   - [ ] Should see GREEN banner at top: "Standard Plan Active"
   - [ ] Should show: "€0.00/month • 0/500K tokens used"

4. **Enable AI Features**
   - [ ] Toggle "Enable AI Features" to ON
   - [ ] Should see model selection section appear
   - [ ] Should see 7 models pre-selected (Claude Sonnet 4, GPT-4o, etc.)
   - [ ] Default model should be "Claude Sonnet 4" (first one)

5. **Save Settings**
   - [ ] Click "Save Settings" button
   - [ ] Should see green "✓ Settings saved successfully" message

## Step 3: Test AI Chat

1. **Open AI Chat**
   - Look for AI chat window or button
   - (You may need to tell me where this is in your UI)

2. **Send Test Message**
   - Type: "Hello, can you help me create a simple test form?"
   - Send message

3. **Verify Response**
   - [ ] Should receive a response from Claude
   - [ ] Response should be relevant to creating forms
   - [ ] No errors in console

## Step 4: Verify Usage Tracking (Super Admin)

1. **Check Usage**
   - Go back to Super Admin → Organizations → Test Org → Licensing
   - Look at "AI Subscription Status" section
   - [ ] "Included Tokens" should show some usage: `{used}/500,000`

2. **Check Backend (Optional)**
   - Open Convex dashboard
   - Go to Data → `aiSubscriptions` table
   - [ ] Find record for test org
   - [ ] `status` should be "active"
   - [ ] `includedTokensUsed` should be > 0

3. **Check Usage Records (Optional)**
   - Go to Data → `aiUsage` table
   - [ ] Should see records for test org
   - [ ] `requestType` = "chat"
   - [ ] `model` = "anthropic/claude-3-5-sonnet" (or similar)
   - [ ] `totalTokens` > 0

## Common Issues & Fixes

### ❌ Issue: "No active subscription" error when using AI
**Fix**: Check that subscription status is "active" in database

### ❌ Issue: "OpenRouter API key not configured" error
**Fix**: Add `OPENROUTER_API_KEY` to Convex environment variables

### ❌ Issue: Models not showing after enabling AI
**Fix**: Subscription tier might be missing - re-grant subscription

### ❌ Issue: Subscription shows as "active" but org can't see it
**Fix**: Organization might need to refresh or re-login

## Success Criteria

✅ All checkboxes above are checked
✅ Customer can send AI chat messages and receive responses
✅ Tokens are being tracked in the database
✅ No console errors
✅ You are using YOUR platform OpenRouter key (not customer's)

---

## What to Check if Things Break

1. **Console Errors**: Open browser console (F12) and look for errors
2. **Network Tab**: Check if API calls to Convex are succeeding
3. **Convex Logs**: Open Convex dashboard → Logs to see backend errors
4. **Database State**: Check these tables in Convex dashboard:
   - `aiSubscriptions` - Should have active subscription
   - `organizationAiSettings` - Should have `enabled: true`
   - `aiConversations` - Should be created when chat is used
   - `aiMessages` - Should contain chat messages

---

**Ready to test?** Start with Step 1 and let me know where you get stuck!
