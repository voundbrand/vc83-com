"use client";

import { useState } from "react";
import { Doc } from "../../../../../convex/_generated/dataModel";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { getSupportedCountries } from "../../../../../convex/legalEntityTypes";

interface AddressFormData {
  type: "billing" | "shipping" | "mailing" | "physical" | "other";
  label?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  region?: string;
  isDefault?: boolean;
  isPrimary?: boolean;
  isTaxOrigin?: boolean;
}

interface AddressFormProps {
  initialData?: Doc<"objects">; // Changed from organizationAddresses
  onSubmit: (data: AddressFormData) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function AddressForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: AddressFormProps) {
  const { t } = useNamespaceTranslations("ui.manage");

  // Get supported countries for dropdown
  const supportedCountries = getSupportedCountries();

  // Extract data from ontology object structure
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props = initialData?.customProperties as any;

  const [formData, setFormData] = useState<AddressFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type: (initialData?.subtype as any) || "billing", // subtype replaces type
    label: props?.label || "",
    addressLine1: props?.addressLine1 || "",
    addressLine2: props?.addressLine2 || "",
    city: props?.city || "",
    state: props?.state || "",
    postalCode: props?.postalCode || "",
    country: props?.country || "",
    region: props?.region || "",
    isDefault: props?.isDefault || false,
    isPrimary: props?.isPrimary || false,
    isTaxOrigin: props?.isTaxOrigin || false,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof AddressFormData, string>>>({});

  const handleChange = (field: keyof AddressFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof AddressFormData, string>> = {};

    if (!formData.addressLine1.trim()) {
      newErrors.addressLine1 = t("ui.manage.address.form.line1_required");
    }
    if (!formData.city.trim()) {
      newErrors.city = t("ui.manage.address.form.city_required");
    }
    if (!formData.postalCode.trim()) {
      newErrors.postalCode = t("ui.manage.address.form.postal_required");
    }
    if (!formData.country.trim()) {
      newErrors.country = t("ui.manage.address.form.country_required");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Address Type */}
      <div>
        <label className="block text-sm font-bold mb-1">
          {t("ui.manage.address.form.type_label")} *
        </label>
        <select
          value={formData.type}
          onChange={(e) => handleChange("type", e.target.value as AddressFormData["type"])}
          className="w-full retro-input"
          disabled={isSubmitting}
        >
          <option value="billing">{t("ui.manage.address.type.billing")}</option>
          <option value="shipping">{t("ui.manage.address.type.shipping")}</option>
          <option value="mailing">{t("ui.manage.address.type.mailing")}</option>
          <option value="physical">{t("ui.manage.address.type.physical")}</option>
          <option value="other">{t("ui.manage.address.type.other")}</option>
        </select>
      </div>

      {/* Label */}
      <div>
        <label className="block text-sm font-bold mb-1">
          {t("ui.manage.address.form.label_field")}
        </label>
        <input
          type="text"
          value={formData.label}
          onChange={(e) => handleChange("label", e.target.value)}
          placeholder={t("ui.manage.address.form.label_placeholder")}
          className="w-full retro-input"
          disabled={isSubmitting}
        />
        <p className="text-xs mt-1 retro-text-secondary">
          {t("ui.manage.address.form.label_help")}
        </p>
      </div>

      {/* Address Line 1 */}
      <div>
        <label className="block text-sm font-bold mb-1">
          {t("ui.manage.address.form.line1_label")} *
        </label>
        <input
          type="text"
          value={formData.addressLine1}
          onChange={(e) => handleChange("addressLine1", e.target.value)}
          placeholder={t("ui.manage.address.form.line1_placeholder")}
          className={`w-full retro-input ${errors.addressLine1 ? "border-2" : ""}`}
          style={errors.addressLine1 ? { borderColor: 'var(--error)' } : {}}
          disabled={isSubmitting}
        />
        {errors.addressLine1 && (
          <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>{errors.addressLine1}</p>
        )}
      </div>

      {/* Address Line 2 */}
      <div>
        <label className="block text-sm font-bold mb-1">
          {t("ui.manage.address.form.line2_label")}
        </label>
        <input
          type="text"
          value={formData.addressLine2}
          onChange={(e) => handleChange("addressLine2", e.target.value)}
          placeholder={t("ui.manage.address.form.line2_placeholder")}
          className="w-full retro-input"
          disabled={isSubmitting}
        />
      </div>

      {/* City & State */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold mb-1">
            {t("ui.manage.address.form.city_label")} *
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => handleChange("city", e.target.value)}
            placeholder={t("ui.manage.address.form.city_placeholder")}
            className={`w-full retro-input ${errors.city ? "border-2" : ""}`}
            style={errors.city ? { borderColor: 'var(--error)' } : {}}
            disabled={isSubmitting}
          />
          {errors.city && (
            <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>{errors.city}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">
            {t("ui.manage.address.form.state_label")}
          </label>
          <input
            type="text"
            value={formData.state}
            onChange={(e) => handleChange("state", e.target.value)}
            placeholder={t("ui.manage.address.form.state_placeholder")}
            className="w-full retro-input"
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Postal Code & Country */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold mb-1">
            {t("ui.manage.address.form.postal_label")} *
          </label>
          <input
            type="text"
            value={formData.postalCode}
            onChange={(e) => handleChange("postalCode", e.target.value)}
            placeholder={t("ui.manage.address.form.postal_placeholder")}
            className={`w-full retro-input ${errors.postalCode ? "border-2" : ""}`}
            style={errors.postalCode ? { borderColor: 'var(--error)' } : {}}
            disabled={isSubmitting}
          />
          {errors.postalCode && (
            <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>{errors.postalCode}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">
            {t("ui.manage.address.form.country_label")} *
          </label>
          <select
            value={formData.country}
            onChange={(e) => handleChange("country", e.target.value)}
            className={`w-full retro-input ${errors.country ? "border-2" : ""}`}
            style={errors.country ? { borderColor: 'var(--error)' } : {}}
            disabled={isSubmitting}
          >
            <option value="">Select a country...</option>
            {supportedCountries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name} ({country.code})
              </option>
            ))}
          </select>
          {errors.country && (
            <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>{errors.country}</p>
          )}
          <p className="text-xs mt-1 retro-text-secondary">
            Country code is used to determine tax nexus and legal entity types
          </p>
        </div>
      </div>

      {/* Region */}
      <div>
        <label className="block text-sm font-bold mb-1">
          {t("ui.manage.address.form.region_label")}
        </label>
        <input
          type="text"
          value={formData.region}
          onChange={(e) => handleChange("region", e.target.value)}
          placeholder={t("ui.manage.address.form.region_placeholder")}
          className="w-full retro-input"
          disabled={isSubmitting}
        />
        <p className="text-xs mt-1 retro-text-secondary">
          {t("ui.manage.address.form.region_help")}
        </p>
      </div>

      {/* Flags */}
      <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--win95-border)' }}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isDefault}
            onChange={(e) => handleChange("isDefault", e.target.checked)}
            className="w-4 h-4"
            disabled={isSubmitting}
          />
          <span className="text-sm font-bold retro-text">
            {t("ui.manage.address.form.default_checkbox").replace("{type}", t(`ui.manage.address.type.${formData.type}`))}
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isPrimary}
            onChange={(e) => handleChange("isPrimary", e.target.checked)}
            className="w-4 h-4"
            disabled={isSubmitting}
          />
          <span className="text-sm font-bold retro-text">
            {t("ui.manage.address.form.primary_checkbox")}
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isTaxOrigin}
            onChange={(e) => handleChange("isTaxOrigin", e.target.checked)}
            className="w-4 h-4"
            disabled={isSubmitting}
          />
          <span className="text-sm font-bold retro-text">
            Use this address as tax origin (determines tax nexus)
          </span>
        </label>
        {formData.isTaxOrigin && (
          <p className="text-xs ml-6 retro-text-secondary">
            This address determines where your business must collect tax.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="retro-button-primary px-4 py-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? t("ui.manage.address.form.saving") : initialData ? t("ui.manage.address.form.update_button") : t("ui.manage.address.form.add_button")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="retro-button px-4 py-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t("ui.manage.address.form.cancel_button")}
        </button>
      </div>
    </form>
  );
}
