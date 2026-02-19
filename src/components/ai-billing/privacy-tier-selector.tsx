/**
 * Privacy Tier Selector Component
 *
 * Large radio selector for choosing between three privacy tiers:
 * - Standard (€49/month)
 * - Privacy-Enhanced (€49/month)
 * - Private LLM (€2,500+/month)
 *
 * Usage:
 * <PrivacyTierSelector
 *   currentTier="privacy-enhanced"
 *   onTierChange={(tier) => console.log(tier)}
 *   canChangeTier={true}
 * />
 */

import React from 'react';
import { Check, Info, Lock, Shield } from 'lucide-react';

type TierType = 'standard' | 'privacy-enhanced' | 'private-llm';

interface PrivacyTierSelectorProps {
  currentTier: TierType;
  onTierChange: (tier: TierType) => void;
  canChangeTier?: boolean;
  className?: string;
}

const tierData = {
  standard: {
    name: 'Standard',
    price: '€49/mo',
    priceNote: 'incl. VAT',
    icon: null,
    description: 'All models available. Data may be processed globally.',
    features: [
      'All AI models',
      '500K tokens/month included',
      'Global routing',
      'Best pricing',
    ],
    badges: [] as string[],
    available: true,
    recommended: false,
  },
  'privacy-enhanced': {
    name: 'Privacy-Enhanced',
    price: '€49/mo',
    priceNote: 'incl. VAT',
    icon: Lock,
    description: 'Zero Data Retention. EU providers prioritized.',
    features: [
      'GDPR-optimized',
      'No training on your data',
      'Zero Data Retention',
      '500K tokens/month included',
    ],
    badges: ['EU', 'ZDR', 'No Training'],
    available: true,
    recommended: true,
  },
  'private-llm': {
    name: 'Private LLM',
    price: 'from €2,500/mo',
    priceNote: 'incl. VAT',
    icon: Shield,
    description: 'Self-hosted model. Data never leaves your infrastructure.',
    features: [
      'Self-hosted infrastructure',
      'Unlimited requests',
      'Complete data control',
      'Custom models',
    ],
    badges: [],
    available: false, // Requires sales contact
    recommended: false,
  },
} as const;

export function PrivacyTierSelector({
  currentTier,
  onTierChange,
  canChangeTier = true,
  className = '',
}: PrivacyTierSelectorProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Data Privacy Level</h3>
        <p className="text-xs text-gray-600">Choose how your data is handled by AI providers</p>
      </div>

      <div className="space-y-3">
        {(Object.keys(tierData) as TierType[]).map((tier) => {
          const data = tierData[tier];
          const Icon = data.icon;
          const isSelected = currentTier === tier;
          const isAvailable = data.available;

          return (
            <button
              key={tier}
              type="button"
              onClick={() => {
                if (isAvailable && canChangeTier) {
                  onTierChange(tier);
                }
              }}
              disabled={!isAvailable || !canChangeTier}
              className={`
                w-full text-left p-4 rounded-lg border-2 transition-all
                ${isSelected ? 'border-[#6B46C1] bg-violet-50' : 'border-gray-200 bg-white hover:border-gray-300'}
                ${!isAvailable ? 'opacity-60 cursor-not-allowed' : canChangeTier ? 'cursor-pointer' : 'cursor-not-allowed'}
                ${!canChangeTier && 'opacity-75'}
              `}
            >
              <div className="flex items-start gap-3">
                {/* Radio button */}
                <div className="mt-0.5">
                  <div
                    className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                      ${isSelected ? 'border-[#6B46C1] bg-[#6B46C1]' : 'border-gray-300 bg-white'}
                    `}
                  >
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {Icon && <Icon className="h-4 w-4 text-gray-700" />}
                    <h4 className="font-semibold text-gray-900">{data.name}</h4>
                    {data.recommended && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800 rounded">
                        RECOMMENDED
                      </span>
                    )}
                    {isSelected && !isAvailable && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                        CURRENT
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-lg font-bold text-gray-900">{data.price}</span>
                    <span className="text-xs text-gray-500">{data.priceNote}</span>
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{data.description}</p>

                  {/* Privacy badges */}
                  {data.badges.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {data.badges.map((badge) => (
                        <span
                          key={badge}
                          className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded border border-blue-200"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Features list */}
                  <ul className="space-y-1.5">
                    {data.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-xs text-gray-700">
                        <Check size={12} className="text-green-600 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Contact Sales button for Private LLM */}
                  {tier === 'private-llm' && !isAvailable && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          // TODO: Open contact sales modal
                          console.log('Contact sales for Private LLM');
                        }}
                        className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      >
                        Contact Sales
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Helper text */}
      <p className="text-xs text-gray-500 mt-4 inline-flex items-center gap-1">
        <Info size={12} />
        Changing between Standard and Privacy-Enhanced is instant. Your token balance will be preserved.
      </p>
    </div>
  );
}
