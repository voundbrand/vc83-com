"use client";

/**
 * STEP 3: CUSTOMER INFORMATION (Dynamic based on employer billing)
 *
 * 🚨 NEW BEHAVIOR:
 * - If employer billing is detected from registration form, show simplified personal info form
 * - If self-pay or no employer mapping, show full billing form
 *
 * Collect customer details:
 * - Email (required)
 * - Full Name (required)
 * - Phone (optional)
 * - Special Requests/Notes (optional)
 * - Billing details (conditional based on employer)
 */

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { User, Mail, Phone, MessageSquare, ArrowLeft, Building2, FileText, MapPin, CheckCircle } from "lucide-react";
import styles from "../styles/multi-step.module.css";
import { Id } from "../../../../convex/_generated/dataModel";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { usePostHog } from "posthog-js/react";

interface CustomerInfo {
  email: string;
  name: string;
  phone?: string;
  notes?: string;
  // B2B fields
  transactionType?: "B2C" | "B2B";
  companyName?: string;
  vatNumber?: string;
  // Billing address (matches BillingAddress interface)
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
}

// Type for employer billing info (from product invoice config)
type EmployerBillingInfo = {
  type: "employer_billing";
  organizationName: string;
  displayName?: string;
  legalEntityName?: string;
  vatNumber?: string;
  taxId?: string;
  billingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  billingEmail?: string;
  billingContact?: string;
  primaryPhone?: string;
  website?: string;
  defaultPaymentTerms?: "net30" | "net60" | "net90";
  preferredPaymentMethod?: string;
  notes?: string;
  accountingReference?: string;
};

interface CustomerInfoStepProps {
  initialData?: CustomerInfo;
  forceB2B?: boolean; // Force B2B mode (require organization info)
  // NEW: Form responses to detect employer
  formResponses?: Array<{
    productId: Id<"objects">;
    ticketNumber: number;
    formId: string;
    responses: Record<string, unknown>;
    addedCosts: number;
    submittedAt: number;
  }>;
  // NEW: Linked products for invoice config (accepts CheckoutProduct type)
  linkedProducts?: Array<{
    _id: string | Id<"objects">;
    name: string;
    customProperties?: unknown; // Use unknown and type-check at runtime
  }>;
  onComplete: (data: CustomerInfo) => void;
  onBack: () => void;
}

