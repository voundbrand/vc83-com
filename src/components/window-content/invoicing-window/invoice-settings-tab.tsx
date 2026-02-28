"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useNotification } from "@/hooks/use-notification";
import { useWindowManager } from "@/hooks/use-window-manager";
import {
  Settings,
  Hash,
  Calendar,
  Save,
  Loader2,
  Info,
  FileText,
  Building2,
  MapPin,
  Mail,
  CreditCard,
  Image,
  Receipt,
  AlertTriangle,
} from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
// Dynamic require avoids TS2589 deep type instantiation from generated API type expansion.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api: apiAny } = require("../../../../convex/_generated/api") as { api: any };

/**
 * Invoice Settings Tab
 *
 * Shows a preview of what appears on invoices and allows editing invoice-specific settings:
 * - Business Profile Preview (read-only, links to Manage Organization)
 * - Invoice numbering (editable: prefix, next number)
 * - Default payment terms (editable)
 *
 * Business info is managed in Manage Organization - this tab provides easy navigation.
 */
export function InvoiceSettingsTab() {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.invoicing_window");
  const tx = (
    key: string,
    fallback: string,
    params?: Record<string, string | number>
  ): string => {
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  };
  const notification = useNotification();
  const { openWindow } = useWindowManager();

  // Form state - Invoice Numbering
  const [isSaving, setIsSaving] = useState(false);
  const [invoicePrefix, setInvoicePrefix] = useState("INV");
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(1);
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState("net_30");
  const [isEditingInvoiceNumber, setIsEditingInvoiceNumber] = useState(false);

  // Display state - Business Profile (read-only, for preview)
  const [companyName, setCompanyName] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [taxId, setTaxId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  // Display state - Business Address (read-only, from tax origin)
  const [street, setStreet] = useState("");
  const [street2, setStreet2] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");

  // ============================================================================
  // QUERIES - Load from SAME sources as Manage Organization
  // ============================================================================

  // Get organization contact info (phone, email, website) - SAME as Manage Org
  const contactInfo = useQuery(
    apiAny.organizationOntology.getOrganizationContact,
    currentOrg ? { organizationId: currentOrg.id as Id<"organizations"> } : "skip"
  );

  // Get organization legal info (VAT, tax ID) - SAME as Manage Org
  const legalInfo = useQuery(
    apiAny.organizationOntology.getOrganizationLegal,
    currentOrg ? { organizationId: currentOrg.id as Id<"organizations"> } : "skip"
  );

  // Get organization branding (logo) - SAME as Manage Org
  const brandingSettings = useQuery(
    apiAny.organizationOntology.getOrganizationSettings,
    currentOrg
      ? {
          organizationId: currentOrg.id as Id<"organizations">,
          subtype: "branding",
        }
      : "skip"
  );

  // Get organization invoicing settings (prefix, next number, terms)
  const invoicingSettings = useQuery(
    apiAny.organizationOntology.getOrganizationSettings,
    currentOrg
      ? {
          organizationId: currentOrg.id as Id<"organizations">,
          subtype: "invoicing",
        }
      : "skip"
  );

  // Get the ACTUAL current invoice counter (what will be used for next invoice)
  const currentCounter = useQuery(
    apiAny.organizationOntology.getCurrentInvoiceCounter,
    currentOrg ? { organizationId: currentOrg.id as Id<"organizations"> } : "skip"
  );

  // Get organization addresses to find tax origin address
  const addresses = useQuery(
    apiAny.organizationOntology.getOrganizationAddresses,
    currentOrg ? { organizationId: currentOrg.id as Id<"organizations"> } : "skip"
  );

  // Find the tax origin address
  const taxOriginAddress = addresses?.find(
    (addr: { customProperties?: { isTaxOrigin?: boolean } }) =>
      (addr.customProperties as { isTaxOrigin?: boolean })?.isTaxOrigin
  );

  // ============================================================================
  // MUTATIONS - Only for invoice-specific settings
  // ============================================================================

  const updateSettings = useMutation(apiAny.organizationOntology.updateOrganizationSettings);

  // ============================================================================
  // POPULATE FORM FROM EXISTING DATA
  // ============================================================================

  // Populate from organization (company name from currentOrg)
  useEffect(() => {
    if (currentOrg) {
      setCompanyName(currentOrg.name || "");
    }
  }, [currentOrg]);

  // Populate from contact info
  useEffect(() => {
    if (contactInfo) {
      const props = contactInfo.customProperties as {
        contactPhone?: string;
        contactEmail?: string;
        billingEmail?: string;
        website?: string;
      } | undefined;
      if (props?.contactPhone) setPhone(props.contactPhone);
      if (props?.contactEmail) setEmail(props.contactEmail);
      if (props?.billingEmail) setBillingEmail(props.billingEmail);
      if (props?.website) setWebsite(props.website);
    }
  }, [contactInfo]);

  // Populate from legal info
  useEffect(() => {
    if (legalInfo) {
      const props = legalInfo.customProperties as {
        vatNumber?: string;
        taxId?: string;
      } | undefined;
      if (props?.vatNumber) setVatNumber(props.vatNumber);
      if (props?.taxId) setTaxId(props.taxId);
    }
  }, [legalInfo]);

  // Populate logo from branding settings
  useEffect(() => {
    if (brandingSettings && !Array.isArray(brandingSettings)) {
      const props = brandingSettings.customProperties as {
        logo?: string;
      } | undefined;
      if (props?.logo) setLogoUrl(props.logo);
    }
  }, [brandingSettings]);

  // Populate from invoicing settings
  useEffect(() => {
    if (invoicingSettings && !Array.isArray(invoicingSettings)) {
      const props = invoicingSettings.customProperties as {
        prefix?: string;
        nextNumber?: number;
        defaultTerms?: string;
      } | undefined;
      // Strip trailing hyphens from prefix (legacy data cleanup)
      if (props?.prefix) setInvoicePrefix(props.prefix.replace(/-+$/, ''));
      if (props?.defaultTerms) {
        // Normalize payment terms to match dropdown values (e.g., "Net 30" → "net_30")
        // Handle legacy formats: "Net 30" (space), "net30" (no underscore), "net_30" (correct)
        const normalized = props.defaultTerms
          .toLowerCase()
          .replace(/\s+/g, "_") // "Net 30" → "net_30"
          .replace(/^(net)(\d+)$/, "$1_$2"); // "net30" → "net_30"
        setDefaultPaymentTerms(normalized);
      }
    }
  }, [invoicingSettings]);

  // Update next invoice number from current counter (real-time)
  useEffect(() => {
    if (currentCounter) {
      setNextInvoiceNumber(currentCounter.nextNumber);
    }
  }, [currentCounter]);

  // Populate from tax origin address
  useEffect(() => {
    if (taxOriginAddress) {
      const props = taxOriginAddress.customProperties as {
        addressLine1?: string;
        addressLine2?: string;
        city?: string;
        postalCode?: string;
        country?: string;
      } | undefined;
      if (props?.addressLine1) setStreet(props.addressLine1);
      if (props?.addressLine2) setStreet2(props.addressLine2);
      if (props?.city) setCity(props.city);
      if (props?.postalCode) setPostalCode(props.postalCode);
      if (props?.country) setCountry(props.country);
    }
  }, [taxOriginAddress]);

  // ============================================================================
  // SAVE - Invoice-specific settings only
  // ============================================================================

  const handleSave = async () => {
    if (!sessionId || !currentOrg) return;

    setIsSaving(true);
    try {
      // Save only invoice-specific settings (prefix, next number, terms)
      // Strip trailing hyphens from prefix to ensure clean format
      await updateSettings({
        sessionId,
        organizationId: currentOrg.id as Id<"organizations">,
        subtype: "invoicing",
        settings: {
          prefix: invoicePrefix.replace(/-+$/, ''),
          nextNumber: nextInvoiceNumber,
          defaultTerms: defaultPaymentTerms,
        },
      });

      notification.success(
        tx("ui.invoicing_window.invoice_settings.notifications.save_success_title", "Invoice Settings Saved"),
        tx(
          "ui.invoicing_window.invoice_settings.notifications.save_success_message",
          "Invoice numbering and payment terms updated successfully.",
        )
      );
    } catch (error) {
      console.error("Failed to save invoice settings:", error);
      notification.error(
        tx("ui.invoicing_window.invoice_settings.notifications.save_failed_title", "Save Failed"),
        error instanceof Error
          ? error.message
          : tx(
              "ui.invoicing_window.invoice_settings.notifications.save_failed_message",
              "Failed to save settings",
            )
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (translationsLoading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Loader2 className="animate-spin" size={24} style={{ color: "var(--tone-accent)" }} />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
      {/* Header */}
      <div>
        <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
          <Settings size={16} />
          {tx("ui.invoicing_window.invoice_settings.header.title", "Invoice Settings")}
        </h3>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          {tx(
            "ui.invoicing_window.invoice_settings.header.subtitle",
            "Configure business profile and default settings for all invoices. These settings appear on your invoice PDFs and emails.",
          )}
        </p>
      </div>

      {/* What's Used on Invoices Info */}
      <div
        className="p-3 rounded border-2 flex items-start gap-3"
        style={{
          borderColor: "var(--tone-accent)",
          background: "rgba(99, 91, 255, 0.05)",
        }}
      >
        <Receipt size={16} className="flex-shrink-0 mt-0.5" style={{ color: "var(--tone-accent)" }} />
        <div>
          <h5 className="text-xs font-bold mb-1" style={{ color: "var(--tone-accent)" }}>
            {tx("ui.invoicing_window.invoice_settings.appears_on_invoice.title", "What Appears on Your Invoices")}
          </h5>
          <div className="grid grid-cols-2 gap-x-4 text-[11px]" style={{ color: "var(--neutral-gray)" }}>
            <div>
              <p className="font-semibold" style={{ color: "var(--window-document-text)" }}>
                {tx("ui.invoicing_window.invoice_settings.appears_on_invoice.header", "Header:")}
              </p>
              <ul className="space-y-0.5 ml-2">
                <li>{tx("ui.invoicing_window.invoice_settings.appears_on_invoice.header_logo", "• Company logo")}</li>
                <li>{tx("ui.invoicing_window.invoice_settings.appears_on_invoice.header_name", "• Company name")}</li>
                <li>{tx("ui.invoicing_window.invoice_settings.appears_on_invoice.header_address", "• Business address")}</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold" style={{ color: "var(--window-document-text)" }}>
                {tx("ui.invoicing_window.invoice_settings.appears_on_invoice.footer", "Footer:")}
              </p>
              <ul className="space-y-0.5 ml-2">
                <li>{tx("ui.invoicing_window.invoice_settings.appears_on_invoice.footer_phone", "• Phone & email")}</li>
                <li>{tx("ui.invoicing_window.invoice_settings.appears_on_invoice.footer_tax_id", "• VAT/Tax ID")}</li>
                <li>{tx("ui.invoicing_window.invoice_settings.appears_on_invoice.footer_terms", "• Payment terms")}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Shared Settings Note */}
      <div
        className="p-3 rounded border-2 flex items-start gap-3"
        style={{
          borderColor: "var(--warning)",
          background: "rgba(234, 179, 8, 0.05)",
        }}
      >
        <Info size={16} className="flex-shrink-0 mt-0.5" style={{ color: "var(--warning)" }} />
        <div>
          <h5 className="text-xs font-bold mb-1" style={{ color: "var(--warning)" }}>
            {tx("ui.invoicing_window.invoice_settings.shared.title", "Shared with Manage Organization")}
          </h5>
          <p className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>
            {tx("ui.invoicing_window.invoice_settings.shared.text_prefix", "These settings are the same as in")}{" "}
            <strong>{tx("ui.invoicing_window.invoice_settings.shared.manage_org", "Manage Organization")}</strong>
            {tx(
              "ui.invoicing_window.invoice_settings.shared.text_suffix",
              ". Changes made here will be reflected there too, and vice versa.",
            )}
          </p>
        </div>
      </div>

      {/* Business Profile Section - Read-only Preview */}
      <div
        className="p-4 rounded border-2"
        style={{
          background: "var(--window-document-bg-elevated)",
          borderColor: "var(--window-document-border)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 size={16} style={{ color: "var(--tone-accent)" }} />
            <h4 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
              {tx("ui.invoicing_window.invoice_settings.business_profile.title", "Business Profile Preview")}
            </h4>
          </div>
          <span className="text-[10px] px-2 py-1 rounded" style={{ background: "var(--tone-accent)", color: "white" }}>
            {tx("ui.invoicing_window.invoice_settings.business_profile.read_only", "Read-only")}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Logo - Read-only with button */}
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
                <Image size={12} />
                {tx("ui.invoicing_window.invoice_settings.business_profile.company_logo", "Company Logo")}
              </label>
              <button
                onClick={() => openWindow("manage", "Manage", undefined, undefined, undefined, "ui.windows.manage.title", undefined, { activeTab: "branding" })}
                className="text-[10px] px-2 py-1 rounded hover:opacity-80"
                style={{ background: "var(--tone-accent)", color: "white" }}
              >
                {tx("ui.invoicing_window.invoice_settings.business_profile.edit_manage_org", "Edit in Manage Org")}
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div
                className="w-24 h-24 rounded border-2 flex items-center justify-center overflow-hidden"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg)",
                }}
              >
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt={tx("ui.invoicing_window.invoice_settings.business_profile.company_logo", "Company Logo")}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <Image size={32} className="mx-auto mb-1" style={{ color: "var(--neutral-gray)" }} />
                    <p className="text-[9px]" style={{ color: "var(--neutral-gray)" }}>
                      {tx("ui.invoicing_window.invoice_settings.business_profile.no_logo", "No logo set")}
                    </p>
                  </div>
                )}
              </div>
              {logoUrl && (
                <div className="flex-1">
                  <p className="text-[10px] font-mono truncate" style={{ color: "var(--neutral-gray)" }}>
                    {logoUrl}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Company Name */}
          <div>
            <label className="flex items-center gap-1 text-xs font-semibold mb-2" style={{ color: "var(--window-document-text)" }}>
              <Building2 size={12} />
              {tx("ui.invoicing_window.invoice_settings.business_profile.company_name", "Company Name")}
            </label>
            <p className="text-sm px-3 py-2 rounded border-2" style={{ background: "var(--window-document-bg)", borderColor: "var(--window-document-border)", color: "var(--window-document-text)", minHeight: "38px", display: "flex", alignItems: "center" }}>
              {companyName || (
                <span style={{ color: "var(--neutral-gray)" }}>
                  {tx("ui.invoicing_window.invoice_settings.business_profile.not_set", "Not set")}
                </span>
              )}
            </p>
          </div>

          {/* Legal Info - VAT & Tax ID with button */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
                <CreditCard size={12} />
                {tx("ui.invoicing_window.invoice_settings.business_profile.vat_tax_id", "VAT & Tax ID")}
              </label>
              <button
                onClick={() => openWindow("manage", "Manage", undefined, undefined, undefined, "ui.windows.manage.title", undefined, { activeTab: "legal_info" })}
                className="text-[10px] px-2 py-1 rounded hover:opacity-80"
                style={{ background: "var(--tone-accent)", color: "white" }}
              >
                {tx("ui.invoicing_window.invoice_settings.business_profile.edit_manage_org", "Edit in Manage Org")}
              </button>
            </div>
            <p className="text-sm px-3 py-2 rounded border-2 font-mono" style={{ background: "var(--window-document-bg)", borderColor: "var(--window-document-border)", color: "var(--window-document-text)", minHeight: "38px", display: "flex", alignItems: "center" }}>
              {vatNumber || taxId ? (
                <>
                  {vatNumber && (
                    <span>
                      {tx("ui.invoicing_window.invoice_settings.business_profile.vat_prefix", "VAT:")} {vatNumber}
                    </span>
                  )}
                  {vatNumber && taxId && <span className="mx-2">|</span>}
                  {taxId && (
                    <span>
                      {tx("ui.invoicing_window.invoice_settings.business_profile.tax_prefix", "Tax:")} {taxId}
                    </span>
                  )}
                </>
              ) : (
                <span style={{ color: "var(--neutral-gray)" }}>
                  {tx("ui.invoicing_window.invoice_settings.business_profile.not_set", "Not set")}
                </span>
              )}
            </p>
          </div>

          {/* Contact Info with button */}
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
                <Mail size={12} />
                {tx("ui.invoicing_window.invoice_settings.business_profile.contact_information", "Contact Information")}
              </label>
              <button
                onClick={() => openWindow("manage", "Manage", undefined, undefined, undefined, "ui.windows.manage.title", undefined, { activeTab: "contact_info" })}
                className="text-[10px] px-2 py-1 rounded hover:opacity-80"
                style={{ background: "var(--tone-accent)", color: "white" }}
              >
                {tx("ui.invoicing_window.invoice_settings.business_profile.edit_manage_org", "Edit in Manage Org")}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] mb-1" style={{ color: "var(--neutral-gray)" }}>
                  {tx("ui.invoicing_window.invoice_settings.business_profile.contact_email", "Contact Email:")}
                </p>
                <p className="text-xs px-2 py-1 rounded border" style={{ background: "var(--window-document-bg)", borderColor: "var(--window-document-border)", color: "var(--window-document-text)" }}>
                  {email || (
                    <span style={{ color: "var(--neutral-gray)" }}>
                      {tx("ui.invoicing_window.invoice_settings.business_profile.not_set", "Not set")}
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-[10px] mb-1" style={{ color: "var(--neutral-gray)" }}>
                  {tx("ui.invoicing_window.invoice_settings.business_profile.billing_email", "Billing Email:")}
                </p>
                <p className="text-xs px-2 py-1 rounded border" style={{ background: "var(--window-document-bg)", borderColor: "var(--window-document-border)", color: "var(--window-document-text)" }}>
                  {billingEmail || (
                    <span style={{ color: "var(--neutral-gray)" }}>
                      {tx("ui.invoicing_window.invoice_settings.business_profile.not_set", "Not set")}
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-[10px] mb-1" style={{ color: "var(--neutral-gray)" }}>
                  {tx("ui.invoicing_window.invoice_settings.business_profile.phone", "Phone:")}
                </p>
                <p className="text-xs px-2 py-1 rounded border" style={{ background: "var(--window-document-bg)", borderColor: "var(--window-document-border)", color: "var(--window-document-text)" }}>
                  {phone || (
                    <span style={{ color: "var(--neutral-gray)" }}>
                      {tx("ui.invoicing_window.invoice_settings.business_profile.not_set", "Not set")}
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-[10px] mb-1" style={{ color: "var(--neutral-gray)" }}>
                  {tx("ui.invoicing_window.invoice_settings.business_profile.website", "Website:")}
                </p>
                <p className="text-xs px-2 py-1 rounded border truncate" style={{ background: "var(--window-document-bg)", borderColor: "var(--window-document-border)", color: "var(--window-document-text)" }}>
                  {website || (
                    <span style={{ color: "var(--neutral-gray)" }}>
                      {tx("ui.invoicing_window.invoice_settings.business_profile.not_set", "Not set")}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Business Address Section */}
      <div
        className="p-4 rounded border-2"
        style={{
          background: "var(--window-document-bg-elevated)",
          borderColor: "var(--window-document-border)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin size={16} style={{ color: "var(--tone-accent)" }} />
            <h4 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
              {tx("ui.invoicing_window.invoice_settings.business_address.title", "Business Address")}
            </h4>
          </div>
          {!taxOriginAddress && (
            <span
              className="text-[10px] px-2 py-1 rounded flex items-center gap-1"
              style={{ background: "var(--warning)", color: "white" }}
            >
              <AlertTriangle size={10} />
              {tx("ui.invoicing_window.invoice_settings.business_address.no_tax_origin_set", "No tax origin set")}
            </span>
          )}
        </div>

        {taxOriginAddress ? (
          <div className="space-y-3">
            {/* Display current tax origin address (read-only here) */}
            <div
              className="p-3 rounded border-2"
              style={{
                background: "var(--window-document-bg)",
                borderColor: "var(--window-document-border)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--window-document-text)" }}>
                {street}
                {street2 && <><br />{street2}</>}
                <br />
                {postalCode} {city}
                {country && <><br />{country}</>}
              </p>
            </div>
            <p className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
              {tx("ui.invoicing_window.invoice_settings.business_address.tax_origin_intro", "This is your")}{" "}
              <strong>{tx("ui.invoicing_window.invoice_settings.business_address.tax_origin_label", "Tax Origin Address")}</strong>
              {tx("ui.invoicing_window.invoice_settings.business_address.tax_origin_change", ". To change it,")}{" "}
              <button
                onClick={() => {
                  openWindow(
                    "manage",
                    "Manage",
                    undefined,
                    undefined,
                    undefined,
                    "ui.windows.manage.title",
                    undefined,
                    { activeTab: "addresses" }
                  );
                }}
                className="font-bold hover:underline"
                style={{ color: "var(--tone-accent)" }}
              >
                {tx("ui.invoicing_window.invoice_settings.business_address.open_manage_addresses", "open Manage Organization → Addresses")}
              </button>{" "}
              {tx("ui.invoicing_window.invoice_settings.business_address.mark_different", "and mark a different address as tax origin.")}
            </p>
          </div>
        ) : (
          <div
            className="p-4 rounded border-2 text-center"
            style={{
              background: "rgba(234, 179, 8, 0.05)",
              borderColor: "var(--warning)",
            }}
          >
            <AlertTriangle size={24} className="mx-auto mb-2" style={{ color: "var(--warning)" }} />
            <p className="text-xs font-semibold mb-1" style={{ color: "var(--warning)" }}>
              {tx("ui.invoicing_window.invoice_settings.business_address.no_tax_origin_title", "No Tax Origin Address Set")}
            </p>
            <p className="text-[11px] mb-3" style={{ color: "var(--neutral-gray)" }}>
              {tx(
                "ui.invoicing_window.invoice_settings.business_address.no_tax_origin_message",
                "Your business address will not appear on invoices until you set a tax origin address.",
              )}
            </p>
            <button
              onClick={() => {
                openWindow(
                  "manage",
                  "Manage",
                  undefined,
                  undefined,
                  undefined,
                  "ui.windows.manage.title",
                  undefined,
                  { activeTab: "addresses" }
                );
              }}
              className="px-4 py-2 text-xs font-bold rounded hover:opacity-90 transition-opacity"
              style={{
                background: "var(--tone-accent)",
                color: "var(--window-document-text)",
                border: "2px solid var(--window-document-border)",
              }}
            >
              {tx("ui.invoicing_window.invoice_settings.business_address.set_tax_origin_button", "Set Tax Origin Address")}
            </button>
          </div>
        )}
      </div>

      {/* Invoice Numbering Section */}
      <div
        className="p-4 rounded border-2"
        style={{
          background: "var(--window-document-bg-elevated)",
          borderColor: "var(--window-document-border)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Hash size={16} style={{ color: "var(--tone-accent)" }} />
            <h4 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
              {tx("ui.invoicing_window.invoice_settings.numbering.title", "Invoice Numbering")}
            </h4>
          </div>
        </div>

        {/* Sequential Numbering Info */}
        <div
          className="p-3 mb-4 rounded border-2 flex items-start gap-3"
          style={{
            borderColor: "var(--tone-accent)",
            background: "rgba(99, 91, 255, 0.05)",
          }}
        >
          <Info size={14} className="flex-shrink-0 mt-0.5" style={{ color: "var(--tone-accent)" }} />
          <div>
            <h5 className="text-xs font-bold mb-1" style={{ color: "var(--tone-accent)" }}>
              {tx("ui.invoicing_window.invoice_settings.numbering.sequential_title", "Sequential Numbering (Stripe Compatible)")}
            </h5>
            <p className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
              {tx(
                "ui.invoicing_window.invoice_settings.numbering.sequential_description",
                "Invoices are numbered sequentially (e.g., {{current}}, {{next}}, {{next2}}...). This ensures gap-free numbering required for legal compliance and Stripe invoicing integration.",
                {
                  current: `${invoicePrefix || "INV"}-${String(nextInvoiceNumber).padStart(4, "0")}`,
                  next: `${invoicePrefix || "INV"}-${String(nextInvoiceNumber + 1).padStart(4, "0")}`,
                  next2: `${invoicePrefix || "INV"}-${String(nextInvoiceNumber + 2).padStart(4, "0")}`,
                },
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Invoice Prefix */}
          <div>
            <label className="flex items-center gap-1 text-xs font-semibold mb-2" style={{ color: "var(--window-document-text)" }}>
              <FileText size={12} />
              {tx("ui.invoicing_window.invoice_settings.numbering.invoice_prefix", "Invoice Prefix")}
            </label>
            <input
              type="text"
              value={invoicePrefix}
              onChange={(e) => setInvoicePrefix(e.target.value)}
              placeholder={tx("ui.invoicing_window.invoice_settings.numbering.prefix_placeholder", "INV")}
              className="w-full px-3 py-2 text-sm font-mono rounded border-2"
              style={{
                background: "var(--window-document-bg)",
                borderColor: "var(--window-document-border)",
                color: "var(--window-document-text)",
              }}
            />
            <p className="text-[10px] mt-1" style={{ color: "var(--neutral-gray)" }}>
              {tx(
                "ui.invoicing_window.invoice_settings.numbering.prefix_help",
                "Prefix for all invoices (e.g., INV, INVOICE, INV-2025 to include year).",
              )}
            </p>
          </div>

          {/* Next Invoice Number */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
                <Hash size={12} />
                {tx("ui.invoicing_window.invoice_settings.numbering.next_invoice_number", "Next Invoice Number")}
              </label>
              {!isEditingInvoiceNumber ? (
                <button
                  onClick={() => setIsEditingInvoiceNumber(true)}
                  className="text-[10px] px-2 py-1 rounded hover:opacity-80"
                  style={{ background: "var(--warning)", color: "white" }}
                >
                  {tx("ui.invoicing_window.invoice_settings.numbering.edit_number", "Edit Number")}
                </button>
              ) : (
                <button
                  onClick={() => setIsEditingInvoiceNumber(false)}
                  className="text-[10px] px-2 py-1 rounded hover:opacity-80"
                  style={{ background: "var(--window-document-border)", color: "var(--window-document-text)" }}
                >
                  {tx("ui.invoicing_window.invoice_settings.numbering.cancel_edit", "Cancel Edit")}
                </button>
              )}
            </div>

            {isEditingInvoiceNumber && (
              <div
                className="p-2 mb-2 rounded border-2 flex items-start gap-2"
                style={{
                  borderColor: "var(--warning)",
                  background: "rgba(234, 179, 8, 0.05)",
                }}
              >
                <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--warning)" }} />
                <p className="text-[9px]" style={{ color: "var(--warning)" }}>
                  <strong>{tx("ui.invoicing_window.invoice_settings.numbering.warning_label", "Warning:")}</strong>{" "}
                  {tx(
                    "ui.invoicing_window.invoice_settings.numbering.warning_message",
                    "Changing this number can create duplicate invoice numbers or gaps in your sequence. Only change if you're migrating from another system or correcting an error.",
                  )}
                </p>
              </div>
            )}

            <input
              type="number"
              value={nextInvoiceNumber}
              onChange={(e) => setNextInvoiceNumber(parseInt(e.target.value) || 1)}
              disabled={!isEditingInvoiceNumber}
              min="1"
              className="w-full px-3 py-2 text-sm rounded border-2"
              style={{
                background: isEditingInvoiceNumber ? "var(--window-document-bg)" : "var(--window-document-bg-elevated)",
                borderColor: isEditingInvoiceNumber ? "var(--warning)" : "var(--window-document-border)",
                color: isEditingInvoiceNumber ? "var(--window-document-text)" : "var(--neutral-gray)",
                cursor: isEditingInvoiceNumber ? "text" : "not-allowed",
              }}
            />
            <p className="text-[10px] mt-1" style={{ color: "var(--neutral-gray)" }}>
              {tx("ui.invoicing_window.invoice_settings.numbering.next_invoice_label", "Next invoice:")}{" "}
              <strong className="font-mono">{invoicePrefix}-{String(nextInvoiceNumber).padStart(4, "0")}</strong>
              {currentCounter && currentCounter.nextNumber > 1 && (
                <span className="ml-2 text-[9px]" style={{ color: "var(--tone-accent)" }}>
                  {tx(
                    "ui.invoicing_window.invoice_settings.numbering.existing_count",
                    "(based on {{count}} existing {{label}})",
                    {
                      count: currentCounter.nextNumber - 1,
                      label:
                        currentCounter.nextNumber - 1 === 1
                          ? tx("ui.invoicing_window.invoice_settings.numbering.invoice_singular", "invoice")
                          : tx("ui.invoicing_window.invoice_settings.numbering.invoice_plural", "invoices"),
                    },
                  )}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Payment Terms Section */}
      <div
        className="p-4 rounded border-2"
        style={{
          background: "var(--window-document-bg-elevated)",
          borderColor: "var(--window-document-border)",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={16} style={{ color: "var(--tone-accent)" }} />
          <h4 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
            {tx("ui.invoicing_window.invoice_settings.payment_terms.title", "Payment Terms")}
          </h4>
        </div>

        <div>
          <label className="flex items-center gap-1 text-xs font-semibold mb-2" style={{ color: "var(--window-document-text)" }}>
            {tx("ui.invoicing_window.invoice_settings.payment_terms.default_label", "Default Payment Terms")}
          </label>
          <select
            value={defaultPaymentTerms}
            onChange={(e) => setDefaultPaymentTerms(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded border-2"
            style={{
              background: "var(--window-document-bg)",
              borderColor: "var(--window-document-border)",
              color: "var(--window-document-text)",
            }}
          >
            <option value="due_on_receipt">
              {tx("ui.invoicing_window.invoice_settings.payment_terms.due_on_receipt", "Due on Receipt")}
            </option>
            <option value="net_7">
              {tx("ui.invoicing_window.invoice_settings.payment_terms.net_7", "Net 7 (7 days)")}
            </option>
            <option value="net_15">
              {tx("ui.invoicing_window.invoice_settings.payment_terms.net_15", "Net 15 (15 days)")}
            </option>
            <option value="net_30">
              {tx("ui.invoicing_window.invoice_settings.payment_terms.net_30", "Net 30 (30 days)")}
            </option>
            <option value="net_60">
              {tx("ui.invoicing_window.invoice_settings.payment_terms.net_60", "Net 60 (60 days)")}
            </option>
            <option value="net_90">
              {tx("ui.invoicing_window.invoice_settings.payment_terms.net_90", "Net 90 (90 days)")}
            </option>
          </select>
          <p className="text-[10px] mt-1" style={{ color: "var(--neutral-gray)" }}>
            {tx(
              "ui.invoicing_window.invoice_settings.payment_terms.help",
              "Default payment terms applied to new invoices. Can be overridden when creating individual invoices.",
            )}
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div
        className="p-3 rounded border-2 flex items-start gap-3"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--window-document-bg-elevated)",
        }}
      >
        <Info size={16} className="flex-shrink-0 mt-0.5" style={{ color: "var(--neutral-gray)" }} />
        <div>
          <h5 className="text-xs font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
            {tx("ui.invoicing_window.invoice_settings.source_of_truth.title", "Single Source of Truth")}
          </h5>
          <p className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>
            {tx(
              "ui.invoicing_window.invoice_settings.source_of_truth.description",
              "These settings are used as defaults for all invoice creation flows:",
            )}
          </p>
          <ul className="text-[11px] mt-1 space-y-0.5" style={{ color: "var(--neutral-gray)" }}>
            <li>{tx("ui.invoicing_window.invoice_settings.source_of_truth.checkout", "• Checkout payments (invoice payment method)")}</li>
            <li>{tx("ui.invoicing_window.invoice_settings.source_of_truth.manual", "• Manual invoice creation")}</li>
            <li>{tx("ui.invoicing_window.invoice_settings.source_of_truth.b2b", "• B2B consolidated invoices")}</li>
            <li>{tx("ui.invoicing_window.invoice_settings.source_of_truth.draft", "• Draft invoices from transactions")}</li>
          </ul>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end sticky bottom-0 pt-4 pb-2" style={{ background: "var(--window-document-bg)" }}>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2 text-sm font-bold rounded hover:opacity-90 transition-opacity"
          style={{
            background: "var(--tone-accent)",
            color: "var(--window-document-text)",
            border: "2px solid var(--window-document-border)",
            opacity: isSaving ? 0.6 : 1,
          }}
        >
          {isSaving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          {isSaving
            ? tx("ui.invoicing_window.invoice_settings.save.saving", "Saving...")
            : tx("ui.invoicing_window.invoice_settings.save.button", "Save Settings")}
        </button>
      </div>
    </div>
  );
}
