# Phase 4: Platform Billing

**Phase:** 4 of 5
**Duration:** 1 week
**Status:** Not Started
**Dependencies:** Phase 3 complete

---

## Objectives

1. Implement monthly fee aggregation
2. Generate platform fee invoices for GW
3. Build admin reporting dashboard
4. Set up automated billing cron jobs

---

## Deliverables

- [ ] Monthly fee aggregation logic
- [ ] Invoice generation using existing invoicing system
- [ ] Admin dashboard for fee reporting
- [ ] Automated monthly invoice generation
- [ ] Payment reminder system

---

## Implementation

### Day 1-2: Fee Aggregation

**Task 4.1: Monthly Summary Generation**

```typescript
// convex/gw/platformFees.ts

export const generateMonthlySummary = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, { organizationId, year, month }) => {
    // Calculate period
    const periodStart = new Date(year, month - 1, 1).getTime();
    const periodEnd = new Date(year, month, 0, 23, 59, 59, 999).getTime();

    // Check if summary already exists
    const existing = await ctx.db
      .query("platformFeeSummaries")
      .withIndex("by_org_period", q =>
        q.eq("organizationId", organizationId)
          .eq("periodStart", periodStart)
      )
      .first();

    if (existing && existing.status !== "accumulating") {
      return existing._id;
    }

    // Aggregate fees
    const fees = await ctx.db
      .query("platformFees")
      .withIndex("by_org", q => q.eq("organizationId", organizationId))
      .filter(q =>
        q.and(
          q.gte(q.field("createdAt"), periodStart),
          q.lte(q.field("createdAt"), periodEnd)
        )
      )
      .collect();

    const summary = {
      benefitClaimCount: 0,
      benefitClaimFees: 0,
      stripePayoutCount: 0,
      stripePayoutFees: 0,
      paypalPayoutCount: 0,
      paypalPayoutFees: 0,
      cryptoPayoutCount: 0,
      cryptoPayoutFees: 0,
      escrowReleaseCount: 0,
      escrowReleaseFees: 0,
    };

    for (const fee of fees) {
      switch (fee.transactionType) {
        case "benefit_claim":
          summary.benefitClaimCount++;
          summary.benefitClaimFees += fee.feeAmount;
          break;
        case "commission_payout_stripe":
          summary.stripePayoutCount++;
          summary.stripePayoutFees += fee.feeAmount;
          break;
        case "commission_payout_paypal":
          summary.paypalPayoutCount++;
          summary.paypalPayoutFees += fee.feeAmount;
          break;
        case "commission_payout_crypto":
          summary.cryptoPayoutCount++;
          summary.cryptoPayoutFees += fee.feeAmount;
          break;
        case "commission_escrow_release":
          summary.escrowReleaseCount++;
          summary.escrowReleaseFees += fee.feeAmount;
          break;
      }
    }

    const subtotal =
      summary.benefitClaimFees +
      summary.stripePayoutFees +
      summary.paypalPayoutFees +
      summary.cryptoPayoutFees +
      summary.escrowReleaseFees;

    // Calculate volume discount
    const discountPercent = calculateVolumeDiscount(subtotal);
    const discountAmount = Math.round(subtotal * (discountPercent / 100));
    const total = subtotal - discountAmount;

    const summaryData = {
      organizationId,
      periodStart,
      periodEnd,
      ...summary,
      subtotal,
      discountPercent,
      discountAmount,
      total,
      status: "finalized" as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, summaryData);
      return existing._id;
    }

    return await ctx.db.insert("platformFeeSummaries", summaryData);
  },
});

function calculateVolumeDiscount(totalCents: number): number {
  if (totalCents >= 500000) return 25;
  if (totalCents >= 250000) return 20;
  if (totalCents >= 100000) return 15;
  if (totalCents >= 50000) return 10;
  return 0;
}
```

### Day 3-4: Invoice Generation

**Task 4.2: Generate Platform Fee Invoice**

