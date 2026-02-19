"use client";

import { useQuery, useMutation } from "convex/react";
// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../../../convex/_generated/api") as { api: any };
import { UserManagementTable } from "./user-management-table";
import { RolesPermissionsTab } from "./roles-permissions-tab";
import { AdminSecurityTab } from "./admin-security-tab";
import { LicensingTab } from "./licensing-tab";
import { OrganizationSection } from "./components/organization-section";
import { AddressCard } from "./components/address-card";
import { AddressModal } from "./components/address-modal";
import { OrganizationDetailsForm, OrganizationDetailsFormRef } from "./organization-details-form";
import { Users, Building2, AlertCircle, Loader2, Shield, Save, Crown, Edit2, X, MapPin, Plus, Key, Link2 } from "lucide-react";
import { useState, useRef, useEffect, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Id, Doc } from "../../../../../convex/_generated/dataModel";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
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
type TabType = "organization" | "users" | "roles" | "security" | "licensing";

interface AdminManageWindowProps {
  organizationId: Id<"organizations">;
}

type ParentOrganizationOption = {
  _id: Id<"organizations">;
  isActive?: boolean;
  parentOrganizationId?: Id<"organizations"> | null;
  name?: string | null;
  slug?: string | null;
};

type OrganizationAddress = Doc<"objects"> & {
  customProperties?: {
    isPrimary?: boolean;
  } & Record<string, unknown>;
};

