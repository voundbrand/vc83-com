"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

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

  return (
    <div className="p-6">
      <div className="mb-4">
        <button
          onClick={onBack}
          className="px-3 py-2 text-xs font-bold flex items-center gap-2"
          style={{
            background: "var(--win95-bg)",
            color: "var(--win95-text)",
            border: "2px solid var(--win95-button-border)",
          }}
        >
          <ArrowLeft size={14} />
          Back to List
        </button>
      </div>

      <div className="max-w-3xl">
        <h3 className="text-lg font-bold mb-4" style={{ color: "var(--win95-text)" }}>
          {certificateId ? "Edit Certificate" : "Issue New Certificate"}
        </h3>

        <div
          className="p-4 mb-4 border-2 rounded text-xs"
          style={{ background: "#FEF3C7", borderColor: "#F59E0B", color: "#92400E" }}
        >
          <strong>Note:</strong> This is a simplified form for manual certificate issuance. In production,
          certificates are usually auto-issued when attendees check in to events. You&apos;ll need to select
          an existing transaction and event from your system.
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Certificate Type */}
          <div>
            <h4 className="text-sm font-bold mb-3" style={{ color: "var(--win95-text)" }}>
              Certificate Type
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--neutral-gray)" }}>
                  Point Type *
                </label>
                <select
                  value={formData.pointType}
                  onChange={(e) => setFormData({ ...formData, pointType: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs"
                  style={{
                    background: "white",
                    border: "2px solid var(--win95-border)",
                    color: "var(--win95-text)",
                  }}
                >
                  <option value="cme">CME (Medical)</option>
                  <option value="cle">CLE (Legal)</option>
                  <option value="cpe">CPE (Accounting)</option>
                  <option value="ce">CE (Nursing)</option>
                  <option value="pdu">PDU (Project Management)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--neutral-gray)" }}>
                  Points Awarded *
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.pointsAwarded}
                  onChange={(e) => setFormData({ ...formData, pointsAwarded: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs"
                  style={{
                    background: "white",
                    border: "2px solid var(--win95-border)",
                    color: "var(--win95-text)",
                  }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--neutral-gray)" }}>
                  Category *
                </label>
                <input
                  type="text"
                  value={formData.pointCategory}
                  onChange={(e) => setFormData({ ...formData, pointCategory: e.target.value })}
                  placeholder="e.g., AMA PRA Category 1"
                  required
                  className="w-full px-3 py-2 text-xs"
                  style={{
                    background: "white",
                    border: "2px solid var(--win95-border)",
                    color: "var(--win95-text)",
                  }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--neutral-gray)" }}>
                  Unit
                </label>
                <input
                  type="text"
                  value={formData.pointUnit}
                  onChange={(e) => setFormData({ ...formData, pointUnit: e.target.value })}
                  className="w-full px-3 py-2 text-xs"
                  style={{
                    background: "white",
                    border: "2px solid var(--win95-border)",
                    color: "var(--win95-text)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Recipient Info */}
          <div>
            <h4 className="text-sm font-bold mb-3" style={{ color: "var(--win95-text)" }}>
              Recipient Information
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--neutral-gray)" }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.recipientName}
                  onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs"
                  style={{
                    background: "white",
                    border: "2px solid var(--win95-border)",
                    color: "var(--win95-text)",
                  }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--neutral-gray)" }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.recipientEmail}
                  onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs"
                  style={{
                    background: "white",
                    border: "2px solid var(--win95-border)",
                    color: "var(--win95-text)",
                  }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--neutral-gray)" }}>
                  License Number
                </label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  className="w-full px-3 py-2 text-xs"
                  style={{
                    background: "white",
                    border: "2px solid var(--win95-border)",
                    color: "var(--win95-text)",
                  }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--neutral-gray)" }}>
                  Profession
                </label>
                <input
                  type="text"
                  value={formData.profession}
                  onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                  placeholder="e.g., Physician, Attorney"
                  className="w-full px-3 py-2 text-xs"
                  style={{
                    background: "white",
                    border: "2px solid var(--win95-border)",
                    color: "var(--win95-text)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Event Info */}
          <div>
            <h4 className="text-sm font-bold mb-3" style={{ color: "var(--win95-text)" }}>
              Event Information
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--neutral-gray)" }}>
                  Event Name *
                </label>
                <input
                  type="text"
                  value={formData.eventName}
                  onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs"
                  style={{
                    background: "white",
                    border: "2px solid var(--win95-border)",
                    color: "var(--win95-text)",
                  }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--neutral-gray)" }}>
                  Event Date *
                </label>
                <input
                  type="date"
                  value={formData.eventDate}
                  onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs"
                  style={{
                    background: "white",
                    border: "2px solid var(--win95-border)",
                    color: "var(--win95-text)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t-2" style={{ borderColor: "var(--win95-border)" }}>
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 text-xs font-bold"
              style={{
                background: "var(--win95-bg)",
                color: "var(--win95-text)",
                border: "2px solid var(--win95-button-border)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold flex items-center gap-2"
              style={{
                background: isSubmitting ? "var(--neutral-gray)" : "var(--primary)",
                color: "white",
                border: "2px solid var(--win95-button-border)",
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Issuing...
                </>
              ) : (
                <>
                  <Save size={14} />
                  Issue Certificate
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
