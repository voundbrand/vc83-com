"use client";

import { useState } from "react";
import { Building2, Save, AlertCircle, CheckCircle } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/contexts/translation-context";

/**
 * System Organizations Tab - Create New Organizations
 *
 * Permission: create_system_organization (super admin only)
 *
 * This form allows super admins to create new organizations with:
 * - Business name (required) - auto-generates name and slug
 * - Description (optional)
 * - Industry (optional)
 * - Contact info (optional)
 * - Auto-add creator as org_owner (optional, default true)
 */

export function SystemOrganizationsTab() {
  const { sessionId } = useAuth();
  const { t } = useTranslation();
  const createOrganization = useAction(api.organizations.createOrganization);

  // Form state
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [addMeAsOwner, setAddMeAsOwner] = useState(true);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!businessName.trim()) {
      setError(t('ui.organizations.error.business_name_required'));
      return;
    }

    if (!sessionId) {
      setError(t('ui.organizations.error.not_authenticated'));
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createOrganization({
        sessionId,
        businessName: businessName.trim(),
        description: description.trim() || undefined,
        industry: industry.trim() || undefined,
        addCreatorAsOwner: addMeAsOwner,
      });

      // Success!
      setSuccess(true);
      setSuccessMessage(result.message);

      // Reset form
      setBusinessName("");
      setDescription("");
      setIndustry("");

      // Hide success message after 5 seconds
      setTimeout(() => {
        setSuccess(false);
        setSuccessMessage("");
      }, 5000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('ui.organizations.error.create_failed');
      setError(errorMessage);
      console.error("Create organization error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full overflow-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
          <Building2 size={24} style={{ color: "var(--primary)" }} />
          {t('ui.organizations.create.title')}
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--win95-text-secondary)" }}>
          {t('ui.organizations.create.subtitle')}
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div
          className="mb-6 p-4 rounded flex items-start gap-3"
          style={{
            backgroundColor: "#16a34a",
            color: "white",
            border: "2px solid #15803d",
          }}
        >
          <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold mb-1">{t('ui.organizations.success.title')}</p>
            <p className="text-sm">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          className="mb-6 p-4 rounded flex items-start gap-3"
          style={{
            backgroundColor: "#dc2626",
            color: "white",
            border: "2px solid #991b1b",
          }}
        >
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold mb-1">{t('ui.organizations.error.title')}</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {/* Business Name - REQUIRED */}
        <div>
          <label htmlFor="businessName" className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
            <Building2 size={14} className="inline mr-1" />
            {t('ui.organizations.form.business_name')}
          </label>
          <input
            type="text"
            id="businessName"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm"
            style={{
              backgroundColor: "var(--win95-input-bg)",
              color: "var(--win95-input-text)",
              border: "2px inset",
              borderColor: "var(--win95-input-border-dark)",
            }}
            placeholder={t('ui.organizations.placeholder.business_name')}
          />
          <p className="text-xs mt-1" style={{ color: "var(--win95-text-secondary)" }}>
            {t('ui.organizations.form.business_name_hint')}
          </p>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
            {t('ui.organizations.form.description')}
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm"
            style={{
              backgroundColor: "var(--win95-input-bg)",
              color: "var(--win95-input-text)",
              border: "2px inset",
              borderColor: "var(--win95-input-border-dark)",
            }}
            placeholder={t('ui.organizations.placeholder.description')}
          />
        </div>

        {/* Industry/Type */}
        <div>
          <label htmlFor="industry" className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
            {t('ui.organizations.form.industry')}
          </label>
          <input
            type="text"
            id="industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full px-3 py-2 text-sm"
            style={{
              backgroundColor: "var(--win95-input-bg)",
              color: "var(--win95-input-text)",
              border: "2px inset",
              borderColor: "var(--win95-input-border-dark)",
            }}
            placeholder={t('ui.organizations.placeholder.industry')}
          />
          <p className="text-xs mt-1" style={{ color: "var(--win95-text-secondary)" }}>
            {t('ui.organizations.form.industry_hint')}
          </p>
        </div>

        {/* Add Me as Owner Checkbox */}
        <div className="flex items-center gap-3 pt-2">
          <input
            type="checkbox"
            id="addMeAsOwner"
            checked={addMeAsOwner}
            onChange={(e) => setAddMeAsOwner(e.target.checked)}
            className="cursor-pointer"
            style={{
              width: "18px",
              height: "18px",
            }}
          />
          <label htmlFor="addMeAsOwner" className="text-sm cursor-pointer" style={{ color: "var(--win95-text)" }}>
            {t('ui.organizations.form.add_me_owner')}
          </label>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting || !businessName.trim()}
            className="px-6 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{
              backgroundColor: "var(--primary)",
              color: "white",
              border: "2px solid",
              borderTopColor: "var(--win95-button-light)",
              borderLeftColor: "var(--win95-button-light)",
              borderBottomColor: "var(--win95-button-dark)",
              borderRightColor: "var(--win95-button-dark)",
            }}
          >
            <Save size={16} />
            {isSubmitting ? t('ui.organizations.button.creating') : t('ui.organizations.button.create')}
          </button>
        </div>
      </form>
    </div>
  );
}
