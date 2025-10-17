"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { Search, Filter, Plus } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"

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
            onClick={() => alert("Add contact feature coming soon!")}
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
                <button
                  key={contact._id}
                  onClick={() => onSelect(contact._id)}
                  className={`w-full text-left p-3 hover:bg-blue-50 transition-colors ${
                    selectedId === contact._id ? "bg-blue-100 border-l-4 border-blue-500" : ""
                  }`}
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
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