```typescript
// convex/gw/platformFees.ts

export const generateMonthlyInvoice = internalMutation({
  args: {
    summaryId: v.id("platformFeeSummaries"),
  },
  handler: async (ctx, { summaryId }) => {
    const summary = await ctx.db.get(summaryId);
    if (!summary) throw new Error("Summary not found");
    if (summary.invoiceId) throw new Error("Invoice already generated");

    const org = await ctx.db.get(summary.organizationId);
    if (!org) throw new Error("Organization not found");

    // Get GW billing info
    const gwConfig = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", summary.organizationId)
          .eq("type", "platform_config")
      )
      .first();

    const billingEmail = gwConfig?.customProperties?.billingEmail || "billing@gruendungswerft.com";
    const billingName = gwConfig?.customProperties?.billingName || "Gründungswerft e.V.";

    // Format period
    const periodDate = new Date(summary.periodStart);
    const monthName = periodDate.toLocaleString("de-DE", { month: "long", year: "numeric" });

    // Build line items
    const lineItems = [];

    if (summary.benefitClaimCount > 0) {
      lineItems.push({
        description: `Benefit Claims (${summary.benefitClaimCount}x)`,
        quantity: summary.benefitClaimCount,
        unitPriceInCents: 50,
        totalPriceInCents: summary.benefitClaimFees,
        taxRatePercent: 19,
        taxAmountInCents: Math.round(summary.benefitClaimFees * 0.19),
      });
    }

    if (summary.stripePayoutCount > 0) {
      lineItems.push({
        description: `Stripe Commission Payouts (${summary.stripePayoutCount}x)`,
        quantity: 1,
        unitPriceInCents: summary.stripePayoutFees,
        totalPriceInCents: summary.stripePayoutFees,
        taxRatePercent: 19,
        taxAmountInCents: Math.round(summary.stripePayoutFees * 0.19),
        notes: "2.5% platform fee per payout",
      });
    }

    if (summary.paypalPayoutCount > 0) {
      lineItems.push({
        description: `PayPal Commission Payouts (${summary.paypalPayoutCount}x)`,
        quantity: 1,
        unitPriceInCents: summary.paypalPayoutFees,
        totalPriceInCents: summary.paypalPayoutFees,
        taxRatePercent: 19,
        taxAmountInCents: Math.round(summary.paypalPayoutFees * 0.19),
        notes: "2.5% platform fee per payout",
      });
    }

    if (summary.cryptoPayoutCount > 0) {
      lineItems.push({
        description: `Crypto Commission Payouts (${summary.cryptoPayoutCount}x)`,
        quantity: 1,
        unitPriceInCents: summary.cryptoPayoutFees,
        totalPriceInCents: summary.cryptoPayoutFees,
        taxRatePercent: 19,
        taxAmountInCents: Math.round(summary.cryptoPayoutFees * 0.19),
        notes: "1.5% platform fee per payout",
      });
    }

    if (summary.escrowReleaseCount > 0) {
      lineItems.push({
        description: `Escrow Releases (${summary.escrowReleaseCount}x)`,
        quantity: 1,
        unitPriceInCents: summary.escrowReleaseFees,
        totalPriceInCents: summary.escrowReleaseFees,
        taxRatePercent: 19,
        taxAmountInCents: Math.round(summary.escrowReleaseFees * 0.19),
        notes: "1.0% platform fee per release",
      });
    }

    // Add discount line if applicable
    if (summary.discountAmount > 0) {
      lineItems.push({
        description: `Mengenrabatt (${summary.discountPercent}%)`,
        quantity: 1,
        unitPriceInCents: -summary.discountAmount,
        totalPriceInCents: -summary.discountAmount,
        taxRatePercent: 19,
        taxAmountInCents: Math.round(-summary.discountAmount * 0.19),
      });
    }

    // Calculate totals
    const subtotalInCents = summary.total;
    const taxInCents = Math.round(subtotalInCents * 0.19);
    const totalInCents = subtotalInCents + taxInCents;

    // Create invoice using existing invoicing system
    const invoiceId = await ctx.db.insert("objects", {
      organizationId: summary.organizationId,
      type: "invoice",
      name: `Platform Fees - ${monthName}`,
      status: "draft",
      customProperties: {
        invoiceType: "platform_fee",
        billToName: billingName,
        billToEmail: billingEmail,
        lineItems,
        subtotalInCents,
        taxInCents,
        totalInCents,
        currency: "EUR",
        invoiceDate: Date.now(),
        dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // Net 30
        paymentTerms: "net30",
        periodStart: summary.periodStart,
        periodEnd: summary.periodEnd,
        isDraft: false,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update summary with invoice reference
    await ctx.db.patch(summaryId, {
      status: "invoiced",
      invoiceId,
      updatedAt: Date.now(),
    });

    // Update individual fee records
    const fees = await ctx.db
      .query("platformFees")
      .withIndex("by_org", q => q.eq("organizationId", summary.organizationId))
      .filter(q =>
        q.and(
          q.gte(q.field("createdAt"), summary.periodStart),
          q.lte(q.field("createdAt"), summary.periodEnd)
        )
      )
      .collect();

    for (const fee of fees) {
      await ctx.db.patch(fee._id, {
        status: "invoiced",
        invoiceId,
        updatedAt: Date.now(),
      });
    }

    return invoiceId;
  },
});
```

