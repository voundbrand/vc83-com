"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { X, Save, Loader2, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { usePostHog } from "posthog-js/react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

interface ContactFormModalProps {
  editId?: Id<"objects">;
  onClose: () => void;
  onSuccess: (contactId: Id<"objects">) => void;
}

type CompanyAssociation = "none" | "existing" | "new";

export function ContactFormModal({ editId, onClose, onSuccess }: ContactFormModalProps) {
  const { t } = useNamespaceTranslations("ui.crm");
  const { sessionId } = useAuth();
  const posthog = usePostHog();
  const currentOrganization = useCurrentOrganization();
  const currentOrganizationId = currentOrganization?.id;

  const [saving, setSaving] = useState(false);
  const [showCompany, setShowCompany] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [showTagsNotes, setShowTagsNotes] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    jobTitle: "",
    lifecycleStage: "lead" as "lead" | "prospect" | "customer" | "partner",
    source: "manual" as "manual" | "import" | "event" | "form",
    companyAssociation: "none" as CompanyAssociation,
    existingOrgId: "",
    newOrgName: "",
    newOrgIndustry: "",
    newOrgWebsite: "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "United States",
    tags: [] as string[],
    notes: "",
  });

  const [tagInput, setTagInput] = useState("");
  const [emailError, setEmailError] = useState("");

  // Query existing contact if editing
  const existingContact = useQuery(
    api.crmOntology.getContact,
    editId && sessionId ? { sessionId, contactId: editId } : "skip"
  );

  // Mutations
  const createContact = useMutation(api.crmOntology.createContact);
  const updateContact = useMutation(api.crmOntology.updateContact);
  const deleteContact = useMutation(api.crmOntology.deleteContact);
  const createCrmOrganization = useMutation(api.crmOntology.createCrmOrganization);
  const createLink = useMutation(api.ontologyHelpers.createLink);

  // Get organizations for dropdown
  const organizations = useQuery(
    api.crmOntology.getCrmOrganizations,
    sessionId && currentOrganizationId
      ? { sessionId, organizationId: currentOrganizationId as Id<"organizations">, status: "active" }
      : "skip"
  );

  // Load existing data when editing
  useEffect(() => {
    if (existingContact) {
      const props = existingContact.customProperties || {};
      const address = props.address || {};

      setFormData({
        firstName: props.firstName?.toString() || "",
        lastName: props.lastName?.toString() || "",
        email: props.email?.toString() || "",
        phone: props.phone?.toString() || "",
        jobTitle: props.jobTitle?.toString() || "",
        lifecycleStage: (existingContact.subtype || "lead") as "lead" | "prospect" | "customer" | "partner",
        source: (props.source?.toString() || "manual") as "manual" | "import" | "event" | "form",
        companyAssociation: "none",
        existingOrgId: "",
        newOrgName: "",
        newOrgIndustry: "",
        newOrgWebsite: "",
        street: address.street || "",
        city: address.city || "",
        state: address.state || "",
        postalCode: address.postalCode || "",
        country: address.country || "United States",
        tags: Array.isArray(props.tags) ? props.tags : [],
        notes: props.notes?.toString() || "",
      });

      // Expand sections if they have data
      if (address.street || address.city) {
        setShowAddress(true);
      }
      if (props.tags?.length > 0 || props.notes) {
        setShowTagsNotes(true);
      }
    }
  }, [existingContact]);

  // Handle delete
  const handleDelete = async () => {
    if (!sessionId || !editId) return;

    try {
      setSaving(true);
      await deleteContact({ sessionId, contactId: editId });
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      console.error("Failed to delete contact:", error);
      alert(t("ui.crm.contact_form.errors.delete_failed"));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sessionId || !currentOrganizationId) {
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setEmailError(t("ui.crm.contact_form.validation.email_invalid"));
      return;
    }

    setSaving(true);
    setEmailError("");

    try {
      const address = showAddress && (formData.street || formData.city) ? {
        street: formData.street || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        postalCode: formData.postalCode || undefined,
        country: formData.country || undefined,
      } : undefined;

      let contactId: Id<"objects">;

      if (editId) {
        // Update existing contact
        await updateContact({
          sessionId,
          contactId: editId,
          updates: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone || undefined,
            jobTitle: formData.jobTitle || undefined,
            address,
            tags: formData.tags.length > 0 ? formData.tags : undefined,
            notes: formData.notes || undefined,
          },
        });
        contactId = editId;

        // Track contact update
        posthog?.capture("contact_updated", {
          contact_id: editId,
          lifecycle_stage: formData.lifecycleStage,
          has_phone: !!formData.phone,
          has_job_title: !!formData.jobTitle,
          has_address: !!address,
          tags_count: formData.tags.length,
          has_notes: !!formData.notes,
          organization_id: currentOrganizationId,
        });
      } else {
        // Create new contact
        contactId = await createContact({
          sessionId,
          organizationId: currentOrganizationId as Id<"organizations">,
          subtype: formData.lifecycleStage,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone || undefined,
          jobTitle: formData.jobTitle || undefined,
          address,
          source: formData.source,
          tags: formData.tags.length > 0 ? formData.tags : undefined,
          notes: formData.notes || undefined,
        });

        // Identify the contact in PostHog
        posthog?.identify(formData.email, {
          email: formData.email,
          name: `${formData.firstName} ${formData.lastName}`,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          job_title: formData.jobTitle,
          lifecycle_stage: formData.lifecycleStage,
        });

        // Track contact creation
        posthog?.capture("contact_created", {
          contact_id: contactId,
          lifecycle_stage: formData.lifecycleStage,
          source: formData.source,
          has_phone: !!formData.phone,
          has_job_title: !!formData.jobTitle,
          has_address: !!address,
          tags_count: formData.tags.length,
          has_notes: !!formData.notes,
          organization_id: currentOrganizationId,
          company_association: formData.companyAssociation,
        });

        // Handle organization association (only when creating)
        let orgId: Id<"objects"> | undefined;

        if (formData.companyAssociation === "existing" && formData.existingOrgId) {
          orgId = formData.existingOrgId as Id<"objects">;
        } else if (formData.companyAssociation === "new" && formData.newOrgName) {
          // Create new organization
          orgId = await createCrmOrganization({
            sessionId,
            organizationId: currentOrganizationId as Id<"organizations">,
            name: formData.newOrgName,
            subtype: "prospect",
            industry: formData.newOrgIndustry || undefined,
            website: formData.newOrgWebsite || undefined,
          });
        }

        // Create objectLink if organization was selected/created
        if (orgId) {
          await createLink({
            sessionId,
            organizationId: currentOrganizationId as Id<"organizations">,
            fromObjectId: contactId,
            toObjectId: orgId,
            linkType: "works_at",
          });
        }
      }

      onSuccess(contactId);
    } catch (error) {
      console.error(`Failed to ${editId ? "update" : "create"} contact:`, error);
      alert(editId ? t("ui.crm.contact_form.errors.update_failed") : t("ui.crm.contact_form.errors.create_failed"));

      posthog?.capture("$exception", {
        error_type: editId ? "contact_update_failed" : "contact_creation_failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        lifecycle_stage: formData.lifecycleStage,
        organization_id: currentOrganizationId,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[9000]"
      style={{ background: "var(--modal-overlay-bg)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden border-2"
        style={{
          borderColor: "var(--modal-border)",
          background: "var(--modal-bg)",
          boxShadow: "var(--modal-shadow)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title Bar */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ background: "var(--modal-header-bg)" }}
        >
          <span className="font-bold text-sm" style={{ color: "var(--modal-header-text)" }}>
            {editId ? t("ui.crm.contact_form.title.edit") : t("ui.crm.contact_form.title.add_new")}
          </span>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-5 h-5 text-sm font-bold hover:opacity-80"
            style={{ color: "var(--modal-header-text)" }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-48px)] p-6 space-y-4">
          {/* Basic Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold border-b pb-2" style={{ color: "var(--win95-text)", borderColor: "var(--win95-border)" }}>
              {t("ui.crm.contact_form.sections.basic_information")}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                  {t("ui.crm.contact_form.labels.first_name")} <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border-2"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-input-bg)",
                    color: "var(--win95-input-text)",
                  }}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                  {t("ui.crm.contact_form.labels.last_name")} <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border-2"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-input-bg)",
                    color: "var(--win95-input-text)",
                  }}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                {t("ui.crm.contact_form.labels.email")} <span style={{ color: "var(--error)" }}>*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setEmailError("");
                }}
                className="w-full px-2 py-1.5 text-sm border-2"
                style={{
                  borderColor: emailError ? "var(--error)" : "var(--win95-border)",
                  background: "var(--win95-input-bg)",
                  color: "var(--win95-input-text)",
                }}
                required
              />
              {emailError && (
                <p className="text-xs mt-1" style={{ color: "var(--error)" }}>
                  {emailError}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                {t("ui.crm.contact_form.labels.phone")}
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border-2"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-input-bg)",
                  color: "var(--win95-input-text)",
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                {t("ui.crm.contact_form.labels.job_title")}
              </label>
              <input
                type="text"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border-2"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-input-bg)",
                  color: "var(--win95-input-text)",
                }}
              />
            </div>
          </div>

          {/* Contact Type */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold border-b pb-2" style={{ color: "var(--win95-text)", borderColor: "var(--win95-border)" }}>
              {t("ui.crm.contact_form.sections.contact_type")}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                  {t("ui.crm.contact_form.labels.contact_stage")} <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <select
                  value={formData.lifecycleStage}
                  onChange={(e) => setFormData({ ...formData, lifecycleStage: e.target.value as typeof formData.lifecycleStage })}
                  className="w-full px-2 py-1.5 text-sm border-2"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-input-bg)",
                    color: "var(--win95-input-text)",
                  }}
                >
                  <option value="lead">{t("ui.crm.contact_form.stages.lead")}</option>
                  <option value="prospect">{t("ui.crm.contact_form.stages.prospect")}</option>
                  <option value="customer">{t("ui.crm.contact_form.stages.customer")}</option>
                  <option value="partner">{t("ui.crm.contact_form.stages.partner")}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                  {t("ui.crm.contact_form.labels.source")}
                </label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value as typeof formData.source })}
                  className="w-full px-2 py-1.5 text-sm border-2"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-input-bg)",
                    color: "var(--win95-input-text)",
                  }}
                >
                  <option value="manual">{t("ui.crm.contact_form.sources.manual")}</option>
                  <option value="import">{t("ui.crm.contact_form.sources.import")}</option>
                  <option value="event">{t("ui.crm.contact_form.sources.event")}</option>
                  <option value="form">{t("ui.crm.contact_form.sources.form")}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Company (Collapsible) */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowCompany(!showCompany)}
              className="flex items-center justify-between w-full text-left py-2 px-3 border-2"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg-light)",
                color: "var(--win95-text)",
              }}
            >
              <span className="text-sm font-bold">{t("ui.crm.contact_form.sections.company")}</span>
              {showCompany ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showCompany && (
              <div className="pl-4 space-y-3 border-l-2" style={{ borderColor: "var(--win95-border)" }}>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="companyAssociation"
                      checked={formData.companyAssociation === "none"}
                      onChange={() => setFormData({ ...formData, companyAssociation: "none" })}
                    />
                    <span className="text-sm" style={{ color: "var(--win95-text)" }}>
                      {t("ui.crm.contact_form.company.no_affiliation")}
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="companyAssociation"
                      checked={formData.companyAssociation === "existing"}
                      onChange={() => setFormData({ ...formData, companyAssociation: "existing" })}
                    />
                    <span className="text-sm" style={{ color: "var(--win95-text)" }}>
                      {t("ui.crm.contact_form.company.link_existing")}
                    </span>
                  </label>

                  {formData.companyAssociation === "existing" && (
                    <div className="pl-6">
                      <select
                        value={formData.existingOrgId}
                        onChange={(e) => setFormData({ ...formData, existingOrgId: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border-2"
                        style={{
                          borderColor: "var(--win95-border)",
                          background: "var(--win95-input-bg)",
                          color: "var(--win95-input-text)",
                        }}
                      >
                        <option value="">{t("ui.crm.contact_form.company.select_organization")}</option>
                        {organizations?.map((org) => (
                          <option key={org._id} value={org._id}>
                            {org.name} ({org.customProperties?.industry || t("ui.crm.contact_form.company.no_industry")})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="companyAssociation"
                      checked={formData.companyAssociation === "new"}
                      onChange={() => setFormData({ ...formData, companyAssociation: "new" })}
                    />
                    <span className="text-sm" style={{ color: "var(--win95-text)" }}>
                      {t("ui.crm.contact_form.company.create_new")}
                    </span>
                  </label>

                  {formData.companyAssociation === "new" && (
                    <div className="pl-6 space-y-2">
                      <input
                        type="text"
                        placeholder={t("ui.crm.contact_form.placeholders.company_name")}
                        value={formData.newOrgName}
                        onChange={(e) => setFormData({ ...formData, newOrgName: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border-2"
                        style={{
                          borderColor: "var(--win95-border)",
                          background: "var(--win95-input-bg)",
                          color: "var(--win95-input-text)",
                        }}
                      />
                      <input
                        type="text"
                        placeholder={t("ui.crm.contact_form.placeholders.industry")}
                        value={formData.newOrgIndustry}
                        onChange={(e) => setFormData({ ...formData, newOrgIndustry: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border-2"
                        style={{
                          borderColor: "var(--win95-border)",
                          background: "var(--win95-input-bg)",
                          color: "var(--win95-input-text)",
                        }}
                      />
                      <input
                        type="url"
                        placeholder={t("ui.crm.contact_form.placeholders.website")}
                        value={formData.newOrgWebsite}
                        onChange={(e) => setFormData({ ...formData, newOrgWebsite: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border-2"
                        style={{
                          borderColor: "var(--win95-border)",
                          background: "var(--win95-input-bg)",
                          color: "var(--win95-input-text)",
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Address (Collapsible) */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowAddress(!showAddress)}
              className="flex items-center justify-between w-full text-left py-2 px-3 border-2"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg-light)",
                color: "var(--win95-text)",
              }}
            >
              <span className="text-sm font-bold">{t("ui.crm.contact_form.sections.address")}</span>
              {showAddress ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showAddress && (
              <div className="pl-4 space-y-3 border-l-2" style={{ borderColor: "var(--win95-border)" }}>
                <input
                  type="text"
                  placeholder={t("ui.crm.contact_form.placeholders.street")}
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border-2"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-input-bg)",
                    color: "var(--win95-input-text)",
                  }}
                />
                <input
                  type="text"
                  placeholder={t("ui.crm.contact_form.placeholders.city")}
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border-2"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-input-bg)",
                    color: "var(--win95-input-text)",
                  }}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder={t("ui.crm.contact_form.placeholders.state_province")}
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border-2"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-input-bg)",
                      color: "var(--win95-input-text)",
                    }}
                  />
                  <input
                    type="text"
                    placeholder={t("ui.crm.contact_form.placeholders.postal_code")}
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border-2"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-input-bg)",
                      color: "var(--win95-input-text)",
                    }}
                  />
                </div>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border-2"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-input-bg)",
                    color: "var(--win95-input-text)",
                  }}
                >
                  <option value="United States">{t("ui.crm.contact_form.countries.united_states")}</option>
                  <option value="Canada">{t("ui.crm.contact_form.countries.canada")}</option>
                  <option value="United Kingdom">{t("ui.crm.contact_form.countries.united_kingdom")}</option>
                  <option value="Australia">{t("ui.crm.contact_form.countries.australia")}</option>
                </select>
              </div>
            )}
          </div>

          {/* Tags & Notes (Collapsible) */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowTagsNotes(!showTagsNotes)}
              className="flex items-center justify-between w-full text-left py-2 px-3 border-2"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg-light)",
                color: "var(--win95-text)",
              }}
            >
              <span className="text-sm font-bold">{t("ui.crm.contact_form.sections.tags_notes")}</span>
              {showTagsNotes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showTagsNotes && (
              <div className="pl-4 space-y-3 border-l-2" style={{ borderColor: "var(--win95-border)" }}>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                    {t("ui.crm.contact_form.labels.tags")}
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder={t("ui.crm.contact_form.placeholders.tag_input")}
                      className="flex-1 px-2 py-1.5 text-sm border-2"
                      style={{
                        borderColor: "var(--win95-border)",
                        background: "var(--win95-input-bg)",
                        color: "var(--win95-input-text)",
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3 py-1.5 text-sm font-bold border-2"
                      style={{
                        borderColor: "var(--win95-border)",
                        background: "var(--win95-button-face)",
                        color: "var(--win95-text)",
                      }}
                    >
                      {t("ui.crm.contact_form.buttons.add_tag")}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs border-2"
                        style={{
                          borderColor: "var(--primary)",
                          background: "var(--win95-bg-light)",
                          color: "var(--primary)",
                        }}
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:opacity-70"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                    {t("ui.crm.contact_form.labels.notes")}
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    placeholder={t("ui.crm.contact_form.placeholders.notes")}
                    className="w-full px-2 py-1.5 text-sm border-2"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-input-bg)",
                      color: "var(--win95-input-text)",
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center gap-2 pt-4 border-t-2" style={{ borderColor: "var(--win95-border)" }}>
            {/* Delete button - only show when editing */}
            {editId ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving}
                className="px-4 py-2 text-sm font-bold flex items-center gap-2 border-2"
                style={{
                  borderColor: "var(--error)",
                  background: "white",
                  color: "var(--error)",
                }}
              >
                <Trash2 size={14} />
                {t("ui.crm.contact_form.buttons.delete")}
              </button>
            ) : <div />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 text-sm font-bold flex items-center gap-2 border-2"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-button-face)",
                  color: "var(--win95-text)",
                }}
              >
                {t("ui.crm.contact_form.buttons.cancel")}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm font-bold flex items-center gap-2 border-2"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--primary)",
                  color: "white",
                }}
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {t("ui.crm.contact_form.buttons.saving")}
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    {t("ui.crm.contact_form.buttons.save_contact")}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div
            className="border-4 p-6 max-w-md mx-4 shadow-lg"
            style={{
              background: 'var(--win95-bg)',
              borderColor: 'var(--win95-border)'
            }}
          >
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--win95-text)' }}>
              Delete Contact?
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--win95-text)' }}>
              Are you sure you want to delete this contact? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={saving}
                className="px-4 py-2 border-2 hover:opacity-80 transition-colors"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-button-face)',
                  color: 'var(--win95-text)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 border-2 hover:opacity-80 transition-colors flex items-center gap-2"
                style={{
                  background: 'var(--error)',
                  color: 'white',
                  borderColor: 'var(--error)'
                }}
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {t("ui.crm.contact_form.buttons.deleting")}
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    {t("ui.crm.contact_form.buttons.delete")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
