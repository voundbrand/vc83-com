"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { UserManagementTable } from "./user-management-table";
import { RolesPermissionsTab } from "./roles-permissions-tab";
import { OrganizationSection } from "./components/organization-section";
import { AddressCard } from "./components/address-card";
import { AddressModal } from "./components/address-modal";
import { OrganizationDetailsForm, OrganizationDetailsFormRef } from "./organization-details-form";
import { Users, Building2, AlertCircle, Loader2, Shield, Save, Crown, Edit2, X, MapPin, Plus } from "lucide-react";
import { useState, useRef } from "react";
import {
  useAuth,
  useCurrentOrganization,
} from "@/hooks/use-auth";
import { usePermissions } from "@/contexts/permission-context";
import { PermissionGuard, PermissionButton } from "@/components/permission";
import { Id, Doc } from "../../../../convex/_generated/dataModel";

type TabType = "organization" | "users" | "roles";

export function ManageWindow() {
  const [activeTab, setActiveTab] = useState<TabType>("organization");
  const [isEditingOrg, setIsEditingOrg] = useState(false);
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
  }) => {
    if (!organizationId || !sessionId) return;

    setIsSubmittingAddress(true);
    try {
      if (editingAddress) {
        // Update existing address
        await updateAddressMut({
          sessionId,
          addressId: editingAddress._id as Id<"objects">,
          name: data.label || `${data.type} address`,
          ...data,
        });
      } else {
        // Create new address
        await createAddress({
          sessionId,
          organizationId: organizationId as Id<"organizations">,
          subtype: data.type, // type → subtype
          name: data.label || `${data.type} address`,
          ...data,
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
            <p style={{ color: 'var(--win95-text)' }}>Loading...</p>
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
            <p style={{ color: 'var(--win95-text)' }}>Not authenticated</p>
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
            <p style={{ color: 'var(--win95-text)' }} className="font-semibold">No Organization</p>
            <p style={{ color: 'var(--win95-text-secondary)' }} className="text-sm mt-2">
              You need to be part of an organization to access management features.
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
              Manage
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
                  SUPER ADMIN
                </span>
              )}
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              Organization, users, and permissions management
            </p>
          </div>

          {/* Organization Info */}
          <div className="text-right">
            <p className="text-xs font-semibold" style={{ color: 'var(--win95-text)' }}>
              {currentOrganization?.name}
            </p>
            <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
              Your role: {formatRoleName(currentOrganization?.role.name || "")}
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
          Organization
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
          Users & Invites
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
          Roles & Permissions
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
                  backgroundColor: 'var(--warning)',
                  borderColor: 'var(--win95-border)',
                  color: 'var(--win95-text)'
                }}
              >
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
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
                  Organization Details
                </h3>
                <div className="flex gap-2">
                  {isEditingOrg ? (
                    <>
                      <button
                        onClick={handleCancelEdit}
                        disabled={isSavingOrg}
                        className="px-3 py-1 text-xs font-semibold flex items-center gap-1"
                        style={{
                          backgroundColor: "var(--win95-button-face)",
                          color: "var(--win95-text)",
                          border: "2px solid",
                          borderTopColor: "var(--win95-button-light)",
                          borderLeftColor: "var(--win95-button-light)",
                          borderBottomColor: "var(--win95-button-dark)",
                          borderRightColor: "var(--win95-button-dark)",
                        }}
                      >
                        <X size={12} />
                        Cancel
                      </button>
                      <button
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
                        className="px-3 py-1 text-xs font-semibold flex items-center gap-1"
                        style={{
                          backgroundColor: "var(--success)",
                          color: "white",
                          border: "2px solid",
                          borderTopColor: "var(--win95-button-light)",
                          borderLeftColor: "var(--win95-button-light)",
                          borderBottomColor: "var(--win95-button-dark)",
                          borderRightColor: "var(--win95-button-dark)",
                        }}
                      >
                        <Save size={12} />
                        {isSavingOrg ? "Saving..." : "Save All Changes"}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditingOrg(true)}
                      className="px-3 py-1 text-xs font-semibold flex items-center gap-1"
                      style={{
                        backgroundColor: "var(--primary)",
                        color: "white",
                        border: "2px solid",
                        borderTopColor: "var(--win95-button-light)",
                        borderLeftColor: "var(--win95-button-light)",
                        borderBottomColor: "var(--win95-button-dark)",
                        borderRightColor: "var(--win95-button-dark)",
                      }}
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
              title="Addresses"
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
                    className="px-3 py-1.5 text-xs font-semibold flex items-center gap-1"
                    style={{
                      backgroundColor: "var(--success)",
                      color: "white",
                      border: "2px solid",
                      borderTopColor: "var(--win95-button-light)",
                      borderLeftColor: "var(--win95-button-light)",
                      borderBottomColor: "var(--win95-button-dark)",
                      borderRightColor: "var(--win95-button-dark)",
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Address
                  </PermissionButton>
                </PermissionGuard>
              }
            >
              {(!addresses || addresses.length === 0) ? (
                <div className="text-center py-8" style={{ color: 'var(--neutral-gray)' }}>
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No addresses added yet</p>
                  <PermissionGuard permission="manage_organization">
                    <PermissionButton
                      permission="manage_organization"
                      onClick={() => {
                        setEditingAddress(undefined);
                        setIsAddressModalOpen(true);
                      }}
                      className="mt-4 px-4 py-2 text-sm font-semibold"
                      style={{
                        backgroundColor: "var(--primary)",
                        color: "white",
                        border: "2px solid",
                        borderTopColor: "var(--win95-button-light)",
                        borderLeftColor: "var(--win95-button-light)",
                        borderBottomColor: "var(--win95-button-dark)",
                        borderRightColor: "var(--win95-button-dark)",
                      }}
                    >
                      Add Your First Address
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
                        Primary Address
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
                        Other Addresses
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
                  backgroundColor: 'var(--warning)',
                  borderColor: 'var(--win95-border)',
                  color: 'var(--win95-text)'
                }}
              >
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold">Limited Access</p>
                  <p className="text-xs mt-1">
                    As {formatRoleName(currentOrganization?.role.name || "")}, you can view team members but cannot send invitations.
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

        {activeTab === "roles" && (
          <RolesPermissionsTab />
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
          <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
            Changes are saved automatically
          </p>
        </div>
      </div>
    </div>
  );
}

// Helper function to format role names
function formatRoleName(role: string): string {
  const roleDisplay: Record<string, string> = {
    super_admin: "Super Admin",
    org_owner: "Organization Owner",
    business_manager: "Business Manager",
    employee: "Employee",
    viewer: "Viewer",
  };
  return roleDisplay[role] || role;
}