### Day 5: Cron Jobs

**Task 4.3: Automated Billing**

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

export default cronJobs()
  // Generate monthly summaries on 1st of each month
  .monthly(
    "generate monthly fee summaries",
    { day: 1, hourUTC: 2, minuteUTC: 0 },
    internal.gw.platformFees.generateAllMonthlySummaries
  )

  // Generate invoices on 2nd of each month
  .monthly(
    "generate monthly fee invoices",
    { day: 2, hourUTC: 6, minuteUTC: 0 },
    internal.gw.platformFees.generateAllMonthlyInvoices
  )

  // Send payment reminders on 15th
  .monthly(
    "send payment reminders",
    { day: 15, hourUTC: 9, minuteUTC: 0 },
    internal.gw.platformFees.sendPaymentReminders
  )

  // Check overdue invoices daily
  .daily(
    "check overdue invoices",
    { hourUTC: 8, minuteUTC: 0 },
    internal.gw.platformFees.checkOverdueInvoices
  );
```

```typescript
// convex/gw/platformFees.ts

export const generateAllMonthlySummaries = internalAction({
  handler: async (ctx) => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Get GW organization
    const gwOrgId = process.env.L4YERCAK3_GW_ORG_ID as Id<"organizations">;

    await ctx.runMutation(internal.gw.platformFees.generateMonthlySummary, {
      organizationId: gwOrgId,
      year: lastMonth.getFullYear(),
      month: lastMonth.getMonth() + 1,
    });
  },
});

export const generateAllMonthlyInvoices = internalAction({
  handler: async (ctx) => {
    // Find all finalized summaries without invoices
    const summaries = await ctx.runQuery(
      internal.gw.platformFees.getPendingInvoiceSummaries
    );

    for (const summary of summaries) {
      await ctx.runMutation(internal.gw.platformFees.generateMonthlyInvoice, {
        summaryId: summary._id,
      });

      // Send invoice email
      await ctx.runAction(internal.gw.platformFees.sendInvoiceEmail, {
        summaryId: summary._id,
      });
    }
  },
});

