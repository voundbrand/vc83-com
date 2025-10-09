"use client";

import { useState, useEffect, useImperativeHandle, forwardRef, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
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
import { usePermissions } from "@/contexts/permission-context";

interface OrganizationDetailsFormProps {
  organization: Doc<"organizations"> & { members?: unknown[] };
  isEditing: boolean;
  isSaving: boolean;
}

// Ref handle for parent to trigger save
export interface OrganizationDetailsFormRef {
  getFormData: () => FormData;
  hasChanges: () => boolean;
}

// Export the FormData type so parent can use it
export interface FormData {
  name: string;
  businessName: string;
  slug: string;
  industry: string;
  foundedYear: number;
  employeeCount: string;
  bio: string;
  contactEmail: string;
  billingEmail: string;
  supportEmail: string;
  contactPhone: string;
  faxNumber: string;
  website: string;
  socialMedia: {
    linkedin: string;
    twitter: string;
    facebook: string;
    instagram: string;
  };
  taxId: string;
  vatNumber: string;
  companyRegistrationNumber: string;
  legalEntityType: string;
  settings: {
    branding: {
      primaryColor: string;
      logo: string;
    };
    locale: {
      language: string;
      currency: string;
      timezone: string;
    };
    invoicing: {
      prefix: string;
      nextNumber: number;
      defaultTerms: string;
    };
  };
}

export const OrganizationDetailsForm = forwardRef<OrganizationDetailsFormRef, OrganizationDetailsFormProps>(
  function OrganizationDetailsForm({ organization, isEditing }, ref) {
    // Check permissions inline using centralized context
    const { hasPermission } = usePermissions();
    const canEdit = hasPermission("manage_organization");

    // Query ontology data for this organization
    const profile = useQuery(api.organizationOntology.getOrganizationProfile, {
      organizationId: organization._id
    });
    const contact = useQuery(api.organizationOntology.getOrganizationContact, {
      organizationId: organization._id
    });
    const social = useQuery(api.organizationOntology.getOrganizationSocial, {
      organizationId: organization._id
    });
    const legal = useQuery(api.organizationOntology.getOrganizationLegal, {
      organizationId: organization._id
    });
    const brandingSettingsData = useQuery(api.organizationOntology.getOrganizationSettings, {
      organizationId: organization._id,
      subtype: "branding"
    });
    const localeSettingsData = useQuery(api.organizationOntology.getOrganizationSettings, {
      organizationId: organization._id,
      subtype: "locale"
    });
    const invoicingSettingsData = useQuery(api.organizationOntology.getOrganizationSettings, {
      organizationId: organization._id,
      subtype: "invoicing"
    });

    // Extract single objects from settings queries (they return arrays when no subtype)
    const brandingSettings = useMemo(() =>
      Array.isArray(brandingSettingsData) ? undefined : brandingSettingsData,
      [brandingSettingsData]
    );
    const localeSettings = useMemo(() =>
      Array.isArray(localeSettingsData) ? undefined : localeSettingsData,
      [localeSettingsData]
    );
    const invoicingSettings = useMemo(() =>
      Array.isArray(invoicingSettingsData) ? undefined : invoicingSettingsData,
      [invoicingSettingsData]
    );

  // Form state for all fields
  const [formData, setFormData] = useState({
    // Basic Information (CORE - Still on organizations table)
    name: organization.name || "",
    businessName: organization.businessName || "",
    slug: organization.slug || "",

    // Profile fields - from ontology (organization_profile)
    industry: profile?.customProperties?.industry || "",
    foundedYear: profile?.customProperties?.foundedYear || new Date().getFullYear(),
    employeeCount: profile?.customProperties?.employeeCount || "",
    bio: profile?.customProperties?.bio || "",

    // Contact Information - from ontology (organization_contact)
    contactEmail: contact?.customProperties?.contactEmail || "",
    billingEmail: contact?.customProperties?.billingEmail || "",
    supportEmail: contact?.customProperties?.supportEmail || "",
    contactPhone: contact?.customProperties?.contactPhone || "",
    faxNumber: contact?.customProperties?.faxNumber || "",
    website: contact?.customProperties?.website || "",

    // Social Media - from ontology (organization_social)
    socialMedia: {
      linkedin: social?.customProperties?.linkedin || "",
      twitter: social?.customProperties?.twitter || "",
      facebook: social?.customProperties?.facebook || "",
      instagram: social?.customProperties?.instagram || "",
    },

    // Legal & Tax - from ontology (organization_legal)
    taxId: legal?.customProperties?.taxId || "",
    vatNumber: legal?.customProperties?.vatNumber || "",
    companyRegistrationNumber: legal?.customProperties?.companyRegistrationNumber || "",
    legalEntityType: legal?.customProperties?.legalEntityType || "",

    // Settings - from ontology (organization_settings with subtypes)
    settings: {
      branding: {
        primaryColor: brandingSettings?.customProperties?.primaryColor || "#6B46C1",
        logo: brandingSettings?.customProperties?.logo || "",
      },
      locale: {
        language: localeSettings?.customProperties?.language || "en",
        currency: localeSettings?.customProperties?.currency || "USD",
        timezone: localeSettings?.customProperties?.timezone || "America/New_York",
      },
      invoicing: {
        prefix: invoicingSettings?.customProperties?.prefix || "INV-",
        nextNumber: invoicingSettings?.customProperties?.nextNumber || 1,
        defaultTerms: invoicingSettings?.customProperties?.defaultTerms || "Net 30",
      },
    },
  });

  // Update form data when organization or ontology data changes
  useEffect(() => {
    if (organization && !isEditing) {
      setFormData({
        // Core fields - from organizations table
        name: organization.name || "",
        businessName: organization.businessName || "",
        slug: organization.slug || "",

        // Profile fields - from ontology
        industry: profile?.customProperties?.industry || "",
        foundedYear: profile?.customProperties?.foundedYear || new Date().getFullYear(),
        employeeCount: profile?.customProperties?.employeeCount || "",
        bio: profile?.customProperties?.bio || "",

        // Contact fields - from ontology
        contactEmail: contact?.customProperties?.contactEmail || "",
        billingEmail: contact?.customProperties?.billingEmail || "",
        supportEmail: contact?.customProperties?.supportEmail || "",
        contactPhone: contact?.customProperties?.contactPhone || "",
        faxNumber: contact?.customProperties?.faxNumber || "",
        website: contact?.customProperties?.website || "",

        // Social media - from ontology
        socialMedia: {
          linkedin: social?.customProperties?.linkedin || "",
          twitter: social?.customProperties?.twitter || "",
          facebook: social?.customProperties?.facebook || "",
          instagram: social?.customProperties?.instagram || "",
        },

        // Legal - from ontology
        taxId: legal?.customProperties?.taxId || "",
        vatNumber: legal?.customProperties?.vatNumber || "",
        companyRegistrationNumber: legal?.customProperties?.companyRegistrationNumber || "",
        legalEntityType: legal?.customProperties?.legalEntityType || "",

        // Settings - from ontology
        settings: {
          branding: {
            primaryColor: brandingSettings?.customProperties?.primaryColor || "#6B46C1",
            logo: brandingSettings?.customProperties?.logo || "",
          },
          locale: {
            language: localeSettings?.customProperties?.language || "en",
            currency: localeSettings?.customProperties?.currency || "USD",
            timezone: localeSettings?.customProperties?.timezone || "America/New_York",
          },
          invoicing: {
            prefix: invoicingSettings?.customProperties?.prefix || "INV-",
            nextNumber: invoicingSettings?.customProperties?.nextNumber || 1,
            defaultTerms: invoicingSettings?.customProperties?.defaultTerms || "Net 30",
          },
        },
      });
    }
  }, [organization, isEditing, profile, contact, social, legal, brandingSettings, localeSettings, invoicingSettings]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    getFormData: () => formData,
    hasChanges: () => {
      // Simple comparison - only check core organization fields
      // Extended fields (industry, contact info, etc.) moved to ontology - will be compared separately later
      return (
        formData.name !== organization.name ||
        formData.businessName !== organization.businessName ||
        formData.slug !== organization.slug
        // TODO: Add ontology field comparisons when implementing full ontology UI
      );
    },
  }), [formData, organization]);

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
              value={formData.industry}
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
              value={formData.foundedYear}
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
              value={formData.employeeCount}
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
            value={formData.bio}
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
              value={formData.contactEmail}
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
              value={formData.billingEmail}
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
              value={formData.supportEmail}
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
              value={formData.contactPhone}
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
              value={formData.faxNumber}
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
              value={formData.website}
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
                value={formData.socialMedia.linkedin}
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
                value={formData.socialMedia.twitter}
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
                value={formData.socialMedia.facebook}
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
                value={formData.socialMedia.instagram}
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
              value={formData.taxId}
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
              value={formData.vatNumber}
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
              value={formData.companyRegistrationNumber}
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
              value={formData.legalEntityType}
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
                    value={formData.settings.branding.primaryColor}
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
                    value={formData.settings.branding.primaryColor}
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
                  value={formData.settings.branding.logo}
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
                  value={formData.settings.locale.language}
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
                  value={formData.settings.locale.currency}
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
                  value={formData.settings.locale.timezone}
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
                  value={formData.settings.invoicing.prefix}
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
                  value={formData.settings.invoicing.nextNumber}
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
                  value={formData.settings.invoicing.defaultTerms}
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
              {/* Features temporarily hidden - moved to ontology */}
              {false && (
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
              {false && (
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
              {false && (
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
              {/* Show "no features" message since we haven't queried ontology yet */}
              {true && (
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
});

OrganizationDetailsForm.displayName = "OrganizationDetailsForm";
