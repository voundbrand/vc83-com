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

import { useState, useMemo } from "react";
import { User, Mail, Phone, MessageSquare, ArrowLeft, Building2, FileText, MapPin, CheckCircle } from "lucide-react";
import styles from "../styles/multi-step.module.css";
import { Id } from "../../../../convex/_generated/dataModel";

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
  // 🚨 NEW: Detect employer billing from form responses
  const employerBilling = useMemo((): EmployerBillingInfo | null => {
    if (!formResponses || !linkedProducts) return null;

    // Get first form response (assuming single product checkout)
    const firstResponse = formResponses[0];
    if (!firstResponse) return null;

    // Get product's invoice config
    const product = linkedProducts.find((p) => p._id === firstResponse.productId);

    // Type-safe access to customProperties with proper type assertion
    const customProps = product?.customProperties as
      | {
          invoiceConfig?: {
            employerSourceField: string;
            employerMapping: Record<string, EmployerBillingInfo | { type: "self_pay" } | string>;
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

    // Get employer mapping
    const mapping = invoiceConfig.employerMapping[employerValue];

    // Support both old (string) and new (object) format
    if (typeof mapping === "object" && mapping?.type === "employer_billing") {
      return mapping as EmployerBillingInfo;
    }

    // Old format: just a string name, treat as minimal employer billing
    if (typeof mapping === "string") {
      return {
        type: "employer_billing" as const,
        organizationName: mapping,
        billingAddress: {
          line1: "",
          city: "",
          postalCode: "",
          country: "DE",
        },
      };
    }

    return null;
  }, [formResponses, linkedProducts]);

  // Check if we're in employer billing mode
  const isEmployerBilling = !!employerBilling;

  const [email, setEmail] = useState(initialData?.email || "");
  const [name, setName] = useState(initialData?.name || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [notes, setNotes] = useState(initialData?.notes || "");

  // B2B fields - auto-set to B2B if forced or employer billing
  const [transactionType, setTransactionType] = useState<"B2C" | "B2B">(
    (forceB2B || isEmployerBilling) ? "B2B" : (initialData?.transactionType || "B2C")
  );
  const [companyName, setCompanyName] = useState(
    initialData?.companyName || employerBilling?.organizationName || ""
  );
  const [vatNumber, setVatNumber] = useState(
    initialData?.vatNumber || employerBilling?.vatNumber || ""
  );

  // Debug logging
  console.log("🔍 [CustomerInfoStep] State:", {
    forceB2B,
    isEmployerBilling,
    employerBilling,
    transactionType,
    shouldShowB2BFields: transactionType === "B2B"
  });

  // Billing address fields (using line1/line2 format)
  // Pre-fill from employer billing if available
  const [line1, setLine1] = useState(
    initialData?.billingAddress?.line1 || employerBilling?.billingAddress.line1 || ""
  );
  const [line2, setLine2] = useState(
    initialData?.billingAddress?.line2 || employerBilling?.billingAddress.line2 || ""
  );
  const [city, setCity] = useState(
    initialData?.billingAddress?.city || employerBilling?.billingAddress.city || ""
  );
  const [state, setState] = useState(
    initialData?.billingAddress?.state || employerBilling?.billingAddress.state || ""
  );
  const [postalCode, setPostalCode] = useState(
    initialData?.billingAddress?.postalCode || employerBilling?.billingAddress.postalCode || ""
  );
  const [country, setCountry] = useState(
    initialData?.billingAddress?.country || employerBilling?.billingAddress.country || "DE"
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Validate form fields
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Name validation
    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    // B2B validations
    if (transactionType === "B2B") {
      if (!companyName.trim()) {
        newErrors.companyName = "Company name is required for business transactions";
      }

      // VAT number format validation (basic EU format check)
      if (vatNumber.trim()) {
        const vatRegex = /^[A-Z]{2}[0-9A-Z]{2,13}$/;
        if (!vatRegex.test(vatNumber.trim().replace(/[\s.-]/g, ""))) {
          newErrors.vatNumber = "Please enter a valid VAT number (e.g., DE123456789, GB999999973)";
        }
      }

      // Billing address validation for B2B
      if (!line1.trim()) {
        newErrors.line1 = "Street address is required for business transactions";
      }
      if (!city.trim()) {
        newErrors.city = "City is required for business transactions";
      }
      if (!postalCode.trim()) {
        newErrors.postalCode = "Postal code is required for business transactions";
      }
      if (!country.trim()) {
        newErrors.country = "Country is required for business transactions";
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
          Your Information
        </h2>
        <p className={styles.stepSubtitle}>
          {isEmployerBilling
            ? "Personal information only - billing will be sent to your employer"
            : "Please provide your contact details for order confirmation."}
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
              Employer Billing Detected
            </h3>
          </div>
          <div style={{ fontSize: "14px", color: "#1E40AF", lineHeight: "1.6" }}>
            <p style={{ margin: "4px 0" }}>
              <strong>Company:</strong> {employerBilling.organizationName}
            </p>
            {employerBilling.billingAddress.line1 && (
              <p style={{ margin: "4px 0" }}>
                <strong>Billing Address:</strong>{" "}
                {employerBilling.billingAddress.line1}
                {employerBilling.billingAddress.line2 && `, ${employerBilling.billingAddress.line2}`}
                , {employerBilling.billingAddress.city},{" "}
                {employerBilling.billingAddress.postalCode}
              </p>
            )}
            {employerBilling.vatNumber && (
              <p style={{ margin: "4px 0" }}>
                <strong>VAT Number:</strong> {employerBilling.vatNumber}
              </p>
            )}
            {employerBilling.billingEmail && (
              <p style={{ margin: "4px 0" }}>
                <strong>Invoice will be sent to:</strong> {employerBilling.billingEmail}
              </p>
            )}
            <p style={{ margin: "8px 0 0 0", fontSize: "12px", fontStyle: "italic" }}>
              ✓ Billing information has been automatically configured based on your employer selection.
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
            Email Address <span className={styles.required}>*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors({ ...errors, email: "" });
            }}
            placeholder="your.email@example.com"
            className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
            required
          />
          {errors.email && (
            <p className={styles.errorMessage}>{errors.email}</p>
          )}
          <p className={styles.helperText}>
            We&apos;ll send your order confirmation and ticket to this email.
          </p>
        </div>

        {/* Full Name */}
        <div className={styles.formField}>
          <label className={styles.fieldLabel}>
            <User size={16} />
            Full Name <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors({ ...errors, name: "" });
            }}
            placeholder="John Doe"
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
            Phone Number <span className={styles.optional}>(Optional)</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 123-4567"
            className={styles.input}
          />
        </div>

        {/* Special Requests (Optional) */}
        <div className={styles.formField}>
          <label className={styles.fieldLabel}>
            <MessageSquare size={16} />
            Special Requests <span className={styles.optional}>(Optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any dietary restrictions, accessibility needs, or special requests..."
            rows={4}
            className={styles.textarea}
          />
        </div>

        {/* Transaction Type Selector - Hide if employer billing */}
        {!isEmployerBilling && (
          <div className={styles.formField}>
            <label className={styles.fieldLabel}>
              <Building2 size={16} />
              Transaction Type <span className={styles.required}>*</span>
            </label>
            {forceB2B ? (
              <div className="mt-2 p-3 rounded" style={{ backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                <p className="text-sm font-bold" style={{ color: "#1E40AF" }}>
                  🏢 Business/Organization Purchase Required
                </p>
                <p className="text-xs mt-1" style={{ color: "#1E40AF" }}>
                  This checkout requires organization information. Company details and billing address are mandatory.
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
                    <span>Individual/Consumer</span>
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
                    <span>Business/Company</span>
                  </label>
                </div>
                <p className={styles.helperText}>
                  Select if this purchase is for a business (requires company details)
                </p>
              </>
            )}
          </div>
        )}

        {/* B2B Fields - Show only when B2B is selected */}
        {transactionType === "B2B" && (
          <>
            {/* Company Name - Read-only if employer billing */}
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>
                <Building2 size={16} />
                Company Name <span className={styles.required}>*</span>
                {isEmployerBilling && <span className={styles.optional}> (From Employer)</span>}
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => {
                  if (!isEmployerBilling) {
                    setCompanyName(e.target.value);
                    if (errors.companyName) setErrors({ ...errors, companyName: "" });
                  }
                }}
                placeholder="Acme Corporation"
                className={`${styles.input} ${errors.companyName ? styles.inputError : ""}`}
                required={transactionType === "B2B"}
                readOnly={isEmployerBilling}
                disabled={isEmployerBilling}
                style={isEmployerBilling ? { backgroundColor: "#F3F4F6", cursor: "not-allowed" } : {}}
              />
              {errors.companyName && (
                <p className={styles.errorMessage}>{errors.companyName}</p>
              )}
            </div>

            {/* VAT Number (Optional for B2B) - Read-only if employer billing */}
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>
                <FileText size={16} />
                VAT Number <span className={styles.optional}>(Optional)</span>
                {isEmployerBilling && <span className={styles.optional}> (From Employer)</span>}
              </label>
              <input
                type="text"
                value={vatNumber}
                onChange={(e) => {
                  if (!isEmployerBilling) {
                    setVatNumber(e.target.value);
                    if (errors.vatNumber) setErrors({ ...errors, vatNumber: "" });
                  }
                }}
                placeholder="DE123456789 or GB999999973"
                className={`${styles.input} ${errors.vatNumber ? styles.inputError : ""}`}
                readOnly={isEmployerBilling}
                disabled={isEmployerBilling}
                style={isEmployerBilling ? { backgroundColor: "#F3F4F6", cursor: "not-allowed" } : {}}
              />
              {errors.vatNumber && (
                <p className={styles.errorMessage}>{errors.vatNumber}</p>
              )}
              {!isEmployerBilling && (
                <p className={styles.helperText}>
                  EU VAT number format: 2-letter country code + digits (e.g., DE123456789)
                </p>
              )}
            </div>

            {/* Billing Address Section */}
            <div className={styles.formField} style={{ marginTop: "24px" }}>
              <label className={styles.fieldLabel} style={{ fontSize: "16px", fontWeight: "600" }}>
                <MapPin size={16} />
                Billing Address
                {isEmployerBilling && <span className={styles.optional}> (From Employer)</span>}
              </label>
              <p className={styles.helperText} style={{ marginTop: "4px" }}>
                {isEmployerBilling
                  ? "Pre-filled from employer information"
                  : "Required for business invoices"}
              </p>
            </div>

            {/* Street Address - Line 1 */}
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>
                Street Address <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={line1}
                onChange={(e) => {
                  if (!isEmployerBilling) {
                    setLine1(e.target.value);
                    if (errors.line1) setErrors({ ...errors, line1: "" });
                  }
                }}
                placeholder="Hauptstraße 123"
                className={`${styles.input} ${errors.line1 ? styles.inputError : ""}`}
                required={transactionType === "B2B"}
                readOnly={isEmployerBilling}
                disabled={isEmployerBilling}
                style={isEmployerBilling ? { backgroundColor: "#F3F4F6", cursor: "not-allowed" } : {}}
              />
              {errors.line1 && (
                <p className={styles.errorMessage}>{errors.line1}</p>
              )}
            </div>

            {/* Street Address - Line 2 (Optional) */}
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>
                Address Line 2 <span className={styles.optional}>(Optional)</span>
              </label>
              <input
                type="text"
                value={line2}
                onChange={(e) => {
                  if (!isEmployerBilling) setLine2(e.target.value);
                }}
                placeholder="Suite 100, Floor 2"
                className={styles.input}
                readOnly={isEmployerBilling}
                disabled={isEmployerBilling}
                style={isEmployerBilling ? { backgroundColor: "#F3F4F6", cursor: "not-allowed" } : {}}
              />
              {!isEmployerBilling && (
                <p className={styles.helperText}>
                  Apartment, suite, unit, building, floor, etc.
                </p>
              )}
            </div>

            {/* City and State/Province (side by side) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>
                  City <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => {
                    if (!isEmployerBilling) {
                      setCity(e.target.value);
                      if (errors.city) setErrors({ ...errors, city: "" });
                    }
                  }}
                  placeholder="San Francisco"
                  className={`${styles.input} ${errors.city ? styles.inputError : ""}`}
                  required={transactionType === "B2B"}
                  readOnly={isEmployerBilling}
                  disabled={isEmployerBilling}
                  style={isEmployerBilling ? { backgroundColor: "#F3F4F6", cursor: "not-allowed" } : {}}
                />
                {errors.city && (
                  <p className={styles.errorMessage}>{errors.city}</p>
                )}
              </div>

              <div className={styles.formField}>
                <label className={styles.fieldLabel}>
                  State/Province <span className={styles.optional}>(Optional)</span>
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => {
                    if (!isEmployerBilling) setState(e.target.value);
                  }}
                  placeholder="CA"
                  className={styles.input}
                  readOnly={isEmployerBilling}
                  disabled={isEmployerBilling}
                  style={isEmployerBilling ? { backgroundColor: "#F3F4F6", cursor: "not-allowed" } : {}}
                />
              </div>
            </div>

            {/* Postal Code and Country (side by side) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>
                  Postal Code <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => {
                    if (!isEmployerBilling) {
                      setPostalCode(e.target.value);
                      if (errors.postalCode) setErrors({ ...errors, postalCode: "" });
                    }
                  }}
                  placeholder="94105"
                  className={`${styles.input} ${errors.postalCode ? styles.inputError : ""}`}
                  required={transactionType === "B2B"}
                  readOnly={isEmployerBilling}
                  disabled={isEmployerBilling}
                  style={isEmployerBilling ? { backgroundColor: "#F3F4F6", cursor: "not-allowed" } : {}}
                />
                {errors.postalCode && (
                  <p className={styles.errorMessage}>{errors.postalCode}</p>
                )}
              </div>

              <div className={styles.formField}>
                <label className={styles.fieldLabel}>
                  Country <span className={styles.required}>*</span>
                </label>
                <select
                  value={country}
                  onChange={(e) => {
                    if (!isEmployerBilling) {
                      setCountry(e.target.value);
                      if (errors.country) setErrors({ ...errors, country: "" });
                    }
                  }}
                  className={`${styles.input} ${errors.country ? styles.inputError : ""}`}
                  required={transactionType === "B2B"}
                  disabled={isEmployerBilling}
                  style={isEmployerBilling ? { backgroundColor: "#F3F4F6", cursor: "not-allowed" } : {}}
                >
                  <option value="DE">Deutschland</option>
                  <option value="AT">Österreich</option>
                  <option value="CH">Schweiz</option>
                  <option value="PL">Polen</option>
                  <option value="FR">Frankreich</option>
                  <option value="NL">Niederlande</option>
                  <option value="BE">Belgien</option>
                  <option value="DK">Dänemark</option>
                  <option value="SE">Schweden</option>
                  <option value="NO">Norwegen</option>
                  <option value="GB">Vereinigtes Königreich</option>
                  <option value="US">USA</option>
                </select>
                {errors.country && (
                  <p className={styles.errorMessage}>{errors.country}</p>
                )}
                {!isEmployerBilling && (
                  <p className={styles.helperText}>
                    ISO 3166-1 alpha-2 country code (e.g., DE for Germany)
                  </p>
                )}
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
            Back
          </button>

          <button
            type="submit"
            disabled={!isValid()}
            className={styles.primaryButton}
          >
            Continue →
          </button>
        </div>
      </form>
    </div>
  );
}
