"use client";

import { Building2, Calendar, Mail, MessageSquare, Phone, Send, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQuery, useAction } from "convex/react";
import { Id } from "../../../convex/_generated/dataModel";
import Image from "next/image";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useTranslation } from "@/contexts/translation-context";
import { createPortal } from "react-dom";

interface EnterpriseContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

type ContactModalApiRefs = {
  emailService: { sendContactFormEmail: unknown };
  files: { getFileUrl: unknown };
};

const { api: apiRefs } = require("../../../convex/_generated/api") as { api: ContactModalApiRefs };

export function EnterpriseContactModal({
  isOpen,
  onClose,
  title = "Enterprise Solutions",
}: EnterpriseContactModalProps) {
  const { t } = useNamespaceTranslations("ui.contact_modal");
  const { locale } = useTranslation();
  const unsafeUseAction = useAction as unknown as (
    actionRef: unknown
  ) => (args: {
    name: string;
    company: string;
    email: string;
    phone?: string;
    message?: string;
    productInterest: string;
    locale: string;
  }) => Promise<unknown>;
  const sendContactEmail = unsafeUseAction(apiRefs.emailService.sendContactFormEmail);

  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get avatar URL from Convex storage
  const avatarStorageId = process.env.NEXT_PUBLIC_REM_AVATAR_STORAGE_ID;
  const unsafeUseQuery = useQuery as unknown as (
    queryRef: unknown,
    args: unknown
  ) => string | null | undefined;
  const avatarUrl = unsafeUseQuery(
    apiRefs.files.getFileUrl,
    avatarStorageId ? { storageId: avatarStorageId as Id<"_storage"> } : "skip"
  );

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  if (!isOpen || !mounted) return null;

  const handleClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    onClose();
  };

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
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
      closeTimerRef.current = setTimeout(() => {
        setSubmitted(false);
        setFormData({ name: "", company: "", email: "", phone: "", message: "" });
        onClose();
        closeTimerRef.current = null;
      }, 3000);
    } catch (error) {
      console.error("Failed to send contact form:", error);
      // TODO: Show error message to user
      alert("Failed to send message. Please try again or contact us directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--modal-overlay-bg, rgba(0, 0, 0, 0.7))", zIndex: 9000 }}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border"
        style={{
          backgroundColor: "var(--window-document-bg, var(--shell-surface))",
          borderColor: "var(--window-document-border, var(--shell-border))",
          boxShadow: "var(--modal-shadow)",
        }}
      >
        {/* Window Title Bar */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b select-none"
          style={{
            backgroundColor: "var(--window-document-bg-elevated, var(--shell-surface-elevated))",
            borderColor: "var(--window-document-border, var(--shell-border))",
          }}
        >
          <div className="flex items-center gap-2">
            <Building2 size={16} style={{ color: "var(--shell-text)" }} />
            <span className="font-semibold text-sm" style={{ color: "var(--shell-text)" }}>
              {title} - {t("ui.contact_modal.title_suffix")}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md border transition-opacity hover:opacity-80"
            style={{
              backgroundColor: "var(--shell-button-surface)",
              borderColor: "var(--window-document-border, var(--shell-border))",
            }}
            title="Close"
          >
            <X size={14} className="select-none" style={{ color: "var(--shell-text)" }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-66px)]">
          {!submitted ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Personal Message */}
              <div>
                {/* Profile Section */}
                <div
                  className="p-5 border rounded-xl"
                  style={{
                    backgroundColor: "var(--window-document-bg-elevated, var(--shell-surface-elevated))",
                    borderColor: "var(--window-document-border, var(--shell-border))",
                  }}
                >
                  <div className="flex items-start gap-4 mb-4">
                    {/* Profile Image - Circular */}
                    <div className="flex-shrink-0">
                      {avatarUrl ? (
                        <div
                          className="w-24 h-24 relative overflow-hidden border"
                          style={{
                            borderRadius: "50%",
                            borderColor: "var(--window-document-border, var(--shell-border))",
                          }}
                        >
                          <Image
                            src={avatarUrl}
                            alt="Remington Splettstoesser"
                            fill
                            className="object-cover"
                            sizes="96px"
                            quality={100}
                            unoptimized
                            priority
                          />
                        </div>
                      ) : (
                        <div
                          className="w-24 h-24 flex items-center justify-center border"
                          style={{
                            borderRadius: "50%",
                            backgroundColor: "var(--window-document-bg-elevated, var(--shell-surface-elevated))",
                            borderColor: "var(--window-document-border, var(--shell-border))",
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
                            style={{ color: "var(--tone-accent-strong, var(--shell-accent))" }}
                          >
                            sales@l4yercak3.com
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone size={12} style={{ color: "var(--shell-accent)" }} />
                          <a
                            href="tel:+4915140427103"
                            className="underline hover:opacity-80 transition-opacity"
                            style={{ color: "var(--tone-accent-strong, var(--shell-accent))" }}
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
                            style={{ color: "var(--tone-accent-strong, var(--shell-accent))" }}
                          >
                            {t("ui.contact_modal.schedule_call")}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Personal Message */}
                  <div
                    className="p-4 border rounded-lg"
                    style={{
                      backgroundColor: "var(--window-document-bg, var(--shell-surface))",
                      borderColor: "var(--window-document-border, var(--shell-border))",
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
                        style={{ color: "var(--tone-accent-strong, var(--shell-accent))" }}
                      >
                        email
                      </a>
                      ,{" "}
                      <a
                        href="tel:+4915140427103"
                        className="underline font-semibold hover:opacity-80 transition-opacity"
                        style={{ color: "var(--tone-accent-strong, var(--shell-accent))" }}
                      >
                        phone
                      </a>
                      ,{" "}
                      <a
                        href="https://cal.com/voundbrand/open-end-meeting"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-semibold hover:opacity-80 transition-opacity"
                        style={{ color: "var(--tone-accent-strong, var(--shell-accent))" }}
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
                <div
                  className="p-5 border rounded-xl"
                  style={{
                    backgroundColor: "var(--window-document-bg-elevated, var(--shell-surface-elevated))",
                    borderColor: "var(--window-document-border, var(--shell-border))",
                  }}
                >
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
                      className="desktop-interior-input"
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
                      className="desktop-interior-input"
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
                      className="desktop-interior-input"
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
                      className="desktop-interior-input"
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
                      className="desktop-interior-textarea resize-none"
                      placeholder={t("ui.contact_modal.form_placeholder_message")}
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="desktop-interior-button desktop-interior-button-primary w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                    style={{
                      opacity: isSubmitting ? 0.6 : 1,
                      cursor: isSubmitting ? "wait" : "pointer",
                    }}
                  >
                    <Send size={16} />
                    {isSubmitting ? t("ui.contact_modal.button_sending") : t("ui.contact_modal.button_send")}
                  </button>

                  <p className="text-xs text-center pt-1" style={{ color: "var(--neutral-gray)" }}>
                    {t("ui.contact_modal.response_time")}
                  </p>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            // Success State
            <div className="text-center py-12 px-4">
              <div
                className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center shadow-sm"
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

  return createPortal(modalContent, document.body);
}
