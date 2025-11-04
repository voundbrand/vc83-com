"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { X, Save, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { getSupportedCountries } from "../../../../convex/legalEntityTypes";
import { useTranslation } from "@/contexts/translation-context";

interface OrganizationFormModalProps {
  editId?: Id<"objects">;
  onClose: () => void;
  onSuccess: (organizationId: Id<"objects">) => void;
}

type OrgType = "prospect" | "customer" | "partner" | "sponsor";

export function OrganizationFormModal({ editId, onClose, onSuccess }: OrganizationFormModalProps) {
  const { t } = useTranslation();
  const { sessionId } = useAuth();
  const currentOrganization = useCurrentOrganization();
  const currentOrganizationId = currentOrganization?.id;

  const [saving, setSaving] = useState(false);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
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
    sponsorLevel: "" as "" | "platinum" | "gold" | "silver" | "bronze" | "community",
    logoUrl: "",
    sponsorBio: "",
    tags: [] as string[],
    notes: "",
  });

  const [tagInput, setTagInput] = useState("");
  const [websiteError, setWebsiteError] = useState("");
  const [emailError, setEmailError] = useState("");

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

      setFormData({
        name: existingOrg.name || "",
        website: props.website?.toString() || "",
        industry: props.industry?.toString() || "",
        size: (props.size?.toString() || "") as typeof formData.size,
        orgType: (existingOrg.subtype || "prospect") as OrgType,
        phone: props.phone?.toString() || "",
        billingEmail: props.billingEmail?.toString() || "",
        taxId: props.taxId?.toString() || "",
        street: address.street || "",
        city: address.city || "",
        state: address.state || "",
        postalCode: address.postalCode || "",
        country: address.country || "",
        sponsorLevel: (props.sponsorLevel?.toString() || "") as typeof formData.sponsorLevel,
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
        setEmailError(t("crm.organization_form.validation.email_invalid"));
        return;
      }
    }

    setSaving(true);
    setWebsiteError("");
    setEmailError("");

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
          tags: formData.tags.length > 0 ? formData.tags : undefined,
          notes: formData.notes || undefined,
          customFields,
        });
      }

      onSuccess(orgId);
    } catch (error) {
      console.error(`Failed to ${editId ? "update" : "create"} organization:`, error);
      alert(editId ? t("crm.organization_form.errors.update_failed") : t("crm.organization_form.errors.create_failed"));
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
            {editId ? "Edit Organization" : "Add New Organization"}
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
              🏢 Organization Details
            </h3>

            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                Organization Name <span style={{ color: "var(--error)" }}>*</span>
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
                Website
              </label>
              <input
                type="text"
                value={formData.website}
                onChange={(e) => {
                  setFormData({ ...formData, website: e.target.value });
                  setWebsiteError("");
                }}
                placeholder="example.com"
                className="w-full px-2 py-1.5 text-sm border-2"
                style={{
                  borderColor: websiteError ? "var(--error)" : "var(--win95-border)",
                  background: "var(--win95-input-bg)",
                  color: "var(--win95-input-text)",
                }}
              />
              <p className="text-xs mt-1" style={{ color: "var(--win95-text)" }}>
                Auto-prefixed with https:// if not provided
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
                  Industry
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
                  <option value="">-- Select Industry --</option>
                  <option value="Technology">Technology</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Finance">Finance</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Retail">Retail</option>
                  <option value="Education">Education</option>
                  <option value="Media">Media</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                  Organization Size
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
                  <option value="">-- Select Size --</option>
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
              🎯 Organization Type <span style={{ color: "var(--error)" }}>*</span>
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
                  Prospect
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
                  Customer
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
                  Partner
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
                  Sponsor
                </div>
              </label>
            </div>

            <p className="text-xs" style={{ color: "var(--win95-text)" }}>
              Select the relationship type for this organization
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
              <span className="text-sm font-bold">📞 Contact Details (Optional)</span>
              {showContactDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showContactDetails && (
              <div className="pl-4 space-y-3 border-l-2" style={{ borderColor: "var(--win95-border)" }}>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                    Primary Phone
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
                    Billing Email
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
                    Tax ID / VAT Number
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
              <span className="text-sm font-bold">📍 Address (Optional)</span>
              {showAddress ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showAddress && (
              <div className="pl-4 space-y-3 border-l-2" style={{ borderColor: "var(--win95-border)" }}>
                <input
                  type="text"
                  placeholder="Street"
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
                  placeholder="City"
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
                    placeholder="State/Province"
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
                    placeholder="Postal Code"
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
                  <option value="">-- Select Country --</option>
                  {supportedCountries.map((country) => (
                    <option key={country.code} value={country.name}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Sponsorship Details (Conditional - only if Type = Sponsor) */}
          {formData.orgType === "sponsor" && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold border-b pb-2" style={{ color: "var(--win95-text)", borderColor: "var(--win95-border)" }}>
                🌟 Sponsorship Details
              </h3>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                  Sponsor Level
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
                  <option value="">-- Select Level --</option>
                  <option value="platinum">Platinum</option>
                  <option value="gold">Gold</option>
                  <option value="silver">Silver</option>
                  <option value="bronze">Bronze</option>
                  <option value="community">Community</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                  Logo URL
                </label>
                <input
                  type="url"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-2 py-1.5 text-sm border-2"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-input-bg)",
                    color: "var(--win95-input-text)",
                  }}
                />
                <p className="text-xs mt-1" style={{ color: "var(--win95-text)" }}>
                  Optional - for event displays
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                  Sponsor Bio
                </label>
                <textarea
                  value={formData.sponsorBio}
                  onChange={(e) => setFormData({ ...formData, sponsorBio: e.target.value })}
                  rows={3}
                  placeholder="Optional - shown on event pages"
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
              <span className="text-sm font-bold">🏷️ Tags & Notes (Optional)</span>
              {showTagsNotes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showTagsNotes && (
              <div className="pl-4 space-y-3 border-l-2" style={{ borderColor: "var(--win95-border)" }}>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                    Tags
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
                      placeholder="Enter tag and press Enter"
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
                      Add
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
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    placeholder="Add any additional information about this organization..."
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
              Cancel
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
                  Saving...
                </>
              ) : (
                <>
                  <Save size={14} />
                  Save Organization
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
