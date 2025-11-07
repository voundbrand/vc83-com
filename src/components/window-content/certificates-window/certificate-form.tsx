"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

interface CertificateFormProps {
  certificateId: Id<"objects"> | null;
  sessionId: string;
  organizationId: Id<"organizations">;
  onBack: () => void;
}

export function CertificateForm({
  certificateId,
  sessionId,
  organizationId,
  onBack,
}: CertificateFormProps) {
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.certificates");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createCertificate = useMutation(api.certificateOntology.createCertificate);

  const [formData, setFormData] = useState({
    pointType: "cme",
    pointsAwarded: "",
    pointCategory: "",
    pointUnit: "credits",
    recipientName: "",
    recipientEmail: "",
    eventName: "",
    eventDate: "",
    licenseNumber: "",
    profession: "",
    specialty: "",
    accreditingBody: "",
    activityId: "",
    expirationMonths: "",
    transactionId: "",
    eventId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Note: This is a simplified form. In reality, you'd need to:
      // 1. Select an existing transaction and event (via dropdowns)
      // 2. Validate all required fields
      // 3. Handle errors properly

      if (!formData.transactionId || !formData.eventId) {
        alert("Please select a transaction and event");
        return;
      }

      await createCertificate({
        sessionId,
        organizationId,
        transactionId: formData.transactionId as Id<"objects">,
        eventId: formData.eventId as Id<"objects">,
        pointType: formData.pointType,
        pointsAwarded: parseFloat(formData.pointsAwarded),
        pointCategory: formData.pointCategory,
        pointUnit: formData.pointUnit,
        recipientName: formData.recipientName,
        recipientEmail: formData.recipientEmail,
        eventName: formData.eventName,
        eventDate: new Date(formData.eventDate).getTime(),
        ...(formData.licenseNumber && { licenseNumber: formData.licenseNumber }),
        ...(formData.profession && { profession: formData.profession }),
        ...(formData.specialty && { specialty: formData.specialty }),
        ...(formData.accreditingBody && { accreditingBody: formData.accreditingBody }),
        ...(formData.activityId && { activityId: formData.activityId }),
        ...(formData.expirationMonths && { expirationMonths: parseInt(formData.expirationMonths) }),
      });

      onBack();
    } catch (error) {
      console.error("Failed to create certificate:", error);
      alert("Failed to create certificate. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (translationsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4">
        <button
          onClick={onBack}
          className="px-3 py-2 text-xs font-bold flex items-center gap-2 retro-button"
        >
          <ArrowLeft size={14} />
          {t("ui.certificates.button.back_to_list")}
        </button>
      </div>

      <div className="max-w-3xl">
        <h3 className="text-lg font-bold mb-4" style={{ color: "var(--win95-text)" }}>
          {certificateId ? t("ui.certificates.form.title.edit") : t("ui.certificates.form.title.new")}
        </h3>

        <div
          className="p-4 mb-4 border-2 rounded text-xs"
          style={{
            background: "var(--win95-bg-light)",
            borderColor: "var(--win95-highlight)",
            color: "var(--win95-text)"
          }}
        >
          <strong>{t("ui.certificates.form.note_title")}</strong> {t("ui.certificates.form.note_description")}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Certificate Type */}
          <div>
            <h4 className="text-sm font-bold mb-3" style={{ color: "var(--win95-text)" }}>
              {t("ui.certificates.form.section.certificate_type")}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.certificates.form.field.point_type")} {t("ui.certificates.common.required_field")}
                </label>
                <select
                  value={formData.pointType}
                  onChange={(e) => setFormData({ ...formData, pointType: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs retro-input"
                >
                  <option value="cme">{t("ui.certificates.type_full.cme")}</option>
                  <option value="cle">{t("ui.certificates.type_full.cle")}</option>
                  <option value="cpe">{t("ui.certificates.type_full.cpe")}</option>
                  <option value="ce">{t("ui.certificates.type_full.ce")}</option>
                  <option value="pdu">{t("ui.certificates.type_full.pdu")}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.certificates.form.field.points_awarded")} {t("ui.certificates.common.required_field")}
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.pointsAwarded}
                  onChange={(e) => setFormData({ ...formData, pointsAwarded: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs retro-input"
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.certificates.form.field.category")} {t("ui.certificates.common.required_field")}
                </label>
                <input
                  type="text"
                  value={formData.pointCategory}
                  onChange={(e) => setFormData({ ...formData, pointCategory: e.target.value })}
                  placeholder={t("ui.certificates.form.field.category_placeholder")}
                  required
                  className="w-full px-3 py-2 text-xs retro-input"
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.certificates.form.field.unit")}
                </label>
                <input
                  type="text"
                  value={formData.pointUnit}
                  onChange={(e) => setFormData({ ...formData, pointUnit: e.target.value })}
                  className="w-full px-3 py-2 text-xs retro-input"
                />
              </div>
            </div>
          </div>

          {/* Recipient Info */}
          <div>
            <h4 className="text-sm font-bold mb-3" style={{ color: "var(--win95-text)" }}>
              {t("ui.certificates.form.section.recipient_info")}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.certificates.form.field.full_name")} {t("ui.certificates.common.required_field")}
                </label>
                <input
                  type="text"
                  value={formData.recipientName}
                  onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs retro-input"
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.certificates.form.field.email")} {t("ui.certificates.common.required_field")}
                </label>
                <input
                  type="email"
                  value={formData.recipientEmail}
                  onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs retro-input"
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.certificates.form.field.license_number")}
                </label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  className="w-full px-3 py-2 text-xs retro-input"
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.certificates.form.field.profession")}
                </label>
                <input
                  type="text"
                  value={formData.profession}
                  onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                  placeholder={t("ui.certificates.form.field.profession_placeholder")}
                  className="w-full px-3 py-2 text-xs retro-input"
                />
              </div>
            </div>
          </div>

          {/* Event Info */}
          <div>
            <h4 className="text-sm font-bold mb-3" style={{ color: "var(--win95-text)" }}>
              {t("ui.certificates.form.section.event_info")}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.certificates.form.field.event_name")} {t("ui.certificates.common.required_field")}
                </label>
                <input
                  type="text"
                  value={formData.eventName}
                  onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs retro-input"
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.certificates.form.field.event_date")} {t("ui.certificates.common.required_field")}
                </label>
                <input
                  type="date"
                  value={formData.eventDate}
                  onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs retro-input"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t-2" style={{ borderColor: "var(--win95-border)" }}>
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 text-xs font-bold retro-button"
            >
              {t("ui.certificates.form.button.cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold flex items-center gap-2"
              style={{
                background: isSubmitting ? "var(--neutral-gray)" : "var(--win95-highlight)",
                color: "var(--win95-bg-light)",
                border: "2px solid var(--win95-border)",
                cursor: isSubmitting ? "not-allowed" : "pointer",
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {t("ui.certificates.form.button.issuing")}
                </>
              ) : (
                <>
                  <Save size={14} />
                  {t("ui.certificates.form.button.issue")}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
