"use client";

import { useQuery, useMutation } from "convex/react";
// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };
import { UserManagementTable } from "./user-management-table";
import { RolesPermissionsTab } from "./roles-permissions-tab";
import { DomainConfigTab } from "./domain-config-tab";
import { SecurityTab } from "./security-tab";
import { AISettingsTab } from "./ai-settings-tab";
import { OrganizationSection } from "./components/organization-section";
import { AddressCard } from "./components/address-card";
import { AddressModal } from "./components/address-modal";
import { OrganizationDetailsForm, OrganizationDetailsFormRef } from "./organization-details-form";
import { Users, Building2, AlertCircle, Loader2, Shield, Save, Crown, Edit2, X, MapPin, Plus, Key, Globe, Brain, Network, Sparkles } from "lucide-react";
import { useState, useRef, useEffect, type ReactNode } from "react";
import {
  useAuth,
  useCurrentOrganization,
} from "@/hooks/use-auth";
import { usePermissions } from "@/contexts/permission-context";
import { PermissionGuard, PermissionButton } from "@/components/permission";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { IntegrationsTab } from "../settings-window/integrations-tab";
import { SubOrganizationsTab } from "./sub-organizations-tab";
import { ProductOSReleaseStageTab } from "./product-os-release-stage-tab";
import {
  InteriorButton,
  InteriorHeader,
  InteriorHelperText,
  InteriorRoot,
  InteriorSubtitle,
  InteriorTabButton,
  InteriorTabRow,
  InteriorTitle,
} from "@/components/window-content/shared/interior-primitives";

type TabType = "organization" | "users" | "ai" | "integrations" | "roles" | "domains" | "security" | "sub-orgs" | "product-rollout";

interface ManageWindowProps {
  initialTab?: TabType;
  initialUserContext?: "current-user" | "organization";
  initialUserEntity?: string;
}

