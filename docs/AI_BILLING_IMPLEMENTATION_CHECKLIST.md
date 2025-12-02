# AI Billing Implementation Checklist

This checklist breaks down the AI billing implementation into concrete, actionable tasks.

## Prerequisites ✅

- [x] AI Settings UI created with billing mode selector
- [x] Translation system integrated (6 languages)
- [x] Theme system integrated (4 themes)
- [x] OpenRouter API key configured in Convex
- [ ] Architecture document reviewed and approved
- [ ] Stripe account access confirmed
- [ ] Database schema reviewed

## Phase 1: Database Schema & Stripe Setup (Week 1)

### Database Schema Implementation

- [ ] **Create `aiBillingSchemas.ts`** (`convex/schemas/aiBillingSchemas.ts`)
  - [x] File created with complete schema definitions
  - [ ] Import in `convex/schema.ts`
  - [ ] Run `npx convex dev` to apply schema
  - [ ] Verify tables created in Convex dashboard

- [ ] **Test schema in Convex dashboard**
  - [ ] Create test `aiUsage` record
  - [ ] Create test `aiSubscriptions` record
  - [ ] Verify indexes working correctly
  - [ ] Delete test records

### Stripe Product Configuration

- [ ] **Create Stripe Products (Test Mode First)**
  - [ ] Product 1: "AI Features - Platform API Key"
    - [ ] Base price: $29/month recurring
    - [ ] Usage price: $1.50 per dollar of OpenRouter cost (metered)
    - [ ] Add metadata: `plan_type: platform`, `included_credits: 1000`
  - [ ] Product 2: "AI Features - BYOK" (Optional)
    - [ ] Price: $0/month (or $9/month for support)
    - [ ] Add metadata: `plan_type: byok`

- [ ] **Configure Stripe Webhooks**
  - [ ] Add webhook endpoint: `https://[your-domain]/api/stripe/webhooks`
  - [ ] Enable events:
    - [ ] `customer.subscription.created`
    - [ ] `customer.subscription.updated`
    - [ ] `customer.subscription.deleted`
    - [ ] `invoice.paid`
    - [ ] `invoice.payment_failed`
    - [ ] `invoice.payment_action_required`
  - [ ] Save webhook signing secret to `.env.local`

- [ ] **Update Environment Variables**
  ```bash
  # Add to .env.local
  STRIPE_SECRET_KEY=sk_test_...  # If not already present
  STRIPE_PUBLISHABLE_KEY=pk_test_...  # If not already present
  STRIPE_WEBHOOK_SECRET=whsec_...  # New webhook secret
  STRIPE_AI_PLATFORM_PRICE_ID=price_...  # Base price ID
  STRIPE_AI_USAGE_PRICE_ID=price_...  # Usage price ID
  STRIPE_AI_BYOK_PRICE_ID=price_...  # BYOK price ID (optional)
  ```

## Phase 2: Core Backend Implementation (Week 2)

### Subscription Management

- [ ] **Create `convex/aiSubscriptions.ts`**

  ```typescript
  // Mutations
  - [ ] createAISubscription() - Create new subscription
  - [ ] updateAISubscription() - Update existing subscription
  - [ ] cancelAISubscription() - Cancel subscription
  - [ ] resumeAISubscription() - Resume canceled subscription

  // Queries
  - [ ] getAISubscription() - Get org's subscription
  - [ ] getAISubscriptionStatus() - Get status only
  - [ ] listAISubscriptions() - Admin: list all subscriptions
  ```

- [ ] **Create `convex/aiUsageTracking.ts`**

  ```typescript
  // Mutations
  - [ ] recordAIUsage() - Record a single usage event
  - [ ] batchRecordUsage() - Record multiple events

  // Queries
  - [ ] getCurrentPeriodUsage() - Get usage for current period
  - [ ] getUsageHistory() - Get historical usage
  - [ ] getUsageByModel() - Break down by model
  - [ ] getUsageForecast() - Predict end-of-month usage
  ```

- [ ] **Create `convex/aiBudgetEnforcement.ts`**

  ```typescript
  // Queries
  - [ ] checkBudgetStatus() - Check if request allowed
  - [ ] getBudgetUtilization() - Get usage percentage

  // Mutations
  - [ ] sendBudgetAlert() - Send alert email/notification
  - [ ] acknowledgeBudgetAlert() - User acknowledges alert

  // Internal
  - [ ] shouldBlockRequest() - Budget enforcement logic
  ```

### Integration with Existing AI Code

