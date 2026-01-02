/**
 * PAYMENT PROVIDER SELECTION CONFIG FORM
 *
 * Configuration UI for the payment-provider-selection behavior.
 * Allows configuring which payment providers are available based on conditions.
 */

"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import type { PaymentProviderSelectionConfig } from "@/lib/behaviors/handlers/payment-provider-selection";

interface FormField {
  id: string;
  label: string;
  type: string;
  options?: Array<{ value: string; label: string }>;
}

interface PaymentProviderSelectionConfigFormProps {
  config: PaymentProviderSelectionConfig;
  onChange: (config: PaymentProviderSelectionConfig) => void;
  availableForms?: Array<{ _id: string; name: string; fields?: FormField[] }>;
  availableProducts?: Array<{ _id: string; name: string; subtype?: string }>;
  availableCrmOrganizations?: Array<{ _id: string; name: string }>;
}

const PROVIDER_OPTIONS = [
  { value: "stripe", label: "💳 Stripe" },
  { value: "paypal", label: "🅿️ PayPal" },
  { value: "invoice", label: "📄 Invoice (Pay Later)" },
];

const PAYMENT_TERMS = [
  { value: "net30", label: "NET 30 (30 days)" },
  { value: "net60", label: "NET 60 (60 days)" },
  { value: "net90", label: "NET 90 (90 days)" },
];

