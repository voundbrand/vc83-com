"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { UserManagementTable } from "./user-management-table";
import { RolesPermissionsTab } from "./roles-permissions-tab";
import { DomainConfigTab } from "./domain-config-tab";
import { SecurityTab } from "./security-tab";
import { AISettingsTabV3 as AISettingsTab } from "./ai-settings-tab-v3";
import { OrganizationSection } from "./components/organization-section";
import { AddressCard } from "./components/address-card";
import { AddressModal } from "./components/address-modal";
import { OrganizationDetailsForm, OrganizationDetailsFormRef } from "./organization-details-form";
import { Users, Building2, AlertCircle, Loader2, Shield, Save, Crown, Edit2, X, MapPin, Plus, Key, Globe, Brain } from "lucide-react";
import { useState, useRef } from "react";
import {
  useAuth,
  useCurrentOrganization,
} from "@/hooks/use-auth";
import { usePermissions } from "@/contexts/permission-context";
import { PermissionGuard, PermissionButton } from "@/components/permission";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { IntegrationsTab } from "../settings-window/integrations-tab";

type TabType = "organization" | "users" | "ai" | "integrations" | "roles" | "domains" | "security";

interface ManageWindowProps {
  initialTab?: TabType;
}

export function ManageWindow({ initialTab = "organization" }: ManageWindowProps) {
  const { t } = useNamespaceTranslations("ui.manage");
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [isEditingOrg, setIsEditingOrg] = useState(false); // Start in view mode to load saved settings
  const [isSavingOrg, setIsSavingOrg] = useState(false);

  // Address management state
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Doc<"objects"> | undefined>(); // Changed to objects
  const [isSubmittingAddress, setIsSubmittingAddress] = useState(false);

  // Ref to organization form for accessing form data
  const organizationFormRef = useRef<OrganizationDetailsFormRef>(null);

  // Use existing useAuth hooks
  const { user, isLoading, sessionId } = useAuth();
  const currentOrganization = useCurrentOrganization();

  // Get super admin status for UI display purposes only (not for permission checks)
  const { isSuperAdmin } = useAuth();

  // Use permission context for silent checks (only where absolutely needed for conditional rendering)
  const { hasPermission } = usePermissions();

  // Mutations
  const updateOrganization = useMutation(api.organizationMutations.updateOrganization);
  const updateProfile = useMutation(api.organizationOntology.updateOrganizationProfile);
  const updateContact = useMutation(api.organizationOntology.updateOrganizationContact);
  const updateSocial = useMutation(api.organizationOntology.updateOrganizationSocial);
  const updateLegal = useMutation(api.organizationOntology.updateOrganizationLegal);
  const updateSettings = useMutation(api.organizationOntology.updateOrganizationSettings);
  const createAddress = useMutation(api.organizationOntology.createOrganizationAddress);
  const updateAddressMut = useMutation(api.organizationOntology.updateOrganizationAddress);
  const deleteAddressMut = useMutation(api.organizationOntology.deleteOrganizationAddress);

  // Get organization ID
  const organizationId = currentOrganization?.id || user?.defaultOrgId;

  // Get organization details with sessionId
  const organization = useQuery(api.organizations.getById,
    organizationId && sessionId ? { organizationId: organizationId as Id<"organizations">, sessionId } : "skip"
  );

  // Get organization addresses (from ontology)
  const addresses = useQuery(api.organizationOntology.getOrganizationAddresses,
    organizationId ? { organizationId: organizationId as Id<"organizations"> } : "skip"
  );

  const handleCancelEdit = () => {
    setIsEditingOrg(false);
  };

  // Address handlers
  const handleAddressSubmit = async (data: {
    type: "billing" | "shipping" | "mailing" | "physical" | "other";
    label?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
    region?: string;
    isDefault?: boolean;
    isPrimary?: boolean;
    isTaxOrigin?: boolean;
  }) => {
    if (!organizationId || !sessionId) return;

    setIsSubmittingAddress(true);
    try {
      // Extract type and spread the rest (type is not in mutation args, only subtype)
      const { type, ...addressData } = data;

      if (editingAddress) {
        // Update existing address
        await updateAddressMut({
          sessionId,
          addressId: editingAddress._id as Id<"objects">,
          name: data.label || `${type} address`,
          ...addressData,
        });
      } else {
        // Create new address
        await createAddress({
          sessionId,
          organizationId: organizationId as Id<"organizations">,
          subtype: type, // type → subtype
          name: data.label || `${type} address`,
          ...addressData,
        });
      }
      setIsAddressModalOpen(false);
      setEditingAddress(undefined);
    } catch (error) {
      console.error("Failed to save address:", error);
      alert("Failed to save address. Please try again.");
    } finally {
      setIsSubmittingAddress(false);
    }
  };

  const handleDeleteAddress = async (address: Doc<"objects">) => {
    if (!confirm("Are you sure you want to delete this address?")) {
      return;
    }

    if (!sessionId) return;

    try {
      await deleteAddressMut({ sessionId, addressId: address._id });
    } catch (error) {
      console.error("Failed to delete address:", error);
      alert("Failed to delete address. Please try again.");
    }
  };

  const handleSetPrimary = async (address: Doc<"objects">) => {
    if (!sessionId) return;

    try {
      // Update address to set isPrimary=true
      await updateAddressMut({
        sessionId,
        addressId: address._id,
        isPrimary: true,
      });
    } catch (error) {
      console.error("Failed to set primary address:", error);
      alert("Failed to set primary address. Please try again.");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full" style={{ background: 'var(--win95-bg)' }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: 'var(--primary)' }} />
            <p style={{ color: 'var(--win95-text)' }}>{t("ui.manage.loading")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col h-full" style={{ background: 'var(--win95-bg)' }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle size={48} style={{ color: 'var(--error)' }} className="mx-auto mb-4" />
            <p style={{ color: 'var(--win95-text)' }}>{t("ui.manage.not_authenticated")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="flex flex-col h-full" style={{ background: 'var(--win95-bg)' }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Building2 size={48} style={{ color: 'var(--warning)' }} className="mx-auto mb-4" />
            <p style={{ color: 'var(--win95-text)' }} className="font-semibold">{t("ui.manage.no_organization")}</p>
            <p style={{ color: 'var(--win95-text-secondary)' }} className="text-sm mt-2">
              {t("ui.manage.no_organization_message")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--win95-bg)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
              <Building2 size={16} />
              {t("ui.manage.title")}
              {isSuperAdmin && (
                <span
                  className="inline-flex items-center px-2 py-0.5 text-xs font-bold"
                  style={{
                    backgroundColor: 'var(--badge-super-admin-bg)',
                    color: 'var(--badge-super-admin-text)',
                    border: '1px solid',
                    borderColor: 'var(--badge-super-admin-bg)',
                  }}
                >
                  <Crown size={10} className="mr-1" />
                  {t("ui.manage.super_admin")}
                </span>
              )}
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              {t("ui.manage.subtitle")}
            </p>
          </div>

          {/* Organization Info */}
          <div className="text-right">
            <p className="text-xs font-semibold" style={{ color: 'var(--win95-text)' }}>
              {currentOrganization?.name}
            </p>
            <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
              {t("ui.manage.your_role")}: {formatRoleName(currentOrganization?.role.name || "", t)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "organization" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "organization" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("organization")}
        >
          <Building2 size={14} />
          {t("ui.manage.tab.organization")}
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "users" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "users" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("users")}
        >
          <Users size={14} />
          {t("ui.manage.tab.users_invites")}
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "ai" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "ai" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("ai")}
        >
          <Brain size={14} />
          {t("ui.manage.tab.ai")}
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "integrations" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "integrations" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("integrations")}
        >
          🔗
          {t("ui.manage.tab.integrations")}
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "roles" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "roles" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("roles")}
        >
          <Shield size={14} />
          {t("ui.manage.tab.roles_permissions")}
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "domains" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "domains" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("domains")}
        >
          <Globe size={14} />
          {t("ui.manage.tab.domains")}
        </button>
        <button
          className="px-4 py-2 text-xs font-bold transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "security" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "security" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("security")}
        >
          <Key size={14} />
          {t("ui.manage.tab.security")}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "organization" && (
          <div className="space-y-4">
            {/* Permission Warning - shown when user lacks permission */}
            <PermissionGuard permission="manage_organization" mode="show-fallback" fallback={
              <div
                className="mb-4 p-3 border-2 flex items-start gap-2"
                style={{
                  backgroundColor: 'var(--win95-bg-light)',
                  borderColor: 'var(--warning)',
                  color: 'var(--win95-text)'
                }}
              >
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--warning)' }} />
                <div className="text-sm">
                  <p className="font-semibold">View Only</p>
                  <p className="text-xs mt-1">
                    You don&apos;t have permission to modify organization settings.
                  </p>
                </div>
              </div>
            }>
              {null}
            </PermissionGuard>

            {/* Edit/Save Controls */}
            <PermissionGuard permission="manage_organization">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
                  {t("ui.manage.org.details_title")}
                </h3>
                <div className="flex gap-2">
                  {isEditingOrg ? (
                    <>
                      <button
                        onClick={handleCancelEdit}
                        disabled={isSavingOrg}
                        className="retro-button px-3 py-1 text-xs font-semibold flex items-center gap-1"
                      >
                        <X size={12} />
                        {t("ui.manage.org.cancel")}
                      </button>
                      <button
                        onClick={async () => {
                          console.log("🔵 [SAVE] Save button clicked");
                          console.log("🔵 [SAVE] organizationFormRef.current:", !!organizationFormRef.current);
                          console.log("🔵 [SAVE] sessionId:", sessionId);
                          console.log("🔵 [SAVE] organizationId:", organizationId);

                          if (!organizationFormRef.current || !sessionId || !organizationId) {
                            console.error("🔴 [SAVE] Missing required data - aborting save");
                            return;
                          }

                          const formData = organizationFormRef.current.getFormData();
                          console.log("🔵 [SAVE] Form data retrieved:", formData);
                          console.log("🔵 [SAVE] Settings.branding:", formData.settings.branding);
                          console.log("🔵 [SAVE] Settings.locale:", formData.settings.locale);
                          console.log("🔵 [SAVE] Settings.invoicing:", formData.settings.invoicing);

                          setIsSavingOrg(true);
                          try {
                            // Update core organization fields
                            console.log("🔵 [SAVE] Updating core organization fields...");
                            await updateOrganization({
                              sessionId,
                              organizationId: organizationId as Id<"organizations">,
                              updates: {
                                name: formData.name,
                                businessName: formData.businessName,
                                slug: formData.slug,
                              },
                            });
                            console.log("✅ [SAVE] Core organization updated");

                            // Update ontology data in parallel
                            console.log("🔵 [SAVE] Updating ontology data in parallel...");
                            await Promise.all([
                              // Profile
                              updateProfile({
                                sessionId,
                                organizationId: organizationId as Id<"organizations">,
                                industry: formData.industry,
                                foundedYear: formData.foundedYear,
                                employeeCount: formData.employeeCount,
                                bio: formData.bio,
                              }).then(() => console.log("✅ [SAVE] Profile updated")),
                              // Contact
                              updateContact({
                                sessionId,
                                organizationId: organizationId as Id<"organizations">,
                                contactEmail: formData.contactEmail,
                                billingEmail: formData.billingEmail,
                                supportEmail: formData.supportEmail,
                                contactPhone: formData.contactPhone,
                                faxNumber: formData.faxNumber,
                                website: formData.website,
                              }).then(() => console.log("✅ [SAVE] Contact updated")),
                              // Social
                              updateSocial({
                                sessionId,
                                organizationId: organizationId as Id<"organizations">,
                                linkedin: formData.socialMedia.linkedin,
                                twitter: formData.socialMedia.twitter,
                                facebook: formData.socialMedia.facebook,
                                instagram: formData.socialMedia.instagram,
                              }).then(() => console.log("✅ [SAVE] Social updated")),
                              // Legal (including tax collection settings)
                              updateLegal({
                                sessionId,
                                organizationId: organizationId as Id<"organizations">,
                                taxId: formData.taxId,
                                vatNumber: formData.vatNumber,
                                companyRegistrationNumber: formData.companyRegistrationNumber,
                                legalEntityType: formData.legalEntityType,
                                taxEnabled: formData.taxEnabled,
                                defaultTaxBehavior: formData.defaultTaxBehavior,
                                defaultTaxCode: formData.defaultTaxCode,
                              }).then(() => console.log("✅ [SAVE] Legal updated")),
                              // Settings (branding)
                              updateSettings({
                                sessionId,
                                organizationId: organizationId as Id<"organizations">,
                                subtype: "branding",
                                settings: formData.settings.branding,
                              }).then(() => console.log("✅ [SAVE] Branding settings updated with:", formData.settings.branding)),
                              // Settings (locale)
                              updateSettings({
                                sessionId,
                                organizationId: organizationId as Id<"organizations">,
                                subtype: "locale",
                                settings: formData.settings.locale,
                              }).then(() => console.log("✅ [SAVE] Locale settings updated with:", formData.settings.locale)),
                              // Settings (invoicing)
                              updateSettings({
                                sessionId,
                                organizationId: organizationId as Id<"organizations">,
                                subtype: "invoicing",
                                settings: formData.settings.invoicing,
                              }).then(() => console.log("✅ [SAVE] Invoicing settings updated with:", formData.settings.invoicing)),
                            ]);

                            console.log("✅ [SAVE] All updates completed successfully!");
                            setIsEditingOrg(false);
                          } catch (error) {
                            console.error("🔴 [SAVE] Failed to update organization:", error);
                            alert("Failed to update organization. " + (error instanceof Error ? error.message : ""));
                          } finally {
                            setIsSavingOrg(false);
                          }
                        }}
                        disabled={isSavingOrg}
                        className="retro-button-primary px-3 py-1 text-xs font-semibold flex items-center gap-1"
                      >
                        <Save size={12} />
                        {isSavingOrg ? t("ui.manage.org.saving") : t("ui.manage.org.save_all_changes")}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditingOrg(true)}
                      className="retro-button-primary px-3 py-1 text-xs font-semibold flex items-center gap-1"
                    >
                      <Edit2 size={12} />
                      Edit Organization
                    </button>
                  )}
                </div>
              </div>
            </PermissionGuard>

            {/* Comprehensive Organization Details Form */}
            {organization && (
              <OrganizationDetailsForm
                ref={organizationFormRef}
                organization={organization}
                isEditing={isEditingOrg}
                isSaving={isSavingOrg}
              />
            )}

            {/* Addresses Section */}
            <OrganizationSection
              title={t("ui.manage.org.section.addresses")}
              icon={<MapPin className="w-4 h-4" />}
              collapsible={true}
              defaultCollapsed={false}
              actions={
                <PermissionGuard permission="manage_organization">
                  <PermissionButton
                    permission="manage_organization"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent accordion toggle
                      setEditingAddress(undefined);
                      setIsAddressModalOpen(true);
                    }}
                    className="retro-button-primary px-3 py-1.5 text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t("ui.manage.org.add_address")}
                  </PermissionButton>
                </PermissionGuard>
              }
            >
              {(!addresses || addresses.length === 0) ? (
                <div className="text-center py-8" style={{ color: 'var(--neutral-gray)' }}>
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t("ui.manage.org.no_addresses")}</p>
                  <PermissionGuard permission="manage_organization">
                    <PermissionButton
                      permission="manage_organization"
                      onClick={() => {
                        setEditingAddress(undefined);
                        setIsAddressModalOpen(true);
                      }}
                      className="retro-button-primary mt-4 px-4 py-2 text-sm font-semibold"
                    >
                      {t("ui.manage.org.add_first_address")}
                    </PermissionButton>
                  </PermissionGuard>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* eslint-disable @typescript-eslint/no-explicit-any */}
                  {/* Primary Address */}
                  {addresses?.find((a) => (a.customProperties as any)?.isPrimary) && (
                    <div>
                      <h4 className="text-sm font-bold mb-2" style={{ color: 'var(--primary)' }}>
                        {t("ui.manage.org.primary_address")}
                      </h4>
                      <AddressCard
                        address={addresses.find((a) => (a.customProperties as any)?.isPrimary)!}
                        canEdit={hasPermission("manage_organization")}
                        onEdit={(addr) => {
                          setEditingAddress(addr);
                          setIsAddressModalOpen(true);
                        }}
                        onDelete={handleDeleteAddress}
                        onSetPrimary={handleSetPrimary}
                      />
                    </div>
                  )}

                  {/* Other Addresses */}
                  {addresses?.filter((a) => !(a.customProperties as any)?.isPrimary).length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
                        {t("ui.manage.org.other_addresses")}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {addresses
                          .filter((a) => !(a.customProperties as any)?.isPrimary)
                          .map((address) => (
                            <AddressCard
                              key={address._id}
                              address={address}
                              canEdit={hasPermission("manage_organization")}
                              onEdit={(addr) => {
                                setEditingAddress(addr);
                                setIsAddressModalOpen(true);
                              }}
                              onDelete={handleDeleteAddress}
                              onSetPrimary={handleSetPrimary}
                            />
                          ))}
                      </div>
                    </div>
                  )}
                  {/* eslint-enable @typescript-eslint/no-explicit-any */}
                </div>
              )}
            </OrganizationSection>

            {/* Address Modal */}
            <AddressModal
              isOpen={isAddressModalOpen}
              onClose={() => {
                setIsAddressModalOpen(false);
                setEditingAddress(undefined);
              }}
              address={editingAddress}
              onSubmit={handleAddressSubmit}
              isSubmitting={isSubmittingAddress}
            />
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-4">
            {/* Permission Warning for Viewers/Employees */}
            <PermissionGuard permission="manage_users" mode="show-fallback" fallback={
              <div
                className="mb-4 p-3 border-2 flex items-start gap-2"
                style={{
                  backgroundColor: 'var(--win95-bg-light)',
                  borderColor: 'var(--warning)',
                  color: 'var(--win95-text)'
                }}
              >
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--warning)' }} />
                <div className="text-sm">
                  <p className="font-semibold">Limited Access</p>
                  <p className="text-xs mt-1">
                    As {formatRoleName(currentOrganization?.role.name || "", t)}, you can view team members but cannot send invitations.
                  </p>
                </div>
              </div>
            }>
              {null}
            </PermissionGuard>

            {/* User Management Table */}
            <UserManagementTable
              organizationId={organizationId as Id<"organizations">}
            />
          </div>
        )}

        {activeTab === "ai" && (
          <AISettingsTab />
        )}

        {activeTab === "integrations" && (
          <IntegrationsTab />
        )}

        {activeTab === "roles" && (
          <RolesPermissionsTab />
        )}

        {activeTab === "domains" && organizationId && sessionId && (
          <DomainConfigTab
            organizationId={organizationId as Id<"organizations">}
            sessionId={sessionId}
          />
        )}

        {activeTab === "security" && organizationId && sessionId && (
          <SecurityTab
            organizationId={organizationId as Id<"organizations">}
            sessionId={sessionId}
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <div className="flex justify-between items-center">
          <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
            {isSuperAdmin && (
              <span className="font-semibold" style={{ color: 'var(--badge-super-admin-bg)' }}>
                Super Admin Mode
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// Helper function to format role names with translations
function formatRoleName(role: string, t: (key: string) => string): string {
  const roleKeyMap: Record<string, string> = {
    super_admin: "ui.manage.roles.super_admin",
    org_owner: "ui.manage.roles.org_owner",
    business_manager: "ui.manage.roles.business_manager",
    employee: "ui.manage.roles.employee",
    viewer: "ui.manage.roles.viewer",
  };
  const key = roleKeyMap[role];
  return key ? t(key) : role;
}

