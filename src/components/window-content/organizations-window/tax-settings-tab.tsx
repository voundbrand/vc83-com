"use client";

/**
 * TAX SETTINGS TAB
 *
 * Organization tax configuration UI.
 * Allows organizations to:
 * - Enable/disable tax collection
 * - Set default tax behavior (inclusive/exclusive/automatic)
 * - Configure origin address for tax nexus
 * - Manage tax registrations by jurisdiction
 * - Configure Stripe Tax integration
 */

import { useState, useEffect } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Save, AlertCircle, Plus, Trash2, DollarSign, CheckCircle, XCircle, Loader } from "lucide-react";
import {
  getLegalEntitiesForCountry,
  getSupportedCountries,
  type LegalEntityType,
} from "../../../../convex/legalEntityTypes";

interface TaxSettingsTabProps {
  sessionId: string;
  organizationId: Id<"organizations">;
}

export function TaxSettingsTab({ sessionId, organizationId }: TaxSettingsTabProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load current tax settings
  const taxSettings = useQuery(api.organizationTaxSettings.getTaxSettings, {
    sessionId,
    organizationId,
  });

  const taxRegistrations = useQuery(api.organizationTaxSettings.getTaxRegistrations, {
    sessionId,
    organizationId,
    active: true,
  });

  // Load addresses to find tax origin address
  const addresses = useQuery(api.organizationOntology.getOrganizationAddresses, {
    organizationId,
  });

  // Find the tax origin address
  const taxOriginAddress = addresses?.find(
    (addr) => (addr.customProperties as { isTaxOrigin?: boolean })?.isTaxOrigin
  );

  // Get country from tax origin address
  const taxOriginCountry = taxOriginAddress
    ? (taxOriginAddress.customProperties as { country?: string })?.country
    : null;

  // Mutations
  const updateTaxSettings = useMutation(api.organizationTaxSettings.updateTaxSettings);
  const deleteTaxRegistration = useMutation(api.organizationTaxSettings.deleteTaxRegistration);

  // VAT validation
  const validateVAT = useAction(api.vatValidation.validateVATNumber);
  const [vatValidation, setVatValidation] = useState<{
    status: "idle" | "validating" | "valid" | "invalid";
    message?: string;
  }>({ status: "idle" });

  // Form state
  const [formData, setFormData] = useState({
    taxEnabled: taxSettings?.customProperties?.taxEnabled ?? false,
    defaultTaxBehavior: taxSettings?.customProperties?.defaultTaxBehavior ?? "exclusive",
    defaultTaxCode: taxSettings?.customProperties?.defaultTaxCode ?? "",
    originAddress: {
      addressLine1: taxSettings?.customProperties?.originAddress?.addressLine1 ?? "",
      addressLine2: taxSettings?.customProperties?.originAddress?.addressLine2 ?? "",
      city: taxSettings?.customProperties?.originAddress?.city ?? "",
      state: taxSettings?.customProperties?.originAddress?.state ?? "",
      postalCode: taxSettings?.customProperties?.originAddress?.postalCode ?? "",
      country: taxSettings?.customProperties?.originAddress?.country ?? "DE",
    },
    legalEntityType: taxSettings?.customProperties?.legalEntityType ?? "",
    legalEntityName: taxSettings?.customProperties?.legalEntityName ?? "",
    vatNumber: taxSettings?.customProperties?.vatNumber ?? "",
    taxIdNumber: taxSettings?.customProperties?.taxIdNumber ?? "",
    stripeSettings: {
      taxCalculationEnabled:
        taxSettings?.customProperties?.stripeSettings?.taxCalculationEnabled ?? true,
      taxCodeValidation: taxSettings?.customProperties?.stripeSettings?.taxCodeValidation ?? false,
    },
  });

  // Get available legal entity types based on tax origin address country
  const availableLegalEntities = taxOriginCountry
    ? getLegalEntitiesForCountry(taxOriginCountry)
    : null;

  // Reset legal entity type when tax origin country changes
  useEffect(() => {
    if (!taxOriginCountry) {
      // No tax origin address - clear entity type
      if (formData.legalEntityType) {
        setFormData((prev) => ({ ...prev, legalEntityType: "" }));
      }
      return;
    }

    const entities = getLegalEntitiesForCountry(taxOriginCountry);
    // If current entity type is not valid for new country, reset it
    if (
      formData.legalEntityType &&
      entities &&
      !entities.entities.find((e) => e.code === formData.legalEntityType)
    ) {
      setFormData((prev) => ({ ...prev, legalEntityType: "" }));
    }
    // Reset VAT validation when country changes
    setVatValidation({ status: "idle" });
  }, [taxOriginCountry, formData.legalEntityType]);

  /**
   * Validate VAT Number
   */
  const handleValidateVAT = async () => {
    if (!formData.vatNumber) {
      setVatValidation({ status: "invalid", message: "Please enter a VAT number" });
      return;
    }

    setVatValidation({ status: "validating" });

    try {
      const result = await validateVAT({ vatNumber: formData.vatNumber });

      if (result.valid) {
        setVatValidation({
          status: "valid",
          message: result.name
            ? `Valid! Registered to: ${result.name}`
            : "Valid VAT number confirmed by EU VIES",
        });
      } else {
        setVatValidation({
          status: "invalid",
          message: result.error || "Invalid VAT number",
        });
      }
    } catch (err) {
      setVatValidation({
        status: "invalid",
        message: err instanceof Error ? err.message : "Validation failed",
      });
    }
  };

  /**
   * Handle form submission
   */
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateTaxSettings({
        sessionId,
        organizationId,
        taxEnabled: formData.taxEnabled,
        defaultTaxBehavior: formData.defaultTaxBehavior as "inclusive" | "exclusive" | "automatic",
        defaultTaxCode: formData.defaultTaxCode || undefined,
        originAddress: formData.originAddress,
        legalEntityType: formData.legalEntityType || undefined,
        legalEntityName: formData.legalEntityName || undefined,
        vatNumber: formData.vatNumber || undefined,
        taxIdNumber: formData.taxIdNumber || undefined,
        stripeSettings: formData.stripeSettings,
      });

      setSuccess("Tax settings saved successfully!");
    } catch (err) {
      console.error("Failed to save tax settings:", err);
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="tax-settings-tab p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <DollarSign size={24} />
          Tax Settings
        </h2>
        <p className="text-gray-600">Configure tax collection and calculation for your organization.</p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4 flex items-start gap-2">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-900">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 mb-4">
          <p className="text-sm text-green-900">{success}</p>
        </div>
      )}

      {/* Global Settings */}
      <div className="bg-white border-2 border-gray-300 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-bold mb-4">Global Settings</h3>

        {/* Enable Tax Collection */}
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.taxEnabled}
              onChange={(e) => setFormData({ ...formData, taxEnabled: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">Enable automatic tax collection</span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            When enabled, tax will be calculated and collected on all taxable transactions.
          </p>
        </div>

        {/* Default Tax Behavior */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Default Tax Behavior</label>
          <select
            value={formData.defaultTaxBehavior}
            onChange={(e) => setFormData({ ...formData, defaultTaxBehavior: e.target.value })}
            className="w-full border-2 border-gray-300 rounded px-3 py-2 text-sm"
            disabled={!formData.taxEnabled}
          >
            <option value="exclusive">Exclusive (tax added to price)</option>
            <option value="inclusive">Inclusive (tax included in price)</option>
            <option value="automatic">Automatic (based on location)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Exclusive is common in US/Canada. Inclusive is common in EU/UK.
          </p>
        </div>

        {/* Default Tax Code */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Default Tax Code (optional)
          </label>
          <input
            type="text"
            value={formData.defaultTaxCode}
            onChange={(e) => setFormData({ ...formData, defaultTaxCode: e.target.value })}
            placeholder="e.g., txcd_10000000"
            className="w-full border-2 border-gray-300 rounded px-3 py-2 text-sm"
            disabled={!formData.taxEnabled}
          />
          <p className="text-xs text-gray-500 mt-1">
            Stripe tax code for products without specific codes. Leave empty for general goods.
          </p>
        </div>
      </div>

      {/* Legal Entity Information */}
      <div className="bg-white border-2 border-gray-300 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-bold mb-4">Legal Entity Information</h3>
        <p className="text-sm text-gray-600 mb-4">
          Configure your business legal structure and tax identifiers.
        </p>

        {/* Requirement: Must have tax origin address */}
        {!taxOriginAddress ? (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-900 mb-2">
                  Tax Origin Address Required
                </p>
                <p className="text-sm text-amber-800 mb-3">
                  Before configuring legal entity information, you must add an address and mark it as your tax origin.
                </p>
                <ol className="text-sm text-amber-800 space-y-1 ml-4 list-decimal mb-3">
                  <li>Go to the <strong>General</strong> tab</li>
                  <li>Add or edit an address in the <strong>Addresses</strong> section</li>
                  <li>Check: <strong>&quot;Use this address as tax origin&quot;</strong></li>
                  <li>Return to this tab to configure legal entity</li>
                </ol>
                <p className="text-xs text-amber-700 italic">
                  💡 Your tax origin address determines which country&apos;s legal entity types are available.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-300 rounded px-3 py-2 mb-4 flex items-center gap-2">
            <DollarSign size={16} className="text-green-600" />
            <p className="text-sm text-green-800">
              <strong>Tax Origin Country:</strong> {availableLegalEntities?.countryName || taxOriginCountry}
              {taxOriginAddress.customProperties?.city && ` (${taxOriginAddress.customProperties.city})`}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Legal Entity Type (Dynamic based on country) */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Legal Entity Type *</label>
            <select
              value={formData.legalEntityType}
              onChange={(e) => setFormData({ ...formData, legalEntityType: e.target.value })}
              className="w-full border-2 border-gray-300 rounded px-3 py-2 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={!formData.taxEnabled || !taxOriginAddress}
            >
              <option value="">
                {!taxOriginAddress
                  ? "Please add a tax origin address first"
                  : "Select entity type..."}
              </option>
              {availableLegalEntities?.entities.map((entity) => (
                <option key={entity.code} value={entity.code}>
                  {entity.code} - {entity.name}
                  {entity.minShareCapital ? ` (Min capital: ${entity.minShareCapital})` : ""}
                </option>
              ))}
            </select>

            {/* Show entity details if selected */}
            {formData.legalEntityType && availableLegalEntities && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                {(() => {
                  const selectedEntity = availableLegalEntities.entities.find(
                    (e) => e.code === formData.legalEntityType
                  );
                  return selectedEntity ? (
                    <>
                      <p className="font-medium text-blue-900 mb-1">
                        {selectedEntity.localName}
                      </p>
                      <p className="text-blue-800 mb-2">{selectedEntity.description}</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-900 rounded text-xs">
                          {selectedEntity.liability} liability
                        </span>
                        {selectedEntity.vatEligible && (
                          <span className="px-2 py-1 bg-green-100 text-green-900 rounded text-xs">
                            VAT eligible
                          </span>
                        )}
                        {selectedEntity.minShareCapital && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-900 rounded text-xs">
                            Min capital: {selectedEntity.minShareCapital}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-blue-700 mt-2">
                        <strong>Common use:</strong> {selectedEntity.commonUse}
                      </p>
                    </>
                  ) : null;
                })()}
              </div>
            )}
          </div>

          {/* Legal Entity Name */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Registered Business Name *</label>
            <input
              type="text"
              value={formData.legalEntityName}
              onChange={(e) => setFormData({ ...formData, legalEntityName: e.target.value })}
              placeholder="e.g., Example GmbH, Example SAS, Example Ltd"
              className="w-full border-2 border-gray-300 rounded px-3 py-2 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={!formData.taxEnabled || !taxOriginAddress}
            />
            <p className="text-xs text-gray-500 mt-1">
              Official registered name of your business entity
            </p>
          </div>

          {/* VAT Number with Validation */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">
              VAT/Tax ID Number
              {availableLegalEntities?.defaultVATPrefix !== "N/A" && " *"}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.vatNumber}
                onChange={(e) => {
                  setFormData({ ...formData, vatNumber: e.target.value.toUpperCase() });
                  setVatValidation({ status: "idle" });
                }}
                placeholder={
                  !taxOriginAddress
                    ? "Add tax origin address first"
                    : availableLegalEntities?.defaultVATPrefix !== "N/A"
                    ? `${availableLegalEntities?.defaultVATPrefix}123456789`
                    : "Enter tax ID"
                }
                className="flex-1 border-2 border-gray-300 rounded px-3 py-2 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={!formData.taxEnabled || !taxOriginAddress}
              />
              {availableLegalEntities?.defaultVATPrefix !== "N/A" && taxOriginAddress && (
                <button
                  type="button"
                  onClick={handleValidateVAT}
                  disabled={
                    !formData.taxEnabled ||
                    !formData.vatNumber ||
                    !taxOriginAddress ||
                    vatValidation.status === "validating"
                  }
                  className="px-4 py-2 text-sm font-bold border-2 border-blue-600 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {vatValidation.status === "validating" ? (
                    <>
                      <Loader size={16} className="inline animate-spin mr-1" />
                      Validating...
                    </>
                  ) : (
                    "Validate"
                  )}
                </button>
              )}
            </div>

            {/* Validation Status */}
            {vatValidation.status === "valid" && (
              <div className="mt-2 p-2 bg-green-50 border border-green-300 rounded text-sm flex items-start gap-2">
                <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-green-900">{vatValidation.message}</p>
              </div>
            )}
            {vatValidation.status === "invalid" && (
              <div className="mt-2 p-2 bg-red-50 border border-red-300 rounded text-sm flex items-start gap-2">
                <XCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-900">{vatValidation.message}</p>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-1">
              {availableLegalEntities?.defaultVATPrefix !== "N/A"
                ? "EU VAT numbers will be validated against VIES database"
                : "Enter your business tax identification number"}
            </p>
          </div>

          {/* Additional Tax ID (if different from VAT) */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">
              Additional Tax ID (optional)
            </label>
            <input
              type="text"
              value={formData.taxIdNumber}
              onChange={(e) => setFormData({ ...formData, taxIdNumber: e.target.value })}
              placeholder={
                !taxOriginAddress
                  ? "Add tax origin address first"
                  : "Enter additional tax ID if different from VAT number"
              }
              className="w-full border-2 border-gray-300 rounded px-3 py-2 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={!formData.taxEnabled || !taxOriginAddress}
            />
            <p className="text-xs text-gray-500 mt-1">
              Some countries require multiple tax IDs (e.g., federal vs state)
            </p>
          </div>
        </div>
      </div>

      {/* Origin Address Reference */}
      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-bold mb-2 text-blue-900">Tax Origin Address</h3>
        <p className="text-sm text-blue-800 mb-4">
          Your business address determines <strong>tax nexus</strong> (where you must collect tax).
        </p>

        <div className="bg-white border border-blue-200 rounded p-4">
          <p className="text-sm text-gray-700 mb-2">
            <strong>✓ Use existing address system:</strong>
          </p>
          <ol className="text-sm text-gray-700 space-y-1 ml-4 list-decimal">
            <li>Go to the <strong>General</strong> tab in Manage Organization</li>
            <li>Add or edit an address in the <strong>Addresses</strong> section</li>
            <li>Check the box: <strong>&quot;Use this address as tax origin&quot;</strong></li>
          </ol>
          <p className="text-xs text-gray-500 mt-3 italic">
            💡 This keeps all your organization addresses in one place and avoids duplication.
          </p>
        </div>
      </div>

      {/* Stripe Tax Settings */}
      <div className="bg-white border-2 border-gray-300 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-bold mb-4">Stripe Tax Integration</h3>

        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.stripeSettings.taxCalculationEnabled}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  stripeSettings: {
                    ...formData.stripeSettings,
                    taxCalculationEnabled: e.target.checked,
                  },
                })
              }
              className="w-4 h-4"
              disabled={!formData.taxEnabled}
            />
            <span className="text-sm font-medium">Enable Stripe automatic tax calculation</span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            Use Stripe Tax to automatically calculate tax rates based on customer location.
          </p>
        </div>

        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.stripeSettings.taxCodeValidation}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  stripeSettings: {
                    ...formData.stripeSettings,
                    taxCodeValidation: e.target.checked,
                  },
                })
              }
              className="w-4 h-4"
              disabled={!formData.taxEnabled}
            />
            <span className="text-sm font-medium">Validate tax codes</span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            Verify that product tax codes are valid Stripe tax codes.
          </p>
        </div>
      </div>

      {/* Tax Registrations */}
      <div className="bg-white border-2 border-gray-300 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Tax Registrations</h3>
          <button
            type="button"
            className="px-3 py-1 text-sm font-bold border-2 border-purple-600 bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center gap-1"
            disabled={!formData.taxEnabled}
          >
            <Plus size={16} />
            Add Registration
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Manage tax registrations for jurisdictions where you collect tax.
        </p>

        {taxRegistrations && taxRegistrations.length > 0 ? (
          <div className="space-y-2">
            {taxRegistrations.map((reg) => (
              <div
                key={reg._id}
                className="flex justify-between items-center p-3 bg-gray-50 border border-gray-300 rounded"
              >
                <div>
                  <p className="text-sm font-medium">{reg.name}</p>
                  <p className="text-xs text-gray-500">
                    Registration: {reg.customProperties?.registrationNumber}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteTaxRegistration({ sessionId, registrationId: reg._id })}
                  className="text-red-600 hover:text-red-800"
                  title="Delete registration"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">
            No tax registrations configured. Add registrations for jurisdictions where you collect tax.
          </p>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-3 text-base font-bold border-2 border-green-600 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <Save size={20} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={20} />
              Save Tax Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}
