"use client";

import { Building2, Calendar, Mail, MessageSquare, Phone, Send, User, X } from "lucide-react";
import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Image from "next/image";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useTranslation } from "@/contexts/translation-context";

interface EnterpriseContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export function EnterpriseContactModal({
  isOpen,
  onClose,
  title = "Enterprise Solutions",
}: EnterpriseContactModalProps) {
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.contact_modal");
  const { locale } = useTranslation();
  const sendContactEmail = useAction(api.emailService.sendContactFormEmail);

  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Get avatar URL from Convex storage
  const avatarStorageId = process.env.NEXT_PUBLIC_REM_AVATAR_STORAGE_ID;
  const avatarUrl = useQuery(
    api.files.getFileUrl,
    avatarStorageId ? { storageId: avatarStorageId as Id<"_storage"> } : "skip"
  );

  if (!isOpen || translationsLoading) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Send email via Convex action
      await sendContactEmail({
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone || undefined,
        message: formData.message || undefined,
        productInterest: title, // Pass the modal title as product interest
        locale: locale, // Pass current language for localized confirmation
      });

      setSubmitted(true);

      // Reset form after 3 seconds and close
      setTimeout(() => {
        setSubmitted(false);
        setFormData({ name: "", company: "", email: "", phone: "", message: "" });
        onClose();
      }, 3000);
    } catch (error) {
      console.error("Failed to send contact form:", error);
      // TODO: Show error message to user
      alert("Failed to send message. Please try again or contact us directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto border-4"
        style={{
          backgroundColor: "var(--shell-surface)",
          borderColor: "var(--shell-border)",
        }}
      >
        {/* Window Title Bar */}
        <div
          className="retro-titlebar flex items-center justify-between select-none"
        >
          <div className="flex items-center gap-2">
            <Building2 size={16} style={{ color: "var(--shell-titlebar-text)" }} />
            <span className="font-semibold text-sm" style={{ color: "var(--shell-titlebar-text)" }}>
              {title} - {t("ui.contact_modal.title_suffix")}
            </span>
          </div>
          <button
            onClick={onClose}
            className="retro-control-button retro-close-btn"
            title="Close"
          >
            <X size={12} className="select-none window-btn-icon" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!submitted ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Personal Message */}
              <div>
                {/* Profile Section */}
                <div
                  className="p-4 border-2"
                  style={{
                    backgroundColor: "var(--shell-surface-elevated)",
                    borderColor: "var(--shell-border)",
                  }}
                >
                  <div className="flex items-start gap-4 mb-4">
                    {/* Profile Image - Circular */}
                    <div className="flex-shrink-0">
                      {avatarUrl ? (
                        <div
                          className="w-24 h-24 relative overflow-hidden border-2"
                          style={{
                            borderRadius: "50%",
                            borderColor: "var(--shell-border)",
                          }}
                        >
                          <Image
                            src={avatarUrl}
                            alt="Remington Splettstoesser"
                            fill
                            className="object-cover"
                            priority
                          />
                        </div>
                      ) : (
                        <div
                          className="w-24 h-24 flex items-center justify-center border-2"
                          style={{
                            borderRadius: "50%",
                            backgroundColor: "var(--shell-surface-elevated)",
                            borderColor: "var(--shell-border)",
                          }}
                        >
                          <User size={48} style={{ color: "var(--neutral-gray)" }} />
                        </div>
                      )}
                    </div>

                    {/* Profile Info */}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-1" style={{ color: "var(--shell-text)" }}>
                        Remington Splettstoesser
                      </h3>
                      <p className="text-sm mb-2" style={{ color: "var(--neutral-gray)" }}>
                        {t("ui.contact_modal.founder_title")}
                      </p>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <Mail size={12} style={{ color: "var(--shell-accent)" }} />
                          <a
                            href="mailto:sales@l4yercak3.com"
                            className="underline hover:opacity-80 transition-opacity"
                            style={{ color: "var(--shell-accent)" }}
                          >
                            sales@l4yercak3.com
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone size={12} style={{ color: "var(--shell-accent)" }} />
                          <a
                            href="tel:+4915140427103"
                            className="underline hover:opacity-80 transition-opacity"
                            style={{ color: "var(--shell-accent)" }}
                          >
                            +49 151 404 27 103
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar size={12} style={{ color: "var(--shell-accent)" }} />
                          <a
                            href="https://cal.com/voundbrand/open-end-meeting"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:opacity-80 transition-opacity"
                            style={{ color: "var(--shell-accent)" }}
                          >
                            {t("ui.contact_modal.schedule_call")}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Personal Message */}
                  <div
                    className="p-3 border-2"
                    style={{
                      backgroundColor: "var(--shell-surface-elevated)",
                      borderColor: "var(--shell-border)",
                    }}
                  >
                    <div className="flex gap-2 mb-2">
                      <MessageSquare size={16} style={{ color: "var(--shell-accent)" }} />
                      <p className="text-sm font-bold" style={{ color: "var(--shell-text)" }}>
                        {t("ui.contact_modal.message_label")}
                      </p>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--shell-text)" }}>
                      {t("ui.contact_modal.message_greeting")}
                      <br />
                      <br />
                      {t("ui.contact_modal.message_thanks_general")}
                      <br />
                      <br />
                      {t("ui.contact_modal.message_contact_simple")}{" "}
                      <a
                        href="mailto:sales@l4yercak3.com"
                        className="underline font-semibold hover:opacity-80 transition-opacity"
                        style={{ color: "var(--shell-accent)" }}
                      >
                        email
                      </a>
                      ,{" "}
                      <a
                        href="tel:+4915140427103"
                        className="underline font-semibold hover:opacity-80 transition-opacity"
                        style={{ color: "var(--shell-accent)" }}
                      >
                        phone
                      </a>
                      ,{" "}
                      <a
                        href="https://cal.com/voundbrand/open-end-meeting"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-semibold hover:opacity-80 transition-opacity"
                        style={{ color: "var(--shell-accent)" }}
                      >
                        calendar
                      </a>
                      .
                      <br />
                      <br />
                      {t("ui.contact_modal.message_looking_forward")}
                      <br />
                      <br />
                      <span className="font-bold">- Remington</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Contact Form */}
              <div>
                <h3 className="text-lg font-bold mb-4" style={{ color: "var(--shell-text)" }}>
                  {t("ui.contact_modal.form_title")}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: "var(--shell-text)" }}>
                      {t("ui.contact_modal.form_name")} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-2 text-sm border-2"
                      style={{
                        backgroundColor: "var(--shell-surface-elevated)",
                        borderColor: "var(--shell-border)",
                        color: "var(--shell-text)",
                      }}
                      placeholder={t("ui.contact_modal.form_placeholder_name")}
                    />
                  </div>

                  {/* Company */}
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: "var(--shell-text)" }}>
                      {t("ui.contact_modal.form_company")} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full p-2 text-sm border-2"
                      style={{
                        backgroundColor: "var(--shell-surface-elevated)",
                        borderColor: "var(--shell-border)",
                        color: "var(--shell-text)",
                      }}
                      placeholder={t("ui.contact_modal.form_placeholder_company")}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: "var(--shell-text)" }}>
                      {t("ui.contact_modal.form_email")} *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full p-2 text-sm border-2"
                      style={{
                        backgroundColor: "var(--shell-surface-elevated)",
                        borderColor: "var(--shell-border)",
                        color: "var(--shell-text)",
                      }}
                      placeholder={t("ui.contact_modal.form_placeholder_email")}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: "var(--shell-text)" }}>
                      {t("ui.contact_modal.form_phone")}
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full p-2 text-sm border-2"
                      style={{
                        backgroundColor: "var(--shell-surface-elevated)",
                        borderColor: "var(--shell-border)",
                        color: "var(--shell-text)",
                      }}
                      placeholder={t("ui.contact_modal.form_placeholder_phone")}
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: "var(--shell-text)" }}>
                      {t("ui.contact_modal.form_message")}
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={4}
                      className="w-full p-2 text-sm border-2 resize-none"
                      style={{
                        backgroundColor: "var(--shell-surface-elevated)",
                        borderColor: "var(--shell-border)",
                        color: "var(--shell-text)",
                      }}
                      placeholder={t("ui.contact_modal.form_placeholder_message")}
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="retro-button w-full py-2 text-xs font-pixel flex items-center justify-center gap-2"
                    style={{
                      opacity: isSubmitting ? 0.6 : 1,
                      cursor: isSubmitting ? "wait" : "pointer",
                    }}
                  >
                    <Send size={16} />
                    {isSubmitting ? t("ui.contact_modal.button_sending") : t("ui.contact_modal.button_send")}
                  </button>

                  <p className="text-xs text-center" style={{ color: "var(--neutral-gray)" }}>
                    {t("ui.contact_modal.response_time")}
                  </p>
                </form>
              </div>
            </div>
          ) : (
            // Success State
            <div className="text-center py-12">
              <div
                className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "var(--success)" }}
              >
                <Send size={48} style={{ color: "white" }} />
              </div>
              <h3 className="text-2xl font-bold mb-2" style={{ color: "var(--success)" }}>
                {t("ui.contact_modal.success_title")}
              </h3>
              <p className="text-sm mb-4" style={{ color: "var(--shell-text)" }}>
                {t("ui.contact_modal.success_message")}
              </p>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {t("ui.contact_modal.success_email")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
