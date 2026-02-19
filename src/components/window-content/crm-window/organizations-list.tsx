"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { Search, Plus, Building2, Edit, Trash2 } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"
import { OrganizationFormModal } from "./organization-form-modal"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { useNotification } from "@/hooks/use-notification"

interface OrganizationsListProps {
  selectedId: Id<"objects"> | null
  onSelect: (id: Id<"objects">) => void
  onNavigateToPipelines?: () => void
}

export function OrganizationsList({ selectedId, onSelect, onNavigateToPipelines }: OrganizationsListProps) {
  const { t } = useNamespaceTranslations("ui.crm")
  const { sessionId } = useAuth()
  const currentOrganization = useCurrentOrganization()
  const currentOrganizationId = currentOrganization?.id
  const notification = useNotification()

  const [searchQuery, setSearchQuery] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingId, setEditingId] = useState<Id<"objects"> | null>(null)
  const [deletingId, setDeletingId] = useState<Id<"objects"> | null>(null)

  // Mutations
  const deleteOrgMutation = useMutation(api.crmOntology.deleteCrmOrganization)

  // Handle delete
  const handleDelete = async (orgId: Id<"objects">) => {
    if (!sessionId) return

    try {
      await deleteOrgMutation({ sessionId, crmOrganizationId: orgId })
      // Clear selection if deleted org was selected
      if (selectedId === orgId) {
        onSelect(null as unknown as Id<"objects">)
      }
      setDeletingId(null)
      notification.success(
        t("ui.crm.organizations.delete_success") || "Organization deleted",
        "The organization has been removed."
      )
    } catch (error) {
      console.error("Failed to delete organization:", error)
      notification.error(
        t("ui.crm.organizations.delete_failed") || "Failed to delete organization",
        "Please try again."
      )
    }
  }

  // Query organizations
  const organizations = useQuery(
    api.crmOntology.getCrmOrganizations,
    sessionId && currentOrganizationId
      ? {
          sessionId,
          organizationId: currentOrganizationId as Id<"organizations">,
          status: "active",
        }
      : "skip"
  )

  if (!sessionId || !currentOrganizationId) {
    return (
      <div className="p-4 text-center" style={{ color: 'var(--neutral-gray)' }}>
        <p className="font-pixel text-sm">{t("ui.crm.organizations.login_required")}</p>
        <p className="text-xs mt-2">{t("ui.crm.organizations.login_message")}</p>
      </div>
    )
  }

  // Filter organizations
  const filteredOrgs = organizations?.filter((org) => {
    if (!searchQuery) return true

    const searchLower = searchQuery.toLowerCase()
    const name = org.name?.toLowerCase() || ""
    const props = org.customProperties || {}
    const website = props.website?.toString().toLowerCase() || ""
    const industry = props.industry?.toString().toLowerCase() || ""

    return name.includes(searchLower) || website.includes(searchLower) || industry.includes(searchLower)
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header with search */}
      <div className="p-3 border-b-2 space-y-2" style={{ background: 'var(--window-document-bg-elevated)', borderColor: 'var(--window-document-border)' }}>
        {/* Search bar */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--neutral-gray)' }} />
            <input
              type="text"
              placeholder={t("ui.crm.organizations.search_placeholder")}
              className="w-full pl-8 pr-2 py-1.5 border-2 focus:outline-none text-sm"
              style={{
                borderColor: 'var(--window-document-border)',
                background: 'var(--window-document-bg-elevated)',
                color: 'var(--window-document-text)'
              }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            className="desktop-interior-button px-3 py-1.5 flex items-center gap-1"
            title={t("ui.crm.organizations.add_organization")}
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Results count */}
        <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
          {filteredOrgs?.length || 0} {filteredOrgs?.length === 1 ? t("ui.crm.organizations.organization") : t("ui.crm.organizations.organizations_plural")} {t("ui.crm.organizations.found")}
        </div>
      </div>

      {/* Organizations list */}
      <div className="flex-1 overflow-y-auto">
        {!organizations ? (
          <div className="p-4 text-center" style={{ color: 'var(--neutral-gray)' }}>
            <p className="text-sm">{t("ui.crm.organizations.loading")}</p>
          </div>
        ) : filteredOrgs && filteredOrgs.length === 0 ? (
          <div className="p-4 text-center" style={{ color: 'var(--neutral-gray)' }}>
            <p className="text-sm">{t("ui.crm.organizations.no_organizations")}</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-2 text-xs hover:underline"
                style={{ color: 'var(--tone-accent)' }}
              >
                {t("ui.crm.organizations.clear_search")}
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--window-document-border)' }}>
            {filteredOrgs?.map((org) => {
              const props = org.customProperties || {}
              const website = props.website?.toString()
              const industry = props.industry?.toString()
              const size = props.size?.toString()

              return (
                <div
                  key={org._id}
                  className="w-full text-left p-3 transition-colors group relative"
                  style={{
                    background: selectedId === org._id ? 'var(--desktop-menu-hover)' : 'transparent',
                    color: selectedId === org._id ? 'var(--window-document-text)' : 'var(--window-document-text)',
                    borderLeftWidth: selectedId === org._id ? '4px' : '0',
                    borderLeftColor: selectedId === org._id ? 'var(--tone-accent)' : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedId !== org._id) {
                      e.currentTarget.style.background = 'var(--desktop-menu-hover)'
                      e.currentTarget.style.color = 'var(--window-document-text)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedId !== org._id) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = ''
                    }
                  }}
                >
                  <div
                    onClick={() => onSelect(org._id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-start gap-2">
                      <Building2 size={20} className="mt-0.5 flex-shrink-0" style={{ color: 'inherit' }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate" style={{ color: 'inherit' }}>{org.name}</div>
                        {website && (
                          <div className="text-xs truncate" style={{ color: 'inherit', opacity: 0.8 }}>{website}</div>
                        )}
                        {(industry || size) && (
                          <div className="text-xs mt-1" style={{ color: 'inherit', opacity: 0.8 }}>
                            {[industry, size].filter(Boolean).join(" • ")}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stage tag */}
                    {org.subtype && (
                      <div className="mt-2">
                        <span
                          className="px-1.5 py-0.5 text-[10px] font-pixel border-2"
                          style={{
                            background: 'var(--window-document-bg-elevated)',
                            borderColor: org.subtype === "customer" ? 'var(--success)' : org.subtype === "prospect" ? 'var(--tone-accent)' : org.subtype === "partner" ? 'var(--tone-accent)' : org.subtype === "sponsor" ? 'var(--neutral-gray)' : 'var(--window-document-border)',
                            color: org.subtype === "customer" ? 'var(--success)' : org.subtype === "prospect" ? 'var(--tone-accent)' : org.subtype === "partner" ? 'var(--tone-accent)' : org.subtype === "sponsor" ? 'var(--neutral-gray)' : 'var(--window-document-text)'
                          }}
                        >
                          {org.subtype.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action buttons - appear on hover */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingId(org._id)
                      }}
                      className="p-1.5 border-2 hover:opacity-80"
                      style={{
                        background: 'var(--window-document-bg-elevated)',
                        borderColor: 'var(--window-document-border)'
                      }}
                      title={t("ui.crm.organizations.edit_organization")}
                    >
                      <Edit size={14} style={{ color: 'var(--window-document-text)' }} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeletingId(org._id)
                      }}
                      className="p-1.5 border-2 hover:opacity-80"
                      style={{
                        background: 'var(--window-document-bg-elevated)',
                        borderColor: 'var(--error)'
                      }}
                      title="Delete organization"
                    >
                      <Trash2 size={14} style={{ color: 'var(--error)' }} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Organization Modal */}
      {showAddModal && (
        <OrganizationFormModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(organizationId) => {
            setShowAddModal(false)
            onSelect(organizationId)
          }}
          onNavigateToPipelines={onNavigateToPipelines}
        />
      )}

      {/* Edit Organization Modal */}
      {editingId && (
        <OrganizationFormModal
          editId={editingId}
          onClose={() => setEditingId(null)}
          onSuccess={(organizationId) => {
            setEditingId(null)
            onSelect(organizationId)
          }}
          onNavigateToPipelines={onNavigateToPipelines}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingId && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div
            className="border-4 p-6 max-w-md mx-4 shadow-lg"
            style={{
              background: 'var(--window-document-bg)',
              borderColor: 'var(--window-document-border)'
            }}
          >
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--window-document-text)' }}>
              Delete Organization?
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--window-document-text)' }}>
              Are you sure you want to delete this organization? This will also remove all contact associations. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 border-2 hover:opacity-80 transition-colors"
                style={{
                  borderColor: 'var(--window-document-border)',
                  background: 'var(--window-document-bg-elevated)',
                  color: 'var(--window-document-text)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 border-2 hover:opacity-80 transition-colors"
                style={{
                  background: 'var(--error)',
                  color: 'white',
                  borderColor: 'var(--error)'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
