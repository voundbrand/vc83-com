"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { Search, Filter, Plus, Edit, Trash2 } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"
import { ContactFormModal } from "./contact-form-modal"

interface ContactsListProps {
  selectedId: Id<"objects"> | null
  onSelect: (id: Id<"objects">) => void
}

type LifecycleStage = "lead" | "prospect" | "customer" | "partner" | ""
type SourceType = "checkout" | "form" | "manual" | "import" | ""

export function ContactsList({ selectedId, onSelect }: ContactsListProps) {
  const { sessionId } = useAuth()
  const currentOrganization = useCurrentOrganization()
  const currentOrganizationId = currentOrganization?.id

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
        onSelect(null as any)
      }
      setDeletingId(null)
    } catch (error) {
      console.error("Failed to delete contact:", error)
      alert("Failed to delete contact. Please try again.")
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
      <div className="p-4 text-center text-gray-500">
        <p className="font-pixel text-sm">PLEASE LOG IN</p>
        <p className="text-xs mt-2">You need to be logged in to view contacts</p>
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

    // Lifecycle stage filter
    if (stageFilter && props.lifecycleStage !== stageFilter) {
      return false
    }

    return true
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header with search and filters */}
      <div className="p-3 bg-gray-100 border-b-2 border-gray-300 space-y-2">
        {/* Search bar */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search contacts..."
              className="w-full pl-8 pr-2 py-1.5 border-2 border-gray-400 focus:outline-none focus:border-blue-500 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`retro-button px-3 py-1.5 flex items-center gap-1 ${
              showFilters ? "shadow-inner bg-gray-300" : ""
            }`}
            title="Toggle filters"
          >
            <Filter size={14} />
          </button>
          <button
            className="retro-button px-3 py-1.5 flex items-center gap-1"
            title="Add new contact"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="space-y-2 pt-2 border-t border-gray-300">
            <div>
              <label className="text-xs font-pixel mb-1 block">SOURCE:</label>
              <select
                className="w-full px-2 py-1 border-2 border-gray-400 text-sm"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as SourceType)}
              >
                <option value="">All Sources</option>
                <option value="checkout">Checkout</option>
                <option value="form">Form</option>
                <option value="manual">Manual</option>
                <option value="import">Import</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-pixel mb-1 block">STAGE:</label>
              <select
                className="w-full px-2 py-1 border-2 border-gray-400 text-sm"
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value as LifecycleStage)}
              >
                <option value="">All Stages</option>
                <option value="lead">Lead</option>
                <option value="prospect">Prospect</option>
                <option value="customer">Customer</option>
                <option value="partner">Partner</option>
              </select>
            </div>
          </div>
        )}

        {/* Results count */}
        <div className="text-xs text-gray-600">
          {filteredContacts?.length || 0} contact{filteredContacts?.length !== 1 ? "s" : ""} found
        </div>
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto">
        {!contacts ? (
          <div className="p-4 text-center text-gray-500">
            <p className="text-sm">Loading contacts...</p>
          </div>
        ) : filteredContacts && filteredContacts.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p className="text-sm">No contacts found</p>
            {(searchQuery || sourceFilter || stageFilter) && (
              <button
                onClick={() => {
                  setSearchQuery("")
                  setSourceFilter("")
                  setStageFilter("")
                }}
                className="mt-2 text-xs text-blue-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredContacts?.map((contact) => {
              const props = contact.customProperties || {}
              const fullName = props.fullName || `${props.firstName || ""} ${props.lastName || ""}`.trim() || "Unnamed Contact"
              const email = props.email?.toString() || ""
              const stage = props.lifecycleStage?.toString() || "lead"
              const source = props.source?.toString() || "manual"
              const totalSpent = typeof props.totalSpent === "number" ? props.totalSpent : 0
              const purchaseCount = typeof props.purchaseCount === "number" ? props.purchaseCount : 0

              return (
                <div
                  key={contact._id}
                  className={`w-full text-left p-3 hover:bg-blue-50 transition-colors group relative ${
                    selectedId === contact._id ? "bg-blue-100 border-l-4 border-blue-500" : ""
                  }`}
                >
                  <div
                    onClick={() => onSelect(contact._id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{fullName}</div>
                        <div className="text-xs text-gray-600 truncate">{email}</div>

                        {/* Stats row */}
                        {totalSpent > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            ${(totalSpent / 100).toFixed(2)} • {purchaseCount} purchase{purchaseCount !== 1 ? "s" : ""}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tags row */}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-pixel border ${
                          stage === "customer"
                            ? "bg-green-100 border-green-400 text-green-700"
                            : stage === "prospect"
                            ? "bg-blue-100 border-blue-400 text-blue-700"
                            : stage === "lead"
                            ? "bg-yellow-100 border-yellow-400 text-yellow-700"
                            : "bg-gray-100 border-gray-400 text-gray-700"
                        }`}
                      >
                        {stage.toUpperCase()}
                      </span>
                      <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 border border-gray-400 text-gray-600">
                        {source.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons - appear on hover */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingId(contact._id)
                      }}
                      className="p-1.5 bg-white border-2 border-gray-400 hover:bg-gray-100"
                      title="Edit contact"
                    >
                      <Edit size={14} className="text-gray-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeletingId(contact._id)
                      }}
                      className="p-1.5 bg-white border-2 border-red-400 hover:bg-red-50"
                      title="Delete contact"
                    >
                      <Trash2 size={14} className="text-red-600" />
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
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white border-4 border-gray-800 p-6 max-w-md mx-4 shadow-lg">
            <h3 className="text-lg font-bold mb-4">Delete Contact?</h3>
            <p className="text-sm text-gray-700 mb-6">
              Are you sure you want to delete this contact? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 border-2 border-gray-400 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 bg-red-600 text-white border-2 border-red-700 hover:bg-red-700 transition-colors"
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
