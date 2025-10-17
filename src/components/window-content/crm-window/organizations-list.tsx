"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { Search, Plus, Building2 } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"

interface OrganizationsListProps {
  selectedId: Id<"objects"> | null
  onSelect: (id: Id<"objects">) => void
}

export function OrganizationsList({ selectedId, onSelect }: OrganizationsListProps) {
  const { sessionId } = useAuth()
  const currentOrganization = useCurrentOrganization()
  const currentOrganizationId = currentOrganization?.id

  const [searchQuery, setSearchQuery] = useState("")

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
      <div className="p-4 text-center text-gray-500">
        <p className="font-pixel text-sm">PLEASE LOG IN</p>
        <p className="text-xs mt-2">You need to be logged in to view organizations</p>
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
      <div className="p-3 bg-gray-100 border-b-2 border-gray-300 space-y-2">
        {/* Search bar */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search organizations..."
              className="w-full pl-8 pr-2 py-1.5 border-2 border-gray-400 focus:outline-none focus:border-blue-500 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            className="retro-button px-3 py-1.5 flex items-center gap-1"
            title="Add new organization"
            onClick={() => alert("Add organization feature coming soon!")}
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Results count */}
        <div className="text-xs text-gray-600">
          {filteredOrgs?.length || 0} organization{filteredOrgs?.length !== 1 ? "s" : ""} found
        </div>
      </div>

      {/* Organizations list */}
      <div className="flex-1 overflow-y-auto">
        {!organizations ? (
          <div className="p-4 text-center text-gray-500">
            <p className="text-sm">Loading organizations...</p>
          </div>
        ) : filteredOrgs && filteredOrgs.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p className="text-sm">No organizations found</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-2 text-xs text-blue-600 hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredOrgs?.map((org) => {
              const props = org.customProperties || {}
              const website = props.website?.toString()
              const industry = props.industry?.toString()
              const size = props.size?.toString()

              return (
                <button
                  key={org._id}
                  onClick={() => onSelect(org._id)}
                  className={`w-full text-left p-3 hover:bg-blue-50 transition-colors ${
                    selectedId === org._id ? "bg-blue-100 border-l-4 border-blue-500" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Building2 size={20} className="text-purple-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{org.name}</div>
                      {website && (
                        <div className="text-xs text-gray-600 truncate">{website}</div>
                      )}
                      {(industry || size) && (
                        <div className="text-xs text-gray-500 mt-1">
                          {[industry, size].filter(Boolean).join(" • ")}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stage tag */}
                  {org.subtype && (
                    <div className="mt-2">
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-pixel border ${
                          org.subtype === "customer"
                            ? "bg-green-100 border-green-400 text-green-700"
                            : org.subtype === "prospect"
                            ? "bg-blue-100 border-blue-400 text-blue-700"
                            : org.subtype === "partner"
                            ? "bg-purple-100 border-purple-400 text-purple-700"
                            : "bg-gray-100 border-gray-400 text-gray-700"
                        }`}
                      >
                        {org.subtype.toUpperCase()}
                      </span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
