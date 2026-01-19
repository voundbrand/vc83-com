"use client";

/**
 * PRICING SECTION
 *
 * Displays pricing tiers/plans with features and CTAs.
 */

import { EditableText } from "@/components/project-editing";
import { Check, X } from "lucide-react";
import { CTAButton } from "./cta-button";
import type {
  PricingSectionProps,
  PricingTier,
} from "@/lib/page-builder/section-registry";
import type { PageIntegrations } from "@/lib/page-builder/page-schema";

interface PricingSectionComponentProps extends PricingSectionProps {
  sectionId: string;
  isEditMode?: boolean;
  integrations?: PageIntegrations;
}

function PricingCard({
  tier,
  sectionId,
  index,
  isEditMode,
  integrations,
}: {
  tier: PricingTier;
  sectionId: string;
  index: number;
  isEditMode: boolean;
  integrations?: PageIntegrations;
}) {
  return (
    <div
      className={`relative rounded-2xl p-8 ${
        tier.highlighted
          ? "bg-indigo-600 text-white ring-2 ring-indigo-600 shadow-xl scale-105"
          : "bg-white text-gray-900 border border-gray-200 shadow-sm"
      }`}
    >
      {/* Popular badge */}
      {tier.highlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-block px-4 py-1 text-sm font-semibold bg-indigo-500 text-white rounded-full">
            Most Popular
          </span>
        </div>
      )}

      {/* Tier name */}
      {isEditMode ? (
        <EditableText
          blockId={`${sectionId}.tiers.${index}.name`}
          defaultValue={tier.name}
          as="h3"
          className={`text-xl font-bold ${tier.highlighted ? "text-white" : "text-gray-900"}`}
        />
      ) : (
        <h3 className={`text-xl font-bold ${tier.highlighted ? "text-white" : "text-gray-900"}`}>
          {tier.name}
        </h3>
      )}

      {/* Description */}
      {tier.description &&
        (isEditMode ? (
          <EditableText
            blockId={`${sectionId}.tiers.${index}.description`}
            defaultValue={tier.description}
            as="p"
            className={`mt-2 text-sm ${tier.highlighted ? "text-indigo-100" : "text-gray-500"}`}
          />
        ) : (
          <p className={`mt-2 text-sm ${tier.highlighted ? "text-indigo-100" : "text-gray-500"}`}>
            {tier.description}
          </p>
        ))}

      {/* Price */}
      <div className="mt-6 mb-6">
        {isEditMode ? (
          <EditableText
            blockId={`${sectionId}.tiers.${index}.price`}
            defaultValue={tier.price}
            as="span"
            className={`text-4xl font-bold ${tier.highlighted ? "text-white" : "text-gray-900"}`}
          />
        ) : (
          <span className={`text-4xl font-bold ${tier.highlighted ? "text-white" : "text-gray-900"}`}>
            {tier.price}
          </span>
        )}
        {tier.priceSubtext && (
          <span className={`text-sm ml-2 ${tier.highlighted ? "text-indigo-200" : "text-gray-500"}`}>
            {tier.priceSubtext}
          </span>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-8">
        {tier.features.map((feature, featureIndex) => (
          <li key={featureIndex} className="flex items-start gap-3">
            {feature.included ? (
              <Check className={`w-5 h-5 flex-shrink-0 ${tier.highlighted ? "text-indigo-200" : "text-green-500"}`} />
            ) : (
              <X className={`w-5 h-5 flex-shrink-0 ${tier.highlighted ? "text-indigo-300" : "text-gray-300"}`} />
            )}
            <span className={`text-sm ${
              feature.included
                ? tier.highlighted ? "text-white" : "text-gray-700"
                : tier.highlighted ? "text-indigo-300" : "text-gray-400"
            }`}>
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <CTAButton
        {...tier.cta}
        variant={tier.highlighted ? "secondary" : "primary"}
        className={`w-full justify-center ${
          tier.highlighted
            ? "bg-white text-indigo-600 hover:bg-indigo-50"
            : "bg-indigo-600 text-white hover:bg-indigo-700"
        }`}
        integrations={integrations}
      />
    </div>
  );
}

export function PricingSection({
  sectionId,
  isEditMode = false,
  integrations,
  badge,
  title,
  subtitle,
  titleClassName = "text-3xl sm:text-4xl font-bold text-gray-900",
  subtitleClassName = "text-lg text-gray-600 mt-4 max-w-2xl mx-auto",
  backgroundClassName = "bg-white py-16 sm:py-24",
  tiers,
}: PricingSectionComponentProps) {
  return (
    <section className={backgroundClassName}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          {badge && (
            <span className="inline-block px-3 py-1 text-sm font-medium text-indigo-600 bg-indigo-100 rounded-full mb-4">
              {isEditMode ? (
                <EditableText
                  blockId={`${sectionId}.badge`}
                  defaultValue={badge}
                  as="span"
                />
              ) : (
                badge
              )}
            </span>
          )}
          {isEditMode ? (
            <EditableText
              blockId={`${sectionId}.title`}
              defaultValue={title}
              as="h2"
              className={titleClassName}
            />
          ) : (
            <h2 className={titleClassName}>{title}</h2>
          )}
          {subtitle &&
            (isEditMode ? (
              <EditableText
                blockId={`${sectionId}.subtitle`}
                defaultValue={subtitle}
                as="p"
                className={subtitleClassName}
              />
            ) : (
              <p className={subtitleClassName}>{subtitle}</p>
            ))}
        </div>

        {/* Pricing Cards */}
        <div className={`grid gap-8 items-center ${
          tiers.length === 1
            ? "max-w-md mx-auto"
            : tiers.length === 2
              ? "md:grid-cols-2 max-w-3xl mx-auto"
              : tiers.length === 3
                ? "lg:grid-cols-3 max-w-5xl mx-auto"
                : "lg:grid-cols-4"
        }`}>
          {tiers.map((tier, index) => (
            <PricingCard
              key={tier.id}
              tier={tier}
              sectionId={sectionId}
              index={index}
              isEditMode={isEditMode}
              integrations={integrations}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
