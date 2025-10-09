"use client";

import { useState } from "react";
import { Doc } from "../../../../../convex/_generated/dataModel";

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
      newErrors.addressLine1 = "Address line 1 is required";
    }
    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }
    if (!formData.postalCode.trim()) {
      newErrors.postalCode = "Postal code is required";
    }
    if (!formData.country.trim()) {
      newErrors.country = "Country is required";
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
          Address Type *
        </label>
        <select
          value={formData.type}
          onChange={(e) => handleChange("type", e.target.value as AddressFormData["type"])}
          className="w-full px-3 py-2 border-2 border-gray-300 bg-white text-sm font-mono"
          disabled={isSubmitting}
        >
          <option value="billing">Billing</option>
          <option value="shipping">Shipping</option>
          <option value="mailing">Mailing</option>
          <option value="physical">Physical Location</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Label */}
      <div>
        <label className="block text-sm font-bold mb-1">
          Label (Optional)
        </label>
        <input
          type="text"
          value={formData.label}
          onChange={(e) => handleChange("label", e.target.value)}
          placeholder="e.g., Headquarters, Warehouse 1"
          className="w-full px-3 py-2 border-2 border-gray-300 bg-white text-sm font-mono"
          disabled={isSubmitting}
        />
        <p className="text-xs text-gray-500 mt-1">
          Custom name for this address
        </p>
      </div>

      {/* Address Line 1 */}
      <div>
        <label className="block text-sm font-bold mb-1">
          Address Line 1 *
        </label>
        <input
          type="text"
          value={formData.addressLine1}
          onChange={(e) => handleChange("addressLine1", e.target.value)}
          placeholder="123 Main Street"
          className={`w-full px-3 py-2 border-2 ${
            errors.addressLine1 ? "border-red-500" : "border-gray-300"
          } bg-white text-sm font-mono`}
          disabled={isSubmitting}
        />
        {errors.addressLine1 && (
          <p className="text-xs text-red-600 mt-1">{errors.addressLine1}</p>
        )}
      </div>

      {/* Address Line 2 */}
      <div>
        <label className="block text-sm font-bold mb-1">
          Address Line 2 (Optional)
        </label>
        <input
          type="text"
          value={formData.addressLine2}
          onChange={(e) => handleChange("addressLine2", e.target.value)}
          placeholder="Suite 100, Apartment 4B"
          className="w-full px-3 py-2 border-2 border-gray-300 bg-white text-sm font-mono"
          disabled={isSubmitting}
        />
      </div>

      {/* City & State */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold mb-1">
            City *
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => handleChange("city", e.target.value)}
            placeholder="San Francisco"
            className={`w-full px-3 py-2 border-2 ${
              errors.city ? "border-red-500" : "border-gray-300"
            } bg-white text-sm font-mono`}
            disabled={isSubmitting}
          />
          {errors.city && (
            <p className="text-xs text-red-600 mt-1">{errors.city}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">
            State/Province
          </label>
          <input
            type="text"
            value={formData.state}
            onChange={(e) => handleChange("state", e.target.value)}
            placeholder="CA"
            className="w-full px-3 py-2 border-2 border-gray-300 bg-white text-sm font-mono"
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Postal Code & Country */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold mb-1">
            Postal Code *
          </label>
          <input
            type="text"
            value={formData.postalCode}
            onChange={(e) => handleChange("postalCode", e.target.value)}
            placeholder="94102"
            className={`w-full px-3 py-2 border-2 ${
              errors.postalCode ? "border-red-500" : "border-gray-300"
            } bg-white text-sm font-mono`}
            disabled={isSubmitting}
          />
          {errors.postalCode && (
            <p className="text-xs text-red-600 mt-1">{errors.postalCode}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">
            Country *
          </label>
          <input
            type="text"
            value={formData.country}
            onChange={(e) => handleChange("country", e.target.value)}
            placeholder="United States"
            className={`w-full px-3 py-2 border-2 ${
              errors.country ? "border-red-500" : "border-gray-300"
            } bg-white text-sm font-mono`}
            disabled={isSubmitting}
          />
          {errors.country && (
            <p className="text-xs text-red-600 mt-1">{errors.country}</p>
          )}
        </div>
      </div>

      {/* Region */}
      <div>
        <label className="block text-sm font-bold mb-1">
          Region (Optional)
        </label>
        <input
          type="text"
          value={formData.region}
          onChange={(e) => handleChange("region", e.target.value)}
          placeholder="e.g., Americas, EU, APAC"
          className="w-full px-3 py-2 border-2 border-gray-300 bg-white text-sm font-mono"
          disabled={isSubmitting}
        />
        <p className="text-xs text-gray-500 mt-1">
          Geographic region for reporting
        </p>
      </div>

      {/* Flags */}
      <div className="space-y-2 pt-2 border-t border-gray-300">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isDefault}
            onChange={(e) => handleChange("isDefault", e.target.checked)}
            className="w-4 h-4 border-2 border-gray-300"
            disabled={isSubmitting}
          />
          <span className="text-sm font-bold">
            Set as default {formData.type} address
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isPrimary}
            onChange={(e) => handleChange("isPrimary", e.target.checked)}
            className="w-4 h-4 border-2 border-gray-300"
            disabled={isSubmitting}
          />
          <span className="text-sm font-bold">
            Set as primary organization address
          </span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-purple-600 text-white font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Saving..." : initialData ? "Update Address" : "Add Address"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 bg-white text-black font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