- [ ] **Update `convex/ai/chat.ts`**

  ```typescript
  - [ ] Add budget check BEFORE OpenRouter call
  - [ ] Add usage recording AFTER OpenRouter call
  - [ ] Handle budget exceeded errors gracefully
  - [ ] Add cost calculation helper function
  ```

- [ ] **Update `convex/ai/aiSettings.ts`**

  ```typescript
  - [ ] Add subscription validation in enableAI()
  - [ ] Require active subscription to enable AI
  - [ ] Allow BYOK mode without subscription
  ```

### Stripe Integration

- [ ] **Create `convex/stripeAIBilling.ts`**

  ```typescript
  // Actions (call Stripe API)
  - [ ] createStripeCustomer() - Create customer if doesn't exist
  - [ ] createStripeSubscription() - Create AI subscription
  - [ ] updateStripeSubscription() - Update subscription
  - [ ] cancelStripeSubscription() - Cancel subscription
  - [ ] reportUsageToStripe() - Report metered usage
  - [ ] getStripeBillingPortalUrl() - Get portal URL

  // Webhook handlers
  - [ ] handleSubscriptionCreated()
  - [ ] handleSubscriptionUpdated()
  - [ ] handleSubscriptionDeleted()
  - [ ] handleInvoicePaid()
  - [ ] handleInvoicePaymentFailed()
  ```

- [ ] **Update `convex/stripeWebhooks.ts`**

  ```typescript
  - [ ] Add AI subscription webhook routing
  - [ ] Route to appropriate handlers in stripeAIBilling.ts
  - [ ] Add webhook event logging to aiBillingEvents
  ```

### Cron Jobs

- [ ] **Create `convex/crons/aiUsageReporting.ts`**

  ```typescript
  - [ ] Daily job: Calculate usage for each org
  - [ ] Daily job: Report usage to Stripe (metered billing)
  - [ ] Daily job: Send budget alerts if needed
  - [ ] Weekly job: Clean up old usage records
  - [ ] Monthly job: Generate usage reports
  ```

- [ ] **Register cron jobs in `convex/crons.ts`**

  ```typescript
  - [ ] Daily: reportUsageToStripe (runs at 1 AM)
  - [ ] Daily: sendBudgetAlerts (runs at 9 AM)
  - [ ] Weekly: cleanupOldUsageRecords (runs Sunday 2 AM)
  - [ ] Monthly: generateMonthlyReports (runs 1st at 3 AM)
  ```

## Phase 3: Frontend Implementation (Week 2-3)

### Billing Setup Flow

- [ ] **Create `src/components/billing/billing-setup-modal.tsx`**

  ```typescript
  - [ ] Step 1: Billing mode selector (Platform vs BYOK)
  - [ ] Step 2a: Platform mode - Stripe payment form
  - [ ] Step 2b: BYOK mode - OpenRouter API key input
  - [ ] Step 3: Review and confirm subscription
  - [ ] Step 4: Success/error handling
  ```

- [ ] **Create `src/components/billing/stripe-payment-form.tsx`**

  ```typescript
  - [ ] Integrate Stripe Elements for card input
  - [ ] Handle payment method creation
  - [ ] Show loading states
  - [ ] Handle errors gracefully
  ```

- [ ] **Create `src/components/billing/subscription-status.tsx`**

  ```typescript
  - [ ] Show subscription status badge
  - [ ] Show current usage and budget
  - [ ] Show usage progress bar
  - [ ] Link to billing portal
  ```

### AI Settings Tab Enhancements

- [ ] **Update `src/components/window-content/org-owner-manage-window/ai-settings-tab.tsx`**

  ```typescript
  - [ ] Add subscription status section
  - [ ] Add "Enable AI Features" button (opens billing modal)
  - [ ] Add "Manage Subscription" button (opens Stripe portal)
  - [ ] Show usage dashboard if subscription active
  - [ ] Hide API key section until subscription exists
  ```

### Usage Dashboard

- [ ] **Create `src/components/billing/usage-dashboard.tsx`**

  ```typescript
  - [ ] Current period usage chart (daily breakdown)
  - [ ] Cost breakdown by model
  - [ ] Request volume trends
  - [ ] Budget utilization gauge
  - [ ] Forecast for end of month
  - [ ] Export usage data button
  ```

- [ ] **Add Usage Dashboard Tab to Manage Window** (Optional)

  ```typescript
  - [ ] Add "AI Usage" tab next to AI Settings
  - [ ] Show full usage dashboard
  - [ ] Show billing history
  - [ ] Show invoice list
  ```

