/**
 * Subscription Status Card Component
 *
 * Displays the current AI subscription status including:
 * - Current tier with badge
 * - Next billing date
 * - Monthly cost
 * - Actions (Change Tier, Manage Subscription)
 *
 * Usage:
 * <SubscriptionStatusCard
 *   tier="privacy-enhanced"
 *   status="active"
 *   nextBillingDate={new Date()}
 *   monthlyCost={4900}
 *   currency="EUR"
 *   onChangeTier={() => {}}
 *   onManageSubscription={() => {}}
 * />
 */

import React from 'react';
import { TierBadge } from './tier-badge';
import { Calendar, CreditCard } from 'lucide-react';

type TierType = 'standard' | 'privacy-enhanced' | 'private-llm';
type StatusType = 'active' | 'past_due' | 'canceled' | 'paused';

interface SubscriptionStatusCardProps {
  tier: TierType;
  status: StatusType;
  nextBillingDate?: Date;
  monthlyCost: number; // in cents
  currency: 'EUR' | 'USD';
  onChangeTier?: () => void;
  onManageSubscription?: () => void;
  className?: string;
}

const statusConfig = {
  active: {
    label: 'Active',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    indicator: 'bg-green-500',
  },
  past_due: {
    label: 'Past Due',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    indicator: 'bg-yellow-500',
  },
  canceled: {
    label: 'Canceled',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    indicator: 'bg-red-500',
  },
  paused: {
    label: 'Paused',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    indicator: 'bg-gray-500',
  },
} as const;

export function SubscriptionStatusCard({
  tier,
  status,
  nextBillingDate,
  monthlyCost,
  currency,
  onChangeTier,
  onManageSubscription,
  className = '',
}: SubscriptionStatusCardProps) {
  const statusInfo = statusConfig[status];
  const formattedCost = (monthlyCost / 100).toFixed(2);
  const currencySymbol = currency === 'EUR' ? '€' : '$';

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  return (
    <div className={`border border-gray-200 rounded-lg p-6 bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Subscription Status
        </h3>
      </div>

      {/* Current Tier and Status */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Current Tier:</span>
          <TierBadge tier={tier} size="md" />
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusInfo.indicator}`}></div>
          <span className={`text-sm font-medium ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Billing Info */}
      <div className="space-y-2 mb-6">
        {nextBillingDate && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>Next billing: {formatDate(nextBillingDate)}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CreditCard className="h-4 w-4" />
          <span>
            Monthly cost: {currencySymbol}{formattedCost}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {onChangeTier && (
          <button
            type="button"
            onClick={onChangeTier}
            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Change Tier
          </button>
        )}
        {onManageSubscription && (
          <button
            type="button"
            onClick={onManageSubscription}
            className="px-4 py-2 text-sm font-medium text-[#6B46C1] border border-[#6B46C1] rounded hover:bg-purple-50 transition-colors"
          >
            Manage Subscription →
          </button>
        )}
      </div>

      {/* Warning messages for non-active status */}
      {status === 'past_due' && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            <strong>Payment failed.</strong> Please update your payment method to continue using AI features.
          </p>
        </div>
      )}
      {status === 'canceled' && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800">
            <strong>Subscription canceled.</strong> AI features will remain active until the end of your billing period.
          </p>
        </div>
      )}
    </div>
  );
}
