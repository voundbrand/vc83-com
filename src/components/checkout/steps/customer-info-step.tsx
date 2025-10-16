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
import { User, Mail, Phone, MessageSquare, ArrowLeft } from "lucide-react";
import styles from "../styles/multi-step.module.css";

interface CustomerInfo {
  email: string;
  name: string;
  phone?: string;
  notes?: string;
}

interface CustomerInfoStepProps {
  initialData?: CustomerInfo;
  onComplete: (data: CustomerInfo) => void;
  onBack: () => void;
}

export function CustomerInfoStep({
  initialData,
  onComplete,
  onBack,
}: CustomerInfoStepProps) {
  const [email, setEmail] = useState(initialData?.email || "");
  const [name, setName] = useState(initialData?.name || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [notes, setNotes] = useState(initialData?.notes || "");

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
      });
    }
  };

  /**
   * Check if form is valid (for button state)
   */
  const isValid = () => {
    return (
      email.trim().length > 0 &&
      name.trim().length > 0 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    );
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
