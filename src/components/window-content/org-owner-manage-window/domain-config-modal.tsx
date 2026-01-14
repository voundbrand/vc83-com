"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { X, Globe, Palette, Mail, Layout, Save, Loader2, Eye, Upload } from "lucide-react";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { getAllEmailTemplateMetadata } from "@/templates/emails/registry";
import { TemplatePreviewModal } from "@/components/template-preview-modal";
import { useWindowManager } from "@/hooks/use-window-manager";
import MediaLibraryWindow from "@/components/window-content/media-library-window";

interface DomainConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: Doc<"objects">;
  organizationId: Id<"organizations">;
  sessionId: string;
}

export function DomainConfigModal({
  isOpen,
  onClose,
  config,
  organizationId,
  sessionId,
}: DomainConfigModalProps) {
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.manage.domains");
  const createDomainConfig = useMutation(api.domainConfigOntology.createDomainConfig);
  const updateDomainConfig = useMutation(api.domainConfigOntology.updateDomainConfig);
  const { openWindow } = useWindowManager();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState<"core" | "email" | "web">("core");
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [previewTemplateCode, setPreviewTemplateCode] = useState<string>("");

  // Form state
  const [formData, setFormData] = useState({
    domainName: "",
    // Branding
    logoUrl: "",
    primaryColor: "#6B46C1",
    secondaryColor: "#9F7AEA",
    accentColor: "#ffffff",
    fontFamily: "system-ui, sans-serif",
    // Email
    enableEmail: false,
    emailDomain: "",
    senderEmail: "",
    systemEmail: "",
    salesEmail: "",
    replyToEmail: "",
    emailTemplateCode: "luxury-confirmation", // Default template
    // Web
    enableWeb: false,
    templateId: "",
    isExternal: true,
    siteUrl: "",
    metaTitle: "",
    metaDescription: "",
  });

  // Type for domain config custom properties
  interface DomainConfigProperties {
    domainName?: string;
    branding?: {
      logoUrl?: string;
      primaryColor?: string;
      secondaryColor?: string;
      accentColor?: string;
      fontFamily?: string;
    };
    email?: {
      emailDomain?: string;
      senderEmail?: string;
      systemEmail?: string;
      salesEmail?: string;
      replyToEmail?: string;
      defaultTemplateCode?: string;
    };
    webPublishing?: {
      templateId?: string;
      isExternal?: boolean;
      siteUrl?: string;
      metaTags?: {
        title?: string;
        description?: string;
      };
    };
  }

  // Load existing config data
  useEffect(() => {
    if (config) {
      const props = config.customProperties as DomainConfigProperties;
      setFormData({
        domainName: props.domainName || "",
        logoUrl: props.branding?.logoUrl || "",
        primaryColor: props.branding?.primaryColor || "#6B46C1",
        secondaryColor: props.branding?.secondaryColor || "#9F7AEA",
        accentColor: props.branding?.accentColor || "#ffffff",
        fontFamily: props.branding?.fontFamily || "system-ui, sans-serif",
        enableEmail: !!props.email,
        emailDomain: props.email?.emailDomain || "",
        senderEmail: props.email?.senderEmail || "",
        systemEmail: props.email?.systemEmail || "",
        salesEmail: props.email?.salesEmail || "",
        replyToEmail: props.email?.replyToEmail || "",
        emailTemplateCode: props.email?.defaultTemplateCode || "luxury-confirmation",
        enableWeb: !!props.webPublishing,
        templateId: props.webPublishing?.templateId || "",
        isExternal: props.webPublishing?.isExternal ?? true,
        siteUrl: props.webPublishing?.siteUrl || "",
        metaTitle: props.webPublishing?.metaTags?.title || "",
        metaDescription: props.webPublishing?.metaTags?.description || "",
      });
    } else {
      // Reset for new config
      setFormData({
        domainName: "",
        logoUrl: "",
        primaryColor: "#6B46C1",
        secondaryColor: "#9F7AEA",
        accentColor: "#ffffff",
        fontFamily: "system-ui, sans-serif",
        enableEmail: false,
        emailDomain: "",
        senderEmail: "",
        systemEmail: "",
        salesEmail: "",
        replyToEmail: "",
        emailTemplateCode: "luxury-confirmation",
        enableWeb: false,
        templateId: "",
        isExternal: true,
        siteUrl: "",
        metaTitle: "",
        metaDescription: "",
      });
    }
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const branding = {
        logoUrl: formData.logoUrl,
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor,
        accentColor: formData.accentColor,
        fontFamily: formData.fontFamily,
      };

      const email = formData.enableEmail ? {
        emailDomain: formData.emailDomain,
        senderEmail: formData.senderEmail,
        systemEmail: formData.systemEmail,
        salesEmail: formData.salesEmail,
        replyToEmail: formData.replyToEmail,
        defaultTemplateCode: formData.emailTemplateCode,
      } : undefined;

      const webPublishing = formData.enableWeb ? {
        templateId: formData.templateId || undefined,
        isExternal: formData.isExternal,
        siteUrl: formData.siteUrl || undefined,
        metaTags: {
          title: formData.metaTitle,
          description: formData.metaDescription,
        },
      } : undefined;

      if (config) {
        // Update existing
        await updateDomainConfig({
          sessionId,
          configId: config._id,
          branding,
          email,
          webPublishing,
        });
      } else {
        // Create new
        await createDomainConfig({
          sessionId,
          organizationId,
          domainName: formData.domainName,
          capabilities: {
            email: !!email,
            branding: true,
            webPublishing: !!webPublishing,
            api: false, // API capability managed separately in Security & API tab
          },
          branding,
          email,
          webPublishing,
        });
      }

      onClose();
    } catch (error) {
      console.error("Failed to save domain config:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      alert(t("ui.manage.domains.alert.save_error", { error: errorMsg }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || translationsLoading) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2"
        style={{
          backgroundColor: 'var(--win95-bg)',
          borderColor: 'var(--win95-border)',
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 border-b-2 flex items-center justify-between"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-titlebar)',
            color: 'var(--win95-titlebar-text)'
          }}
        >
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Globe size={16} />
            {config ? t("ui.manage.domains.modal.title.edit") : t("ui.manage.domains.modal.title.create")}
          </h3>
          <button
            onClick={onClose}
            className="hover:bg-white hover:bg-opacity-20 p-1 rounded"
          >
            <X size={16} />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b-2" style={{ borderColor: 'var(--win95-border)', backgroundColor: 'var(--win95-bg-light)' }}>
          <button
            className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
            style={{
              borderColor: 'var(--win95-border)',
              background: activeSection === "core" ? 'var(--win95-bg)' : 'var(--win95-bg-light)',
              color: activeSection === "core" ? 'var(--win95-text)' : 'var(--neutral-gray)'
            }}
            onClick={() => setActiveSection("core")}
          >
            <Palette size={12} />
            {t("ui.manage.domains.modal.tab.core")}
          </button>
          <button
            className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
            style={{
              borderColor: 'var(--win95-border)',
              background: activeSection === "email" ? 'var(--win95-bg)' : 'var(--win95-bg-light)',
              color: activeSection === "email" ? 'var(--win95-text)' : 'var(--neutral-gray)'
            }}
            onClick={() => setActiveSection("email")}
          >
            <Mail size={12} />
            {t("ui.manage.domains.modal.tab.email")}
          </button>
          <button
            className="px-4 py-2 text-xs font-bold transition-colors flex items-center gap-2"
            style={{
              borderColor: 'var(--win95-border)',
              background: activeSection === "web" ? 'var(--win95-bg)' : 'var(--win95-bg-light)',
              color: activeSection === "web" ? 'var(--win95-text)' : 'var(--neutral-gray)'
            }}
            onClick={() => setActiveSection("web")}
          >
            <Layout size={12} />
            {t("ui.manage.domains.modal.tab.web")}
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Core & Branding Section */}
          {activeSection === "core" && (
            <>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
                  {t("ui.manage.domains.modal.field.domain_name")} *
                </label>
                <input
                  type="text"
                  value={formData.domainName}
                  onChange={(e) => setFormData({ ...formData, domainName: e.target.value })}
                  placeholder={t("ui.manage.domains.modal.field.domain_name.placeholder")}
                  required
                  disabled={!!config} // Can't change domain name on edit
                  className="w-full px-2 py-1 text-xs border-2"
                  style={{
                    borderColor: 'var(--win95-border)',
                    backgroundColor: config ? 'var(--win95-bg-light)' : 'var(--win95-input-bg)',
                    color: 'var(--win95-text)'
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
                  {t("ui.manage.domains.modal.field.logo_url")}
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    placeholder={t("ui.manage.domains.modal.field.logo_url.placeholder")}
                    className="flex-1 px-2 py-1 text-xs border-2"
                    style={{
                      borderColor: 'var(--win95-border)',
                      backgroundColor: 'var(--win95-input-bg)',
                      color: 'var(--win95-text)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      openWindow(
                        "media-library",
                        "Media Library",
                        <MediaLibraryWindow
                          selectionMode={true}
                          onSelect={(media) => {
                            if (media.url) {
                              setFormData({ ...formData, logoUrl: media.url });
                            }
                          }}
                        />
                      );
                    }}
                    className="px-3 py-1 text-xs font-bold border-2 hover:bg-opacity-90 flex items-center gap-1"
                    style={{
                      borderColor: 'var(--win95-border)',
                      backgroundColor: 'var(--win95-bg-light)',
                      color: 'var(--win95-text)'
                    }}
                  >
                    <Upload size={12} />
                    Browse
                  </button>
                </div>
                {/* Logo Preview */}
                {formData.logoUrl && (
                  <div className="mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formData.logoUrl}
                      alt="Domain Logo Preview"
                      className="max-w-xs max-h-20 border-2"
                      style={{ borderColor: 'var(--win95-border)' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
                    {t("ui.manage.domains.modal.field.primary_color")} *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="w-12 h-8 border-2"
                      style={{ borderColor: 'var(--win95-border)' }}
                    />
                    <input
                      type="text"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="flex-1 px-2 py-1 text-xs border-2"
                      style={{
                        borderColor: 'var(--win95-border)',
                        backgroundColor: 'var(--win95-input-bg)',
                        color: 'var(--win95-text)'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
                    {t("ui.manage.domains.modal.field.secondary_color")} *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.secondaryColor}
                      onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                      className="w-12 h-8 border-2"
                      style={{ borderColor: 'var(--win95-border)' }}
                    />
                    <input
                      type="text"
                      value={formData.secondaryColor}
                      onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                      className="flex-1 px-2 py-1 text-xs border-2"
                      style={{
                        borderColor: 'var(--win95-border)',
                        backgroundColor: 'var(--win95-input-bg)',
                        color: 'var(--win95-text)'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
                  {t("ui.manage.domains.modal.field.font_family")}
                </label>
                <input
                  type="text"
                  value={formData.fontFamily}
                  onChange={(e) => setFormData({ ...formData, fontFamily: e.target.value })}
                  placeholder={t("ui.manage.domains.modal.field.font_family.placeholder")}
                  className="w-full px-2 py-1 text-xs border-2"
                  style={{
                    borderColor: 'var(--win95-border)',
                    backgroundColor: 'var(--win95-input-bg)',
                    color: 'var(--win95-text)'
                  }}
                />
              </div>
            </>
          )}

          {/* Email Settings Section */}
          {activeSection === "email" && (
            <>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enableEmail"
                  checked={formData.enableEmail}
                  onChange={(e) => setFormData({ ...formData, enableEmail: e.target.checked })}
                />
                <label htmlFor="enableEmail" className="text-xs font-semibold" style={{ color: 'var(--win95-text)' }}>
                  {t("ui.manage.domains.modal.email.enable")}
                </label>
              </div>

              {formData.enableEmail && (
                <>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
                      Email Domain *
                    </label>
                    <input
                      type="text"
                      value={formData.emailDomain}
                      onChange={(e) => setFormData({ ...formData, emailDomain: e.target.value })}
                      placeholder="mail.pluseins.gg"
                      className="w-full px-2 py-1 text-xs border-2"
                      style={{
                        borderColor: 'var(--win95-border)',
                        backgroundColor: 'var(--win95-input-bg)',
                        color: 'var(--win95-text)'
                      }}
                      required
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                      Domain configured in Resend (e.g., mail.pluseins.gg for transactional emails)
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
                      {t("ui.manage.domains.modal.field.sender_email")}
                    </label>
                    <input
                      type="email"
                      value={formData.senderEmail}
                      onChange={(e) => setFormData({ ...formData, senderEmail: e.target.value })}
                      placeholder={t("ui.manage.domains.modal.field.sender_email.placeholder")}
                      className="w-full px-2 py-1 text-xs border-2"
                      style={{
                        borderColor: 'var(--win95-border)',
                        backgroundColor: 'var(--win95-input-bg)',
                        color: 'var(--win95-text)'
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
                        {t("ui.manage.domains.modal.field.system_email")}
                      </label>
                      <input
                        type="email"
                        value={formData.systemEmail}
                        onChange={(e) => setFormData({ ...formData, systemEmail: e.target.value })}
                        placeholder={t("ui.manage.domains.modal.field.system_email.placeholder")}
                        className="w-full px-2 py-1 text-xs border-2"
                        style={{
                          borderColor: 'var(--win95-border)',
                          backgroundColor: 'var(--win95-input-bg)',
                          color: 'var(--win95-text)'
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
                        {t("ui.manage.domains.modal.field.sales_email")}
                      </label>
                      <input
                        type="email"
                        value={formData.salesEmail}
                        onChange={(e) => setFormData({ ...formData, salesEmail: e.target.value })}
                        placeholder={t("ui.manage.domains.modal.field.sales_email.placeholder")}
                        className="w-full px-2 py-1 text-xs border-2"
                        style={{
                          borderColor: 'var(--win95-border)',
                          backgroundColor: 'var(--win95-input-bg)',
                          color: 'var(--win95-text)'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
                      {t("ui.manage.domains.modal.field.reply_to_email")}
                    </label>
                    <input
                      type="email"
                      value={formData.replyToEmail}
                      onChange={(e) => setFormData({ ...formData, replyToEmail: e.target.value })}
                      placeholder={t("ui.manage.domains.modal.field.reply_to_email.placeholder")}
                      className="w-full px-2 py-1 text-xs border-2"
                      style={{
                        borderColor: 'var(--win95-border)',
                        backgroundColor: 'var(--win95-input-bg)',
                        color: 'var(--win95-text)'
                      }}
                    />
                  </div>

                  {/* Email Template Selector */}
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
                      Default Email Template
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={formData.emailTemplateCode}
                        onChange={(e) => setFormData({ ...formData, emailTemplateCode: e.target.value })}
                        className="flex-1 px-2 py-1 text-xs border-2"
                        style={{
                          borderColor: 'var(--win95-border)',
                          backgroundColor: 'var(--win95-input-bg)',
                          color: 'var(--win95-text)'
                        }}
                      >
                        {getAllEmailTemplateMetadata().map((template) => (
                          <option key={template.code} value={template.code}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewTemplateCode(formData.emailTemplateCode);
                          setShowTemplatePreview(true);
                        }}
                        className="px-3 py-1 text-xs font-semibold border-2 flex items-center gap-1 hover:bg-opacity-90 transition-colors"
                        style={{
                          borderColor: 'var(--win95-border)',
                          backgroundColor: 'var(--win95-highlight)',
                          color: 'white'
                        }}
                      >
                        <Eye size={12} />
                        Preview
                      </button>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                      This template will be used for all ticket confirmation emails from this domain.
                    </p>
                  </div>
                </>
              )}
            </>
          )}

          {/* Web Publishing Section */}
          {activeSection === "web" && (
            <>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enableWeb"
                  checked={formData.enableWeb}
                  onChange={(e) => setFormData({ ...formData, enableWeb: e.target.checked })}
                />
                <label htmlFor="enableWeb" className="text-xs font-semibold" style={{ color: 'var(--win95-text)' }}>
                  {t("ui.manage.domains.modal.web.enable")}
                </label>
              </div>

              {formData.enableWeb && (
                <>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
                      {t("ui.manage.domains.modal.field.site_url")}
                    </label>
                    <input
                      type="url"
                      value={formData.siteUrl}
                      onChange={(e) => setFormData({ ...formData, siteUrl: e.target.value })}
                      placeholder={t("ui.manage.domains.modal.field.site_url.placeholder")}
                      className="w-full px-2 py-1 text-xs border-2"
                      style={{
                        borderColor: 'var(--win95-border)',
                        backgroundColor: 'var(--win95-input-bg)',
                        color: 'var(--win95-text)'
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
                      {t("ui.manage.domains.modal.field.meta_title")}
                    </label>
                    <input
                      type="text"
                      value={formData.metaTitle}
                      onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                      placeholder={t("ui.manage.domains.modal.field.meta_title.placeholder")}
                      className="w-full px-2 py-1 text-xs border-2"
                      style={{
                        borderColor: 'var(--win95-border)',
                        backgroundColor: 'var(--win95-input-bg)',
                        color: 'var(--win95-text)'
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
                      {t("ui.manage.domains.modal.field.meta_description")}
                    </label>
                    <textarea
                      value={formData.metaDescription}
                      onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                      placeholder={t("ui.manage.domains.modal.field.meta_description.placeholder")}
                      rows={3}
                      className="w-full px-2 py-1 text-xs border-2"
                      style={{
                        borderColor: 'var(--win95-border)',
                        backgroundColor: 'var(--win95-input-bg)',
                        color: 'var(--win95-text)'
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isExternal"
                      checked={formData.isExternal}
                      onChange={(e) => setFormData({ ...formData, isExternal: e.target.checked })}
                    />
                    <label htmlFor="isExternal" className="text-xs" style={{ color: 'var(--win95-text)' }}>
                      {t("ui.manage.domains.modal.field.is_external")}
                    </label>
                  </div>
                </>
              )}
            </>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t-2" style={{ borderColor: 'var(--win95-border)' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="beveled-button px-4 py-2 text-xs font-semibold"
              style={{
                backgroundColor: "var(--win95-button-face)",
                color: "var(--win95-text)",
              }}
            >
              {t("ui.manage.domains.modal.actions.cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="beveled-button px-4 py-2 text-xs font-semibold flex items-center gap-2"
              style={{
                backgroundColor: "var(--success)",
                color: "white",
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  {t("ui.manage.domains.modal.actions.saving")}
                </>
              ) : (
                <>
                  <Save size={12} />
                  {config ? t("ui.manage.domains.modal.actions.update") : t("ui.manage.domains.modal.actions.create")}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Template Preview Modal */}
      {showTemplatePreview && (
        <TemplatePreviewModal
          isOpen={showTemplatePreview}
          onClose={() => setShowTemplatePreview(false)}
          templateType="email"
          templateCode={previewTemplateCode}
          onSelect={(code) => {
            setFormData({ ...formData, emailTemplateCode: code });
            setShowTemplatePreview(false);
          }}
        />
      )}
    </div>
  );
}