export function AdminManageWindow({ organizationId }: AdminManageWindowProps) {
  const { t } = useNamespaceTranslations("ui.manage");
  const manageRootClassName = "manage-window-modern flex h-full flex-col";
  const [activeTab, setActiveTab] = useState<TabType>("organization");
  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [isSavingOrg, setIsSavingOrg] = useState(false);

  // Address management state
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Doc<"objects"> | undefined>();
  const [isSubmittingAddress, setIsSubmittingAddress] = useState(false);

  // Parent organization state
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [isSavingParent, setIsSavingParent] = useState(false);
  const [parentSaveError, setParentSaveError] = useState<string | null>(null);

  // Ref to organization form for accessing form data
  const organizationFormRef = useRef<OrganizationDetailsFormRef>(null);

  // Use existing useAuth hooks
  const { user, isLoading, sessionId, isSuperAdmin } = useAuth();

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

  // Get organization details with sessionId - using prop organizationId
  const organization = useQuery(api.organizations.getById,
    organizationId && sessionId ? { organizationId, sessionId } : "skip"
  );

  // Get organization addresses (from ontology)
  const addresses = useQuery(api.organizationOntology.getOrganizationAddresses,
    organizationId ? { organizationId } : "skip"
  ) as OrganizationAddress[] | undefined;

  // Get all organizations for parent selection (super admin only)
  const allOrganizations = useQuery(
    api.organizations.listAll,
    sessionId && isSuperAdmin ? { sessionId } : "skip"
  ) as ParentOrganizationOption[] | undefined;

  // Mutation for updating parent
  const updateOrganizationParent = useMutation(api.organizations.updateOrganizationParent);

  // Filter to only show orgs that can be parents (not sub-orgs, not self)
  const potentialParentOrgs = allOrganizations?.filter(org =>
    org.isActive && !org.parentOrganizationId && org._id !== organizationId
  ) || [];

  const tabs: Array<{ id: TabType; label: string; icon: ReactNode }> = [
    { id: "organization", label: t("ui.manage.tab.organization"), icon: <Building2 size={14} /> },
    { id: "users", label: t("ui.manage.tab.users_invites"), icon: <Users size={14} /> },
    { id: "roles", label: t("ui.manage.tab.roles_permissions"), icon: <Shield size={14} /> },
    { id: "security", label: "Security & API", icon: <Key size={14} /> },
    { id: "licensing", label: "Licensing", icon: <Crown size={14} /> },
  ];


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

  // Initialize selectedParentId when organization loads
  useEffect(() => {
    if (organization?.parentOrganizationId) {
      setSelectedParentId(organization.parentOrganizationId);
    } else {
      setSelectedParentId("");
    }
  }, [organization?.parentOrganizationId]);

  // Handler for updating parent organization
  const handleSaveParent = async () => {
    if (!sessionId || !organizationId) return;

    setIsSavingParent(true);
    setParentSaveError(null);

    try {
      await updateOrganizationParent({
        sessionId,
        organizationId: organizationId as Id<"organizations">,
        parentOrganizationId: selectedParentId ? selectedParentId as Id<"organizations"> : null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update parent organization";
      setParentSaveError(message);
      console.error("Failed to update parent organization:", error);
    } finally {
      setIsSavingParent(false);
    }
  };

  // Check if parent has changed from current
  const parentHasChanged = (organization?.parentOrganizationId || "") !== selectedParentId;

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

  // System admin check - only super admins can use this window
  if (!isSuperAdmin) {
    return (
      <InteriorRoot className={manageRootClassName}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Shield size={48} style={{ color: 'var(--error)' }} className="mx-auto mb-4" />
            <p className="font-semibold" style={{ color: "var(--window-document-text)" }}>Access Denied</p>
            <p className="text-sm mt-2" style={{ color: "var(--desktop-menu-text-muted)" }}>
              Only system administrators can access this view.
            </p>
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
              <span
                className="inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold uppercase"
                style={{
                  backgroundColor: "var(--error-bg)",
                  borderColor: "var(--error)",
                  color: "var(--error)",
                }}
              >
                <Crown size={10} className="mr-1" />
                System Admin Mode
              </span>
            </InteriorTitle>
            <InteriorSubtitle className="mt-1 text-xs">
              Managing organization as system administrator
            </InteriorSubtitle>
          </div>

          <div className="text-right">
            <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
              {organization?.name}
            </p>
            <InteriorHelperText className="text-xs">
              Organization ID: {organizationId.slice(0, 8)}...
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
            {/* System Admin has full access - no permission warning */}

            {/* Edit/Save Controls */}
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
                  Organization Details
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
                        Cancel
                      </InteriorButton>
                      <InteriorButton
                        onClick={async () => {
                          if (!organizationFormRef.current || !sessionId || !organizationId) return;

                          const formData = organizationFormRef.current.getFormData();

                          setIsSavingOrg(true);
                          try {
                            // Update core organization fields
                            await updateOrganization({
                              sessionId,
                              organizationId: organizationId as Id<"organizations">,
                              updates: {
                                name: formData.name,
                                businessName: formData.businessName,
                                slug: formData.slug,
                              },
                            });

                            // Update ontology data in parallel
                            await Promise.all([
                              // Profile
                              updateProfile({
                                sessionId,
                                organizationId: organizationId as Id<"organizations">,
                                industry: formData.industry,
                                foundedYear: formData.foundedYear,
                                employeeCount: formData.employeeCount,
                                bio: formData.bio,
                              }),
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
                              }),
                              // Social
                              updateSocial({
                                sessionId,
                                organizationId: organizationId as Id<"organizations">,
                                linkedin: formData.socialMedia.linkedin,
                                twitter: formData.socialMedia.twitter,
                                facebook: formData.socialMedia.facebook,
                                instagram: formData.socialMedia.instagram,
                              }),
                              // Legal
                              updateLegal({
                                sessionId,
                                organizationId: organizationId as Id<"organizations">,
                                taxId: formData.taxId,
                                vatNumber: formData.vatNumber,
                                companyRegistrationNumber: formData.companyRegistrationNumber,
                                legalEntityType: formData.legalEntityType,
                              }),
                              // Settings (branding)
                              updateSettings({
                                sessionId,
                                organizationId: organizationId as Id<"organizations">,
                                subtype: "branding",
                                settings: formData.settings.branding,
                              }),
                              // Settings (locale)
                              updateSettings({
                                sessionId,
                                organizationId: organizationId as Id<"organizations">,
                                subtype: "locale",
                                settings: formData.settings.locale,
                              }),
                              // Settings (invoicing)
                              updateSettings({
                                sessionId,
                                organizationId: organizationId as Id<"organizations">,
                                subtype: "invoicing",
                                settings: formData.settings.invoicing,
                              }),
                            ]);

                            setIsEditingOrg(false);
                          } catch (error) {
                            console.error("Failed to update organization:", error);
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
                        {isSavingOrg ? "Saving..." : "Save All Changes"}
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

            {/* Comprehensive Organization Details Form */}
            {organization && (
              <OrganizationDetailsForm
                ref={organizationFormRef}
                organization={organization}
                isEditing={isEditingOrg}
                isSaving={isSavingOrg}
              />
            )}

            {/* Parent Organization Section (Super Admin Only) */}
            {isSuperAdmin && (
              <OrganizationSection
                title="Parent Organization"
                icon={<Link2 className="w-4 h-4" />}
                collapsible={true}
                defaultCollapsed={true}
              >
                <div className="space-y-4">
                  <p className="text-sm" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    Set this organization as a sub-organization of another. Sub-organizations can inherit templates,
                    forms, and other assets from their parent.
                  </p>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                      Parent Organization
                    </label>
                    <select
                      value={selectedParentId}
                      onChange={(e) => setSelectedParentId(e.target.value)}
                      className="desktop-interior-select w-full text-sm"
                    >
                      <option value="">-- None (Top-level organization) --</option>
                      {potentialParentOrgs.map((org) => (
                        <option key={org._id} value={org._id}>
                          {org.name} ({org.slug})
                        </option>
                      ))}
                    </select>
                  </div>

                  {organization?.parentOrganizationId && (
                    <div className="desktop-interior-panel border p-3" style={{ borderColor: "var(--window-document-border)" }}>
                      <p className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                        <strong>Current parent:</strong>{' '}
                        {potentialParentOrgs.find(o => o._id === organization.parentOrganizationId)?.name ||
                         allOrganizations?.find(o => o._id === organization.parentOrganizationId)?.name ||
                         'Unknown'}
                      </p>
                    </div>
                  )}

                  {parentSaveError && (
                    <div className="desktop-interior-panel border p-3" style={{ borderColor: "var(--error)", color: "var(--error)" }}>
                      <p className="text-sm">{parentSaveError}</p>
                    </div>
                  )}

                  {parentHasChanged && (
                    <div className="flex justify-end">
                      <InteriorButton
                        onClick={handleSaveParent}
                        disabled={isSavingParent}
                        variant="primary"
                        size="md"
                      >
                        {isSavingParent ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                        Save Parent Relationship
                      </InteriorButton>
                    </div>
                  )}
                </div>
              </OrganizationSection>
            )}

            {/* Addresses Section */}
            <OrganizationSection
              title={t("ui.manage.org.section.addresses")}
              icon={<MapPin className="w-4 h-4" />}
              collapsible={true}
              defaultCollapsed={false}
              actions={
                <InteriorButton
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent accordion toggle
                    setEditingAddress(undefined);
                    setIsAddressModalOpen(true);
                  }}
                  variant="primary"
                  size="sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t("ui.manage.org.add_address")}
                </InteriorButton>
              }
            >
              {(!addresses || addresses.length === 0) ? (
                <div className="text-center py-8" style={{ color: 'var(--neutral-gray)' }}>
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t("ui.manage.org.no_addresses")}</p>
                  <InteriorButton
                    onClick={() => {
                      setEditingAddress(undefined);
                      setIsAddressModalOpen(true);
                    }}
                    variant="primary"
                    size="md"
                    className="mt-4"
                  >
                    {t("ui.manage.org.add_first_address")}
                  </InteriorButton>
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
                        canEdit={true}
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
                      <h4 className="text-sm font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
                        {t("ui.manage.org.other_addresses")}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {addresses
                          .filter((a) => !(a.customProperties as any)?.isPrimary)
                          .map((address) => (
                            <AddressCard
                              key={address._id}
                              address={address}
                              canEdit={true}
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
            {/* System Admin has full access - no permission warning */}

            {/* User Management Table */}
            <UserManagementTable
              organizationId={organizationId}
            />
          </div>
        )}

        {activeTab === "roles" && (
          <RolesPermissionsTab />
        )}

        {activeTab === "security" && sessionId && (
          <AdminSecurityTab
            organizationId={organizationId}
            sessionId={sessionId}
          />
        )}

        {activeTab === "licensing" && sessionId && (
          <LicensingTab
            organizationId={organizationId}
            sessionId={sessionId}
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t" style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}>
        <div className="flex justify-between items-center">
          <p className="text-xs font-semibold" style={{ color: 'var(--error)' }}>
             System Admin Mode - Full access to organization settings
          </p>
          <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
            Changes are saved automatically
          </p>
        </div>
      </div>
    </InteriorRoot>
  );
}
