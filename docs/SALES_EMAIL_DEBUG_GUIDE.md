# Sales Notification Email Debugging Guide

## 🔍 Why Am I Not Getting the Sales Notification Email?

The sales notification email implementation exists in the code, but it requires proper configuration in your checkout instance. Here's how to debug and fix it.

## 📋 How Sales Notification Works

When a checkout completes successfully, the system:
1. Retrieves the checkout instance configuration
2. Checks if `salesNotificationRecipientEmail` is configured
3. Sends an email to that address with order details
4. Uses optional custom email template if `salesNotificationEmailTemplateId` is set

**Location in code:** [convex/checkoutSessions.ts:1091-1126](convex/checkoutSessions.ts#L1091-L1126)

## 🗄️ Finding Your Checkout Instance in the Database

### Method 1: Via Convex Dashboard

1. Open your Convex dashboard
2. Go to **Data** → **objects** table
3. Filter by `type = "checkout_instance"`
4. Look for your checkout by name (e.g., "l4yercak3 Live 2024 Ticket Sales")
5. Click on it to see the full object

### Method 2: Via Code (Query)

You can query your checkout instances using this function:

```typescript
// In your Convex dashboard or code
api.checkoutOntology.getCheckoutInstances({
  sessionId: "your-session-id",
  organizationId: "your-org-id",
  status: "published" // or "draft"
})
```

### Method 3: Find by Public Slug

If you know your checkout's public URL slug:

```typescript
api.checkoutOntology.getPublicCheckoutInstance({
  orgSlug: "your-org-slug",
  publicSlug: "your-checkout-slug"
})
```

## 🔧 Configuring Sales Notification Email

### What You Need to Set

Your checkout instance needs these fields in `customProperties`:

```json
{
  "type": "checkout_instance",
  "name": "Your Checkout Name",
  "customProperties": {
    // ✅ REQUIRED: Email address to receive notifications
    "salesNotificationRecipientEmail": "sales@yourdomain.com",

    // ⚠️ OPTIONAL: Custom email template (uses default if not set)
    "salesNotificationEmailTemplateId": "j123456789...",

    // ... other config ...
  }
}
```

### How to Update Your Checkout Instance

#### Option 1: Via Convex Dashboard

1. Go to **Data** → **objects** table
2. Find your checkout instance (type = "checkout_instance")
3. Click **Edit**
4. In the `customProperties` field, add:
   ```json
   "salesNotificationRecipientEmail": "sales@yourdomain.com"
   ```
5. Click **Save**

#### Option 2: Via Code (Mutation)

```typescript
await ctx.runMutation(api.checkoutOntology.updateCheckoutInstance, {
  sessionId: "your-session-id",
  instanceId: "your-checkout-instance-id",
  configuration: {
    salesNotificationRecipientEmail: "sales@yourdomain.com",
    // Optional: add custom template
    salesNotificationEmailTemplateId: "template-id"
  }
});
```

#### Option 3: Via Checkout Window UI

If you have a checkout management UI in your app:
1. Open the checkout editing interface
2. Look for "Sales Notification" settings
3. Enter the recipient email address
4. Save the configuration

## 🐛 Common Issues and Solutions

### Issue 1: Email Field Not Set
**Symptom:** No email is sent
**Debug Log:** `"No sales notification recipient configured, skipping"`
**Solution:** Add `salesNotificationRecipientEmail` to your checkout instance (see above)

### Issue 2: Checkout Instance ID Not Found
**Symptom:** No email is sent
**Debug Log:** `"No checkout instance ID, skipping sales notification"`
**Solution:** Ensure checkout session has `checkoutInstanceId` in its `customProperties`

### Issue 3: Email Fails to Send
**Symptom:** Email configured but still not received
**Debug Log:** `"Sales notification email failed (non-critical)"`
**Solution:** Check:
- Domain configuration has valid Resend API key
- Sender email domain is verified in Resend
- Check Convex logs for detailed error message

### Issue 4: Wrong Organization's Domain Config
**Symptom:** Email tries to send but fails authentication
**Solution:** Ensure your organization has a domain configuration with Resend API key

## 📊 Checking if Email Was Sent

### 1. Check Convex Logs

Look for these log messages in your Convex dashboard logs:

**Success:**
```
📧 [completeCheckoutAndFulfill] Sending sales notification to: sales@yourdomain.com
✅ [sendSalesNotificationEmail] Sales notification sent successfully
```

**Configuration Missing:**
```
📧 [completeCheckoutAndFulfill] No sales notification recipient configured, skipping
```

**Error:**
```
❌ [sendSalesNotificationEmail] Failed to send sales notification
```

### 2. Check Email Delivery Logs

In Convex dashboard:
1. Go to **Logs**
2. Filter by function: `emailDelivery.sendSalesNotificationEmail`
3. Look for success/error messages

### 3. Check Resend Dashboard

If emails are being sent:
1. Log into your Resend dashboard
2. Go to **Logs**
3. Look for emails sent to your sales notification address

## 🧪 Testing the Email

### Quick Test Checkout

1. **Update your checkout instance** with test email:
   ```json
   "salesNotificationRecipientEmail": "your-test@email.com"
   ```

2. **Complete a test checkout:**
   - Go through the full checkout flow
   - Use Stripe test card: `4242 4242 4242 4242`
   - Complete the payment

3. **Check logs immediately:**
   - Convex dashboard → Logs
   - Filter by "sales notification"

4. **Check your inbox:**
   - Should receive email within 1-2 minutes
   - Subject: "🎉 New Order: [Customer Name] - [Total Amount]"

## 📧 Email Content Preview

The sales notification email includes:

- **Header:** Purple gradient with "🎉 New Order Received!"
- **Customer Info Box:** Name, email, phone, order date
- **Order Details Table:** Products, quantities, prices
- **Order Totals:** Subtotal, tax, total amount
- **Action Button:** Link to view order in dashboard

**Email Template Location:** [convex/emailDelivery.ts:260-350](convex/emailDelivery.ts#L260-L350)

## 🔍 Complete Debugging Checklist

Use this checklist to diagnose the issue:

- [ ] Checkout instance exists in database (`type = "checkout_instance"`)
- [ ] Checkout instance is `status = "published"`
- [ ] `customProperties.salesNotificationRecipientEmail` is set
- [ ] Email address is valid and accessible
- [ ] Organization has domain configuration
- [ ] Domain configuration has valid Resend API key
- [ ] Sender domain is verified in Resend
- [ ] Checkout session has `checkoutInstanceId` reference
- [ ] Test checkout completed successfully
- [ ] Checked Convex logs for email sending attempt
- [ ] Checked Resend dashboard for delivery status

## 💡 Pro Tips

1. **Use Environment-Specific Emails:**
   - Development: `dev-sales@yourdomain.com`
   - Production: `sales@yourdomain.com`

2. **Multiple Recipients:**
   Currently, only one email is supported. To send to multiple recipients:
   - Use an email alias/group (e.g., `sales@` forwards to multiple people)
   - Or modify the code to accept array of emails

3. **Custom Templates:**
   To use a custom email template:
   - Create an email template object in database
   - Set `salesNotificationEmailTemplateId` in checkout config
   - Template will override default HTML

## 🆘 Still Not Working?

If you've checked everything and it's still not working:

1. **Enable Debug Mode:**
   ```json
   "debugMode": true
   ```
   in your checkout instance configuration

2. **Run Manual Test:**
   Call the email function directly in Convex dashboard:
   ```typescript
   internal.emailDelivery.sendSalesNotificationEmail({
     checkoutSessionId: "your-session-id",
     recipientEmail: "test@email.com"
   })
   ```

3. **Check Error Details:**
   The function returns detailed error info:
   ```typescript
   {
     success: false,
     error: "Detailed error message here"
   }
   ```

## 📝 Example: Complete Checkout Instance Configuration

Here's a complete example of a properly configured checkout instance:

```json
{
  "_id": "j123456789...",
  "type": "checkout_instance",
  "subtype": "ticket",
  "organizationId": "j123...",
  "name": "l4yercak3 Live 2024 Ticket Sales",
  "status": "published",
  "customProperties": {
    // Template reference
    "templateCode": "behavior-driven-checkout",
    "templateId": "j123...",

    // Payment provider
    "paymentProviders": ["stripe-connect"],

    // Products
    "linkedProducts": ["j123...", "j456..."],

    // ✅ SALES NOTIFICATION (THIS IS WHAT YOU NEED!)
    "salesNotificationRecipientEmail": "sales@l4yercak3.com",
    "salesNotificationEmailTemplateId": "j789..." // Optional
  }
}
```

---

**Need Help?** Check the implementation:
- Email sending: [convex/emailDelivery.ts:167-377](convex/emailDelivery.ts#L167-L377)
- Checkout completion: [convex/checkoutSessions.ts:1091-1126](convex/checkoutSessions.ts#L1091-L1126)