export function CustomerInfoStep({
  initialData,
  forceB2B = false,
  formResponses,
  linkedProducts,
  onComplete,
  onBack,
}: CustomerInfoStepProps) {
  // Translation hook
  const { t } = useNamespaceTranslations("checkout");
  const posthog = usePostHog();

  // 🚨 STEP 1: Extract CRM organization ID from form responses and product mapping
  const crmOrganizationId = useMemo((): Id<"objects"> | null => {
    if (!formResponses || !linkedProducts) return null;

    // Get first form response (assuming single product checkout)
    const firstResponse = formResponses[0];
    if (!firstResponse) return null;

    // Get product's invoice config
    const product = linkedProducts.find((p) => p._id === firstResponse.productId);

    // Type-safe access to customProperties
    const customProps = product?.customProperties as
      | {
          invoiceConfig?: {
            employerSourceField: string;
            employerMapping: Record<string, string | null>; // Now stores org IDs
            defaultPaymentTerms?: "net30" | "net60" | "net90";
          };
        }
      | undefined;

    const invoiceConfig = customProps?.invoiceConfig;
    if (!invoiceConfig) return null;

    // Get employer value from form response
    const employerFieldKey = invoiceConfig.employerSourceField;
    const employerValue = firstResponse.responses[employerFieldKey];
    if (!employerValue || typeof employerValue !== "string") return null;

    // Get CRM organization ID from mapping
    const orgId = invoiceConfig.employerMapping[employerValue];

    // Return ID if valid, otherwise null
    return orgId && orgId.length > 20 ? (orgId as Id<"objects">) : null;
  }, [formResponses, linkedProducts]);

  // 🚨 STEP 2: Fetch CRM organization billing data using the public endpoint
  const crmOrganization = useQuery(
    api.crmOntology.getPublicCrmOrganizationBilling,
    crmOrganizationId ? { crmOrganizationId } : "skip"
  );

  // 🚨 STEP 3: Transform CRM organization data into EmployerBillingInfo format
  const employerBilling = useMemo((): EmployerBillingInfo | null => {
    if (!crmOrganization) return null;

    // Extract address from CRM organization
    const address = (crmOrganization.customProperties as { address?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    } })?.address;

    if (!address) return null;

    return {
      type: "employer_billing" as const,
      organizationName: crmOrganization.name,
      displayName: crmOrganization.name,
      vatNumber: (crmOrganization.customProperties as { taxId?: string })?.taxId,
      taxId: (crmOrganization.customProperties as { taxId?: string })?.taxId,
      billingAddress: {
        line1: address.street || "",
        city: address.city || "",
        state: address.state,
        postalCode: address.postalCode || "",
        country: address.country || "DE",
      },
      billingEmail: (crmOrganization.customProperties as { billingEmail?: string })?.billingEmail,
      primaryPhone: (crmOrganization.customProperties as { phone?: string })?.phone,
      website: (crmOrganization.customProperties as { website?: string })?.website,
    };
  }, [crmOrganization]);

  // Check if we're in employer billing mode
  const isEmployerBilling = !!employerBilling;

  const [email, setEmail] = useState(initialData?.email || "");
  const [name, setName] = useState(initialData?.name || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [notes, setNotes] = useState(initialData?.notes || "");

  // B2B fields - will be auto-filled from employer billing
  const [transactionType, setTransactionType] = useState<"B2C" | "B2B">(
    initialData?.transactionType || "B2C"
  );
  const [companyName, setCompanyName] = useState(initialData?.companyName || "");
  const [vatNumber, setVatNumber] = useState(initialData?.vatNumber || "");

  // Billing address fields
  const [line1, setLine1] = useState(initialData?.billingAddress?.line1 || "");
  const [line2, setLine2] = useState(initialData?.billingAddress?.line2 || "");
  const [city, setCity] = useState(initialData?.billingAddress?.city || "");
  const [state, setState] = useState(initialData?.billingAddress?.state || "");
  const [postalCode, setPostalCode] = useState(initialData?.billingAddress?.postalCode || "");
  const [country, setCountry] = useState(initialData?.billingAddress?.country || "DE");

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 🚨 Auto-fill form when employer billing data loads
  useEffect(() => {
    if (employerBilling && !initialData) {
      // Set to B2B mode
      setTransactionType("B2B");

      // Fill company info
      setCompanyName(employerBilling.organizationName);
      setVatNumber(employerBilling.vatNumber || "");

      // Fill billing address
      setLine1(employerBilling.billingAddress.line1);
      setLine2(employerBilling.billingAddress.line2 || "");
      setCity(employerBilling.billingAddress.city);
      setState(employerBilling.billingAddress.state || "");
      setPostalCode(employerBilling.billingAddress.postalCode);
      setCountry(employerBilling.billingAddress.country);

      console.log("✅ [CustomerInfoStep] Auto-filled employer billing data:", {
        company: employerBilling.organizationName,
        address: employerBilling.billingAddress,
      });
    }
  }, [employerBilling, initialData]);

  // Debug logging
  console.log("🔍 [CustomerInfoStep] State:", {
    forceB2B,
    isEmployerBilling,
    employerBilling,
    transactionType,
    shouldShowB2BFields: transactionType === "B2B",
    formValues: { companyName, line1, city, postalCode, country }
  });

  /**
   * Validate form fields
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = t('ui.checkout.customer_info.errors.email_required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t('ui.checkout.customer_info.errors.email_invalid');
    }

    // Name validation
    if (!name.trim()) {
      newErrors.name = t('ui.checkout.customer_info.errors.name_required');
    }

    // B2B validations
    if (transactionType === "B2B") {
      if (!companyName.trim()) {
        newErrors.companyName = t('ui.checkout.customer_info.errors.company_required');
      }

      // VAT number format validation (basic EU format check)
      if (vatNumber.trim()) {
        const vatRegex = /^[A-Z]{2}[0-9A-Z]{2,13}$/;
        if (!vatRegex.test(vatNumber.trim().replace(/[\s.-]/g, ""))) {
          newErrors.vatNumber = t('ui.checkout.customer_info.errors.vat_invalid');
        }
      }

      // Billing address validation for B2B
      if (!line1.trim()) {
        newErrors.line1 = t('ui.checkout.customer_info.errors.street_required');
      }
      if (!city.trim()) {
        newErrors.city = t('ui.checkout.customer_info.errors.city_required');
      }
      if (!postalCode.trim()) {
        newErrors.postalCode = t('ui.checkout.customer_info.errors.postal_code_required');
      }
      if (!country.trim()) {
        newErrors.country = t('ui.checkout.customer_info.errors.country_required');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validate()) {
      // Track registration form submission
      posthog?.capture("registration_form_submitted", {
        transaction_type: transactionType,
        has_phone: !!phone.trim(),
        has_notes: !!notes.trim(),
        has_vat_number: transactionType === "B2B" && !!vatNumber.trim(),
        is_employer_billing: isEmployerBilling,
        has_form_responses: !!formResponses && formResponses.length > 0,
        product_count: linkedProducts?.length || 0,
      });

      onComplete({
        email: email.trim(),
        name: name.trim(),
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
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
    <div className={styles.stepContainer}>
      {/* Header */}
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>
          <User size={24} />
          {t('ui.checkout.customer_info.headers.title')}
        </h2>
        <p className={styles.stepSubtitle}>
          {isEmployerBilling
            ? t('ui.checkout.customer_info.headers.subtitle_employer')
            : t('ui.checkout.customer_info.headers.subtitle_default')}
        </p>
      </div>

      {/* Employer Billing Info Display */}
      {isEmployerBilling && employerBilling && (
        <div
          style={{
            backgroundColor: "#EFF6FF",
            border: "2px solid #3B82F6",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <CheckCircle size={20} style={{ color: "#3B82F6" }} />
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1E40AF" }}>
              {t('ui.checkout.customer_info.headers.employer_billing_detected')}
            </h3>
          </div>
          <div style={{ fontSize: "14px", color: "#1E40AF", lineHeight: "1.6" }}>
            <p style={{ margin: "4px 0" }}>
              <strong>{t('ui.checkout.customer_info.employer_billing.company_label')}</strong> {employerBilling.organizationName}
            </p>
            {employerBilling.billingAddress.line1 && (
              <p style={{ margin: "4px 0" }}>
                <strong>{t('ui.checkout.customer_info.employer_billing.billing_address_label')}</strong>{" "}
                {employerBilling.billingAddress.line1}
                {employerBilling.billingAddress.line2 && `, ${employerBilling.billingAddress.line2}`}
                , {employerBilling.billingAddress.city},{" "}
                {employerBilling.billingAddress.postalCode}
              </p>
            )}
            {employerBilling.vatNumber && (
              <p style={{ margin: "4px 0" }}>
                <strong>{t('ui.checkout.customer_info.employer_billing.vat_number_label')}</strong> {employerBilling.vatNumber}
              </p>
            )}
            {employerBilling.billingEmail && (
              <p style={{ margin: "4px 0" }}>
                <strong>{t('ui.checkout.customer_info.employer_billing.invoice_sent_to')}</strong> {employerBilling.billingEmail}
              </p>
            )}
            <p style={{ margin: "8px 0 0 0", fontSize: "12px", fontStyle: "italic" }}>
              {t('ui.checkout.customer_info.employer_billing.auto_configured_message')}
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Email */}
        <div className={styles.formField}>
          <label className={styles.fieldLabel}>
            <Mail size={16} />
            {t('ui.checkout.customer_info.labels.email_address')} <span className={styles.required}>{t('ui.checkout.customer_info.required_optional.required_indicator')}</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors({ ...errors, email: "" });
            }}
            placeholder={t('ui.checkout.customer_info.placeholders.email')}
            className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
            required
          />
          {errors.email && (
            <p className={styles.errorMessage}>{errors.email}</p>
          )}
          <p className={styles.helperText}>
            {t('ui.checkout.customer_info.helpers.email_description')}
          </p>
        </div>

        {/* Full Name */}
        <div className={styles.formField}>
          <label className={styles.fieldLabel}>
            <User size={16} />
            {t('ui.checkout.customer_info.labels.full_name')} <span className={styles.required}>{t('ui.checkout.customer_info.required_optional.required_indicator')}</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors({ ...errors, name: "" });
            }}
            placeholder={t('ui.checkout.customer_info.placeholders.name')}
            className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
            required
          />
          {errors.name && (
            <p className={styles.errorMessage}>{errors.name}</p>
          )}
        </div>

        {/* Phone (Optional) */}
        <div className={styles.formField}>
          <label className={styles.fieldLabel}>
            <Phone size={16} />
            {t('ui.checkout.customer_info.labels.phone_number')} <span className={styles.optional}>{t('ui.checkout.customer_info.required_optional.optional_indicator')}</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('ui.checkout.customer_info.placeholders.phone')}
            className={styles.input}
          />
        </div>

        {/* Special Requests (Optional) */}
        <div className={styles.formField}>
          <label className={styles.fieldLabel}>
            <MessageSquare size={16} />
            {t('ui.checkout.customer_info.labels.special_requests')} <span className={styles.optional}>{t('ui.checkout.customer_info.required_optional.optional_indicator')}</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('ui.checkout.customer_info.placeholders.special_requests')}
            rows={4}
            className={styles.textarea}
          />
        </div>

        {/* Transaction Type Selector - Hide if employer billing */}
        {!isEmployerBilling && (
          <div className={styles.formField}>
            <label className={styles.fieldLabel}>
              <Building2 size={16} />
              {t('ui.checkout.customer_info.labels.transaction_type')} <span className={styles.required}>{t('ui.checkout.customer_info.required_optional.required_indicator')}</span>
            </label>
            {forceB2B ? (
              <div className="mt-2 p-3 rounded" style={{ backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                <p className="text-sm font-bold" style={{ color: "#1E40AF" }}>
                  {t('ui.checkout.customer_info.forced_b2b.title')}
                </p>
                <p className="text-xs mt-1" style={{ color: "#1E40AF" }}>
                  {t('ui.checkout.customer_info.forced_b2b.description')}
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="transactionType"
                      value="B2C"
                      checked={transactionType === "B2C"}
                      onChange={(e) => setTransactionType(e.target.value as "B2C")}
                      style={{ cursor: "pointer" }}
                    />
                    <span>{t('ui.checkout.customer_info.transaction_types.individual_consumer')}</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="transactionType"
                      value="B2B"
                      checked={transactionType === "B2B"}
                      onChange={(e) => setTransactionType(e.target.value as "B2B")}
                      style={{ cursor: "pointer" }}
                    />
                    <span>{t('ui.checkout.customer_info.transaction_types.business_company')}</span>
                  </label>
                </div>
                <p className={styles.helperText}>
                  {t('ui.checkout.customer_info.helpers.transaction_type_description')}
                </p>
              </>
            )}
          </div>
        )}

        {/* B2B Fields - Show only when B2B is selected */}
        {transactionType === "B2B" && (
          <>
            {/* Company Name - Pre-filled from employer if available */}
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>
                <Building2 size={16} />
                {t('ui.checkout.customer_info.labels.company_name')} <span className={styles.required}>{t('ui.checkout.customer_info.required_optional.required_indicator')}</span>
                {isEmployerBilling && <span className={styles.optional}> {t('ui.checkout.customer_info.required_optional.autofilled_indicator')}</span>}
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  if (errors.companyName) setErrors({ ...errors, companyName: "" });
                }}
                placeholder={t('ui.checkout.customer_info.placeholders.company_name')}
                className={`${styles.input} ${errors.companyName ? styles.inputError : ""}`}
                required={transactionType === "B2B"}
              />
              {errors.companyName && (
                <p className={styles.errorMessage}>{errors.companyName}</p>
              )}
              {isEmployerBilling && (
                <p className={styles.helperText}>
                  {t('ui.checkout.customer_info.helpers.company_autofilled')}
                </p>
              )}
            </div>

            {/* VAT Number (Optional for B2B) - Pre-filled from employer if available */}
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>
                <FileText size={16} />
                {t('ui.checkout.customer_info.labels.vat_number')} <span className={styles.optional}>{t('ui.checkout.customer_info.required_optional.optional_indicator')}</span>
                {isEmployerBilling && <span className={styles.optional}> {t('ui.checkout.customer_info.required_optional.autofilled_short')}</span>}
              </label>
              <input
                type="text"
                value={vatNumber}
                onChange={(e) => {
                  setVatNumber(e.target.value);
                  if (errors.vatNumber) setErrors({ ...errors, vatNumber: "" });
                }}
                placeholder={t('ui.checkout.customer_info.placeholders.vat_number')}
                className={`${styles.input} ${errors.vatNumber ? styles.inputError : ""}`}
              />
              {errors.vatNumber && (
                <p className={styles.errorMessage}>{errors.vatNumber}</p>
              )}
              <p className={styles.helperText}>
                {t('ui.checkout.customer_info.helpers.vat_format')}
              </p>
            </div>

            {/* Billing Address Section */}
            <div className={styles.formField} style={{ marginTop: "24px" }}>
              <label className={styles.fieldLabel} style={{ fontSize: "16px", fontWeight: "600" }}>
                <MapPin size={16} />
                {t('ui.checkout.customer_info.labels.billing_address')}
                {isEmployerBilling && <span className={styles.optional}> {t('ui.checkout.customer_info.required_optional.autofilled_indicator')}</span>}
              </label>
              <p className={styles.helperText} style={{ marginTop: "4px" }}>
                {isEmployerBilling
                  ? t('ui.checkout.customer_info.helpers.billing_address_employer')
                  : t('ui.checkout.customer_info.helpers.billing_address_required')}
              </p>
            </div>

            {/* Street Address - Line 1 */}
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>
                {t('ui.checkout.customer_info.labels.street_address')} <span className={styles.required}>{t('ui.checkout.customer_info.required_optional.required_indicator')}</span>
              </label>
              <input
                type="text"
                value={line1}
                onChange={(e) => {
                  setLine1(e.target.value);
                  if (errors.line1) setErrors({ ...errors, line1: "" });
                }}
                placeholder={t('ui.checkout.customer_info.placeholders.street_address')}
                className={`${styles.input} ${errors.line1 ? styles.inputError : ""}`}
                required={transactionType === "B2B"}
              />
              {errors.line1 && (
                <p className={styles.errorMessage}>{errors.line1}</p>
              )}
            </div>

            {/* Street Address - Line 2 (Optional) */}
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>
                {t('ui.checkout.customer_info.labels.address_line2')} <span className={styles.optional}>{t('ui.checkout.customer_info.required_optional.optional_indicator')}</span>
              </label>
              <input
                type="text"
                value={line2}
                onChange={(e) => setLine2(e.target.value)}
                placeholder={t('ui.checkout.customer_info.placeholders.address_line2')}
                className={styles.input}
              />
              <p className={styles.helperText}>
                {t('ui.checkout.customer_info.helpers.address_line2_description')}
              </p>
            </div>

            {/* City and State/Province (side by side) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>
                  {t('ui.checkout.customer_info.labels.city')} <span className={styles.required}>{t('ui.checkout.customer_info.required_optional.required_indicator')}</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    if (errors.city) setErrors({ ...errors, city: "" });
                  }}
                  placeholder={t('ui.checkout.customer_info.placeholders.city')}
                  className={`${styles.input} ${errors.city ? styles.inputError : ""}`}
                  required={transactionType === "B2B"}
                />
                {errors.city && (
                  <p className={styles.errorMessage}>{errors.city}</p>
                )}
              </div>

              <div className={styles.formField}>
                <label className={styles.fieldLabel}>
                  {t('ui.checkout.customer_info.labels.state_province')} <span className={styles.optional}>{t('ui.checkout.customer_info.required_optional.optional_indicator')}</span>
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder={t('ui.checkout.customer_info.placeholders.state')}
                  className={styles.input}
                />
              </div>
            </div>

            {/* Postal Code and Country (side by side) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>
                  {t('ui.checkout.customer_info.labels.postal_code')} <span className={styles.required}>{t('ui.checkout.customer_info.required_optional.required_indicator')}</span>
                </label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => {
                    setPostalCode(e.target.value);
                    if (errors.postalCode) setErrors({ ...errors, postalCode: "" });
                  }}
                  placeholder={t('ui.checkout.customer_info.placeholders.postal_code')}
                  className={`${styles.input} ${errors.postalCode ? styles.inputError : ""}`}
                  required={transactionType === "B2B"}
                />
                {errors.postalCode && (
                  <p className={styles.errorMessage}>{errors.postalCode}</p>
                )}
              </div>

              <div className={styles.formField}>
                <label className={styles.fieldLabel}>
                  {t('ui.checkout.customer_info.labels.country')} <span className={styles.required}>{t('ui.checkout.customer_info.required_optional.required_indicator')}</span>
                </label>
                <select
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    if (errors.country) setErrors({ ...errors, country: "" });
                  }}
                  className={`${styles.input} ${errors.country ? styles.inputError : ""}`}
                  required={transactionType === "B2B"}
                >
                  <option value="DE">{t('ui.checkout.customer_info.countries.de')}</option>
                  <option value="AT">{t('ui.checkout.customer_info.countries.at')}</option>
                  <option value="CH">{t('ui.checkout.customer_info.countries.ch')}</option>
                  <option value="PL">{t('ui.checkout.customer_info.countries.pl')}</option>
                  <option value="FR">{t('ui.checkout.customer_info.countries.fr')}</option>
                  <option value="NL">{t('ui.checkout.customer_info.countries.nl')}</option>
                  <option value="BE">{t('ui.checkout.customer_info.countries.be')}</option>
                  <option value="DK">{t('ui.checkout.customer_info.countries.dk')}</option>
                  <option value="SE">{t('ui.checkout.customer_info.countries.se')}</option>
                  <option value="NO">{t('ui.checkout.customer_info.countries.no')}</option>
                  <option value="GB">{t('ui.checkout.customer_info.countries.gb')}</option>
                  <option value="US">{t('ui.checkout.customer_info.countries.us')}</option>
                </select>
                {errors.country && (
                  <p className={styles.errorMessage}>{errors.country}</p>
                )}
                <p className={styles.helperText}>
                  {t('ui.checkout.customer_info.helpers.country_code_format')}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className={styles.actionButtons}>
          <button
            type="button"
            onClick={onBack}
            className={styles.secondaryButton}
          >
            <ArrowLeft size={16} />
            {t('ui.checkout.customer_info.buttons.back')}
          </button>

          <button
            type="submit"
            disabled={!isValid()}
            className={styles.primaryButton}
          >
            {t('ui.checkout.customer_info.buttons.continue')} →
          </button>
        </div>
      </form>
    </div>
  );
}
