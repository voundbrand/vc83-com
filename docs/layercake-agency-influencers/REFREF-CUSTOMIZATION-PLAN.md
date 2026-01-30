# RefRef Customization Plan for Layer Cake

> What to modify to make RefRef your own affiliate system

---

## Customization Overview

| Category | Effort | Priority |
|----------|--------|----------|
| [Branding](#1-branding) | Low | P0 |
| [40% Lifetime Commission](#2-40-lifetime-commission-setup) | Low | P0 |
| [90-Day Cookie Window](#3-90-day-cookie-window) | Low | P0 |
| [Recurring Commission Logic](#4-recurring-commission-support) | Medium | P1 |
| [Payout Integration](#5-payout-integration) | Medium | P1 |
| [Email Templates](#6-email-templates) | Low | P2 |
| [Affiliate Portal Customization](#7-affiliate-portal) | Low | P2 |

---

## 1. Branding

### 1.1 Replace Logo and Name

**Files to modify:**

```
services/affiliate/
├── apps/webapp/public/
│   ├── logo.svg              ← Replace with Layer Cake logo
│   ├── logo-dark.svg         ← Dark mode version
│   └── favicon.ico           ← Replace favicon
│
├── apps/refer/public/        ← Affiliate portal assets
│   ├── logo.svg
│   └── favicon.ico
│
└── apps/www/public/          ← Marketing site (if using)
    └── ...
```

**Text replacements:**

Search and replace across the codebase:
- `RefRef` → `Layer Cake Affiliates`
- `refref` → `layercake-affiliates`
- `refref.ai` → `affiliates.layercake.com`

```bash
# Find all occurrences
cd services/affiliate
grep -r "RefRef" --include="*.tsx" --include="*.ts" --include="*.json"
```

### 1.2 Update Theme Colors

Edit `services/affiliate/packages/ui/src/styles/globals.css` or the Tailwind config:

```css
:root {
  --primary: #your-brand-color;
  --primary-foreground: #ffffff;
  /* etc. */
}
```

Or in `tailwind.config.ts`:

```typescript
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#your-brand-color',
          foreground: '#ffffff',
        },
      },
    },
  },
};
```

### 1.3 Update Metadata

Edit `services/affiliate/apps/webapp/src/app/layout.tsx`:

```typescript
export const metadata = {
  title: 'Layer Cake Affiliate Program',
  description: 'Earn 40% recurring commission promoting Layer Cake',
  // ...
};
```

---

## 2. 40% Lifetime Commission Setup

This is configured in the RefRef dashboard, not in code.

### 2.1 Create Reward Rule

In RefRef admin dashboard:

1. Go to **Programs** → Your Program → **Reward Rules**
2. Click **Create Rule**
3. Configure:

```yaml
Name: "40% Recurring Commission"
Trigger Event: "purchase"
Participant Type: "referrer"
Reward:
  Type: "cash"
  Amount: 40
  Unit: "percent"
  Currency: "USD"
```

### 2.2 Database Configuration (Alternative)

If you want to seed this programmatically, edit `services/affiliate/packages/coredb/src/seed.ts`:

```typescript
// Add to seed data
const layerCakeRewardRule = {
  programId: 'your_program_id',
  name: '40% Lifetime Commission',
  description: 'Affiliates earn 40% of every payment, forever',
  type: 'referrer_reward',
  config: {
    schemaVersion: 1,
    trigger: {
      event: 'purchase',
    },
    participantType: 'referrer',
    reward: {
      type: 'cash',
      amount: 40,
      unit: 'percent',
      currency: 'USD',
    },
  },
  priority: 1,
  isActive: true,
};
```

---

## 3. 90-Day Cookie Window

### 3.1 Attribution Script Configuration

Edit `services/affiliate/packages/attribution-script/src/index.ts`:

```typescript
// Find the cookie configuration
const COOKIE_CONFIG = {
  name: 'refref_ref',
  maxAge: 90 * 24 * 60 * 60, // 90 days in seconds
  path: '/',
  sameSite: 'lax' as const,
};
```

Or if configurable via environment:

```env
# In your .env
ATTRIBUTION_COOKIE_DAYS=90
```

### 3.2 Server-Side Attribution Window

If there's a server-side check, find and update:

```typescript
// Search for attribution window logic
const ATTRIBUTION_WINDOW_DAYS = 90;

function isWithinAttributionWindow(clickDate: Date): boolean {
  const daysSinceClick = (Date.now() - clickDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceClick <= ATTRIBUTION_WINDOW_DAYS;
}
```

---

## 4. Recurring Commission Support

RefRef tracks individual purchase events. For recurring subscriptions, you need to track EVERY payment.

### 4.1 Stripe Webhook Events to Track

Make sure you're tracking these events:

```typescript
// Events that should trigger commission
const COMMISSION_EVENTS = [
  'invoice.paid',              // Every subscription payment
  'invoice.payment_succeeded', // Alternative event
];

// Events to skip
const SKIP_EVENTS = [
  'invoice.created',           // Don't track drafts
  'invoice.upcoming',          // Don't track upcoming
];
```

### 4.2 Prevent Duplicate Commissions

RefRef already has idempotency built in (checks for existing reward with same eventId + ruleId), but verify:

```typescript
// In reward-engine.ts - this already exists
const [existingReward] = await tx
  .select()
  .from(rewardTable)
  .where(
    and(
      eq(rewardTable.eventId, eventId),
      eq(rewardTable.rewardRuleId, rule.id),
      eq(rewardTable.participantId, rewardParticipantId),
    ),
  )
  .limit(1);

if (existingReward) {
  console.log(`Reward already exists for event ${eventId} and rule ${rule.id}`);
  continue; // Skip, don't create duplicate
}
```

### 4.3 Handle Subscription Cancellations

Add handling for cancellations/refunds:

```typescript
// Add to your Stripe webhook handler
case 'customer.subscription.deleted':
case 'charge.refunded': {
  // Option 1: Mark related rewards as "cancelled"
  // Option 2: Create negative adjustment
  // Option 3: Don't claw back (simpler, more affiliate-friendly)
}
```

**Recommendation:** For affiliate-friendliness, don't claw back commissions on cancellation. Only claw back on refunds within 30 days.

---

## 5. Payout Integration

RefRef tracks rewards but doesn't have built-in payouts. You need to add this.

### 5.1 Payout Options

| Method | Integration | Effort |
|--------|-------------|--------|
| **PayPal Payouts API** | Automated batch payouts | Medium |
| **Wise Business API** | International transfers | Medium |
| **Stripe Connect** | If affiliates are on Stripe | High |
| **Manual Export** | CSV export, manual transfer | Low |

### 5.2 Add Payout Status to Rewards

The schema already has `status` and `disbursedAt` fields:

```typescript
// From schema.ts
status: text("status").notNull(), // "pending_disbursal", "disbursed"
disbursedAt: timestamp("disbursed_at"),
```

### 5.3 Create Payout Endpoint

Create `services/affiliate/apps/api/src/routes/v1/payouts.ts`:

```typescript
import { FastifyInstance } from 'fastify';
import { schema } from '@refref/coredb';
const { reward, participant } = schema;
import { eq, and, sql } from 'drizzle-orm';

export default async function payoutRoutes(fastify: FastifyInstance) {
  // Get pending payouts by affiliate
  fastify.get('/pending', async (request, reply) => {
    const pendingPayouts = await request.db
      .select({
        participantId: reward.participantId,
        participantEmail: participant.email,
        participantName: participant.name,
        totalAmount: sql<number>`SUM(${reward.amount})`,
        rewardCount: sql<number>`COUNT(*)`,
      })
      .from(reward)
      .innerJoin(participant, eq(reward.participantId, participant.id))
      .where(eq(reward.status, 'pending_disbursal'))
      .groupBy(reward.participantId, participant.email, participant.name);

    return reply.send({ payouts: pendingPayouts });
  });

  // Mark rewards as disbursed
  fastify.post('/disburse', async (request, reply) => {
    const { participantId, rewardIds } = request.body as {
      participantId: string;
      rewardIds: string[];
    };

    await request.db
      .update(reward)
      .set({
        status: 'disbursed',
        disbursedAt: new Date(),
      })
      .where(
        and(
          eq(reward.participantId, participantId),
          sql`${reward.id} = ANY(${rewardIds})`,
        ),
      );

    return reply.send({ success: true });
  });
}
```

### 5.4 PayPal Payouts Integration (Example)

```typescript
// services/affiliate/apps/api/src/services/paypal-payout.ts
import paypal from '@paypal/checkout-server-sdk';

const environment = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID!,
  process.env.PAYPAL_CLIENT_SECRET!,
);
const client = new paypal.core.PayPalHttpClient(environment);

interface PayoutItem {
  email: string;
  amount: number;
  currency: string;
  note?: string;
}

export async function createBatchPayout(items: PayoutItem[]) {
  const request = new paypal.payouts.PayoutsPostRequest();

  request.requestBody({
    sender_batch_header: {
      sender_batch_id: `LayerCake_${Date.now()}`,
      email_subject: 'Your Layer Cake affiliate commission',
      email_message: 'Thank you for being a Layer Cake affiliate!',
    },
    items: items.map((item, index) => ({
      recipient_type: 'EMAIL',
      amount: {
        value: item.amount.toFixed(2),
        currency: item.currency,
      },
      receiver: item.email,
      note: item.note || 'Affiliate commission payment',
      sender_item_id: `item_${index}`,
    })),
  });

  const response = await client.execute(request);
  return response.result;
}
```

---

## 6. Email Templates

### 6.1 Email Template Locations

```
services/affiliate/packages/email-templates/
├── src/
│   ├── welcome.tsx           ← New affiliate welcome
│   ├── commission-earned.tsx ← Commission notification
│   ├── payout-sent.tsx       ← Payout confirmation
│   └── ...
```

### 6.2 Customize Welcome Email

Edit `services/affiliate/packages/email-templates/src/welcome.tsx`:

```tsx
import { Html, Head, Body, Container, Text, Link } from '@react-email/components';

export function WelcomeEmail({ affiliateName, referralLink }: Props) {
  return (
    <Html>
      <Head />
      <Body>
        <Container>
          <Text>Welcome to the Layer Cake Affiliate Program, {affiliateName}!</Text>

          <Text>
            You're now part of an exclusive group earning 40% recurring commission
            for every agency you refer.
          </Text>

          <Text>Your unique referral link:</Text>
          <Link href={referralLink}>{referralLink}</Link>

          <Text>
            Quick math: 10 referrals = $2,000/month in passive income.
          </Text>

          <Text>
            Access your dashboard: https://affiliates.layercake.com
          </Text>

          <Text>
            Questions? Reply to this email or join our affiliate Slack.
          </Text>

          <Text>— The Layer Cake Team</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

### 6.3 Configure Email Sending

Add to `.env`:

```env
# Resend (recommended)
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=affiliates@layercake.com
```

---

## 7. Affiliate Portal

### 7.1 Portal Features to Customize

The affiliate portal (`apps/refer`) is where affiliates:
- See their referral link
- Track clicks, signups, conversions
- View commission earnings
- Request payouts

### 7.2 Add Commission Calculator

Create a widget showing potential earnings:

```tsx
// apps/refer/src/components/commission-calculator.tsx
export function CommissionCalculator() {
  const [referrals, setReferrals] = useState(10);
  const monthlyCommission = referrals * 599 * 0.4; // $599/mo × 40%
  const yearlyCommission = monthlyCommission * 12;

  return (
    <div className="p-6 border rounded-lg">
      <h3 className="font-bold">Earnings Calculator</h3>

      <input
        type="range"
        min={1}
        max={100}
        value={referrals}
        onChange={(e) => setReferrals(Number(e.target.value))}
      />

      <p>{referrals} referrals</p>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div>
          <p className="text-sm text-gray-500">Monthly</p>
          <p className="text-2xl font-bold">${monthlyCommission.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Yearly</p>
          <p className="text-2xl font-bold">${yearlyCommission.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
```

### 7.3 Add Marketing Materials Section

```tsx
// apps/refer/src/app/resources/page.tsx
export default function ResourcesPage() {
  const resources = [
    {
      name: 'Product Demo Video',
      type: 'video',
      url: '/resources/demo.mp4',
    },
    {
      name: 'Logo Pack',
      type: 'download',
      url: '/resources/logos.zip',
    },
    {
      name: 'Email Swipe Copy',
      type: 'document',
      url: '/resources/email-templates.pdf',
    },
    // ...
  ];

  return (
    <div>
      <h1>Marketing Resources</h1>
      <p>Everything you need to promote Layer Cake</p>

      <div className="grid gap-4">
        {resources.map((resource) => (
          <ResourceCard key={resource.name} {...resource} />
        ))}
      </div>
    </div>
  );
}
```

---

## 8. File Change Summary

### Must Change (P0)

| File | Change |
|------|--------|
| `apps/webapp/public/logo.svg` | Replace logo |
| `apps/refer/public/logo.svg` | Replace logo |
| `apps/*/src/app/layout.tsx` | Update metadata |
| `packages/attribution-script/src/index.ts` | Set 90-day cookie |
| **Dashboard** | Create 40% reward rule |

### Should Change (P1)

| File | Change |
|------|--------|
| `packages/ui/tailwind.config.ts` | Brand colors |
| `apps/api/src/routes/v1/payouts.ts` | Create payout endpoints |
| `services/paypal-payout.ts` | Add PayPal integration |

### Nice to Have (P2)

| File | Change |
|------|--------|
| `packages/email-templates/*` | Customize emails |
| `apps/refer/src/components/*` | Add calculator, resources |
| `apps/www/*` | Customize marketing site |

---

## 9. Testing Checklist

### Commission Calculation
- [ ] 40% calculated correctly on $599 payment ($239.60)
- [ ] Commission created for referrer, not referee
- [ ] No duplicate commissions on same invoice
- [ ] Recurring payments create new commissions

### Attribution
- [ ] Referral link captures code in cookie
- [ ] Cookie persists for 90 days
- [ ] Signup attributed to referrer
- [ ] Attribution survives page refreshes

### Payout Flow
- [ ] Pending payouts aggregate correctly
- [ ] Payout marks rewards as disbursed
- [ ] Disbursed rewards don't show in pending

### Affiliate Experience
- [ ] Can register as affiliate
- [ ] Can see referral link
- [ ] Can see click/signup/conversion stats
- [ ] Can see commission earnings
- [ ] Portal shows Layer Cake branding

---

## 10. Maintenance Notes

### Updating RefRef

If you want upstream updates (bug fixes, features):

```bash
cd services/affiliate

# Add upstream remote
git remote add upstream https://github.com/refrefhq/refref.git

# Fetch updates
git fetch upstream

# Merge (careful - may have conflicts with your customizations)
git merge upstream/main

# Resolve conflicts, keeping your customizations
```

### Database Migrations

When RefRef schema changes:

```bash
cd services/affiliate
pnpm -F @refref/coredb db:push  # Push schema changes
pnpm -F @refref/coredb db:migrate  # Run migrations
```

---

*Part of the [Layer Cake Affiliate Recruitment Campaign](./README.md)*
