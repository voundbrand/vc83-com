"use client";

import { useQuery } from "convex/react";
import { CreditBalance } from "./credit-balance";
import type { Id } from "../../convex/_generated/dataModel";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const creditsApi = (require("../../convex/_generated/api") as { api: any }).api;

interface CreditBalanceWidgetProps {
  organizationId: Id<"organizations">;
}

/**
 * Taskbar credit balance widget.
 * Fetches balance data and renders the compact CreditBalance display.
 */
export function CreditBalanceWidget({ organizationId }: CreditBalanceWidgetProps) {
  const balance = useQuery(creditsApi.credits.index.getCreditBalance, {
    organizationId,
  }) as {
    exists: boolean;
    dailyCredits: number;
    monthlyCredits: number;
    monthlyCreditsTotal: number;
    purchasedCredits: number;
    totalCredits: number;
  } | undefined;

  if (!balance || !balance.exists) return null;

  return (
    <CreditBalance
      variant="compact"
      dailyCredits={balance.dailyCredits}
      monthlyCredits={balance.monthlyCredits}
      monthlyCreditsTotal={balance.monthlyCreditsTotal}
      purchasedCredits={balance.purchasedCredits}
      totalCredits={balance.totalCredits}
      isUnlimited={balance.monthlyCreditsTotal === -1}
    />
  );
}
