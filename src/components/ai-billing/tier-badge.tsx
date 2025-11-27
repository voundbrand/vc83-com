/**
 * Tier Badge Component
 *
 * Displays the current AI subscription tier with appropriate styling.
 * Three tiers: Standard (gray), Privacy-Enhanced (blue with lock), Private LLM (gold with shield)
 *
 * Usage:
 * <TierBadge tier="privacy-enhanced" size="md" />
 */

import React from 'react';
import { Lock, Shield } from 'lucide-react';

type TierType = 'standard' | 'privacy-enhanced' | 'private-llm';

interface TierBadgeProps {
  tier: TierType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const tierConfig = {
  standard: {
    label: 'Standard',
    icon: null,
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  'privacy-enhanced': {
    label: 'Privacy-Enhanced',
    icon: Lock,
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  'private-llm': {
    label: 'Private LLM',
    icon: Shield,
    className: 'bg-yellow-100 text-yellow-900 border-yellow-200',
  },
} as const;

const sizeClasses = {
  sm: {
    badge: 'px-2 py-1 text-xs',
    icon: 'h-3 w-3',
  },
  md: {
    badge: 'px-3 py-1.5 text-sm',
    icon: 'h-4 w-4',
  },
  lg: {
    badge: 'px-4 py-2 text-base',
    icon: 'h-5 w-5',
  },
} as const;

export function TierBadge({ tier, size = 'md', className = '' }: TierBadgeProps) {
  const config = tierConfig[tier];
  const sizeClass = sizeClasses[size];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border font-semibold ${config.className} ${sizeClass.badge} ${className}`}
    >
      {Icon && <Icon className={sizeClass.icon} />}
      {config.label}
    </span>
  );
}
