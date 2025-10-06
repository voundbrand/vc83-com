"use client";

import { useState } from "react";
import { OrganizationSection } from "./components/organization-section";
import {
  Building2,
  Mail,
  Phone,
  Globe,
  FileText,
  Settings as SettingsIcon,
  Shield,
  Briefcase,
  Users as UsersIcon,
  Calendar,
  Hash,
  Palette,
  Languages,
  Receipt
} from "lucide-react";
import { Doc } from "../../../../convex/_generated/dataModel";

interface OrganizationDetailsFormProps {
  organization: Doc<"organizations"> & { members?: unknown[] };
  canEdit: boolean;
  isEditing: boolean;
  onSave: (updates: Partial<Doc<"organizations">>) => Promise<void>;
  isSaving: boolean;
}

export function OrganizationDetailsForm({
  organization,
  canEdit,
  isEditing,
  onSave,
}: OrganizationDetailsFormProps) {
  // Form state for all fields
  const [formData, setFormData] = useState({
    // Basic Information
    name: organization.name || "",
    businessName: organization.businessName || "",
    slug: organization.slug || "",
    industry: organization.industry || "",
    foundedYear: organization.foundedYear || new Date().getFullYear(),
    employeeCount: organization.employeeCount || "",
    bio: organization.bio || "",

    // Contact Information
    contactEmail: organization.contactEmail || "",
    billingEmail: organization.billingEmail || "",
    supportEmail: organization.supportEmail || "",
    contactPhone: organization.contactPhone || "",
    faxNumber: organization.faxNumber || "",
    website: organization.website || "",
    socialMedia: {
      linkedin: organization.socialMedia?.linkedin || "",
      twitter: organization.socialMedia?.twitter || "",
      facebook: organization.socialMedia?.facebook || "",
      instagram: organization.socialMedia?.instagram || "",
    },

    // Legal & Tax
    taxId: organization.taxId || "",
    vatNumber: organization.vatNumber || "",
    companyRegistrationNumber: organization.companyRegistrationNumber || "",
    legalEntityType: organization.legalEntityType || "",

    // Settings
    settings: {
      branding: {
        primaryColor: organization.settings?.branding?.primaryColor || "#6B46C1",
        logo: organization.settings?.branding?.logo || "",
      },
      locale: {
        language: organization.settings?.locale?.language || "en",
        currency: organization.settings?.locale?.currency || "USD",
        timezone: organization.settings?.locale?.timezone || "America/New_York",
      },
      invoicing: {
        prefix: organization.settings?.invoicing?.prefix || "INV-",
        nextNumber: organization.settings?.invoicing?.nextNumber || 1,
        defaultTerms: organization.settings?.invoicing?.defaultTerms || "Net 30",
      },
    },
  });

  // Update form data when organization changes
  useState(() => {
    if (organization && !isEditing) {
      setFormData({
        name: organization.name || "",
        businessName: organization.businessName || "",
        slug: organization.slug || "",
        industry: organization.industry || "",
        foundedYear: organization.foundedYear || new Date().getFullYear(),
        employeeCount: organization.employeeCount || "",
        bio: organization.bio || "",
        contactEmail: organization.contactEmail || "",
        billingEmail: organization.billingEmail || "",
        supportEmail: organization.supportEmail || "",
        contactPhone: organization.contactPhone || "",
        faxNumber: organization.faxNumber || "",
        website: organization.website || "",
        socialMedia: {
          linkedin: organization.socialMedia?.linkedin || "",
          twitter: organization.socialMedia?.twitter || "",
          facebook: organization.socialMedia?.facebook || "",
          instagram: organization.socialMedia?.instagram || "",
        },
        taxId: organization.taxId || "",
        vatNumber: organization.vatNumber || "",
        companyRegistrationNumber: organization.companyRegistrationNumber || "",
        legalEntityType: organization.legalEntityType || "",
        settings: {
          branding: {
            primaryColor: organization.settings?.branding?.primaryColor || "#6B46C1",
            logo: organization.settings?.branding?.logo || "",
          },
          locale: {
            language: organization.settings?.locale?.language || "en",
            currency: organization.settings?.locale?.currency || "USD",
            timezone: organization.settings?.locale?.timezone || "America/New_York",
          },
          invoicing: {
            prefix: organization.settings?.invoicing?.prefix || "INV-",
            nextNumber: organization.settings?.invoicing?.nextNumber || 1,
            defaultTerms: organization.settings?.invoicing?.defaultTerms || "Net 30",
          },
        },
      });
    }
  });

  const inputStyles = {
    backgroundColor: isEditing && canEdit ? 'var(--win95-input-bg)' : 'var(--win95-bg)',
    color: 'var(--win95-input-text)',
    border: '2px inset',
    borderColor: 'var(--win95-input-border-dark)',
    opacity: canEdit ? 1 : 0.7
  };

  return (
    <div className="space-y-4">
      {/* Basic Information */}
      <OrganizationSection
        title="Basic Information"
        icon={<Building2 className="w-4 h-4" />}
        collapsible={true}
        defaultCollapsed={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
              Organization Name *
            </label>
            <input
              type="text"
              value={isEditing ? formData.name : organization.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              readOnly={!isEditing}
              disabled={!canEdit || !isEditing}
              className="w-full px-2 py-1 text-sm"
              style={inputStyles}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
              Business Name *
            </label>
            <input
              type="text"
              value={isEditing ? formData.businessName : organization.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              readOnly={!isEditing}
              disabled={!canEdit || !isEditing}
              className="w-full px-2 py-1 text-sm"
              style={inputStyles}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
              <Hash className="w-3 h-3 inline mr-1" />
              Slug
            </label>
            <input
              type="text"
              value={isEditing ? formData.slug : organization.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
              readOnly={!isEditing}
              disabled={!canEdit || !isEditing}
              className="w-full px-2 py-1 text-sm font-mono"
              style={inputStyles}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
              <Briefcase className="w-3 h-3 inline mr-1" />
              Industry
            </label>
            <input
              type="text"
              value={isEditing ? formData.industry : (organization.industry || "")}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              readOnly={!isEditing}
              disabled={!canEdit || !isEditing}
              placeholder="e.g., Technology, Finance, Healthcare"
              className="w-full px-2 py-1 text-sm"
              style={inputStyles}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
              <Calendar className="w-3 h-3 inline mr-1" />
              Founded Year
            </label>
            <input
              type="number"
              value={isEditing ? formData.foundedYear : (organization.foundedYear || "")}
              onChange={(e) => setFormData({ ...formData, foundedYear: parseInt(e.target.value) })}
              readOnly={!isEditing}
              disabled={!canEdit || !isEditing}
              min="1800"
              max={new Date().getFullYear()}
              className="w-full px-2 py-1 text-sm"
              style={inputStyles}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
              <UsersIcon className="w-3 h-3 inline mr-1" />
              Employee Count
            </label>
            <select
              value={isEditing ? formData.employeeCount : (organization.employeeCount || "")}
              onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })}
              disabled={!canEdit || !isEditing}
              className="w-full px-2 py-1 text-sm"
              style={inputStyles}
            >
              <option value="">Select range</option>
              <option value="1-10">1-10</option>
              <option value="11-50">11-50</option>
              <option value="51-200">51-200</option>
              <option value="201-500">201-500</option>
              <option value="501-1000">501-1000</option>
              <option value="1000+">1000+</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
            <FileText className="w-3 h-3 inline mr-1" />
            About / Bio
          </label>
          <textarea
            value={isEditing ? formData.bio : (organization.bio || "")}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            readOnly={!isEditing}
            disabled={!canEdit || !isEditing}
            rows={3}
            placeholder="Tell us about your organization..."
            className="w-full px-2 py-1 text-sm resize-none"
            style={inputStyles}
          />
        </div>
      </OrganizationSection>

      {/* Contact Information */}
      <OrganizationSection
        title="Contact Information"
        icon={<Mail className="w-4 h-4" />}
        collapsible={true}
        defaultCollapsed={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
              <Mail className="w-3 h-3 inline mr-1" />
              Primary Contact Email
            </label>
            <input
              type="email"
              value={isEditing ? formData.contactEmail : (organization.contactEmail || "")}
              onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              readOnly={!isEditing}
              disabled={!canEdit || !isEditing}
              className="w-full px-2 py-1 text-sm"
              style={inputStyles}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
              <Receipt className="w-3 h-3 inline mr-1" />
              Billing Email
            </label>
            <input
              type="email"
              value={isEditing ? formData.billingEmail : (organization.billingEmail || "")}
              onChange={(e) => setFormData({ ...formData, billingEmail: e.target.value })}
              readOnly={!isEditing}
              disabled={!canEdit || !isEditing}
              className="w-full px-2 py-1 text-sm"
              style={inputStyles}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
              <Shield className="w-3 h-3 inline mr-1" />
              Support Email
            </label>
            <input
              type="email"
              value={isEditing ? formData.supportEmail : (organization.supportEmail || "")}
              onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
              readOnly={!isEditing}
              disabled={!canEdit || !isEditing}
              className="w-full px-2 py-1 text-sm"
              style={inputStyles}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
              <Phone className="w-3 h-3 inline mr-1" />
              Phone Number
            </label>
            <input
              type="tel"
              value={isEditing ? formData.contactPhone : (organization.contactPhone || "")}
              onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              readOnly={!isEditing}
              disabled={!canEdit || !isEditing}
              className="w-full px-2 py-1 text-sm"
              style={inputStyles}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
              Fax Number
            </label>
            <input
              type="tel"
              value={isEditing ? formData.faxNumber : (organization.faxNumber || "")}
              onChange={(e) => setFormData({ ...formData, faxNumber: e.target.value })}
              readOnly={!isEditing}
              disabled={!canEdit || !isEditing}
              className="w-full px-2 py-1 text-sm"
              style={inputStyles}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
              <Globe className="w-3 h-3 inline mr-1" />
              Website
            </label>
            <input
              type="url"
              value={isEditing ? formData.website : (organization.website || "")}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              readOnly={!isEditing}
              disabled={!canEdit || !isEditing}
              placeholder="https://example.com"
              className="w-full px-2 py-1 text-sm"
              style={inputStyles}
            />
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--win95-text)' }}>
            Social Media Links
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--neutral-gray)' }}>
                LinkedIn
              </label>
              <input
                type="url"
                value={isEditing ? formData.socialMedia.linkedin : (organization.socialMedia?.linkedin || "")}
                onChange={(e) => setFormData({
                  ...formData,
                  socialMedia: { ...formData.socialMedia, linkedin: e.target.value }
                })}
                readOnly={!isEditing}
                disabled={!canEdit || !isEditing}
                placeholder="https://linkedin.com/company/..."
                className="w-full px-2 py-1 text-sm"
                style={inputStyles}
              />
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--neutral-gray)' }}>
                Twitter/X
              </label>
              <input
                type="url"
                value={isEditing ? formData.socialMedia.twitter : (organization.socialMedia?.twitter || "")}
                onChange={(e) => setFormData({
                  ...formData,
                  socialMedia: { ...formData.socialMedia, twitter: e.target.value }
                })}
                readOnly={!isEditing}
                disabled={!canEdit || !isEditing}
                placeholder="https://twitter.com/..."
                className="w-full px-2 py-1 text-sm"
                style={inputStyles}
              />
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--neutral-gray)' }}>
                Facebook
              </label>
              <input
                type="url"
                value={isEditing ? formData.socialMedia.facebook : (organization.socialMedia?.facebook || "")}
                onChange={(e) => setFormData({
                  ...formData,
                  socialMedia: { ...formData.socialMedia, facebook: e.target.value }
                })}
                readOnly={!isEditing}
                disabled={!canEdit || !isEditing}
                placeholder="https://facebook.com/..."
                className="w-full px-2 py-1 text-sm"
                style={inputStyles}
              />
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--neutral-gray)' }}>
                Instagram
              </label>
              <input
                type="url"
                value={isEditing ? formData.socialMedia.instagram : (organization.socialMedia?.instagram || "")}
                onChange={(e) => setFormData({
                  ...formData,
                  socialMedia: { ...formData.socialMedia, instagram: e.target.value }
                })}
                readOnly={!isEditing}
                disabled={!canEdit || !isEditing}
                placeholder="https://instagram.com/..."
                className="w-full px-2 py-1 text-sm"
                style={inputStyles}
              />
            </div>
          </div>
        </div>
      </OrganizationSection>

      {/* Legal & Tax Information */}
      <OrganizationSection
        title="Legal & Tax Information"
        icon={<Shield className="w-4 h-4" />}
        collapsible={true}
        defaultCollapsed={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
              Tax ID / EIN
            </label>
            <input
              type="text"
              value={isEditing ? formData.taxId : (organization.taxId || "")}
              onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
              readOnly={!isEditing}
              disabled={!canEdit || !isEditing}
              className="w-full px-2 py-1 text-sm font-mono"
              style={inputStyles}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
              VAT Number
            </label>
            <input
              type="text"
              value={isEditing ? formData.vatNumber : (organization.vatNumber || "")}
              onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
              readOnly={!isEditing}
              disabled={!canEdit || !isEditing}
              placeholder="EU VAT Number"
              className="w-full px-2 py-1 text-sm font-mono"
              style={inputStyles}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
              Company Registration Number
            </label>
            <input
              type="text"
              value={isEditing ? formData.companyRegistrationNumber : (organization.companyRegistrationNumber || "")}
              onChange={(e) => setFormData({ ...formData, companyRegistrationNumber: e.target.value })}
              readOnly={!isEditing}
              disabled={!canEdit || !isEditing}
              className="w-full px-2 py-1 text-sm font-mono"
              style={inputStyles}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
              Legal Entity Type
            </label>
            <select
              value={isEditing ? formData.legalEntityType : (organization.legalEntityType || "")}
              onChange={(e) => setFormData({ ...formData, legalEntityType: e.target.value })}
              disabled={!canEdit || !isEditing}
              className="w-full px-2 py-1 text-sm"
              style={inputStyles}
            >
              <option value="">Select entity type</option>
              <option value="LLC">LLC</option>
              <option value="Corporation">Corporation</option>
              <option value="S-Corp">S-Corporation</option>
              <option value="C-Corp">C-Corporation</option>
              <option value="Partnership">Partnership</option>
              <option value="Sole Proprietorship">Sole Proprietorship</option>
              <option value="Non-Profit">Non-Profit</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </OrganizationSection>

      {/* Settings & Preferences */}
      <OrganizationSection
        title="Settings & Preferences"
        icon={<SettingsIcon className="w-4 h-4" />}
        collapsible={true}
        defaultCollapsed={true}
      >
        <div className="space-y-6">
          {/* Branding */}
          <div>
            <p className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
              <Palette className="w-3.5 h-3.5" />
              Branding
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--neutral-gray)' }}>
                  Primary Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={isEditing ? formData.settings.branding.primaryColor : (organization.settings?.branding?.primaryColor || "#6B46C1")}
                    onChange={(e) => setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        branding: { ...formData.settings.branding, primaryColor: e.target.value }
                      }
                    })}
                    disabled={!canEdit || !isEditing}
                    className="h-8 w-16 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={isEditing ? formData.settings.branding.primaryColor : (organization.settings?.branding?.primaryColor || "#6B46C1")}
                    onChange={(e) => setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        branding: { ...formData.settings.branding, primaryColor: e.target.value }
                      }
                    })}
                    readOnly={!isEditing}
                    disabled={!canEdit || !isEditing}
                    className="flex-1 px-2 py-1 text-sm font-mono"
                    style={inputStyles}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--neutral-gray)' }}>
                  Logo URL
                </label>
                <input
                  type="url"
                  value={isEditing ? formData.settings.branding.logo : (organization.settings?.branding?.logo || "")}
                  onChange={(e) => setFormData({
                    ...formData,
                    settings: {
                      ...formData.settings,
                      branding: { ...formData.settings.branding, logo: e.target.value }
                    }
                  })}
                  readOnly={!isEditing}
                  disabled={!canEdit || !isEditing}
                  placeholder="https://..."
                  className="w-full px-2 py-1 text-sm"
                  style={inputStyles}
                />
              </div>
            </div>
          </div>

          {/* Locale */}
          <div>
            <p className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
              <Languages className="w-3.5 h-3.5" />
              Locale & Regional Settings
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--neutral-gray)' }}>
                  Language
                </label>
                <select
                  value={isEditing ? formData.settings.locale.language : (organization.settings?.locale?.language || "en")}
                  onChange={(e) => setFormData({
                    ...formData,
                    settings: {
                      ...formData.settings,
                      locale: { ...formData.settings.locale, language: e.target.value }
                    }
                  })}
                  disabled={!canEdit || !isEditing}
                  className="w-full px-2 py-1 text-sm"
                  style={inputStyles}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                  <option value="pt">Portuguese</option>
                </select>
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--neutral-gray)' }}>
                  Currency
                </label>
                <select
                  value={isEditing ? formData.settings.locale.currency : (organization.settings?.locale?.currency || "USD")}
                  onChange={(e) => setFormData({
                    ...formData,
                    settings: {
                      ...formData.settings,
                      locale: { ...formData.settings.locale, currency: e.target.value }
                    }
                  })}
                  disabled={!canEdit || !isEditing}
                  className="w-full px-2 py-1 text-sm"
                  style={inputStyles}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--neutral-gray)' }}>
                  Timezone
                </label>
                <select
                  value={isEditing ? formData.settings.locale.timezone : (organization.settings?.locale?.timezone || "America/New_York")}
                  onChange={(e) => setFormData({
                    ...formData,
                    settings: {
                      ...formData.settings,
                      locale: { ...formData.settings.locale, timezone: e.target.value }
                    }
                  })}
                  disabled={!canEdit || !isEditing}
                  className="w-full px-2 py-1 text-sm"
                  style={inputStyles}
                >
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                  <option value="Australia/Sydney">Sydney</option>
                </select>
              </div>
            </div>
          </div>

          {/* Invoicing */}
          <div>
            <p className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
              <Receipt className="w-3.5 h-3.5" />
              Invoicing Settings
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--neutral-gray)' }}>
                  Invoice Prefix
                </label>
                <input
                  type="text"
                  value={isEditing ? formData.settings.invoicing.prefix : (organization.settings?.invoicing?.prefix || "INV-")}
                  onChange={(e) => setFormData({
                    ...formData,
                    settings: {
                      ...formData.settings,
                      invoicing: { ...formData.settings.invoicing, prefix: e.target.value }
                    }
                  })}
                  readOnly={!isEditing}
                  disabled={!canEdit || !isEditing}
                  placeholder="INV-"
                  className="w-full px-2 py-1 text-sm font-mono"
                  style={inputStyles}
                />
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--neutral-gray)' }}>
                  Next Invoice Number
                </label>
                <input
                  type="number"
                  value={isEditing ? formData.settings.invoicing.nextNumber : (organization.settings?.invoicing?.nextNumber || 1)}
                  onChange={(e) => setFormData({
                    ...formData,
                    settings: {
                      ...formData.settings,
                      invoicing: { ...formData.settings.invoicing, nextNumber: parseInt(e.target.value) }
                    }
                  })}
                  readOnly={!isEditing}
                  disabled={!canEdit || !isEditing}
                  min="1"
                  className="w-full px-2 py-1 text-sm"
                  style={inputStyles}
                />
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--neutral-gray)' }}>
                  Default Payment Terms
                </label>
                <select
                  value={isEditing ? formData.settings.invoicing.defaultTerms : (organization.settings?.invoicing?.defaultTerms || "Net 30")}
                  onChange={(e) => setFormData({
                    ...formData,
                    settings: {
                      ...formData.settings,
                      invoicing: { ...formData.settings.invoicing, defaultTerms: e.target.value }
                    }
                  })}
                  disabled={!canEdit || !isEditing}
                  className="w-full px-2 py-1 text-sm"
                  style={inputStyles}
                >
                  <option value="Due on receipt">Due on receipt</option>
                  <option value="Net 7">Net 7</option>
                  <option value="Net 15">Net 15</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 60">Net 60</option>
                  <option value="Net 90">Net 90</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </OrganizationSection>

      {/* Plan & Features (Read-only) */}
      <OrganizationSection
        title="Plan & Features"
        icon={<Shield className="w-4 h-4" />}
        collapsible={true}
        defaultCollapsed={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
              Current Plan
            </label>
            <div
              className="px-2 py-1 text-sm font-semibold uppercase"
              style={{
                backgroundColor: 'var(--win95-bg)',
                color: 'var(--primary)',
                border: '2px inset',
                borderColor: 'var(--win95-input-border-dark)'
              }}
            >
              {organization.plan}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
              Workspace Type
            </label>
            <div
              className="px-2 py-1 text-sm"
              style={{
                backgroundColor: 'var(--win95-bg)',
                color: 'var(--win95-text)',
                border: '2px inset',
                borderColor: 'var(--win95-input-border-dark)'
              }}
            >
              {organization.isPersonalWorkspace ? "Personal Workspace" : "Team Workspace"}
            </div>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--win95-text)' }}>
              Enabled Features
            </label>
            <div className="flex flex-wrap gap-2">
              {organization.settings?.features?.customDomain && (
                <span
                  className="px-2 py-1 text-xs font-semibold"
                  style={{
                    backgroundColor: 'var(--success)',
                    color: 'white',
                    border: '1px solid',
                    borderColor: 'var(--win95-border)'
                  }}
                >
                  Custom Domain
                </span>
              )}
              {organization.settings?.features?.sso && (
                <span
                  className="px-2 py-1 text-xs font-semibold"
                  style={{
                    backgroundColor: 'var(--success)',
                    color: 'white',
                    border: '1px solid',
                    borderColor: 'var(--win95-border)'
                  }}
                >
                  SSO
                </span>
              )}
              {organization.settings?.features?.apiAccess && (
                <span
                  className="px-2 py-1 text-xs font-semibold"
                  style={{
                    backgroundColor: 'var(--success)',
                    color: 'white',
                    border: '1px solid',
                    borderColor: 'var(--win95-border)'
                  }}
                >
                  API Access
                </span>
              )}
              {!organization.settings?.features?.customDomain &&
               !organization.settings?.features?.sso &&
               !organization.settings?.features?.apiAccess && (
                <span className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                  No additional features enabled
                </span>
              )}
            </div>
          </div>
        </div>
      </OrganizationSection>
    </div>
  );
}