### Translations

- [ ] **Create `convex/translations/seedManage_09_AIBilling.ts`**

  ```typescript
  - [ ] Subscription status labels
  - [ ] Billing mode descriptions
  - [ ] Usage dashboard labels
  - [ ] Budget alert messages
  - [ ] Error messages
  - [ ] Success messages
  - [ ] Seed translations (6 languages)
  ```

- [ ] **Update `ai-settings-tab.tsx` to use new translations**

  ```typescript
  - [ ] Replace hardcoded billing text with t() calls
  - [ ] Use ui.manage.ai.billing.* namespace
  ```

## Phase 4: Testing (Week 3-4)

### Unit Tests

- [ ] **Backend Tests**
  - [ ] `aiSubscriptions.test.ts` - Subscription CRUD
  - [ ] `aiUsageTracking.test.ts` - Usage recording
  - [ ] `aiBudgetEnforcement.test.ts` - Budget checks
  - [ ] `stripeAIBilling.test.ts` - Stripe integration

- [ ] **Frontend Tests**
  - [ ] `billing-setup-modal.test.tsx` - Modal flow
  - [ ] `subscription-status.test.tsx` - Status display
  - [ ] `usage-dashboard.test.tsx` - Dashboard rendering

### Integration Tests

- [ ] **Subscription Lifecycle**
  - [ ] Create subscription (Platform mode)
  - [ ] Create subscription (BYOK mode)
  - [ ] Update subscription (change billing mode)
  - [ ] Cancel subscription
  - [ ] Resume subscription
  - [ ] Handle payment failure

- [ ] **Usage Tracking**
  - [ ] Record usage for Platform mode
  - [ ] Record usage for BYOK mode
  - [ ] Calculate period usage correctly
  - [ ] Report usage to Stripe daily
  - [ ] Handle high-volume usage

- [ ] **Budget Enforcement**
  - [ ] Allow requests under budget
  - [ ] Send alerts at thresholds (50%, 75%, 90%)
  - [ ] Block requests at 100% (Platform mode only)
  - [ ] Don't block BYOK mode requests
  - [ ] Reset budget at new period

- [ ] **Webhook Processing**
  - [ ] Handle subscription.created
  - [ ] Handle subscription.updated
  - [ ] Handle subscription.deleted
  - [ ] Handle invoice.paid (reset usage)
  - [ ] Handle invoice.payment_failed (disable AI)

### End-to-End Tests

- [ ] **Platform Key Mode Journey**
  1. [ ] User enables AI features
  2. [ ] User selects Platform Key mode
  3. [ ] User enters payment method
  4. [ ] Subscription created successfully
  5. [ ] AI features enabled
  6. [ ] User makes AI requests
  7. [ ] Usage tracked correctly
  8. [ ] Budget alerts sent at thresholds
  9. [ ] Requests blocked at budget limit
  10. [ ] Invoice paid, usage reset

- [ ] **BYOK Mode Journey**
  1. [ ] User enables AI features
  2. [ ] User selects BYOK mode
  3. [ ] User enters OpenRouter API key
  4. [ ] Subscription created (free/minimal)
  5. [ ] AI features enabled
  6. [ ] User makes AI requests
  7. [ ] Usage tracked for display
  8. [ ] No budget blocking
  9. [ ] Usage dashboard shows spend

### Manual Testing Checklist

- [ ] **Test in Stripe Test Mode**
  - [ ] Create subscriptions
  - [ ] Test with test cards (success, failure, 3D Secure)
  - [ ] Verify webhooks received
  - [ ] Check Stripe dashboard for accuracy

- [ ] **Test Budget Scenarios**
  - [ ] Low usage (under budget)
  - [ ] Approaching budget (75-90%)
  - [ ] At budget (100%)
  - [ ] Over budget (should block)

- [ ] **Test Error Handling**
  - [ ] Invalid payment method
  - [ ] Network errors
  - [ ] Stripe API errors
  - [ ] Invalid API keys (BYOK)

- [ ] **Test UI/UX**
  - [ ] All 4 themes (Win95, Dark, Purple, Blue)
  - [ ] All 6 languages
  - [ ] Mobile responsive
  - [ ] Keyboard navigation
  - [ ] Screen reader accessibility

## Phase 5: Production Launch (Week 4)

### Pre-Launch Checklist

- [ ] **Review & Approval**
  - [ ] Architecture document approved
  - [ ] Code review completed
  - [ ] Security audit passed
  - [ ] Legal review (terms, pricing)
  - [ ] Support team trained

