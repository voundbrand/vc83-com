/**
 * Token Balance Widget Component
 *
 * Displays token balance for Standard and Privacy-Enhanced tiers:
 * - Progress bar showing included tokens usage
 * - Included vs purchased token breakdown
 * - Days until reset
 * - "Buy More" action button
 *
 * Note: Only shown for Standard and Privacy-Enhanced tiers (not Private LLM)
 *
 * Usage:
 * <TokenBalanceWidget
 *   includedTotal={500000}
 *   includedUsed={76850}
 *   purchasedBalance={1250000}
 *   daysUntilReset={12}
 *   onBuyMore={() => {}}
 *   onViewUsage={() => {}}
 * />
 */

import React from 'react';
import { Coins, TrendingUp } from 'lucide-react';

interface TokenBalanceWidgetProps {
  includedTotal: number;
  includedUsed: number;
  purchasedBalance: number;
  daysUntilReset: number;
  onBuyMore?: () => void;
  onViewUsage?: () => void;
  className?: string;
}

export function TokenBalanceWidget({
  includedTotal,
  includedUsed,
  purchasedBalance,
  daysUntilReset,
  onBuyMore,
  onViewUsage,
  className = '',
}: TokenBalanceWidgetProps) {
  const includedRemaining = includedTotal - includedUsed;
  const totalAvailable = includedRemaining + purchasedBalance;
  const percentageUsed = (includedUsed / includedTotal) * 100;

  // Color coding based on percentage used
  const getProgressColor = () => {
    if (percentageUsed >= 80) return 'bg-red-500';
    if (percentageUsed >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className={`border border-gray-200 rounded-lg p-6 bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-gray-700" />
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Token Balance
          </h3>
        </div>
        <span className="text-xs text-gray-500">
          Standard & Privacy-Enhanced only
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold text-gray-900">
            {formatNumber(totalAvailable)}
          </span>
          <span className="text-sm text-gray-500">
            / {formatNumber(includedTotal)} included
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${Math.min(percentageUsed, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Token Breakdown */}
      <div className="space-y-2 mb-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Included <span className="text-xs">(resets in {daysUntilReset} days)</span>:
          </span>
          <span className="font-medium text-gray-900">
            {formatNumber(includedRemaining)} remaining
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Purchased balance:</span>
          <span className="font-medium text-gray-900">
            {formatNumber(purchasedBalance)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {onBuyMore && (
          <button
            type="button"
            onClick={onBuyMore}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#6B46C1] rounded hover:bg-[#5a3ba3] transition-colors"
          >
            Buy More Tokens
          </button>
        )}
        {onViewUsage && (
          <button
            type="button"
            onClick={onViewUsage}
            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-1"
          >
            <TrendingUp className="h-4 w-4" />
            View Usage
          </button>
        )}
      </div>

      {/* Low Balance Warning */}
      {percentageUsed >= 80 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            <strong>Low balance warning.</strong> You've used {percentageUsed.toFixed(0)}% of your included tokens.
            {includedRemaining === 0 && ' Consider purchasing more tokens to avoid service interruption.'}
          </p>
        </div>
      )}

      {/* Zero Balance Warning */}
      {totalAvailable === 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800">
            <strong>No tokens remaining.</strong> Purchase more tokens to continue using AI features.
          </p>
        </div>
      )}
    </div>
  );
}
