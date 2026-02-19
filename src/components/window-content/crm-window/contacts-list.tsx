"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { Search, Filter, Plus, Edit, Trash2 } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"
import { ContactFormModal } from "./contact-form-modal"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { useNotification } from "@/hooks/use-notification"
import { ContactPipelinesBadge } from "./contact-pipelines-badge"

interface ContactsListProps {
  selectedId: Id<"objects"> | null
  onSelect: (id: Id<"objects">) => void
  onNavigateToPipelines?: () => void
}

type LifecycleStage = "lead" | "prospect" | "customer" | "partner" | ""
type SourceType = "checkout" | "form" | "manual" | "import" | ""

export function ContactsList({ selectedId, onSelect, onNavigateToPipelines }: ContactsListProps) {
  const { t } = useNamespaceTranslations("ui.crm")
  const { sessionId } = useAuth()
  const currentOrganization = useCurrentOrganization()
  const currentOrganizationId = currentOrganization?.id
  const notification = useNotification()

  const [searchQuery, setSearchQuery] = useState("")
  const [sourceFilter, setSourceFilter] = useState<SourceType>("")
  const [stageFilter, setStageFilter] = useState<LifecycleStage>("")
  const [showFilters, setShowFilters] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingId, setEditingId] = useState<Id<"objects"> | null>(null)
  const [deletingId, setDeletingId] = useState<Id<"objects"> | null>(null)

  // Mutations
  const deleteContactMutation = useMutation(api.crmOntology.deleteContact)

  // Handle delete
  const handleDelete = async (contactId: Id<"objects">) => {
    if (!sessionId) return

    try {
      await deleteContactMutation({ sessionId, contactId })
      // Clear selection if deleted contact was selected
      if (selectedId === contactId) {
        onSelect(null as unknown as Id<"objects">)
      }
      setDeletingId(null)
      notification.success(
        t("ui.crm.contacts.delete_success") || "Contact deleted",
        "The contact has been removed."
      )
    } catch (error) {
      console.error("Failed to delete contact:", error)
      notification.error(
        t("ui.crm.contacts.delete_failed") || "Failed to delete contact",
        "Please try again."
      )
    }
  }

  // Query contacts
  const contacts = useQuery(
    api.crmOntology.getContacts,
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
        <p className="font-pixel text-sm">{t("ui.crm.contacts.please_login")}</p>
        <p className="text-xs mt-2">{t("ui.crm.contacts.login_required")}</p>
      </div>
    )
  }

  // Filter contacts
  const filteredContacts = contacts?.filter((contact) => {
    const props = contact.customProperties || {}

    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      const email = props.email?.toString().toLowerCase() || ""
      const firstName = props.firstName?.toString().toLowerCase() || ""
      const lastName = props.lastName?.toString().toLowerCase() || ""
      const fullName = `${firstName} ${lastName}`.toLowerCase()

      if (
        !email.includes(searchLower) &&
        !fullName.includes(searchLower) &&
        !firstName.includes(searchLower) &&
        !lastName.includes(searchLower)
      ) {
        return false
      }
    }

    // Source filter
    if (sourceFilter && props.source !== sourceFilter) {
      return false
    }

    // Lifecycle stage filter (read from contact.subtype, not customProperties)
    if (stageFilter && contact.subtype !== stageFilter) {
      return false
    }

    return true
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header with search and filters */}
      <div className="p-3 border-b-2 space-y-2" style={{ background: 'var(--window-document-bg)', borderColor: 'var(--window-document-border)' }}>
        {/* Search bar */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--neutral-gray)' }} />
            <input
              type="text"
              placeholder={t("ui.crm.contacts.search_placeholder")}
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
            onClick={() => setShowFilters(!showFilters)}
            className={`desktop-interior-button px-3 py-1.5 flex items-center gap-1 ${
              showFilters ? "shadow-inner" : ""
            }`}
            style={{
              background: showFilters ? 'var(--desktop-menu-hover)' : 'var(--window-document-bg-elevated)',
              color: showFilters ? 'var(--window-document-text)' : 'var(--window-document-text)'
            }}
            title="Toggle filters"
          >
            <Filter size={14} />
          </button>
          <button
            className="desktop-interior-button px-3 py-1.5 flex items-center gap-1"
            title="Add new contact"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--window-document-border)' }}>
            <div>
              <label className="text-xs font-pixel mb-1 block" style={{ color: 'var(--window-document-text)' }}>
                {t("ui.crm.contacts.filter_label_source")}
              </label>
              <select
                className="w-full px-2 py-1 border-2 text-sm"
                style={{
                  borderColor: 'var(--window-document-border)',
                  background: 'var(--window-document-bg-elevated)',
                  color: 'var(--window-document-text)'
                }}
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as SourceType)}
              >
                <option value="">{t("ui.crm.contacts.filter_all_sources")}</option>
                <option value="checkout">{t("ui.crm.contacts.filter_source_checkout")}</option>
                <option value="form">{t("ui.crm.contacts.filter_source_form")}</option>
                <option value="manual">{t("ui.crm.contacts.filter_source_manual")}</option>
                <option value="import">{t("ui.crm.contacts.filter_source_import")}</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-pixel mb-1 block" style={{ color: 'var(--window-document-text)' }}>
                {t("ui.crm.contacts.filter_label_stage")}
              </label>
              <select
                className="w-full px-2 py-1 border-2 text-sm"
                style={{
                  borderColor: 'var(--window-document-border)',
                  background: 'var(--window-document-bg-elevated)',
                  color: 'var(--window-document-text)'
                }}
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value as LifecycleStage)}
              >
                <option value="">{t("ui.crm.contacts.filter_all_stages")}</option>
                <option value="lead">{t("ui.crm.contacts.stage_lead")}</option>
                <option value="prospect">{t("ui.crm.contacts.stage_prospect")}</option>
                <option value="customer">{t("ui.crm.contacts.stage_customer")}</option>
                <option value="partner">{t("ui.crm.contacts.stage_partner")}</option>
              </select>
            </div>
          </div>
        )}

        {/* Results count */}
        <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
          {filteredContacts?.length || 0} contact{filteredContacts?.length !== 1 ? "s" : ""} found
        </div>
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto">
        {!contacts ? (
          <div className="p-4 text-center" style={{ color: 'var(--neutral-gray)' }}>
            <p className="text-sm">{t("ui.crm.contacts.loading")}</p>
          </div>
        ) : filteredContacts && filteredContacts.length === 0 ? (
          <div className="p-4 text-center" style={{ color: 'var(--neutral-gray)' }}>
            <p className="text-sm">{t("ui.crm.contacts.no_contacts")}</p>
            {(searchQuery || sourceFilter || stageFilter) && (
              <button
                onClick={() => {
                  setSearchQuery("")
                  setSourceFilter("")
                  setStageFilter("")
                }}
                className="mt-2 text-xs hover:underline"
                style={{ color: 'var(--tone-accent)' }}
              >
                {t("ui.crm.contacts.clear_filters")}
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--window-document-border)' }}>
            {filteredContacts?.map((contact) => {
              const props = contact.customProperties || {}
              const fullName = props.fullName || `${props.firstName || ""} ${props.lastName || ""}`.trim() || "Unnamed Contact"
              const email = props.email?.toString() || ""
              const source = props.source?.toString() || "manual"
              const totalSpent = typeof props.totalSpent === "number" ? props.totalSpent : 0
              const purchaseCount = typeof props.purchaseCount === "number" ? props.purchaseCount : 0
              const tags = Array.isArray(props.tags) ? props.tags : []

              return (
                <div
                  key={contact._id}
                  className="w-full text-left p-3 transition-colors group relative"
                  style={{
                    background: selectedId === contact._id ? 'var(--desktop-menu-hover)' : 'transparent',
                    color: selectedId === contact._id ? 'var(--window-document-text)' : 'var(--window-document-text)',
                    borderLeft: selectedId === contact._id ? '4px solid var(--tone-accent)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedId !== contact._id) {
                      e.currentTarget.style.background = 'var(--desktop-menu-hover)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedId !== contact._id) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <div
                    onClick={() => onSelect(contact._id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{fullName}</div>
                        <div className="text-xs truncate" style={{ color: 'var(--neutral-gray)' }}>{email}</div>

                        {/* Stats row */}
                        {totalSpent > 0 && (
                          <div className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                            ${(totalSpent / 100).toFixed(2)} • {purchaseCount} purchase{purchaseCount !== 1 ? "s" : ""}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tags row */}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      <span
                        className="px-1.5 py-0.5 text-[10px] border"
                        style={{
                          background: 'var(--window-document-bg-elevated)',
                          borderColor: 'var(--window-document-border)',
                          color: 'var(--neutral-gray)'
                        }}
                      >
                        {source.toUpperCase()}
                      </span>
                      {/* Custom tags */}
                      {tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 text-[10px] border-2"
                          style={{
                            background: 'var(--window-document-bg-elevated)',
                            borderColor: 'var(--tone-accent)',
                            color: 'var(--tone-accent)'
                          }}
                        >
                          {tag.toUpperCase()}
                        </span>
                      ))}
                    </div>

                    {/* Pipeline badges */}
                    <ContactPipelinesBadge contactId={contact._id} />
                  </div>

                  {/* Action buttons - appear on hover */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingId(contact._id)
                      }}
                      className="p-1.5 border-2 hover:opacity-80"
                      style={{
                        background: 'var(--window-document-bg-elevated)',
                        borderColor: 'var(--window-document-border)'
                      }}
                      title="Edit contact"
                    >
                      <Edit size={14} style={{ color: 'var(--window-document-text)' }} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeletingId(contact._id)
                      }}
                      className="p-1.5 border-2 hover:opacity-80"
                      style={{
                        background: 'var(--window-document-bg-elevated)',
                        borderColor: 'var(--error)'
                      }}
                      title="Delete contact"
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

      {/* Add Contact Modal */}
      {showAddModal && (
        <ContactFormModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(contactId) => {
            setShowAddModal(false);
            onSelect(contactId);
          }}
          onNavigateToPipelines={onNavigateToPipelines}
        />
      )}

      {/* Edit Contact Modal */}
      {editingId && (
        <ContactFormModal
          editId={editingId}
          onClose={() => setEditingId(null)}
          onSuccess={(contactId) => {
            setEditingId(null);
            onSelect(contactId);
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
              {t("ui.crm.contacts.delete_confirm_title")}
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--window-document-text)' }}>
              {t("ui.crm.contacts.delete_confirm_message")}
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
                {t("ui.crm.buttons.cancel")}
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
                {t("ui.crm.buttons.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