- [ ] **Stripe Live Mode Setup**
  - [ ] Create live mode products
  - [ ] Configure live mode webhooks
  - [ ] Update production environment variables
  - [ ] Test with real payment method

- [ ] **Documentation**
  - [ ] User guide: How to enable AI features
  - [ ] User guide: Understanding billing modes
  - [ ] User guide: Managing budget and usage
  - [ ] Admin guide: Troubleshooting billing issues
  - [ ] API documentation (if exposing to customers)

- [ ] **Monitoring Setup**
  - [ ] Set up alerts for failed payments
  - [ ] Set up alerts for webhook failures
  - [ ] Set up alerts for high error rates
  - [ ] Set up dashboard for billing metrics
  - [ ] Set up logs for debugging

### Launch Day

- [ ] **Deployment**
  - [ ] Deploy backend changes to production
  - [ ] Deploy frontend changes to production
  - [ ] Verify all environment variables set
  - [ ] Test with real user account
  - [ ] Smoke test critical paths

- [ ] **Communication**
  - [ ] Send announcement email to existing users
  - [ ] Update website/landing page
  - [ ] Create blog post explaining AI features
  - [ ] Post on social media
  - [ ] Update in-app messaging

- [ ] **Monitoring (First 24 Hours)**
  - [ ] Watch for errors in logs
  - [ ] Monitor webhook processing success rate
  - [ ] Track subscription creation rate
  - [ ] Monitor support tickets
  - [ ] Check for any payment issues

### Post-Launch (Week 5+)

- [ ] **Week 1 Review**
  - [ ] Analyze conversion rate (users enabling AI)
  - [ ] Review BYOK vs Platform split
  - [ ] Check for any technical issues
  - [ ] Gather user feedback
  - [ ] Identify improvement areas

- [ ] **Ongoing Optimization**
  - [ ] A/B test pricing tiers
  - [ ] Optimize billing mode messaging
  - [ ] Improve usage dashboard
  - [ ] Add more budget controls
  - [ ] Expand AI model options

## Success Criteria

### Technical Metrics

- [ ] 99.9% webhook processing success rate
- [ ] < 100ms latency added by budget checks
- [ ] 100% usage tracking accuracy (matches OpenRouter bills)
- [ ] Zero data loss incidents
- [ ] < 1% payment failure rate

### Business Metrics

- [ ] > 10% of organizations enable AI features (Month 1)
- [ ] > $5,000 MRR from AI subscriptions (Month 1)
- [ ] < 5% monthly churn rate
- [ ] > 80% satisfaction rating (from surveys)
- [ ] Positive unit economics (revenue > costs)

### User Experience Metrics

- [ ] < 5 minutes to enable AI features
- [ ] < 10 support tickets per week (after launch)
- [ ] > 90% of budget alerts acknowledged
- [ ] > 80% of payment failures recovered
- [ ] > 4.0 star rating in user reviews

## Rollback Plan

If critical issues arise:

1. [ ] **Disable New Subscriptions**
   - Feature flag: ENABLE_AI_BILLING = false
   - Show "Coming Soon" message instead

2. [ ] **Preserve Existing Subscriptions**
   - Don't disable existing users
   - Continue processing webhooks
   - Support team handles issues manually

3. [ ] **Fix Critical Issues**
   - Deploy fix to staging
   - Test thoroughly
   - Deploy to production
   - Re-enable feature flag

4. [ ] **Communication**
   - Notify affected users via email
   - Post status update
   - Provide manual workarounds
   - Offer refunds if necessary

## Notes

- **Test Mode First**: Complete all testing in Stripe test mode before going live
- **Gradual Rollout**: Consider rolling out to 10% of organizations first
- **Feature Flags**: Use feature flags to enable/disable AI billing
- **Monitoring**: Set up comprehensive monitoring BEFORE launch
- **Support**: Train support team on AI billing before launch
- **Documentation**: Keep docs up-to-date as system evolves

## Resources

- [Stripe Subscriptions Documentation](https://stripe.com/docs/billing/subscriptions)
- [Stripe Metered Billing Guide](https://stripe.com/docs/billing/subscriptions/usage-based)
- [Stripe Webhook Events Reference](https://stripe.com/docs/api/events/types)
- [OpenRouter API Documentation](https://openrouter.ai/docs)
- [l4yercak3 AI Integration Guide](./AI_INTEGRATION.md)
- [l4yercak3 AI Billing Architecture](./AI_BILLING_ARCHITECTURE.md)
