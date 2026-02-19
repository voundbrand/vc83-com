/**
 * Privacy Badge Component
 *
 * Displays privacy indicator badges for AI models and tiers.
 * Three badge types: EU (location), ZDR (zero data retention), No Training
 *
 * Usage:
 * <PrivacyBadge type="eu" size="sm" showTooltip />
 */

import React, { useState } from 'react';

type PrivacyBadgeType = 'eu' | 'zdr' | 'no-training';

interface PrivacyBadgeProps {
  type: PrivacyBadgeType;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const badgeConfig = {
  eu: {
    label: '🇪🇺 EU',
    tooltip: 'Data processed in European Union',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  zdr: {
    label: 'ZDR',
    tooltip: 'Zero Data Retention - data deleted after processing',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  'no-training': {
    label: 'No Training',
    tooltip: 'Provider does not train on your data',
    className: 'bg-violet-100 text-violet-800 border-violet-200',
  },
} as const;

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
} as const;

export function PrivacyBadge({ type, size = 'sm', showTooltip = true, className = '' }: PrivacyBadgeProps) {
  const [showTooltipState, setShowTooltipState] = useState(false);
  const config = badgeConfig[type];
  const sizeClass = sizeClasses[size];

  const badge = (
    <span
      className={`inline-flex items-center rounded border font-medium ${config.className} ${sizeClass} ${className}`}
      onMouseEnter={() => showTooltip && setShowTooltipState(true)}
      onMouseLeave={() => setShowTooltipState(false)}
      title={showTooltip ? config.tooltip : undefined}
    >
      {config.label}
    </span>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <div className="relative inline-flex">
      {badge}
      {showTooltipState && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-sm text-white bg-gray-900 rounded shadow-lg whitespace-nowrap z-50">
          {config.tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Privacy Badge Group Component
 *
 * Displays multiple privacy badges in a group
 *
 * Usage:
 * <PrivacyBadgeGroup badges={['eu', 'zdr', 'no-training']} />
 */

interface PrivacyBadgeGroupProps {
  badges: PrivacyBadgeType[];
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

export function PrivacyBadgeGroup({ badges, size = 'sm', showTooltip = true, className = '' }: PrivacyBadgeGroupProps) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {badges.map((badge) => (
        <PrivacyBadge key={badge} type={badge} size={size} showTooltip={showTooltip} />
      ))}
    </div>
  );
}