export function PaymentProviderSelectionConfigForm({
  config,
  onChange,
  availableForms = [],
  availableProducts = [],
  availableCrmOrganizations = [],
}: PaymentProviderSelectionConfigFormProps) {
  // Mark as intentionally unused - preserved for future form/product selection UI
  void availableForms;
  void availableProducts;
  const handleUpdate = (updates: Partial<PaymentProviderSelectionConfig>) => {
    onChange({ ...config, ...updates });
  };

  const handleProviderToggle = (provider: string, isDefault: boolean) => {
    const currentProviders = isDefault ? config.defaultProviders : [];
    const newProviders = currentProviders.includes(provider)
      ? currentProviders.filter(p => p !== provider)
      : [...currentProviders, provider];

    if (isDefault) {
      handleUpdate({ defaultProviders: newProviders });
    }
  };

  const addRule = () => {
    const newRule = {
      conditions: {},
      availableProviders: [],
    };
    handleUpdate({ rules: [...(config.rules || []), newRule] });
  };

  const removeRule = (index: number) => {
    const newRules = [...(config.rules || [])];
    newRules.splice(index, 1);
    handleUpdate({ rules: newRules });
  };

  const updateRule = (index: number, updates: Partial<NonNullable<PaymentProviderSelectionConfig["rules"]>[number]>) => {
    const newRules = [...(config.rules || [])];
    newRules[index] = { ...newRules[index], ...updates };
    handleUpdate({ rules: newRules });
  };

  const updateRuleCondition = (index: number, conditionUpdates: Partial<NonNullable<PaymentProviderSelectionConfig["rules"]>[number]["conditions"]>) => {
    const newRules = [...(config.rules || [])];
    newRules[index] = {
      ...newRules[index],
      conditions: { ...newRules[index].conditions, ...conditionUpdates },
    };
    handleUpdate({ rules: newRules });
  };

  return (
    <div className="space-y-4">
      {/* Default Providers */}
      <div className="p-3 rounded border-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <label className="text-xs font-bold block mb-2" style={{ color: "var(--win95-text)" }}>
          Default Payment Providers <span className="text-red-500">*</span>
        </label>
        <p className="text-[10px] mb-2" style={{ color: "var(--neutral-gray)" }}>
          These providers are available when no conditional rules match
        </p>
        <div className="space-y-2">
          {PROVIDER_OPTIONS.map((provider) => (
            <label key={provider.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.defaultProviders?.includes(provider.value) || false}
                onChange={() => handleProviderToggle(provider.value, true)}
                className="h-3 w-3"
              />
              <span className="text-xs">{provider.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Conditional Rules */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
            Conditional Rules
          </label>
          <button
            onClick={addRule}
            className="retro-button px-2 py-1 text-[10px] flex items-center gap-1"
          >
            <Plus size={12} /> Add Rule
          </button>
        </div>
        <p className="text-[10px] mb-3" style={{ color: "var(--neutral-gray)" }}>
          Override payment providers based on customer, order, or employer conditions
        </p>

        <div className="space-y-3">
          {(config.rules || []).map((rule, index) => (
            <div key={index} className="p-3 rounded border-2" style={{ borderColor: 'var(--accent-purple)', background: 'var(--win95-bg)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold">Rule {index + 1}</span>
                <button
                  onClick={() => removeRule(index)}
                  className="retro-button px-2 py-1 text-[10px] flex items-center gap-1"
                  style={{ background: '#ff4444' }}
                >
                  <Trash2 size={10} /> Remove
                </button>
              </div>

              {/* Conditions */}
              <div className="space-y-2 mb-3">
                <div className="text-[10px] font-bold" style={{ color: "var(--win95-text)" }}>
                  WHEN (Conditions):
                </div>

                {/* Customer Type */}
                <div>
                  <label className="text-[10px] block mb-1">Customer Type</label>
                  <select
                    value={rule.conditions.customerType || ""}
                    onChange={(e) => updateRuleCondition(index, {
                      customerType: (e.target.value || undefined) as "B2C" | "B2B" | undefined
                    })}
                    className="retro-input w-full px-2 py-1 text-xs"
                  >
                    <option value="">-- Any --</option>
                    <option value="B2C">B2C (Individual/Consumer)</option>
                    <option value="B2B">B2B (Business/Company)</option>
                  </select>
                </div>

                {/* Has Employer */}
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rule.conditions.hasEmployer || false}
                      onChange={(e) => updateRuleCondition(index, {
                        hasEmployer: e.target.checked || undefined
                      })}
                      className="h-3 w-3"
                    />
                    <span className="text-[10px]">Employer Detected (from employer detection behavior)</span>
                  </label>
                </div>

                {/* Specific Employers */}
                {availableCrmOrganizations.length > 0 && (
                  <div>
                    <label className="text-[10px] block mb-1">Specific Employers (CRM Orgs)</label>
                    <div className="max-h-24 overflow-y-auto space-y-1 p-2 rounded" style={{ background: 'var(--win95-bg-light)' }}>
                      {availableCrmOrganizations.map((org) => (
                        <label key={org._id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={rule.conditions.employerIds?.includes(org._id) || false}
                            onChange={(e) => {
                              const current = rule.conditions.employerIds || [];
                              const updated = e.target.checked
                                ? [...current, org._id]
                                : current.filter(id => id !== org._id);
                              updateRuleCondition(index, { employerIds: updated.length > 0 ? updated : undefined });
                            }}
                            className="h-3 w-3"
                          />
                          <span className="text-[10px]">{org.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Order Amount */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] block mb-1">Min Amount (cents)</label>
                    <input
                      type="number"
                      value={rule.conditions.minAmount || ""}
                      onChange={(e) => updateRuleCondition(index, {
                        minAmount: e.target.value ? parseInt(e.target.value) : undefined
                      })}
                      className="retro-input w-full px-2 py-1 text-xs"
                      placeholder="e.g., 5000"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] block mb-1">Max Amount (cents)</label>
                    <input
                      type="number"
                      value={rule.conditions.maxAmount || ""}
                      onChange={(e) => updateRuleCondition(index, {
                        maxAmount: e.target.value ? parseInt(e.target.value) : undefined
                      })}
                      className="retro-input w-full px-2 py-1 text-xs"
                      placeholder="e.g., 100000"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--win95-border)' }}>
                <div className="text-[10px] font-bold" style={{ color: "var(--win95-text)" }}>
                  THEN (Actions):
                </div>

                {/* Available Providers */}
                <div>
                  <label className="text-[10px] block mb-1">Available Providers <span className="text-red-500">*</span></label>
                  <div className="space-y-1">
                    {PROVIDER_OPTIONS.map((provider) => (
                      <label key={provider.value} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={rule.availableProviders?.includes(provider.value) || false}
                          onChange={(e) => {
                            const current = rule.availableProviders || [];
                            const updated = e.target.checked
                              ? [...current, provider.value]
                              : current.filter(p => p !== provider.value);
                            updateRule(index, { availableProviders: updated });
                          }}
                          className="h-3 w-3"
                        />
                        <span className="text-xs">{provider.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Enforce Provider */}
                <div>
                  <label className="text-[10px] block mb-1">Force Specific Provider (Optional)</label>
                  <select
                    value={rule.enforceProvider || ""}
                    onChange={(e) => updateRule(index, {
                      enforceProvider: e.target.value || undefined
                    })}
                    className="retro-input w-full px-2 py-1 text-xs"
                  >
                    <option value="">-- Allow User Choice --</option>
                    {rule.availableProviders?.map((provider) => (
                      <option key={provider} value={provider}>
                        {PROVIDER_OPTIONS.find(p => p.value === provider)?.label || provider}
                      </option>
                    ))}
                  </select>
                  <p className="text-[9px] mt-1" style={{ color: "var(--neutral-gray)" }}>
                    If set, skip provider selection and use this provider automatically
                  </p>
                </div>

                {/* Skip Payment Step */}
                {rule.enforceProvider === "invoice" && (
                  <>
                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={rule.skipPaymentStep || false}
                          onChange={(e) => updateRule(index, { skipPaymentStep: e.target.checked })}
                          className="h-3 w-3"
                        />
                        <span className="text-[10px]">Skip Payment Step (Invoice only)</span>
                      </label>
                      <p className="text-[9px] mt-1 ml-5" style={{ color: "var(--neutral-gray)" }}>
                        Skip payment form entirely and go directly to confirmation
                      </p>
                    </div>

                    {/* Payment Terms */}
                    <div>
                      <label className="text-[10px] block mb-1">Payment Terms</label>
                      <select
                        value={rule.paymentTerms || "net30"}
                        onChange={(e) => updateRule(index, {
                          paymentTerms: e.target.value as "net30" | "net60" | "net90"
                        })}
                        className="retro-input w-full px-2 py-1 text-xs"
                      >
                        {PAYMENT_TERMS.map((term) => (
                          <option key={term.value} value={term.value}>
                            {term.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}

          {(config.rules || []).length === 0 && (
            <div className="p-4 text-center text-[10px]" style={{ color: "var(--neutral-gray)" }}>
              No conditional rules. Click &quot;Add Rule&quot; to create payment provider conditions.
            </div>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="p-3 rounded border-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <label className="text-xs font-bold block mb-2" style={{ color: "var(--win95-text)" }}>
          Additional Settings
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.allowMultipleProviders ?? true}
              onChange={(e) => handleUpdate({ allowMultipleProviders: e.target.checked })}
              className="h-3 w-3"
            />
            <span className="text-xs">Allow users to choose from multiple providers</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.requireProviderSelection ?? true}
              onChange={(e) => handleUpdate({ requireProviderSelection: e.target.checked })}
              className="h-3 w-3"
            />
            <span className="text-xs">Require at least one payment provider</span>
          </label>
        </div>
      </div>
    </div>
  );
}
