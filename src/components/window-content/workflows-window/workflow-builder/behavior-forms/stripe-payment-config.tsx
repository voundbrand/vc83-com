/**
 * STRIPE PAYMENT CONFIG FORM
 *
 * Configuration UI for the stripe-payment behavior.
 * Allows customizing Stripe Elements styling and payment options.
 */

"use client";

import React from "react";
import type { StripePaymentConfig } from "@/lib/behaviors/handlers/stripe-payment";

interface StripePaymentConfigFormProps {
  config: StripePaymentConfig;
  onChange: (config: StripePaymentConfig) => void;
}

export function StripePaymentConfigForm({
  config,
  onChange,
}: StripePaymentConfigFormProps) {
  const handleUpdate = (updates: Partial<StripePaymentConfig>) => {
    onChange({ ...config, ...updates });
  };

  const handleBillingDetailsUpdate = (field: string, value: boolean) => {
    handleUpdate({
      collectBillingDetails: {
        ...config.collectBillingDetails,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Stripe Elements Styling */}
      <div className="p-3 rounded border-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <label className="text-xs font-bold block mb-2" style={{ color: "var(--win95-text)" }}>
           Stripe Elements Styling
        </label>
        <p className="text-[10px] mb-2" style={{ color: "var(--neutral-gray)" }}>
          Customize the appearance of Stripe payment form
        </p>

        <div className="space-y-2">
          <div>
            <label className="text-[10px] block mb-1">Font Size</label>
            <input
              type="text"
              value={config.elementsStyle?.base?.fontSize || "16px"}
              onChange={(e) => handleUpdate({
                elementsStyle: {
                  ...config.elementsStyle,
                  base: {
                    ...config.elementsStyle?.base,
                    fontSize: e.target.value,
                  },
                },
              })}
              className="retro-input w-full px-2 py-1 text-xs"
              placeholder="16px"
            />
          </div>

          <div>
            <label className="text-[10px] block mb-1">Text Color</label>
            <input
              type="text"
              value={config.elementsStyle?.base?.color || "#424770"}
              onChange={(e) => handleUpdate({
                elementsStyle: {
                  ...config.elementsStyle,
                  base: {
                    ...config.elementsStyle?.base,
                    color: e.target.value,
                  },
                },
              })}
              className="retro-input w-full px-2 py-1 text-xs"
              placeholder="#424770"
            />
          </div>

          <div>
            <label className="text-[10px] block mb-1">Font Family</label>
            <input
              type="text"
              value={config.elementsStyle?.base?.fontFamily || ""}
              onChange={(e) => handleUpdate({
                elementsStyle: {
                  ...config.elementsStyle,
                  base: {
                    ...config.elementsStyle?.base,
                    fontFamily: e.target.value,
                  },
                },
              })}
              className="retro-input w-full px-2 py-1 text-xs"
              placeholder="Helvetica Neue, sans-serif"
            />
          </div>
        </div>
      </div>

      {/* Payment Intent Options */}
      <div className="p-3 rounded border-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <label className="text-xs font-bold block mb-2" style={{ color: "var(--win95-text)" }}>
           Payment Intent Options
        </label>

        <div className="space-y-2">
          <div>
            <label className="text-[10px] block mb-1">Capture Method</label>
            <select
              value={config.paymentIntentOptions?.captureMethod || "automatic"}
              onChange={(e) => handleUpdate({
                paymentIntentOptions: {
                  ...config.paymentIntentOptions,
                  captureMethod: e.target.value as "automatic" | "manual",
                },
              })}
              className="retro-input w-full px-2 py-1 text-xs"
            >
              <option value="automatic">Automatic (capture immediately)</option>
              <option value="manual">Manual (capture later)</option>
            </select>
            <p className="text-[9px] mt-1" style={{ color: "var(--neutral-gray)" }}>
              Automatic is recommended for most use cases
            </p>
          </div>

          <div>
            <label className="text-[10px] block mb-1">Save Card for Future Use</label>
            <select
              value={config.paymentIntentOptions?.setupFutureUsage || ""}
              onChange={(e) => handleUpdate({
                paymentIntentOptions: {
                  ...config.paymentIntentOptions,
                  setupFutureUsage: e.target.value as "on_session" | "off_session" | undefined,
                },
              })}
              className="retro-input w-full px-2 py-1 text-xs"
            >
              <option value="">Don&apos;t save</option>
              <option value="on_session">On session (user present)</option>
              <option value="off_session">Off session (future charges)</option>
            </select>
            <p className="text-[9px] mt-1" style={{ color: "var(--neutral-gray)" }}>
              Allows charging the same card in the future
            </p>
          </div>
        </div>
      </div>

      {/* Billing Details Collection */}
      <div className="p-3 rounded border-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <label className="text-xs font-bold block mb-2" style={{ color: "var(--win95-text)" }}>
           Billing Details to Collect
        </label>
        <p className="text-[10px] mb-2" style={{ color: "var(--neutral-gray)" }}>
          Which fields should users fill in during payment
        </p>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.collectBillingDetails?.name ?? true}
              onChange={(e) => handleBillingDetailsUpdate("name", e.target.checked)}
              className="h-3 w-3"
            />
            <span className="text-xs">Collect Name</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.collectBillingDetails?.email ?? true}
              onChange={(e) => handleBillingDetailsUpdate("email", e.target.checked)}
              className="h-3 w-3"
            />
            <span className="text-xs">Collect Email</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.collectBillingDetails?.phone ?? false}
              onChange={(e) => handleBillingDetailsUpdate("phone", e.target.checked)}
              className="h-3 w-3"
            />
            <span className="text-xs">Collect Phone Number</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.collectBillingDetails?.address ?? false}
              onChange={(e) => handleBillingDetailsUpdate("address", e.target.checked)}
              className="h-3 w-3"
            />
            <span className="text-xs">Collect Billing Address (recommended for B2B)</span>
          </label>
        </div>
      </div>

      {/* Error Handling */}
      <div className="p-3 rounded border-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <label className="text-xs font-bold block mb-2" style={{ color: "var(--win95-text)" }}>
           Error Handling
        </label>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.retryOnFailure ?? true}
              onChange={(e) => handleUpdate({ retryOnFailure: e.target.checked })}
              className="h-3 w-3"
            />
            <span className="text-xs">Auto-retry failed payments</span>
          </label>

          {config.retryOnFailure !== false && (
            <div>
              <label className="text-[10px] block mb-1">Max Retry Attempts</label>
              <input
                type="number"
                min="1"
                max="10"
                value={config.maxRetries ?? 3}
                onChange={(e) => handleUpdate({ maxRetries: parseInt(e.target.value) })}
                className="retro-input w-full px-2 py-1 text-xs"
              />
              <p className="text-[9px] mt-1" style={{ color: "var(--neutral-gray)" }}>
                Maximum: 10 retries (to prevent infinite loops)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Custom Metadata */}
      <div className="p-3 rounded border-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <label className="text-xs font-bold block mb-2" style={{ color: "var(--win95-text)" }}>
           Custom Metadata (Optional)
        </label>
        <p className="text-[10px] mb-2" style={{ color: "var(--neutral-gray)" }}>
          Additional data to attach to Stripe PaymentIntent (JSON key-value pairs)
        </p>

        <textarea
          value={JSON.stringify(config.customMetadata || {}, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              handleUpdate({ customMetadata: parsed });
            } catch {
              // Invalid JSON, ignore
            }
          }}
          className="retro-input w-full px-2 py-1 text-xs font-mono"
          rows={4}
          placeholder='{\n  "campaign": "summer_sale",\n  "source": "event_registration"\n}'
        />
      </div>
    </div>
  );
}
