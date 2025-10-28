"use client";

/**
 * STEP 2: CUSTOMER INFORMATION
 *
 * Collect customer details:
 * - Email (required)
 * - Full Name (required)
 * - Phone (optional)
 * - Special Requests/Notes (optional)
 */

import { useState } from "react";
import { User, Mail, Phone, MessageSquare, ArrowLeft, Building2, FileText, MapPin } from "lucide-react";
import styles from "../styles/multi-step.module.css";

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

interface CustomerInfoStepProps {
  initialData?: CustomerInfo;
  forceB2B?: boolean; // Force B2B mode (require organization info)
  onComplete: (data: CustomerInfo) => void;
  onBack: () => void;
}

export function CustomerInfoStep({
  initialData,
  forceB2B = false,
  onComplete,
  onBack,
}: CustomerInfoStepProps) {
  const [email, setEmail] = useState(initialData?.email || "");
  const [name, setName] = useState(initialData?.name || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [notes, setNotes] = useState(initialData?.notes || "");

  // B2B fields - auto-set to B2B if forced
  const [transactionType, setTransactionType] = useState<"B2C" | "B2B">(
    forceB2B ? "B2B" : (initialData?.transactionType || "B2C")
  );
  const [companyName, setCompanyName] = useState(initialData?.companyName || "");
  const [vatNumber, setVatNumber] = useState(initialData?.vatNumber || "");

  // Debug logging for Force B2B
  console.log("🔍 [CustomerInfoStep] Force B2B State:", {
    forceB2B,
    transactionType,
    shouldShowB2BFields: transactionType === "B2B"
  });

  // Billing address fields (using line1/line2 format)
  const [line1, setLine1] = useState(initialData?.billingAddress?.line1 || "");
  const [line2, setLine2] = useState(initialData?.billingAddress?.line2 || "");
  const [city, setCity] = useState(initialData?.billingAddress?.city || "");
  const [state, setState] = useState(initialData?.billingAddress?.state || "");
  const [postalCode, setPostalCode] = useState(initialData?.billingAddress?.postalCode || "");
  const [country, setCountry] = useState(initialData?.billingAddress?.country || "DE");

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
          Please provide your contact details for order confirmation.
        </p>
      </div>

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

        {/* Transaction Type Selector */}
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

        {/* B2B Fields - Show only when B2B is selected */}
        {transactionType === "B2B" && (
          <>
            {/* Company Name */}
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>
                <Building2 size={16} />
                Company Name <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  if (errors.companyName) setErrors({ ...errors, companyName: "" });
                }}
                placeholder="Acme Corporation"
                className={`${styles.input} ${errors.companyName ? styles.inputError : ""}`}
                required={transactionType === "B2B"}
              />
              {errors.companyName && (
                <p className={styles.errorMessage}>{errors.companyName}</p>
              )}
            </div>

            {/* VAT Number (Optional for B2B) */}
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>
                <FileText size={16} />
                VAT Number <span className={styles.optional}>(Optional)</span>
              </label>
              <input
                type="text"
                value={vatNumber}
                onChange={(e) => {
                  setVatNumber(e.target.value);
                  if (errors.vatNumber) setErrors({ ...errors, vatNumber: "" });
                }}
                placeholder="DE123456789 or GB999999973"
                className={`${styles.input} ${errors.vatNumber ? styles.inputError : ""}`}
              />
              {errors.vatNumber && (
                <p className={styles.errorMessage}>{errors.vatNumber}</p>
              )}
              <p className={styles.helperText}>
                EU VAT number format: 2-letter country code + digits (e.g., DE123456789)
              </p>
            </div>

            {/* Billing Address Section */}
            <div className={styles.formField} style={{ marginTop: "24px" }}>
              <label className={styles.fieldLabel} style={{ fontSize: "16px", fontWeight: "600" }}>
                <MapPin size={16} />
                Billing Address
              </label>
              <p className={styles.helperText} style={{ marginTop: "4px" }}>
                Required for business invoices
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
                  setLine1(e.target.value);
                  if (errors.line1) setErrors({ ...errors, line1: "" });
                }}
                placeholder="Hauptstraße 123"
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
                Address Line 2 <span className={styles.optional}>(Optional)</span>
              </label>
              <input
                type="text"
                value={line2}
                onChange={(e) => setLine2(e.target.value)}
                placeholder="Suite 100, Floor 2"
                className={styles.input}
              />
              <p className={styles.helperText}>
                Apartment, suite, unit, building, floor, etc.
              </p>
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
                    setCity(e.target.value);
                    if (errors.city) setErrors({ ...errors, city: "" });
                  }}
                  placeholder="San Francisco"
                  className={`${styles.input} ${errors.city ? styles.inputError : ""}`}
                  required={transactionType === "B2B"}
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
                  onChange={(e) => setState(e.target.value)}
                  placeholder="CA"
                  className={styles.input}
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
                    setPostalCode(e.target.value);
                    if (errors.postalCode) setErrors({ ...errors, postalCode: "" });
                  }}
                  placeholder="94105"
                  className={`${styles.input} ${errors.postalCode ? styles.inputError : ""}`}
                  required={transactionType === "B2B"}
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
                    setCountry(e.target.value);
                    if (errors.country) setErrors({ ...errors, country: "" });
                  }}
                  className={`${styles.input} ${errors.country ? styles.inputError : ""}`}
                  required={transactionType === "B2B"}
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
                <p className={styles.helperText}>
                  ISO 3166-1 alpha-2 country code (e.g., DE for Germany)
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
