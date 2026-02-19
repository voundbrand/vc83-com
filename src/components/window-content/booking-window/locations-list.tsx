"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { Search, Filter, Plus, MapPin, Building2, Globe, Monitor } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"
import { LocationFormModal } from "./location-form-modal"
import { useNotification } from "@/hooks/use-notification"

interface LocationsListProps {
  selectedId: Id<"objects"> | null
  onSelect: (id: Id<"objects">) => void
}

type LocationStatus = "active" | "inactive" | "archived" | ""
type LocationSubtype = "branch" | "venue" | "virtual" | ""

export function LocationsList({ selectedId, onSelect }: LocationsListProps) {
  const { sessionId } = useAuth()
  const currentOrganization = useCurrentOrganization()
  const currentOrganizationId = currentOrganization?.id
  const notification = useNotification()

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<LocationStatus>("")
  const [subtypeFilter, setSubtypeFilter] = useState<LocationSubtype>("")
  const [showFilters, setShowFilters] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  // Query locations
  const locations = useQuery(
    api.locationOntology.getLocations,
    sessionId && currentOrganizationId
      ? {
          sessionId,
          organizationId: currentOrganizationId as Id<"organizations">,
          status: statusFilter || undefined,
          subtype: subtypeFilter || undefined,
        }
      : "skip"
  )

  if (!sessionId || !currentOrganizationId) {
    return (
      <div className="p-4 text-center" style={{ color: 'var(--neutral-gray)' }}>
        <p className="font-pixel text-sm">Please log in</p>
        <p className="text-xs mt-2">Login required to view locations</p>
      </div>
    )
  }

  // Filter locations by search
  const filteredLocations = locations?.filter((location) => {
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      const name = location.name?.toLowerCase() || ""
      const city = (location.customProperties?.address as { city?: string })?.city?.toLowerCase() || ""

      if (!name.includes(searchLower) && !city.includes(searchLower)) {
        return false
      }
    }
    return true
  })

  const getSubtypeIcon = (subtype: string) => {
    switch (subtype) {
      case "branch": return <Building2 size={14} />
      case "venue": return <MapPin size={14} />
      case "virtual": return <Monitor size={14} />
      default: return <MapPin size={14} />
    }
  }

  const getSubtypeLabel = (subtype: string) => {
    switch (subtype) {
      case "branch": return "Branch"
      case "venue": return "Venue"
      case "virtual": return "Virtual"
      default: return subtype
    }
  }

  const formatAddress = (address: { street?: string; city?: string; state?: string } | undefined) => {
    if (!address) return "No address"
    const parts = [address.street, address.city, address.state].filter(Boolean)
    return parts.join(", ") || "No address"
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with search and filters */}
      <div className="p-3 border-b-2 space-y-2" style={{ background: 'var(--shell-surface)', borderColor: 'var(--shell-border)' }}>
        {/* Search bar */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--neutral-gray)' }} />
            <input
              type="text"
              placeholder="Search locations..."
              className="w-full pl-8 pr-2 py-1.5 border-2 focus:outline-none text-sm"
              style={{
                borderColor: 'var(--shell-border)',
                background: 'var(--shell-input-surface)',
                color: 'var(--shell-input-text)'
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
              background: showFilters ? 'var(--shell-selection-bg)' : 'var(--shell-button-surface)',
              color: showFilters ? 'var(--shell-selection-text)' : 'var(--shell-text)'
            }}
          >
            <Filter size={14} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="desktop-interior-button px-3 py-1.5 flex items-center gap-1"
            style={{
              background: 'var(--shell-button-surface)',
              color: 'var(--shell-text)'
            }}
          >
            <Plus size={14} />
            <span className="text-xs">New</span>
          </button>
        </div>

        {/* Filter row */}
        {showFilters && (
          <div className="flex gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LocationStatus)}
              className="px-2 py-1 border-2 text-xs"
              style={{
                borderColor: 'var(--shell-border)',
                background: 'var(--shell-input-surface)',
                color: 'var(--shell-input-text)'
              }}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
            <select
              value={subtypeFilter}
              onChange={(e) => setSubtypeFilter(e.target.value as LocationSubtype)}
              className="px-2 py-1 border-2 text-xs"
              style={{
                borderColor: 'var(--shell-border)',
                background: 'var(--shell-input-surface)',
                color: 'var(--shell-input-text)'
              }}
            >
              <option value="">All Types</option>
              <option value="branch">Branch</option>
              <option value="venue">Venue</option>
              <option value="virtual">Virtual</option>
            </select>
          </div>
        )}
      </div>

      {/* Locations list */}
      <div className="flex-1 overflow-y-auto">
        {!locations ? (
          <div className="p-4 text-center" style={{ color: 'var(--neutral-gray)' }}>
            <p className="text-sm">Loading locations...</p>
          </div>
        ) : filteredLocations?.length === 0 ? (
          <div className="p-4 text-center" style={{ color: 'var(--neutral-gray)' }}>
            <MapPin size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No locations found</p>
            <p className="text-xs mt-1">Create a new location to get started</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--shell-border)' }}>
            {filteredLocations?.map((location) => (
              <button
                key={location._id}
                onClick={() => onSelect(location._id)}
                className="w-full p-3 text-left hover:opacity-80 transition-opacity"
                style={{
                  background: selectedId === location._id ? 'var(--shell-selection-bg)' : 'transparent',
                  color: selectedId === location._id ? 'var(--shell-selection-text)' : 'var(--shell-text)'
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="p-2 rounded"
                    style={{
                      background: selectedId === location._id ? 'var(--shell-selection-text)' : 'var(--shell-selection-bg)',
                      color: selectedId === location._id ? 'var(--shell-selection-bg)' : 'var(--shell-selection-text)'
                    }}
                  >
                    {getSubtypeIcon(location.subtype || "venue")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{location.name}</span>
                      {location.status !== "active" && (
                        <span
                          className="px-1.5 py-0.5 text-xs rounded"
                          style={{
                            background: location.status === "inactive" ? 'var(--warning-bg)' : 'var(--error-bg)',
                            color: 'white'
                          }}
                        >
                          {location.status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs truncate opacity-70 mt-0.5">
                      {formatAddress(location.customProperties?.address as { street?: string; city?: string; state?: string })}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="px-1.5 py-0.5 text-xs rounded"
                        style={{
                          background: 'var(--shell-surface-elevated)',
                          color: 'var(--shell-text)'
                        }}
                      >
                        {getSubtypeLabel(location.subtype || "")}
                      </span>
                      {location.customProperties?.timezone && (
                        <span className="text-xs opacity-60 flex items-center gap-1">
                          <Globe size={10} /> {String(location.customProperties.timezone)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <LocationFormModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            notification.success("Location created", "Your location has been created successfully.")
          }}
        />
      )}
    </div>
  )
}
