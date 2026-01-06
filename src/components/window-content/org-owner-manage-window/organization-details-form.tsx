"use client";

import { useState, useEffect, useImperativeHandle, forwardRef, useMemo } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { OrganizationSection } from "./components/organization-section";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useWindowManager } from "@/hooks/use-window-manager";
import MediaLibraryWindow from "@/components/window-content/media-library-window";
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
import { getLegalEntitiesForCountry } from "../../../../convex/legalEntityTypes";
import { getTaxCodesForCountry } from "@/lib/tax-calculator";
import { TIMEZONE_OPTIONS } from "@/lib/timezone-utils";

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
  taxEnabled: boolean;
  defaultTaxBehavior: "inclusive" | "exclusive" | "automatic";
  defaultTaxCode: string;
  settings: {
    branding: {
      primaryColor: string;
      secondaryColor: string;
      logo: string;
      desktopBackground?: string;
    };
    locale: {
      language: string;
      currency: string;
      timezone: string;
      dateFormat: string;
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
    const { t } = useNamespaceTranslations("ui.manage");
    const { openWindow } = useWindowManager();
    // Check permissions inline using centralized context
    const { hasPermission } = usePermissions();
    const canEdit = hasPermission("manage_organization");

    // VAT validation
    const validateVATAction = useAction(api.vatValidation.validateVATNumber);
    const [isValidatingVAT, setIsValidatingVAT] = useState(false);
    const [vatValidationResult, setVatValidationResult] = useState<{
      valid: boolean;
      name?: string;
      address?: string;
      error?: string;
    } | null>(null);

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

    // Load addresses to find tax origin
    const addresses = useQuery(api.organizationOntology.getOrganizationAddresses, {
      organizationId: organization._id,
    });

    // Find tax origin address
    const taxOriginAddress = addresses?.find(
      (addr) => (addr.customProperties as { isTaxOrigin?: boolean })?.isTaxOrigin
    );

    // Get country from tax origin address
    const taxOriginCountry = taxOriginAddress
      ? (taxOriginAddress.customProperties as { country?: string })?.country
      : null;

    // Get available legal entity types based on tax origin address country
    const availableLegalEntities = taxOriginCountry
      ? getLegalEntitiesForCountry(taxOriginCountry)
      : undefined;

    // Get available tax codes for the organization's country
    const availableTaxCodes = taxOriginCountry
      ? getTaxCodesForCountry(taxOriginCountry)
      : null;

    // Extract single objects from settings queries (they return arrays when no subtype)
    const brandingSettings = useMemo(() => {
      const result = Array.isArray(brandingSettingsData) ? undefined : brandingSettingsData;
      console.log("🟣 [FORM LOAD] brandingSettingsData:", brandingSettingsData);
      console.log("🟣 [FORM LOAD] brandingSettings extracted:", result);
      console.log("🟣 [FORM LOAD] brandingSettings.customProperties:", result?.customProperties);
      return result;
    }, [brandingSettingsData]);

    const localeSettings = useMemo(() => {
      const result = Array.isArray(localeSettingsData) ? undefined : localeSettingsData;
      console.log("🟣 [FORM LOAD] localeSettingsData:", localeSettingsData);
      console.log("🟣 [FORM LOAD] localeSettings extracted:", result);
      console.log("🟣 [FORM LOAD] localeSettings.customProperties:", result?.customProperties);
      return result;
    }, [localeSettingsData]);

    const invoicingSettings = useMemo(() => {
      const result = Array.isArray(invoicingSettingsData) ? undefined : invoicingSettingsData;
      console.log("🟣 [FORM LOAD] invoicingSettingsData:", invoicingSettingsData);
      console.log("🟣 [FORM LOAD] invoicingSettings extracted:", result);
      console.log("🟣 [FORM LOAD] invoicingSettings.customProperties:", result?.customProperties);
      return result;
    }, [invoicingSettingsData]);

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
    taxEnabled: legal?.customProperties?.taxEnabled || false,
    defaultTaxBehavior: legal?.customProperties?.defaultTaxBehavior || "exclusive" as "inclusive" | "exclusive" | "automatic",
    defaultTaxCode: legal?.customProperties?.defaultTaxCode || "",

    // Settings - from ontology (organization_settings with subtypes)
    settings: {
      branding: {
        primaryColor: brandingSettings?.customProperties?.primaryColor || "#6B46C1",
        secondaryColor: brandingSettings?.customProperties?.secondaryColor || "#9F7AEA",
        logo: brandingSettings?.customProperties?.logo || "",
        desktopBackground: brandingSettings?.customProperties?.desktopBackground || "",
      },
      locale: {
        language: localeSettings?.customProperties?.language || "en",
        currency: localeSettings?.customProperties?.currency || "EUR",
        timezone: localeSettings?.customProperties?.timezone || "America/New_York",
        dateFormat: localeSettings?.customProperties?.dateFormat || "DD.MM.YYYY",
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
    console.log("🟣 [FORM LOAD] useEffect triggered");
    console.log("🟣 [FORM LOAD] organization:", !!organization);
    console.log("🟣 [FORM LOAD] isEditing:", isEditing);
    console.log("🟣 [FORM LOAD] brandingSettings:", brandingSettings);
    console.log("🟣 [FORM LOAD] localeSettings:", localeSettings);
    console.log("🟣 [FORM LOAD] invoicingSettings:", invoicingSettings);

    if (organization && !isEditing) {
      console.log("🟣 [FORM LOAD] Updating form data from database...");
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
        taxEnabled: legal?.customProperties?.taxEnabled || false,
        defaultTaxBehavior: legal?.customProperties?.defaultTaxBehavior || "exclusive",
        defaultTaxCode: legal?.customProperties?.defaultTaxCode || "",

        // Settings - from ontology
        settings: {
          branding: {
            primaryColor: brandingSettings?.customProperties?.primaryColor || "#6B46C1",
            secondaryColor: brandingSettings?.customProperties?.secondaryColor || "#9F7AEA",
            logo: brandingSettings?.customProperties?.logo || "",
            desktopBackground: brandingSettings?.customProperties?.desktopBackground || "",
          },
          locale: {
            language: localeSettings?.customProperties?.language || "en",
            currency: localeSettings?.customProperties?.currency || "EUR",
            timezone: localeSettings?.customProperties?.timezone || "America/New_York",
            dateFormat: localeSettings?.customProperties?.dateFormat || "DD.MM.YYYY",
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
        title={t("ui.manage.org.section.basic_info")}
        icon={<Building2 className="w-4 h-4" />}
        collapsible={true}
        defaultCollapsed={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
              {t("ui.manage.org.organization_name")} *
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
              {t("ui.manage.org.business_name")} *
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
              {t("ui.manage.org.slug")}
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
              {t("ui.manage.org.industry")}
            </label>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              readOnly={!isEditing}
              disabled={!canEdit || !isEditing}
              placeholder={t("ui.manage.org.industry_placeholder")}
              className="w-full px-2 py-1 text-sm"
              style={inputStyles}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
              <Calendar className="w-3 h-3 inline mr-1" />
              {t("ui.manage.org.founded_year")}
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
              {t("ui.manage.org.employee_count")}
            </label>
            <select
              value={formData.employeeCount}
              onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })}
              disabled={!canEdit || !isEditing}
              className="w-full px-2 py-1 text-sm"
              style={inputStyles}
            >
              <option value="">{t("ui.manage.org.employee_count_select")}</option>
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
            {t("ui.manage.org.bio")}
          </label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            readOnly={!isEditing}
            disabled={!canEdit || !isEditing}
            rows={3}
            placeholder={t("ui.manage.org.bio_placeholder")}
            className="w-full px-2 py-1 text-sm resize-none"
            style={inputStyles}
          />
        </div>
      </OrganizationSection>

      {/* Contact Information */}
      <OrganizationSection
        title={t("ui.manage.org.section.contact_info")}
        icon={<Mail className="w-4 h-4" />}
        collapsible={true}
        defaultCollapsed={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
              <Mail className="w-3 h-3 inline mr-1" />
              {t("ui.manage.org.primary_contact_email")}
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
              {t("ui.manage.org.billing_email")}
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
              {t("ui.manage.org.support_email")}
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
              {t("ui.manage.org.phone_number")}
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
              {t("ui.manage.org.fax_number")}
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
              {t("ui.manage.org.website")}
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
            {t("ui.manage.org.social_media")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--neutral-gray)' }}>
                {t("ui.manage.org.linkedin")}
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
                {t("ui.manage.org.twitter")}
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
                {t("ui.manage.org.facebook")}
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
                {t("ui.manage.org.instagram")}
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
        title={t("ui.manage.org.section.legal_tax")}
        icon={<Shield className="w-4 h-4" />}
        collapsible={true}
        defaultCollapsed={true}
      >
        {/* Legal Entity Information */}
        <div className="mb-6">
          <p className="text-xs font-semibold mb-3" style={{ color: 'var(--win95-text)' }}>
            Legal Entity
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
                {t("ui.manage.org.tax_id")}
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
                {t("ui.manage.org.vat_number")}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.vatNumber}
                  onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value.toUpperCase() })}
                  readOnly={!isEditing}
                  disabled={!canEdit || !isEditing}
                  placeholder="GB123456789 or DE123456789"
                  className="flex-1 px-2 py-1 text-sm font-mono"
                  style={inputStyles}
                />
                {isEditing && formData.vatNumber && (
                  <button
                    type="button"
                    onClick={async () => {
                      setIsValidatingVAT(true);
                      setVatValidationResult(null);
                      try {
                        const result = await validateVATAction({ vatNumber: formData.vatNumber });
                        setVatValidationResult(result);
                      } catch (error) {
                        setVatValidationResult({
                          valid: false,
                          error: error instanceof Error ? error.message : "Validation failed"
                        });
                      } finally {
                        setIsValidatingVAT(false);
                      }
                    }}
                    disabled={isValidatingVAT}
                    className="retro-button-primary px-2 py-1 text-xs font-semibold whitespace-nowrap"
                    style={{
                      opacity: isValidatingVAT ? 0.6 : 1,
                    }}
                  >
                    {isValidatingVAT ? "Verifying..." : "Verify VAT"}
                  </button>
                )}
              </div>
              {/* VAT Validation Result */}
              {vatValidationResult && (
                <div
                  className="mt-2 p-2 border-2 text-xs"
                  style={{
                    backgroundColor: vatValidationResult.valid ? 'var(--success-bg)' : 'var(--error-bg)',
                    borderColor: vatValidationResult.valid ? 'var(--success)' : 'var(--error)',
                    color: 'var(--win95-text)',
                  }}
                >
                  {vatValidationResult.valid ? (
                    <>
                      <p className="font-semibold" style={{ color: 'var(--success)' }}>
                        ✅ VAT Number Valid
                      </p>
                      {vatValidationResult.name && (
                        <p className="mt-1"><strong>Company:</strong> {vatValidationResult.name}</p>
                      )}
                      {vatValidationResult.address && (
                        <p className="mt-1"><strong>Address:</strong> {vatValidationResult.address}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="font-semibold" style={{ color: 'var(--error)' }}>
                        ❌ VAT Number Invalid
                      </p>
                      {vatValidationResult.error && (
                        <p className="mt-1">{vatValidationResult.error}</p>
                      )}
                    </>
                  )}
                </div>
              )}
              <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                EU VAT format: Country code + number (e.g., DE123456789)
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
                {t("ui.manage.org.company_registration_number")}
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
                {t("ui.manage.org.legal_entity_type")}
              </label>

              {/* Show warning if no tax origin address */}
              {!taxOriginAddress && (
                <div className="mb-2 p-2 border-2 text-xs" style={{
                  backgroundColor: 'var(--warning-bg)',
                  color: 'var(--warning)',
                  borderColor: 'var(--warning)'
                }}>
                  ⚠️ Please add an address and mark it as &quot;tax origin&quot; in the Addresses section above first.
                </div>
              )}

              {/* Show country if tax origin exists */}
              {taxOriginAddress && availableLegalEntities && (
                <div className="mb-1 text-xs" style={{ color: 'var(--neutral-gray)' }}>
                  Country: {availableLegalEntities.countryName} ({availableLegalEntities.country})
                </div>
              )}

              <select
                value={formData.legalEntityType}
                onChange={(e) => setFormData({ ...formData, legalEntityType: e.target.value })}
                disabled={!canEdit || !isEditing || !taxOriginAddress}
                className="w-full px-2 py-1 text-sm"
                style={inputStyles}
              >
                <option value="">
                  {!taxOriginAddress
                    ? "Add tax origin address first"
                    : t("ui.manage.org.legal_entity_type_select")}
                </option>
                {availableLegalEntities?.entities.map((entity) => (
                  <option key={entity.code} value={entity.code} title={entity.description}>
                    {entity.code} - {entity.name}
                    {entity.minShareCapital ? ` (Min: ${entity.minShareCapital})` : ""}
                  </option>
                ))}
              </select>

              {/* Show description for selected entity */}
              {formData.legalEntityType && availableLegalEntities && (
                <div className="mt-2 p-2 text-xs border-2" style={{
                  backgroundColor: 'var(--win95-bg-light)',
                  borderColor: 'var(--win95-border)',
                  color: 'var(--neutral-gray)'
                }}>
                  {(() => {
                    const selectedEntity = availableLegalEntities.entities.find(e => e.code === formData.legalEntityType);
                    if (!selectedEntity) return null;
                    return (
                      <>
                        <strong>{selectedEntity.localName}</strong>
                        <br />
                        {selectedEntity.description}
                        <br />
                        <span style={{ fontSize: '0.65rem' }}>
                          Liability: {selectedEntity.liability} | VAT Eligible: {selectedEntity.vatEligible ? 'Yes' : 'No'}
                          {selectedEntity.minShareCapital && ` | Min Capital: ${selectedEntity.minShareCapital}`}
                        </span>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tax Collection Settings */}
        <div className="border-t-2 pt-4" style={{ borderColor: 'var(--win95-border)' }}>
          <p className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
            <Receipt className="w-3.5 h-3.5" />
            Tax Collection Settings
          </p>
          <div className="space-y-4">
            {/* Enable Tax Collection */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="taxEnabled"
                checked={formData.taxEnabled}
                onChange={(e) => setFormData({ ...formData, taxEnabled: e.target.checked })}
                disabled={!canEdit || !isEditing}
                className="w-4 h-4"
              />
              <label htmlFor="taxEnabled" className="text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
                Enable tax collection for this organization
              </label>
            </div>

            {/* Tax Behavior */}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
                Default Tax Behavior
              </label>
              <select
                value={formData.defaultTaxBehavior}
                onChange={(e) => setFormData({ ...formData, defaultTaxBehavior: e.target.value as "inclusive" | "exclusive" | "automatic" })}
                disabled={!canEdit || !isEditing || !formData.taxEnabled}
                className="w-full px-2 py-1 text-sm"
                style={inputStyles}
              >
                <option value="exclusive">Exclusive (Tax added at checkout)</option>
                <option value="inclusive">Inclusive (Tax included in price)</option>
                <option value="automatic">Automatic (Provider determines)</option>
              </select>
              <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                How tax should be calculated on products by default
              </p>
            </div>

            {/* Default Tax Code */}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
                Default Tax Code
              </label>
              {availableTaxCodes ? (
                <select
                  value={formData.defaultTaxCode}
                  onChange={(e) => setFormData({ ...formData, defaultTaxCode: e.target.value })}
                  disabled={!canEdit || !isEditing || !formData.taxEnabled}
                  className="w-full px-2 py-1 text-sm"
                  style={inputStyles}
                >
                  <option value="">-- No Default (products must specify their own) --</option>
                  <optgroup label={`${availableTaxCodes.flag} ${availableTaxCodes.label}`}>
                    {availableTaxCodes.codes.map((code) => (
                      <option key={code.value} value={code.value}>
                        {code.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
              ) : (
                <div className="w-full px-2 py-1 text-sm" style={inputStyles}>
                  <p className="text-red-600">⚠️ No tax origin address set</p>
                </div>
              )}
              <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                {availableTaxCodes
                  ? `Products without a tax code will use this default (${taxOriginCountry})`
                  : "Set a tax origin address first to select tax codes"
                }
              </p>
            </div>
          </div>
        </div>
      </OrganizationSection>

      {/* Settings & Preferences */}
      <OrganizationSection
        title={t("ui.manage.org.section.settings_preferences")}
        icon={<SettingsIcon className="w-4 h-4" />}
        collapsible={true}
        defaultCollapsed={true}
      >
        <div className="space-y-6">
          {/* Branding */}
          <div>
            <p className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
              <Palette className="w-3.5 h-3.5" />
              {t("ui.manage.org.branding")}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--neutral-gray)' }}>
                  {t("ui.manage.org.primary_color")}
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
                  {t("ui.manage.org.secondary_color")}
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.settings.branding.secondaryColor}
                    onChange={(e) => setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        branding: { ...formData.settings.branding, secondaryColor: e.target.value }
                      }
                    })}
                    disabled={!canEdit || !isEditing}
                    className="h-8 w-16 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.settings.branding.secondaryColor}
                    onChange={(e) => setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        branding: { ...formData.settings.branding, secondaryColor: e.target.value }
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
                  {t("ui.manage.org.logo_url")}
                </label>
                <div className="flex gap-2">
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
                    className="flex-1 px-2 py-1 text-sm"
                    style={inputStyles}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!canEdit || !isEditing) return;
                      openWindow(
                        "media-library-select-logo",
                        "Select Logo",
                        <MediaLibraryWindow
                          selectionMode={true}
                          onSelect={async (media) => {
                            // Get the URL for the selected media
                            const url = media.url || "";
                            setFormData({
                              ...formData,
                              settings: {
                                ...formData.settings,
                                branding: { ...formData.settings.branding, logo: url }
                              }
                            });
                          }}
                        />,
                        { x: 240, y: 160 },
                        { width: 1000, height: 700 }
                      );
                    }}
                    disabled={!canEdit || !isEditing}
                    className="px-3 py-1 text-xs font-bold rounded transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: 'var(--win95-highlight)',
                      color: 'var(--win95-titlebar-text)',
                      border: '2px solid var(--win95-border)',
                    }}
                  >
                    Browse
                  </button>
                </div>
                {formData.settings.branding.logo && (
                  <div className="mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formData.settings.branding.logo}
                      alt="Logo preview"
                      className="h-16 object-contain border-2"
                      style={{ borderColor: 'var(--win95-border)' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--neutral-gray)' }}>
                  Desktop Background
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formData.settings.branding.desktopBackground || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        branding: { ...formData.settings.branding, desktopBackground: e.target.value }
                      }
                    })}
                    readOnly={!isEditing}
                    disabled={!canEdit || !isEditing}
                    placeholder="https://..."
                    className="flex-1 px-2 py-1 text-sm"
                    style={inputStyles}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!canEdit || !isEditing) return;
                      openWindow(
                        "media-library-select-background",
                        "Select Desktop Background",
                        <MediaLibraryWindow
                          selectionMode={true}
                          onSelect={async (media) => {
                            // Get the URL for the selected media
                            const url = media.url || "";
                            setFormData({
                              ...formData,
                              settings: {
                                ...formData.settings,
                                branding: { ...formData.settings.branding, desktopBackground: url }
                              }
                            });
                          }}
                        />,
                        { x: 240, y: 160 },
                        { width: 1000, height: 700 }
                      );
                    }}
                    disabled={!canEdit || !isEditing}
                    className="px-3 py-1 text-xs font-bold rounded transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: 'var(--win95-highlight)',
                      color: 'var(--win95-titlebar-text)',
                      border: '2px solid var(--win95-border)',
                    }}
                  >
                    Browse
                  </button>
                </div>
                {formData.settings.branding.desktopBackground && (
                  <div className="mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formData.settings.branding.desktopBackground}
                      alt="Desktop background preview"
                      className="h-24 w-32 object-cover border-2"
                      style={{ borderColor: 'var(--win95-border)' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Locale */}
          <div>
            <p className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
              <Languages className="w-3.5 h-3.5" />
              {t("ui.manage.org.locale_regional")}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--neutral-gray)' }}>
                  {t("ui.manage.org.language")}
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
                  {t("ui.manage.org.currency")}
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
                  {t("ui.manage.org.timezone")}
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
                  {Object.entries(TIMEZONE_OPTIONS).map(([region, timezones]) => (
                    <optgroup key={region} label={region}>
                      {timezones.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--neutral-gray)' }}>
                  {t("ui.manage.org.date_format")}
                </label>
                <select
                  value={formData.settings.locale.dateFormat}
                  onChange={(e) => setFormData({
                    ...formData,
                    settings: {
                      ...formData.settings,
                      locale: { ...formData.settings.locale, dateFormat: e.target.value }
                    }
                  })}
                  disabled={!canEdit || !isEditing}
                  className="w-full px-2 py-1 text-sm"
                  style={inputStyles}
                >
                  {(() => {
                    // Localized month name examples based on selected language
                    const monthExamples: Record<string, string> = {
                      en: "December",
                      de: "Dezember",
                      fr: "décembre",
                      es: "diciembre",
                      pl: "grudzień",
                      ja: "12月",
                    };
                    const lang = formData.settings.locale.language || "en";
                    const month = monthExamples[lang] || monthExamples.en;

                    return (
                      <>
                        <option value="DD.MM.YYYY">DD.MM.YYYY (31.12.2025)</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2025)</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2025)</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD (2025-12-31)</option>
                        <option value="DD MMMM YYYY">DD MMMM YYYY (31 {month} 2025)</option>
                        <option value="MMMM DD, YYYY">MMMM DD, YYYY ({month} 31, 2025)</option>
                        <option value="DD. MMMM YYYY">DD. MMMM YYYY (31. {month} 2025)</option>
                      </>
                    );
                  })()}
                </select>
              </div>
            </div>
          </div>

          {/* Invoicing Settings Note - Settings moved to Payments window */}
          <div className="p-3 rounded" style={{ background: 'rgba(99, 91, 255, 0.05)', border: '1px solid rgba(99, 91, 255, 0.2)' }}>
            <p className="text-xs flex items-center gap-2" style={{ color: 'var(--win95-highlight)' }}>
              <Receipt className="w-3.5 h-3.5" />
              <span>
                {t("ui.manage.org.invoicing_settings")}: Configure invoice numbering and payment terms in{" "}
                <strong>Payments → Invoicing</strong>
              </span>
            </p>
          </div>
        </div>
      </OrganizationSection>

      {/* Plan & Features (Read-only) */}
      <OrganizationSection
        title={t("ui.manage.org.section.plan_features")}
        icon={<Shield className="w-4 h-4" />}
        collapsible={true}
        defaultCollapsed={true}
      >
        <div className="grid grid-cols-1 gap-4">
          <div
            className="px-4 py-3 text-sm"
            style={{
              backgroundColor: '#FFF9E5',
              color: '#7C6400',
              border: '2px solid #FFEB99',
              borderRadius: '4px'
            }}
          >
            <p className="font-semibold mb-2">📊 Plan information available in header</p>
            <p className="text-xs">
              Your current plan tier is displayed in the organization badge at the top of this window.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
              {t("ui.manage.org.workspace_type")}
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
              {organization.isPersonalWorkspace ? t("ui.manage.org.workspace_personal") : t("ui.manage.org.workspace_team")}
            </div>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--win95-text)' }}>
              {t("ui.manage.org.enabled_features")}
            </label>
            <div className="flex flex-wrap gap-2">
              {/* Features temporarily hidden - moved to ontology */}
              {false && (
                <span
                  className="px-2 py-1 text-xs font-semibold"
                  style={{
                    backgroundColor: 'var(--success)',
                    color: 'var(--win95-bg-light)',
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
                    color: 'var(--win95-bg-light)',
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
                    color: 'var(--win95-bg-light)',
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
                  {t("ui.manage.org.no_features")}
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
