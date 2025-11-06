"use client";

/**
 * STEP 3: CUSTOMER INFO
 *
 * Customer info collection with optional B2B checkout.
 * Supports both individual (B2C) and business (B2B) transactions.
 * Behaviors can auto-fill company details if employer detected.
 */

import { useState } from "react";
import { StepProps } from "../types";
import { User, Mail, Phone, ArrowLeft, Building2, FileText, MapPin } from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

export function CustomerInfoStep({ checkoutData, onComplete, onBack }: StepProps) {
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.checkout_template.behavior_driven");

  const [email, setEmail] = useState(checkoutData.customerInfo?.email || "");
  const [name, setName] = useState(checkoutData.customerInfo?.name || "");
  const [phone, setPhone] = useState(checkoutData.customerInfo?.phone || "");

  // B2B fields
  const [transactionType, setTransactionType] = useState<"B2C" | "B2B">(
    checkoutData.customerInfo?.transactionType || "B2C"
  );
  const [companyName, setCompanyName] = useState(checkoutData.customerInfo?.companyName || "");
  const [vatNumber, setVatNumber] = useState(checkoutData.customerInfo?.vatNumber || "");

  // Billing address fields
  const [line1, setLine1] = useState(checkoutData.customerInfo?.billingAddress?.line1 || "");
  const [line2, setLine2] = useState(checkoutData.customerInfo?.billingAddress?.line2 || "");
  const [city, setCity] = useState(checkoutData.customerInfo?.billingAddress?.city || "");
  const [state, setState] = useState(checkoutData.customerInfo?.billingAddress?.state || "");
  const [postalCode, setPostalCode] = useState(checkoutData.customerInfo?.billingAddress?.postalCode || "");
  const [country, setCountry] = useState(checkoutData.customerInfo?.billingAddress?.country || "DE");

  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Validate form fields
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = t("ui.checkout_template.behavior_driven.customer_info.fields.email.error_required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t("ui.checkout_template.behavior_driven.customer_info.fields.email.error_invalid");
    }

    // Name validation
    if (!name.trim()) {
      newErrors.name = t("ui.checkout_template.behavior_driven.customer_info.fields.name.error_required");
    }

    // B2B validations
    if (transactionType === "B2B") {
      if (!companyName.trim()) {
        newErrors.companyName = t("ui.checkout_template.behavior_driven.customer_info.fields.company.error_required");
      }

      // VAT number format validation (basic EU format check)
      if (vatNumber.trim()) {
        const vatRegex = /^[A-Z]{2}[0-9A-Z]{2,13}$/;
        if (!vatRegex.test(vatNumber.trim().replace(/[\s.-]/g, ""))) {
          newErrors.vatNumber = t("ui.checkout_template.behavior_driven.customer_info.fields.vat.error_invalid");
        }
      }

      // Billing address validation for B2B
      if (!line1.trim()) {
        newErrors.line1 = t("ui.checkout_template.behavior_driven.customer_info.fields.street.error_required");
      }
      if (!city.trim()) {
        newErrors.city = t("ui.checkout_template.behavior_driven.customer_info.fields.city.error_required");
      }
      if (!postalCode.trim()) {
        newErrors.postalCode = t("ui.checkout_template.behavior_driven.customer_info.fields.postal_code.error_required");
      }
      if (!country.trim()) {
        newErrors.country = t("ui.checkout_template.behavior_driven.customer_info.fields.country.error_required");
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validate()) {
      onComplete({
        customerInfo: {
          email: email.trim(),
          name: name.trim(),
          phone: phone.trim() || undefined,
          transactionType,
          companyName: transactionType === "B2B" ? companyName.trim() : undefined,
          vatNumber: transactionType === "B2B" && vatNumber.trim() ? vatNumber.trim() : undefined,
          billingAddress: transactionType === "B2B" ? {
            line1: line1.trim(),
            line2: line2.trim() || undefined,
            city: city.trim(),
            state: state.trim() || undefined,
            postalCode: postalCode.trim(),
            country: country.trim(),
          } : undefined,
        },
      });
    }
  };

  /**
   * Check if form is valid (for button state)
   */
  const isValid = () => {
    const basicValid =
      email.trim().length > 0 &&
      name.trim().length > 0 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    // Additional B2B validation
    if (transactionType === "B2B") {
      return basicValid &&
        companyName.trim().length > 0 &&
        line1.trim().length > 0 &&
        city.trim().length > 0 &&
        postalCode.trim().length > 0 &&
        country.trim().length > 0;
    }

    return basicValid;
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <User size={32} />
          {t("ui.checkout_template.behavior_driven.customer_info.headers.title")}
        </h2>
        <p className="text-gray-600">{t("ui.checkout_template.behavior_driven.customer_info.headers.subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Email */}
        <div className="mb-6">
          <label className="block text-sm font-bold mb-2">
            <Mail size={16} className="inline mr-2" />
            {t("ui.checkout_template.behavior_driven.customer_info.fields.email.label")} <span className="text-red-600">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors({ ...errors, email: "" });
            }}
            placeholder={t("ui.checkout_template.behavior_driven.customer_info.fields.email.placeholder")}
            required
            className={`w-full px-4 py-3 border-2 rounded focus:border-purple-500 focus:outline-none text-lg ${
              errors.email ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.email && (
            <p className="text-sm text-red-600 mt-1">{errors.email}</p>
          )}
          <p className="text-sm text-gray-600 mt-2">
            {t("ui.checkout_template.behavior_driven.customer_info.fields.email.help")}
          </p>
        </div>

        {/* Full Name */}
        <div className="mb-6">
          <label className="block text-sm font-bold mb-2">
            <User size={16} className="inline mr-2" />
            {t("ui.checkout_template.behavior_driven.customer_info.fields.name.label")} <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors({ ...errors, name: "" });
            }}
            placeholder={t("ui.checkout_template.behavior_driven.customer_info.fields.name.placeholder")}
            required
            className={`w-full px-4 py-3 border-2 rounded focus:border-purple-500 focus:outline-none text-lg ${
              errors.name ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.name && (
            <p className="text-sm text-red-600 mt-1">{errors.name}</p>
          )}
        </div>

        {/* Phone (Optional) */}
        <div className="mb-8">
          <label className="block text-sm font-bold mb-2">
            <Phone size={16} className="inline mr-2" />
            {t("ui.checkout_template.behavior_driven.customer_info.fields.phone.label")} <span className="text-gray-500 text-xs">({t("ui.checkout_template.behavior_driven.customer_info.common.optional")})</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("ui.checkout_template.behavior_driven.customer_info.fields.phone.placeholder")}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded focus:border-purple-500 focus:outline-none text-lg"
          />
        </div>

        {/* Transaction Type Selector */}
        <div className="mb-6">
          <label className="block text-sm font-bold mb-2">
            <Building2 size={16} className="inline mr-2" />
            {t("ui.checkout_template.behavior_driven.customer_info.fields.purchase_type.label")} <span className="text-red-600">*</span>
          </label>
          <div className="flex gap-4 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="transactionType"
                value="B2C"
                checked={transactionType === "B2C"}
                onChange={(e) => setTransactionType(e.target.value as "B2C")}
                className="w-4 h-4 text-purple-600 cursor-pointer"
              />
              <span className="text-base">{t("ui.checkout_template.behavior_driven.customer_info.fields.purchase_type.b2c")}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="transactionType"
                value="B2B"
                checked={transactionType === "B2B"}
                onChange={(e) => setTransactionType(e.target.value as "B2B")}
                className="w-4 h-4 text-purple-600 cursor-pointer"
              />
              <span className="text-base">{t("ui.checkout_template.behavior_driven.customer_info.fields.purchase_type.b2b")}</span>
            </label>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {t("ui.checkout_template.behavior_driven.customer_info.fields.purchase_type.help")}
          </p>
        </div>

        {/* B2B Fields - Show only when B2B is selected */}
        {transactionType === "B2B" && (
          <>
            {/* Company Name */}
            <div className="mb-6">
              <label className="block text-sm font-bold mb-2">
                <Building2 size={16} className="inline mr-2" />
                {t("ui.checkout_template.behavior_driven.customer_info.fields.company.label")} <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  if (errors.companyName) setErrors({ ...errors, companyName: "" });
                }}
                placeholder={t("ui.checkout_template.behavior_driven.customer_info.fields.company.placeholder")}
                required={transactionType === "B2B"}
                className={`w-full px-4 py-3 border-2 rounded focus:border-purple-500 focus:outline-none text-lg ${
                  errors.companyName ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.companyName && (
                <p className="text-sm text-red-600 mt-1">{errors.companyName}</p>
              )}
            </div>

            {/* VAT Number (Optional for B2B) */}
            <div className="mb-6">
              <label className="block text-sm font-bold mb-2">
                <FileText size={16} className="inline mr-2" />
                {t("ui.checkout_template.behavior_driven.customer_info.fields.vat.label")} <span className="text-gray-500 text-xs">({t("ui.checkout_template.behavior_driven.customer_info.common.optional")})</span>
              </label>
              <input
                type="text"
                value={vatNumber}
                onChange={(e) => {
                  setVatNumber(e.target.value);
                  if (errors.vatNumber) setErrors({ ...errors, vatNumber: "" });
                }}
                placeholder={t("ui.checkout_template.behavior_driven.customer_info.fields.vat.placeholder")}
                className={`w-full px-4 py-3 border-2 rounded focus:border-purple-500 focus:outline-none text-lg ${
                  errors.vatNumber ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.vatNumber && (
                <p className="text-sm text-red-600 mt-1">{errors.vatNumber}</p>
              )}
              <p className="text-sm text-gray-600 mt-2">
                {t("ui.checkout_template.behavior_driven.customer_info.fields.vat.help")}
              </p>
            </div>

            {/* Billing Address Section */}
            <div className="mb-6">
              <label className="block text-base font-bold mb-4">
                <MapPin size={16} className="inline mr-2" />
                {t("ui.checkout_template.behavior_driven.customer_info.fields.billing_address.label")}
              </label>
              <p className="text-sm text-gray-600 mb-4">
                {t("ui.checkout_template.behavior_driven.customer_info.fields.billing_address.help")}
              </p>
            </div>

            {/* Street Address - Line 1 */}
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2">
                {t("ui.checkout_template.behavior_driven.customer_info.fields.street.label")} <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={line1}
                onChange={(e) => {
                  setLine1(e.target.value);
                  if (errors.line1) setErrors({ ...errors, line1: "" });
                }}
                placeholder={t("ui.checkout_template.behavior_driven.customer_info.fields.street.placeholder")}
                required={transactionType === "B2B"}
                className={`w-full px-4 py-3 border-2 rounded focus:border-purple-500 focus:outline-none text-lg ${
                  errors.line1 ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.line1 && (
                <p className="text-sm text-red-600 mt-1">{errors.line1}</p>
              )}
            </div>

            {/* Street Address - Line 2 (Optional) */}
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2">
                {t("ui.checkout_template.behavior_driven.customer_info.fields.address_line2.label")} <span className="text-gray-500 text-xs">({t("ui.checkout_template.behavior_driven.customer_info.common.optional")})</span>
              </label>
              <input
                type="text"
                value={line2}
                onChange={(e) => setLine2(e.target.value)}
                placeholder={t("ui.checkout_template.behavior_driven.customer_info.fields.address_line2.placeholder")}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded focus:border-purple-500 focus:outline-none text-lg"
              />
            </div>

            {/* City and State/Province (side by side) */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold mb-2">
                  {t("ui.checkout_template.behavior_driven.customer_info.fields.city.label")} <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    if (errors.city) setErrors({ ...errors, city: "" });
                  }}
                  placeholder={t("ui.checkout_template.behavior_driven.customer_info.fields.city.placeholder")}
                  required={transactionType === "B2B"}
                  className={`w-full px-4 py-3 border-2 rounded focus:border-purple-500 focus:outline-none text-lg ${
                    errors.city ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.city && (
                  <p className="text-sm text-red-600 mt-1">{errors.city}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">
                  {t("ui.checkout_template.behavior_driven.customer_info.fields.state.label")} <span className="text-gray-500 text-xs">({t("ui.checkout_template.behavior_driven.customer_info.common.optional")})</span>
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded focus:border-purple-500 focus:outline-none text-lg"
                />
              </div>
            </div>

            {/* Postal Code and Country (side by side) */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div>
                <label className="block text-sm font-bold mb-2">
                  {t("ui.checkout_template.behavior_driven.customer_info.fields.postal_code.label")} <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => {
                    setPostalCode(e.target.value);
                    if (errors.postalCode) setErrors({ ...errors, postalCode: "" });
                  }}
                  placeholder={t("ui.checkout_template.behavior_driven.customer_info.fields.postal_code.placeholder")}
                  required={transactionType === "B2B"}
                  className={`w-full px-4 py-3 border-2 rounded focus:border-purple-500 focus:outline-none text-lg ${
                    errors.postalCode ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.postalCode && (
                  <p className="text-sm text-red-600 mt-1">{errors.postalCode}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">
                  {t("ui.checkout_template.behavior_driven.customer_info.fields.country.label")} <span className="text-red-600">*</span>
                </label>
                <select
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    if (errors.country) setErrors({ ...errors, country: "" });
                  }}
                  required={transactionType === "B2B"}
                  className={`w-full px-4 py-3 border-2 rounded focus:border-purple-500 focus:outline-none text-lg ${
                    errors.country ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="DE">{t("ui.checkout_template.behavior_driven.customer_info.countries.DE")}</option>
                  <option value="AT">{t("ui.checkout_template.behavior_driven.customer_info.countries.AT")}</option>
                  <option value="CH">{t("ui.checkout_template.behavior_driven.customer_info.countries.CH")}</option>
                  <option value="PL">{t("ui.checkout_template.behavior_driven.customer_info.countries.PL")}</option>
                  <option value="FR">{t("ui.checkout_template.behavior_driven.customer_info.countries.FR")}</option>
                  <option value="NL">{t("ui.checkout_template.behavior_driven.customer_info.countries.NL")}</option>
                  <option value="BE">{t("ui.checkout_template.behavior_driven.customer_info.countries.BE")}</option>
                  <option value="DK">{t("ui.checkout_template.behavior_driven.customer_info.countries.DK")}</option>
                  <option value="SE">{t("ui.checkout_template.behavior_driven.customer_info.countries.SE")}</option>
                  <option value="NO">{t("ui.checkout_template.behavior_driven.customer_info.countries.NO")}</option>
                  <option value="GB">{t("ui.checkout_template.behavior_driven.customer_info.countries.GB")}</option>
                  <option value="US">{t("ui.checkout_template.behavior_driven.customer_info.countries.US")}</option>
                </select>
                {errors.country && (
                  <p className="text-sm text-red-600 mt-1">{errors.country}</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 text-lg font-bold border-2 border-gray-400 bg-white text-gray-700 hover:bg-gray-50 rounded transition-colors flex items-center gap-2"
            >
              <ArrowLeft size={20} />
              {t("ui.checkout_template.behavior_driven.customer_info.buttons.back")}
            </button>
          )}

          <button
            type="submit"
            disabled={!isValid()}
            className="flex-1 px-6 py-3 text-lg font-bold border-2 border-purple-600 bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
          >
            {t("ui.checkout_template.behavior_driven.customer_info.buttons.continue")}
          </button>
        </div>
      </form>
    </div>
  );
}