export const sendPaymentReminders = internalAction({
  handler: async (ctx) => {
    const unpaidInvoices = await ctx.runQuery(
      internal.gw.platformFees.getUnpaidInvoices
    );

    for (const invoice of unpaidInvoices) {
      const dueDate = new Date(invoice.customProperties?.dueDate);
      const daysUntilDue = Math.ceil(
        (dueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      );

      if (daysUntilDue <= 7 && daysUntilDue > 0) {
        await ctx.runAction(internal.gw.platformFees.sendReminderEmail, {
          invoiceId: invoice._id,
          daysUntilDue,
        });
      }
    }
  },
});
```

### Day 6-7: Admin Dashboard

**Task 4.4: Fee Reporting Queries**

```typescript
// convex/gw/platformFees.ts

export const getFeeDashboard = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { organizationId }) => {
    // Current month accumulating
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const currentMonthFees = await ctx.db
      .query("platformFees")
      .withIndex("by_org", q => q.eq("organizationId", organizationId))
      .filter(q => q.gte(q.field("createdAt"), currentMonthStart))
      .collect();

    const currentMonthTotal = currentMonthFees.reduce(
      (sum, fee) => sum + fee.feeAmount,
      0
    );

    // Recent summaries
    const summaries = await ctx.db
      .query("platformFeeSummaries")
      .withIndex("by_org", q => q.eq("organizationId", organizationId))
      .order("desc")
      .take(12);

    // Payment status
    const unpaidInvoices = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", organizationId)
          .eq("type", "invoice")
      )
      .filter(q =>
        q.and(
          q.eq(q.field("customProperties.invoiceType"), "platform_fee"),
          q.neq(q.field("status"), "paid")
        )
      )
      .collect();

    const totalOutstanding = unpaidInvoices.reduce(
      (sum, inv) => sum + (inv.customProperties?.totalInCents || 0),
      0
    );

    return {
      currentMonth: {
        transactionCount: currentMonthFees.length,
        totalFees: currentMonthTotal,
        projectedDiscount: calculateVolumeDiscount(currentMonthTotal),
      },
      history: summaries.map(s => ({
        period: new Date(s.periodStart).toLocaleString("de-DE", {
          month: "short",
          year: "numeric",
        }),
        total: s.total,
        status: s.status,
        transactionCount:
          s.benefitClaimCount +
          s.stripePayoutCount +
          s.paypalPayoutCount +
          s.cryptoPayoutCount +
          s.escrowReleaseCount,
      })),
      billing: {
        unpaidInvoices: unpaidInvoices.length,
        totalOutstanding,
      },
    };
  },
});
```

**Task 4.5: Admin UI Component**

```typescript
// src/app/(admin)/fees/page.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function FeeDashboard() {
  const dashboard = useQuery(api.gw.platformFees.getFeeDashboard, {
    organizationId: process.env.NEXT_PUBLIC_GW_ORG_ID!,
  });

  if (!dashboard) {
    return <div>Loading...</div>;
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Platform Fees</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Aktueller Monat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboard.currentMonth.totalFees)}
            </div>
            <p className="text-sm text-gray-500">
              {dashboard.currentMonth.transactionCount} Transaktionen
            </p>
            {dashboard.currentMonth.projectedDiscount > 0 && (
              <Badge variant="secondary" className="mt-2">
                {dashboard.currentMonth.projectedDiscount}% Mengenrabatt
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Offene Rechnungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboard.billing.totalOutstanding)}
            </div>
            <p className="text-sm text-gray-500">
              {dashboard.billing.unpaidInvoices} Rechnungen offen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Durchschnitt (12 Monate)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                dashboard.history.reduce((sum, h) => sum + h.total, 0) /
                  Math.max(dashboard.history.length, 1)
              )}
            </div>
            <p className="text-sm text-gray-500">pro Monat</p>
          </CardContent>
        </Card>
      </div>

      {/* History table */}
      <Card>
        <CardHeader>
          <CardTitle>Abrechnungshistorie</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zeitraum</TableHead>
                <TableHead>Transaktionen</TableHead>
                <TableHead>Gebühren</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboard.history.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{row.period}</TableCell>
                  <TableCell>{row.transactionCount}</TableCell>
                  <TableCell>{formatCurrency(row.total)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        row.status === "paid"
                          ? "default"
                          : row.status === "invoiced"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {row.status === "paid"
                        ? "Bezahlt"
                        : row.status === "invoiced"
                        ? "Rechnung gestellt"
                        : row.status === "finalized"
                        ? "Abgeschlossen"
                        : "Laufend"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Checklist

- [ ] Implement monthly fee aggregation
- [ ] Create fee summary table and mutations
- [ ] Integrate with existing invoicing system
- [ ] Generate line items for each fee type
- [ ] Apply volume discounts
- [ ] Set up monthly cron jobs
- [ ] Implement payment reminders
- [ ] Build admin fee dashboard
- [ ] Test full billing cycle
- [ ] Email templates for invoices

---

## Success Criteria

1. ✅ Monthly fees aggregated correctly
2. ✅ Invoices generated automatically
3. ✅ Volume discounts applied
4. ✅ Payment reminders sent
5. ✅ Admin dashboard shows accurate data

---

## Next Phase

[Phase 5: Launch](./PHASE_5_LAUNCH.md) - Testing, deployment, and go-live