export function ManageWindow({
  initialTab = "organization",
  initialUserContext = "organization",
  initialUserEntity,
}: ManageWindowProps) {
  const { t } = useNamespaceTranslations("ui.manage");
  const manageRootClassName = "manage-window-modern flex h-full flex-col";
  const initialActiveTab = initialUserContext === "current-user" ? "users" : initialTab;
  const [activeTab, setActiveTab] = useState<TabType>(initialActiveTab);
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

  // Get organization license (for plan tier)
  const license = useQuery(api.licensing.helpers.getLicense,
    organizationId ? { organizationId: organizationId as Id<"organizations"> } : "skip"
  );

  // Get organization addresses (from ontology)
  const addresses = useQuery(api.organizationOntology.getOrganizationAddresses,
    organizationId ? { organizationId: organizationId as Id<"organizations"> } : "skip"
  );

  const tabs: Array<{ id: TabType; label: string; icon: ReactNode }> = [
    { id: "organization", label: t("ui.manage.tab.organization"), icon: <Building2 size={14} /> },
    { id: "users", label: t("ui.manage.tab.users_invites"), icon: <Users size={14} /> },
    { id: "ai", label: t("ui.manage.tab.ai"), icon: <Brain size={14} /> },
    { id: "integrations", label: t("ui.manage.tab.integrations"), icon: null },
    { id: "roles", label: t("ui.manage.tab.roles_permissions"), icon: <Shield size={14} /> },
    { id: "domains", label: t("ui.manage.tab.domains"), icon: <Globe size={14} /> },
    { id: "security", label: t("ui.manage.tab.security"), icon: <Key size={14} /> },
    { id: "sub-orgs", label: "Sub-Orgs", icon: <Network size={14} /> },
    ...(isSuperAdmin
      ? [{ id: "product-rollout" as TabType, label: "Product Rollout", icon: <Sparkles size={14} /> }]
      : []),
  ];

  useEffect(() => {
    if (initialUserContext === "current-user") {
      setActiveTab("users");
    }
  }, [initialUserContext, initialUserEntity]);

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
      <InteriorRoot className={manageRootClassName}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: 'var(--primary)' }} />
            <p style={{ color: "var(--window-document-text)" }}>{t("ui.manage.loading")}</p>
          </div>
        </div>
      </InteriorRoot>
    );
  }

  if (!user) {
    return (
      <InteriorRoot className={manageRootClassName}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle size={48} style={{ color: 'var(--error)' }} className="mx-auto mb-4" />
            <p style={{ color: "var(--window-document-text)" }}>{t("ui.manage.not_authenticated")}</p>
          </div>
        </div>
      </InteriorRoot>
    );
  }

  if (!organizationId) {
    return (
      <InteriorRoot className={manageRootClassName}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Building2 size={48} style={{ color: 'var(--warning)' }} className="mx-auto mb-4" />
            <p style={{ color: "var(--window-document-text)" }} className="font-semibold">{t("ui.manage.no_organization")}</p>
            <p style={{ color: "var(--desktop-menu-text-muted)" }} className="text-sm mt-2">
              {t("ui.manage.no_organization_message")}
            </p>
          </div>
        </div>
      </InteriorRoot>
    );
  }

  return (
    <InteriorRoot className={manageRootClassName}>
      <InteriorHeader className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <InteriorTitle className="flex items-center gap-2 text-sm">
              <Building2 size={16} />
              {t("ui.manage.title")}
              {isSuperAdmin && (
                <span
                  className="inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold uppercase"
                  style={{
                    backgroundColor: "var(--badge-super-admin-bg)",
                    borderColor: "var(--badge-super-admin-bg)",
                    color: "var(--badge-super-admin-text)",
                  }}
                >
                  <Crown size={10} className="mr-1" />
                  {t("ui.manage.super_admin")}
                </span>
              )}
            </InteriorTitle>
            <InteriorSubtitle className="mt-1 text-xs">{t("ui.manage.subtitle")}</InteriorSubtitle>
          </div>

          <div className="text-right">
            <div className="flex items-center justify-end gap-2">
              <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
                {currentOrganization?.name}
              </p>
              {license?.planTier && (
                <span
                  className="inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold uppercase"
                  style={{
                    background:
                      license.planTier === "free"
                        ? "var(--window-document-bg)"
                        : "linear-gradient(135deg, var(--tone-accent) 0%, var(--tone-accent-strong) 100%)",
                    borderColor: "var(--window-document-border)",
                    color: license.planTier === "free" ? "var(--desktop-menu-text-muted)" : "#0f0f0f",
                  }}
                >
                  {license.planTier}
                </span>
              )}
            </div>
            <InteriorHelperText className="mt-1 text-xs">
              {t("ui.manage.your_role")}: {formatRoleName(currentOrganization?.role.name || "", t)}
            </InteriorHelperText>
          </div>
        </div>
      </InteriorHeader>

      <InteriorTabRow className="px-3 py-2">
        {tabs.map((tab) => (
          <InteriorTabButton
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2"
          >
            {tab.icon}
            {tab.label}
          </InteriorTabButton>
        ))}
      </InteriorTabRow>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "organization" && (
          <div className="space-y-4">
            {/* Permission Warning - shown when user lacks permission */}
            <PermissionGuard permission="manage_organization" mode="show-fallback" fallback={
              <div className="desktop-interior-panel mb-4 flex items-start gap-2 border" style={{ borderColor: "var(--warning)" }}>
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
                <h3 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
                  {t("ui.manage.org.details_title")}
                </h3>
                <div className="flex gap-2">
                  {isEditingOrg ? (
                    <>
                      <InteriorButton
                        onClick={handleCancelEdit}
                        disabled={isSavingOrg}
                        variant="subtle"
                        size="sm"
                      >
                        <X size={12} />
                        {t("ui.manage.org.cancel")}
                      </InteriorButton>
                      <InteriorButton
                        onClick={async () => {
                          console.log(" [SAVE] Save button clicked");
                          console.log(" [SAVE] organizationFormRef.current:", !!organizationFormRef.current);
                          console.log(" [SAVE] sessionId:", sessionId);
                          console.log(" [SAVE] organizationId:", organizationId);

                          if (!organizationFormRef.current || !sessionId || !organizationId) {
                            console.error(" [SAVE] Missing required data - aborting save");
                            return;
                          }

                          const formData = organizationFormRef.current.getFormData();
                          console.log(" [SAVE] Form data retrieved:", formData);
                          console.log(" [SAVE] Settings.branding:", formData.settings.branding);
                          console.log(" [SAVE] Settings.locale:", formData.settings.locale);
                          console.log(" [SAVE] Settings.invoicing:", formData.settings.invoicing);

                          setIsSavingOrg(true);
                          try {
                            // Update core organization fields
                            console.log(" [SAVE] Updating core organization fields...");
                            await updateOrganization({
                              sessionId,
                              organizationId: organizationId as Id<"organizations">,
                              updates: {
                                name: formData.name,
                                businessName: formData.businessName,
                                slug: formData.slug,
                              },
                            });
                            console.log(" [SAVE] Core organization updated");

                            // Update ontology data in parallel
                            console.log(" [SAVE] Updating ontology data in parallel...");
                            await Promise.all([
                              // Profile
                              updateProfile({
                                sessionId,
                                organizationId: organizationId as Id<"organizations">,
                                industry: formData.industry,
                                foundedYear: formData.foundedYear,
                                employeeCount: formData.employeeCount,
                                bio: formData.bio,
                              }).then(() => console.log(" [SAVE] Profile updated")),
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
                              }).then(() => console.log(" [SAVE] Contact updated")),
                              // Social
                              updateSocial({
                                sessionId,
                                organizationId: organizationId as Id<"organizations">,
                                linkedin: formData.socialMedia.linkedin,
                                twitter: formData.socialMedia.twitter,
                                facebook: formData.socialMedia.facebook,
                                instagram: formData.socialMedia.instagram,
                              }).then(() => console.log(" [SAVE] Social updated")),
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
                              }).then(() => console.log(" [SAVE] Legal updated")),
                              // Settings (branding)
                              updateSettings({
                                sessionId,
                                organizationId: organizationId as Id<"organizations">,
                                subtype: "branding",
                                settings: formData.settings.branding,
                              }).then(() => console.log(" [SAVE] Branding settings updated with:", formData.settings.branding)),
                              // Settings (locale)
                              updateSettings({
                                sessionId,
                                organizationId: organizationId as Id<"organizations">,
                                subtype: "locale",
                                settings: formData.settings.locale,
                              }).then(() => console.log(" [SAVE] Locale settings updated with:", formData.settings.locale)),
                              // Settings (invoicing)
                              updateSettings({
                                sessionId,
                                organizationId: organizationId as Id<"organizations">,
                                subtype: "invoicing",
                                settings: formData.settings.invoicing,
                              }).then(() => console.log(" [SAVE] Invoicing settings updated with:", formData.settings.invoicing)),
                            ]);

                            console.log(" [SAVE] All updates completed successfully!");
                            setIsEditingOrg(false);
                          } catch (error) {
                            console.error(" [SAVE] Failed to update organization:", error);
                            alert("Failed to update organization. " + (error instanceof Error ? error.message : ""));
                          } finally {
                            setIsSavingOrg(false);
                          }
                        }}
                        disabled={isSavingOrg}
                        variant="primary"
                        size="sm"
                      >
                        <Save size={12} />
                        {isSavingOrg ? t("ui.manage.org.saving") : t("ui.manage.org.save_all_changes")}
                      </InteriorButton>
                    </>
                  ) : (
                    <InteriorButton
                      onClick={() => setIsEditingOrg(true)}
                      variant="primary"
                      size="sm"
                    >
                      <Edit2 size={12} />
                      Edit Organization
                    </InteriorButton>
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
                    className="desktop-interior-button desktop-interior-button-primary h-8 px-2.5 text-[11px] font-semibold"
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
                      className="desktop-interior-button desktop-interior-button-primary mt-4 h-9 px-4 text-sm font-semibold"
                    >
                      {t("ui.manage.org.add_first_address")}
                    </PermissionButton>
                  </PermissionGuard>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* eslint-disable @typescript-eslint/no-explicit-any */}
                  {/* Primary Address */}
                  {addresses?.find((a: any) => (a.customProperties as any)?.isPrimary) && (
                    <div>
                      <h4 className="text-sm font-bold mb-2" style={{ color: 'var(--primary)' }}>
                        {t("ui.manage.org.primary_address")}
                      </h4>
                      <AddressCard
                        address={addresses.find((a: any) => (a.customProperties as any)?.isPrimary)!}
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
                  {addresses?.filter((a: any) => !(a.customProperties as any)?.isPrimary).length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
                        {t("ui.manage.org.other_addresses")}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {addresses
                          .filter((a: any) => !(a.customProperties as any)?.isPrimary)
                          .map((address: any) => (
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
            {initialUserContext === "current-user" && (
              <div className="desktop-interior-panel border" style={{ borderColor: "var(--tone-accent)" }}>
                <p className="text-xs font-semibold">User Settings</p>
                <p className="text-xs mt-1">
                  Opened in current-user context for {user?.email || "your account"}.
                </p>
              </div>
            )}

            {/* Permission Warning for Viewers/Employees */}
            <PermissionGuard permission="manage_users" mode="show-fallback" fallback={
              <div className="desktop-interior-panel mb-4 flex items-start gap-2 border" style={{ borderColor: "var(--warning)" }}>
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
              initialUserEntity={initialUserEntity}
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

        {activeTab === "sub-orgs" && organizationId && sessionId && (
          license?.features?.subOrgsEnabled ? (
            <SubOrganizationsTab
              organizationId={organizationId as Id<"organizations">}
              sessionId={sessionId}
              license={license}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Network size={48} className="mb-4" style={{ color: 'var(--neutral-gray)', opacity: 0.5 }} />
              <h3 className="text-lg font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
                Sub-Organizations
              </h3>
              <p className="text-sm mb-4 max-w-md" style={{ color: 'var(--neutral-gray)' }}>
                Create and manage child organizations under your account. Perfect for agencies, franchises, or multi-brand businesses.
              </p>
              <div className="desktop-interior-panel mb-4 max-w-md border" style={{ borderColor: "var(--tone-accent)" }}>
                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--primary)' }}>
                  Available on Scale & Enterprise Plans
                </p>
                <ul className="text-xs text-left space-y-1" style={{ color: "var(--window-document-text)" }}>
                  <li>• Scale: Up to 10 sub-organizations</li>
                  <li>• Enterprise: Unlimited sub-organizations</li>
                  <li>• Each sub-org has independent users & settings</li>
                  <li>• Centralized billing & management</li>
                </ul>
              </div>
              <InteriorButton
                variant="primary"
                size="lg"
                onClick={() => {
                  // TODO: Open upgrade modal or redirect to billing
                  alert('Contact sales@l4yercak3.com to upgrade your plan');
                }}
              >
                Upgrade to Scale
              </InteriorButton>
            </div>
          )
        )}

        {activeTab === "product-rollout" && isSuperAdmin && (
          <ProductOSReleaseStageTab />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t" style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}>
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
    </InteriorRoot>
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
