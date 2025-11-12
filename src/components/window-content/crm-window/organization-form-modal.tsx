"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { X, Save, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { getSupportedCountries } from "../../../../convex/legalEntityTypes";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { validateVATNumber } from "../../../../convex/lib/vatValidation";

interface OrganizationFormModalProps {
  editId?: Id<"objects">;
  onClose: () => void;
  onSuccess: (organizationId: Id<"objects">) => void;
}

type OrgType = "prospect" | "customer" | "partner" | "sponsor";

export function OrganizationFormModal({ editId, onClose, onSuccess }: OrganizationFormModalProps) {
  const { t } = useNamespaceTranslations("ui.crm");
  const { sessionId } = useAuth();
  const currentOrganization = useCurrentOrganization();
  const currentOrganizationId = currentOrganization?.id;

  const [saving, setSaving] = useState(false);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [showBillingSettings, setShowBillingSettings] = useState(false);
  const [showTagsNotes, setShowTagsNotes] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    website: "",
    industry: "",
    size: "" as "" | "1-10" | "11-50" | "51-200" | "201-500" | "501+",
    orgType: "prospect" as OrgType,
    phone: "",
    billingEmail: "",
    taxId: "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    // B2B Billing fields
    billingStreet: "",
    billingCity: "",
    billingState: "",
    billingPostalCode: "",
    billingCountry: "",
    legalEntityType: "" as "" | "corporation" | "llc" | "partnership" | "sole_proprietorship" | "nonprofit",
    registrationNumber: "",
    vatNumber: "",
    taxExempt: false,
    paymentTerms: "net30" as "" | "due_on_receipt" | "net15" | "net30" | "net60" | "net90",
    creditLimit: "",
    preferredPaymentMethod: "" as "" | "invoice" | "bank_transfer" | "credit_card" | "check",
    accountingReference: "",
    costCenter: "",
    purchaseOrderRequired: false,
    billingContact: "",
    billingContactEmail: "",
    billingContactPhone: "",
    // Sponsor fields
    sponsorLevel: "" as "" | "platinum" | "gold" | "silver" | "bronze" | "community",
    logoUrl: "",
    sponsorBio: "",
    tags: [] as string[],
    notes: "",
  });

  const [tagInput, setTagInput] = useState("");
  const [websiteError, setWebsiteError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [vatError, setVatError] = useState("");

  // Get supported countries for dropdown
  const supportedCountries = getSupportedCountries();

  // Query existing organization if editing
  const existingOrg = useQuery(
    api.crmOntology.getCrmOrganization,
    editId && sessionId ? { sessionId, crmOrganizationId: editId } : "skip"
  );

  // Mutations
  const createCrmOrganization = useMutation(api.crmOntology.createCrmOrganization);
  const updateCrmOrganization = useMutation(api.crmOntology.updateCrmOrganization);

  // Load existing data when editing
  useEffect(() => {
    if (existingOrg) {
      const props = existingOrg.customProperties || {};
      const address = props.address || {};
      const billingAddr = props.billingAddress || {};

      setFormData({
        name: existingOrg.name || "",
        website: props.website?.toString() || "",
        industry: props.industry?.toString() || "",
        size: (props.size?.toString() || "") as "" | "1-10" | "11-50" | "51-200" | "201-500" | "501+",
        orgType: (existingOrg.subtype || "prospect") as OrgType,
        phone: props.phone?.toString() || "",
        billingEmail: props.billingEmail?.toString() || "",
        taxId: props.taxId?.toString() || "",
        street: address.street || "",
        city: address.city || "",
        state: address.state || "",
        postalCode: address.postalCode || "",
        country: address.country || "",
        // B2B Billing fields
        billingStreet: billingAddr.street || "",
        billingCity: billingAddr.city || "",
        billingState: billingAddr.state || "",
        billingPostalCode: billingAddr.postalCode || "",
        billingCountry: billingAddr.country || "",
        legalEntityType: (props.legalEntityType?.toString() || "") as "" | "corporation" | "llc" | "partnership" | "sole_proprietorship" | "nonprofit",
        registrationNumber: props.registrationNumber?.toString() || "",
        vatNumber: props.vatNumber?.toString() || "",
        taxExempt: props.taxExempt === true,
        paymentTerms: (props.paymentTerms?.toString() || "net30") as "" | "due_on_receipt" | "net15" | "net30" | "net60" | "net90",
        creditLimit: props.creditLimit?.toString() || "",
        preferredPaymentMethod: (props.preferredPaymentMethod?.toString() || "") as "" | "invoice" | "bank_transfer" | "credit_card" | "check",
        accountingReference: props.accountingReference?.toString() || "",
        costCenter: props.costCenter?.toString() || "",
        purchaseOrderRequired: props.purchaseOrderRequired === true,
        billingContact: props.billingContact?.toString() || "",
        billingContactEmail: props.billingContactEmail?.toString() || "",
        billingContactPhone: props.billingContactPhone?.toString() || "",
        // Sponsor fields
        sponsorLevel: (props.sponsorLevel?.toString() || "") as "" | "platinum" | "gold" | "silver" | "bronze" | "community",
        logoUrl: props.logoUrl?.toString() || "",
        sponsorBio: props.sponsorBio?.toString() || "",
        tags: Array.isArray(props.tags) ? props.tags : [],
        notes: props.notes?.toString() || "",
      });

      // Expand sections if they have data
      if (props.phone || props.billingEmail || props.taxId) {
        setShowContactDetails(true);
      }
      if (address.street || address.city) {
        setShowAddress(true);
      }
      if (props.legalEntityType || props.registrationNumber || props.vatNumber || props.paymentTerms || billingAddr.street) {
        setShowBillingSettings(true);
      }
      if (props.tags?.length > 0 || props.notes) {
        setShowTagsNotes(true);
      }
    }
  }, [existingOrg]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sessionId || !currentOrganizationId) {
      return;
    }

    // Validate email if provided
    if (formData.billingEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.billingEmail)) {
        setEmailError(t("ui.crm.organization_form.validation.email_invalid"));
        return;
      }
    }

    // Validate VAT number if provided
    if (formData.vatNumber && formData.vatNumber.trim()) {
      const vatValidation = validateVATNumber(formData.vatNumber);
      if (!vatValidation.valid) {
        setVatError(vatValidation.message || "Invalid VAT format");
        return;
      }
    }

    setSaving(true);
    setWebsiteError("");
    setEmailError("");
    setVatError("");

    try {
      // Auto-prefix website with https:// if not already prefixed
      let website = formData.website;
      if (website && !website.startsWith("http://") && !website.startsWith("https://")) {
        website = `https://${website}`;
      }

      const address = showAddress && (formData.street || formData.city) ? {
        street: formData.street || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        postalCode: formData.postalCode || undefined,
        country: formData.country || undefined,
      } : undefined;

      // Prepare billing address
      const billingAddress = showBillingSettings && (formData.billingStreet || formData.billingCity) ? {
        street: formData.billingStreet || undefined,
        city: formData.billingCity || undefined,
        state: formData.billingState || undefined,
        postalCode: formData.billingPostalCode || undefined,
        country: formData.billingCountry || undefined,
      } : undefined;

      // Prepare custom fields for sponsor info
      const customFields = formData.orgType === "sponsor" ? {
        sponsorLevel: formData.sponsorLevel || undefined,
        logoUrl: formData.logoUrl || undefined,
        sponsorBio: formData.sponsorBio || undefined,
      } : undefined;

      let orgId: Id<"objects">;

      if (editId) {
        // Update existing organization
        await updateCrmOrganization({
          sessionId,
          crmOrganizationId: editId,
          updates: {
            name: formData.name,
            subtype: formData.orgType,
            website: website || undefined,
            industry: formData.industry || undefined,
            size: formData.size || undefined,
            phone: formData.phone || undefined,
            billingEmail: formData.billingEmail || undefined,
            taxId: formData.taxId || undefined,
            address,
            // B2B Billing fields
            billingAddress,
            legalEntityType: formData.legalEntityType || undefined,
            registrationNumber: formData.registrationNumber || undefined,
            vatNumber: formData.vatNumber || undefined,
            taxExempt: formData.taxExempt,
            paymentTerms: formData.paymentTerms || "net30",
            creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : undefined,
            preferredPaymentMethod: formData.preferredPaymentMethod || undefined,
            accountingReference: formData.accountingReference || undefined,
            costCenter: formData.costCenter || undefined,
            purchaseOrderRequired: formData.purchaseOrderRequired,
            billingContact: formData.billingContact || undefined,
            billingContactEmail: formData.billingContactEmail || undefined,
            billingContactPhone: formData.billingContactPhone || undefined,
            tags: formData.tags.length > 0 ? formData.tags : undefined,
            notes: formData.notes || undefined,
            customFields,
          },
        });
        orgId = editId;
      } else {
        // Create new organization
        orgId = await createCrmOrganization({
          sessionId,
          organizationId: currentOrganizationId as Id<"organizations">,
          name: formData.name,
          subtype: formData.orgType,
          website: website || undefined,
          industry: formData.industry || undefined,
          size: formData.size || undefined,
          phone: formData.phone || undefined,
          billingEmail: formData.billingEmail || undefined,
          taxId: formData.taxId || undefined,
          address,
          // B2B Billing fields
          billingAddress,
          legalEntityType: formData.legalEntityType || undefined,
          registrationNumber: formData.registrationNumber || undefined,
          vatNumber: formData.vatNumber || undefined,
          taxExempt: formData.taxExempt,
          paymentTerms: formData.paymentTerms || "net30",
          creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : undefined,
          preferredPaymentMethod: formData.preferredPaymentMethod || undefined,
          accountingReference: formData.accountingReference || undefined,
          costCenter: formData.costCenter || undefined,
          purchaseOrderRequired: formData.purchaseOrderRequired,
          billingContact: formData.billingContact || undefined,
          billingContactEmail: formData.billingContactEmail || undefined,
          billingContactPhone: formData.billingContactPhone || undefined,
          tags: formData.tags.length > 0 ? formData.tags : undefined,
          notes: formData.notes || undefined,
          customFields,
        });
      }

      onSuccess(orgId);
    } catch (error) {
      console.error(`Failed to ${editId ? "update" : "create"} organization:`, error);
      alert(editId ? t("ui.crm.organization_form.errors.update_failed") : t("ui.crm.organization_form.errors.create_failed"));
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

  const handleVATChange = (vat: string) => {
    setFormData({ ...formData, vatNumber: vat });

    // Validate VAT format if provided
    if (vat.trim()) {
      const validation = validateVATNumber(vat);
      if (!validation.valid) {
        setVatError(validation.message || "Invalid VAT format");
      } else {
        setVatError("");
      }
    } else {
      setVatError("");
    }
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
            {editId ? t("ui.crm.organization_form.modal.title_edit") : t("ui.crm.organization_form.modal.title_add")}
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
              {t("ui.crm.organization_form.sections.organization_details")}
            </h3>

            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                {t("ui.crm.organization_form.labels.organization_name")} <span style={{ color: "var(--error)" }}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                {t("ui.crm.organization_form.labels.website")}
              </label>
              <input
                type="text"
                value={formData.website}
                onChange={(e) => {
                  setFormData({ ...formData, website: e.target.value });
                  setWebsiteError("");
                }}
                placeholder={t("ui.crm.organization_form.placeholders.website")}
                className="w-full px-2 py-1.5 text-sm border-2"
                style={{
                  borderColor: websiteError ? "var(--error)" : "var(--win95-border)",
                  background: "var(--win95-input-bg)",
                  color: "var(--win95-input-text)",
                }}
              />
              <p className="text-xs mt-1" style={{ color: "var(--win95-text)" }}>
                {t("ui.crm.organization_form.helpers.website_prefix")}
              </p>
              {websiteError && (
                <p className="text-xs mt-1" style={{ color: "var(--error)" }}>
                  {websiteError}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                  {t("ui.crm.organization_form.labels.industry")}
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border-2"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-input-bg)",
                    color: "var(--win95-input-text)",
                  }}
                >
                  <option value="">{t("ui.crm.organization_form.industry.select_placeholder")}</option>
                  <option value="Technology">{t("ui.crm.organization_form.industry.technology")}</option>
                  <option value="Healthcare">{t("ui.crm.organization_form.industry.healthcare")}</option>
                  <option value="Finance">{t("ui.crm.organization_form.industry.finance")}</option>
                  <option value="Manufacturing">{t("ui.crm.organization_form.industry.manufacturing")}</option>
                  <option value="Retail">{t("ui.crm.organization_form.industry.retail")}</option>
                  <option value="Education">{t("ui.crm.organization_form.industry.education")}</option>
                  <option value="Media">{t("ui.crm.organization_form.industry.media")}</option>
                  <option value="Real Estate">{t("ui.crm.organization_form.industry.real_estate")}</option>
                  <option value="Other">{t("ui.crm.organization_form.industry.other")}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                  {t("ui.crm.organization_form.labels.organization_size")}
                </label>
                <select
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value as typeof formData.size })}
                  className="w-full px-2 py-1.5 text-sm border-2"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-input-bg)",
                    color: "var(--win95-input-text)",
                  }}
                >
                  <option value="">{t("ui.crm.organization_form.size.select_placeholder")}</option>
                  <option value="1-10">1-10</option>
                  <option value="11-50">11-50</option>
                  <option value="51-200">51-200</option>
                  <option value="201-500">201-500</option>
                  <option value="501+">501+</option>
                </select>
              </div>
            </div>
          </div>

          {/* Organization Type */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold border-b pb-2" style={{ color: "var(--win95-text)", borderColor: "var(--win95-border)" }}>
              {t("ui.crm.organization_form.sections.organization_type")} <span style={{ color: "var(--error)" }}>*</span>
            </h3>

            <div className="grid grid-cols-4 gap-2">
              <label className="cursor-pointer">
                <input
                  type="radio"
                  name="orgType"
                  checked={formData.orgType === "prospect"}
                  onChange={() => setFormData({ ...formData, orgType: "prospect" })}
                  className="sr-only"
                />
                <div
                  className={`text-center py-2 px-3 text-xs font-bold border-2 transition-colors ${
                    formData.orgType === "prospect"
                      ? "bg-blue-100 border-blue-500 text-blue-700"
                      : "bg-gray-100 border-gray-400 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {t("ui.crm.organization_form.types.prospect")}
                </div>
              </label>

              <label className="cursor-pointer">
                <input
                  type="radio"
                  name="orgType"
                  checked={formData.orgType === "customer"}
                  onChange={() => setFormData({ ...formData, orgType: "customer" })}
                  className="sr-only"
                />
                <div
                  className={`text-center py-2 px-3 text-xs font-bold border-2 transition-colors ${
                    formData.orgType === "customer"
                      ? "bg-green-100 border-green-500 text-green-700"
                      : "bg-gray-100 border-gray-400 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {t("ui.crm.organization_form.types.customer")}
                </div>
              </label>

              <label className="cursor-pointer">
                <input
                  type="radio"
                  name="orgType"
                  checked={formData.orgType === "partner"}
                  onChange={() => setFormData({ ...formData, orgType: "partner" })}
                  className="sr-only"
                />
                <div
                  className={`text-center py-2 px-3 text-xs font-bold border-2 transition-colors ${
                    formData.orgType === "partner"
                      ? "bg-purple-100 border-purple-500 text-purple-700"
                      : "bg-gray-100 border-gray-400 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {t("ui.crm.organization_form.types.partner")}
                </div>
              </label>

              <label className="cursor-pointer">
                <input
                  type="radio"
                  name="orgType"
                  checked={formData.orgType === "sponsor"}
                  onChange={() => setFormData({ ...formData, orgType: "sponsor" })}
                  className="sr-only"
                />
                <div
                  className={`text-center py-2 px-3 text-xs font-bold border-2 transition-colors ${
                    formData.orgType === "sponsor"
                      ? "bg-yellow-100 border-yellow-500 text-yellow-700"
                      : "bg-gray-100 border-gray-400 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {t("ui.crm.organization_form.types.sponsor")}
                </div>
              </label>
            </div>

            <p className="text-xs" style={{ color: "var(--win95-text)" }}>
              {t("ui.crm.organization_form.helpers.org_type_description")}
            </p>
          </div>

          {/* Contact Details (Collapsible) */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowContactDetails(!showContactDetails)}
              className="flex items-center justify-between w-full text-left py-2 px-3 border-2"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg-light)",
                color: "var(--win95-text)",
              }}
            >
              <span className="text-sm font-bold">{t("ui.crm.organization_form.sections.contact_details")}</span>
              {showContactDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showContactDetails && (
              <div className="pl-4 space-y-3 border-l-2" style={{ borderColor: "var(--win95-border)" }}>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                    {t("ui.crm.organization_form.labels.primary_phone")}
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
                    {t("ui.crm.organization_form.labels.billing_email")}
                  </label>
                  <input
                    type="email"
                    value={formData.billingEmail}
                    onChange={(e) => {
                      setFormData({ ...formData, billingEmail: e.target.value });
                      setEmailError("");
                    }}
                    className="w-full px-2 py-1.5 text-sm border-2"
                    style={{
                      borderColor: emailError ? "var(--error)" : "var(--win95-border)",
                      background: "var(--win95-input-bg)",
                      color: "var(--win95-input-text)",
                    }}
                  />
                  {emailError && (
                    <p className="text-xs mt-1" style={{ color: "var(--error)" }}>
                      {emailError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                    {t("ui.crm.organization_form.labels.tax_id")}
                  </label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
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
              <span className="text-sm font-bold">{t("ui.crm.organization_form.sections.address")}</span>
              {showAddress ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showAddress && (
              <div className="pl-4 space-y-3 border-l-2" style={{ borderColor: "var(--win95-border)" }}>
                <input
                  type="text"
                  placeholder={t("ui.crm.organization_form.placeholders.street")}
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
                  placeholder={t("ui.crm.organization_form.placeholders.city")}
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
                    placeholder={t("ui.crm.organization_form.placeholders.state")}
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
                    placeholder={t("ui.crm.organization_form.placeholders.postal_code")}
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
                  <option value="">{t("ui.crm.organization_form.country.select_placeholder")}</option>
                  {supportedCountries.map((country) => (
                    <option key={country.code} value={country.name}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* B2B Billing Settings (Collapsible) */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowBillingSettings(!showBillingSettings)}
              className="flex items-center justify-between w-full text-left py-2 px-3 border-2"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg-light)",
                color: "var(--win95-text)",
              }}
            >
              <span className="text-sm font-bold">{t("ui.crm.organization_form.sections.b2b_billing")}</span>
              {showBillingSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showBillingSettings && (
              <div className="pl-4 space-y-4 border-l-2" style={{ borderColor: "var(--win95-border)" }}>
                {/* Legal Entity Information */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>{t("ui.crm.organization_form.b2b.legal_entity_info")}</h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                        {t("ui.crm.organization_form.b2b.legal_entity_type")}
                      </label>
                      <select
                        value={formData.legalEntityType}
                        onChange={(e) => setFormData({ ...formData, legalEntityType: e.target.value as typeof formData.legalEntityType })}
                        className="w-full px-2 py-1.5 text-sm border-2"
                        style={{
                          borderColor: "var(--win95-border)",
                          background: "var(--win95-input-bg)",
                          color: "var(--win95-input-text)",
                        }}
                      >
                        <option value="">{t("ui.crm.organization_form.b2b.legal_type.select")}</option>
                        <option value="corporation">{t("ui.crm.organization_form.b2b.legal_type.corporation")}</option>
                        <option value="llc">{t("ui.crm.organization_form.b2b.legal_type.llc")}</option>
                        <option value="partnership">{t("ui.crm.organization_form.b2b.legal_type.partnership")}</option>
                        <option value="sole_proprietorship">{t("ui.crm.organization_form.b2b.legal_type.sole_proprietorship")}</option>
                        <option value="nonprofit">{t("ui.crm.organization_form.b2b.legal_type.nonprofit")}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                        {t("ui.crm.organization_form.b2b.registration_number")}
                      </label>
                      <input
                        type="text"
                        value={formData.registrationNumber}
                        onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                        placeholder={t("ui.crm.organization_form.b2b.registration_placeholder")}
                        className="w-full px-2 py-1.5 text-sm border-2"
                        style={{
                          borderColor: "var(--win95-border)",
                          background: "var(--win95-input-bg)",
                          color: "var(--win95-input-text)",
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                        {t("ui.crm.organization_form.b2b.vat_number")}
                      </label>
                      <input
                        type="text"
                        value={formData.vatNumber}
                        onChange={(e) => handleVATChange(e.target.value)}
                        placeholder={t("ui.crm.organization_form.b2b.vat_placeholder")}
                        className={`w-full px-2 py-1.5 text-sm border-2 ${vatError ? "border-red-500" : ""}`}
                        style={{
                          borderColor: vatError ? "#ef4444" : "var(--win95-border)",
                          background: "var(--win95-input-bg)",
                          color: "var(--win95-input-text)",
                        }}
                      />
                      {vatError && (
                        <p className="text-xs mt-1 text-red-500">{vatError}</p>
                      )}
                    </div>

                    <div className="flex items-center pt-6">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.taxExempt}
                          onChange={(e) => setFormData({ ...formData, taxExempt: e.target.checked })}
                          className="mr-2"
                        />
                        <span className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                          {t("ui.crm.organization_form.b2b.tax_exempt")}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Billing Address */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>{t("ui.crm.organization_form.b2b.billing_address")}</h4>

                  <input
                    type="text"
                    placeholder="Street"
                    value={formData.billingStreet}
                    onChange={(e) => setFormData({ ...formData, billingStreet: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border-2"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-input-bg)",
                      color: "var(--win95-input-text)",
                    }}
                  />

                  <input
                    type="text"
                    placeholder="City"
                    value={formData.billingCity}
                    onChange={(e) => setFormData({ ...formData, billingCity: e.target.value })}
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
                      placeholder="State/Province"
                      value={formData.billingState}
                      onChange={(e) => setFormData({ ...formData, billingState: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border-2"
                      style={{
                        borderColor: "var(--win95-border)",
                        background: "var(--win95-input-bg)",
                        color: "var(--win95-input-text)",
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Postal Code"
                      value={formData.billingPostalCode}
                      onChange={(e) => setFormData({ ...formData, billingPostalCode: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border-2"
                      style={{
                        borderColor: "var(--win95-border)",
                        background: "var(--win95-input-bg)",
                        color: "var(--win95-input-text)",
                      }}
                    />
                  </div>

                  <select
                    value={formData.billingCountry}
                    onChange={(e) => setFormData({ ...formData, billingCountry: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border-2"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-input-bg)",
                      color: "var(--win95-input-text)",
                    }}
                  >
                    <option value="">-- Select Country --</option>
                    {supportedCountries.map((country) => (
                      <option key={country.code} value={country.name}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Terms */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>{t("ui.crm.organization_form.b2b.payment_settings")}</h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                        {t("ui.crm.organization_form.b2b.payment_terms")}
                      </label>
                      <select
                        value={formData.paymentTerms}
                        onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value as typeof formData.paymentTerms })}
                        className="w-full px-2 py-1.5 text-sm border-2"
                        style={{
                          borderColor: "var(--win95-border)",
                          background: "var(--win95-input-bg)",
                          color: "var(--win95-input-text)",
                        }}
                      >
                        <option value="due_on_receipt">{t("ui.crm.organization_form.b2b.payment_terms.due_on_receipt")}</option>
                        <option value="net15">{t("ui.crm.organization_form.b2b.payment_terms.net15")}</option>
                        <option value="net30">{t("ui.crm.organization_form.b2b.payment_terms.net30")}</option>
                        <option value="net60">{t("ui.crm.organization_form.b2b.payment_terms.net60")}</option>
                        <option value="net90">{t("ui.crm.organization_form.b2b.payment_terms.net90")}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                        {t("ui.crm.organization_form.b2b.credit_limit")}
                      </label>
                      <input
                        type="number"
                        value={formData.creditLimit}
                        onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                        placeholder="0.00"
                        step="0.01"
                        className="w-full px-2 py-1.5 text-sm border-2"
                        style={{
                          borderColor: "var(--win95-border)",
                          background: "var(--win95-input-bg)",
                          color: "var(--win95-input-text)",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                      {t("ui.crm.organization_form.b2b.preferred_payment_method")}
                    </label>
                    <select
                      value={formData.preferredPaymentMethod}
                      onChange={(e) => setFormData({ ...formData, preferredPaymentMethod: e.target.value as typeof formData.preferredPaymentMethod })}
                      className="w-full px-2 py-1.5 text-sm border-2"
                      style={{
                        borderColor: "var(--win95-border)",
                        background: "var(--win95-input-bg)",
                        color: "var(--win95-input-text)",
                      }}
                    >
                      <option value="">{t("ui.crm.organization_form.b2b.payment_method.select")}</option>
                      <option value="invoice">{t("ui.crm.organization_form.b2b.payment_method.invoice")}</option>
                      <option value="bank_transfer">{t("ui.crm.organization_form.b2b.payment_method.bank_transfer")}</option>
                      <option value="credit_card">{t("ui.crm.organization_form.b2b.payment_method.credit_card")}</option>
                      <option value="check">{t("ui.crm.organization_form.b2b.payment_method.check")}</option>
                    </select>
                  </div>
                </div>

                {/* Accounting Integration */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>{t("ui.crm.organization_form.b2b.accounting_integration")}</h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                        {t("ui.crm.organization_form.b2b.accounting_reference")}
                      </label>
                      <input
                        type="text"
                        value={formData.accountingReference}
                        onChange={(e) => setFormData({ ...formData, accountingReference: e.target.value })}
                        placeholder={t("ui.crm.organization_form.b2b.accounting_reference_placeholder")}
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
                        {t("ui.crm.organization_form.b2b.cost_center")}
                      </label>
                      <input
                        type="text"
                        value={formData.costCenter}
                        onChange={(e) => setFormData({ ...formData, costCenter: e.target.value })}
                        placeholder={t("ui.crm.organization_form.b2b.cost_center_placeholder")}
                        className="w-full px-2 py-1.5 text-sm border-2"
                        style={{
                          borderColor: "var(--win95-border)",
                          background: "var(--win95-input-bg)",
                          color: "var(--win95-input-text)",
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.purchaseOrderRequired}
                        onChange={(e) => setFormData({ ...formData, purchaseOrderRequired: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                        {t("ui.crm.organization_form.b2b.purchase_order_required")}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Billing Contact */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>{t("ui.crm.organization_form.b2b.billing_contact")}</h4>

                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                      {t("ui.crm.organization_form.b2b.billing_contact_name")}
                    </label>
                    <input
                      type="text"
                      value={formData.billingContact}
                      onChange={(e) => setFormData({ ...formData, billingContact: e.target.value })}
                      placeholder={t("ui.crm.organization_form.b2b.billing_contact_name_placeholder")}
                      className="w-full px-2 py-1.5 text-sm border-2"
                      style={{
                        borderColor: "var(--win95-border)",
                        background: "var(--win95-input-bg)",
                        color: "var(--win95-input-text)",
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                        {t("ui.crm.organization_form.b2b.billing_contact_email")}
                      </label>
                      <input
                        type="email"
                        value={formData.billingContactEmail}
                        onChange={(e) => setFormData({ ...formData, billingContactEmail: e.target.value })}
                        placeholder={t("ui.crm.organization_form.b2b.billing_contact_email_placeholder")}
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
                        {t("ui.crm.organization_form.b2b.billing_contact_phone")}
                      </label>
                      <input
                        type="tel"
                        value={formData.billingContactPhone}
                        onChange={(e) => setFormData({ ...formData, billingContactPhone: e.target.value })}
                        placeholder={t("ui.crm.organization_form.b2b.billing_contact_phone_placeholder")}
                        className="w-full px-2 py-1.5 text-sm border-2"
                        style={{
                          borderColor: "var(--win95-border)",
                          background: "var(--win95-input-bg)",
                          color: "var(--win95-input-text)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sponsorship Details (Conditional - only if Type = Sponsor) */}
          {formData.orgType === "sponsor" && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold border-b pb-2" style={{ color: "var(--win95-text)", borderColor: "var(--win95-border)" }}>
                {t("ui.crm.organization_form.sections.sponsorship_details")}
              </h3>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                  {t("ui.crm.organization_form.labels.sponsor_level")}
                </label>
                <select
                  value={formData.sponsorLevel}
                  onChange={(e) => setFormData({ ...formData, sponsorLevel: e.target.value as typeof formData.sponsorLevel })}
                  className="w-full px-2 py-1.5 text-sm border-2"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-input-bg)",
                    color: "var(--win95-input-text)",
                  }}
                >
                  <option value="">{t("ui.crm.organization_form.sponsor_level.select_placeholder")}</option>
                  <option value="platinum">{t("ui.crm.organization_form.sponsor_level.platinum")}</option>
                  <option value="gold">{t("ui.crm.organization_form.sponsor_level.gold")}</option>
                  <option value="silver">{t("ui.crm.organization_form.sponsor_level.silver")}</option>
                  <option value="bronze">{t("ui.crm.organization_form.sponsor_level.bronze")}</option>
                  <option value="community">{t("ui.crm.organization_form.sponsor_level.community")}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                  {t("ui.crm.organization_form.labels.logo_url")}
                </label>
                <input
                  type="url"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  placeholder={t("ui.crm.organization_form.placeholders.logo_url")}
                  className="w-full px-2 py-1.5 text-sm border-2"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-input-bg)",
                    color: "var(--win95-input-text)",
                  }}
                />
                <p className="text-xs mt-1" style={{ color: "var(--win95-text)" }}>
                  {t("ui.crm.organization_form.helpers.logo_optional")}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                  {t("ui.crm.organization_form.labels.sponsor_bio")}
                </label>
                <textarea
                  value={formData.sponsorBio}
                  onChange={(e) => setFormData({ ...formData, sponsorBio: e.target.value })}
                  rows={3}
                  placeholder={t("ui.crm.organization_form.placeholders.sponsor_bio")}
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
              <span className="text-sm font-bold">{t("ui.crm.organization_form.sections.tags_notes")}</span>
              {showTagsNotes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showTagsNotes && (
              <div className="pl-4 space-y-3 border-l-2" style={{ borderColor: "var(--win95-border)" }}>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                    {t("ui.crm.organization_form.labels.tags")}
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
                      placeholder={t("ui.crm.organization_form.placeholders.tag_input")}
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
                      {t("ui.crm.organization_form.buttons.add_tag")}
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
                    {t("ui.crm.organization_form.labels.notes")}
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    placeholder={t("ui.crm.organization_form.placeholders.notes")}
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
          <div className="flex gap-2 justify-end pt-4 border-t-2" style={{ borderColor: "var(--win95-border)" }}>
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
              {t("ui.crm.organization_form.buttons.cancel")}
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
                  {t("ui.crm.organization_form.buttons.saving")}
                </>
              ) : (
                <>
                  <Save size={14} />
                  {t("ui.crm.organization_form.buttons.save")}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
