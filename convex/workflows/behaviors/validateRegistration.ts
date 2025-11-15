/**
 * BEHAVIOR: VALIDATE REGISTRATION DATA (Behavior 1)
 *
 * Validates all required fields and data formats for event registration.
 * Runs first in the workflow (priority 100).
 *
 * Checks:
 * - Required fields: email, firstName, lastName, salutation, consent_privacy
 * - Email format validation
 * - Billing address if category requires it (External, HaffNet)
 * - Phone number format if provided
 */

import { action } from "../../_generated/server";
import { v } from "convex/values";

export const executeValidateRegistration = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    config: v.any(),
    context: v.any(),
  },
  handler: async (ctx, args) => {
    console.log("✓ [Behavior 1/12] Validate Registration Data");

    const context = args.context as {
      customerData?: {
        email?: string;
        firstName?: string;
        lastName?: string;
        salutation?: string;
        phone?: string;
      };
      formResponses?: {
        attendee_category?: string;
        billing_address?: string;
        consent_privacy?: boolean;
      };
    };

    const errors: Array<{ field: string; message: string }> = [];

    // Check required customer data
    if (!context.customerData?.email) {
      errors.push({ field: "email", message: "Email is required" });
    } else if (!isValidEmail(context.customerData.email)) {
      errors.push({ field: "email", message: "Invalid email format" });
    }

    if (!context.customerData?.firstName) {
      errors.push({ field: "firstName", message: "First name is required" });
    }

    if (!context.customerData?.lastName) {
      errors.push({ field: "lastName", message: "Last name is required" });
    }

    if (!context.customerData?.salutation) {
      errors.push({ field: "salutation", message: "Salutation is required" });
    }

    // Check privacy consent
    if (!context.formResponses?.consent_privacy) {
      errors.push({ field: "consent_privacy", message: "Privacy consent is required" });
    }

    // Check billing address for External and HaffNet categories
    const category = context.formResponses?.attendee_category;
    if (category === "external" || category === "haffnet") {
      if (!context.formResponses?.billing_address) {
        errors.push({ field: "billing_address", message: "Billing address is required for this category" });
      }
    }

    // Validate phone format if provided
    if (context.customerData?.phone && !isValidPhone(context.customerData.phone)) {
      errors.push({ field: "phone", message: "Invalid phone format" });
    }

    if (errors.length > 0) {
      console.error("❌ Validation failed:", errors);
      return {
        success: false,
        error: "Validation failed",
        message: `Found ${errors.length} validation error(s)`,
        data: { errors },
      };
    }

    console.log("✅ All fields validated successfully");
    return {
      success: true,
      message: "All registration data validated",
      data: { validated: true, fieldCount: 5 },
    };
  },
});

/**
 * HELPER: Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * HELPER: Validate phone format (German format)
 */
function isValidPhone(phone: string): boolean {
  // Accept formats: +49..., 0..., or plain numbers
  const phoneRegex = /^(\+49|0)?[\d\s\-()]{6,}$/;
  return phoneRegex.test(phone);
}
