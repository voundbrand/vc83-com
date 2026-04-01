"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { Search, Filter, Plus, MapPin, Building2, Globe, Monitor } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"
import { LocationFormModal } from "./location-form-modal"
import { useNotification } from "@/hooks/use-notification"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"

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
  const { tWithFallback } = useNamespaceTranslations("ui.app.booking")

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<LocationStatus>("")
  const [subtypeFilter, setSubtypeFilter] = useState<LocationSubtype>("")
  const [showFilters, setShowFilters] = useState(false)
  const [showCreateView, setShowCreateView] = useState(false)

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
      <div className="p-4 text-center" style={{ color: "var(--desktop-menu-text-muted)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
          {tWithFallback("ui.app.booking.auth.login_required_title", "Please log in")}
        </p>
        <p className="text-xs mt-2">
          {tWithFallback("ui.app.booking.auth.login_required_locations_hint", "Login required to view locations")}
        </p>
      </div>
    )
  }

  if (showCreateView) {
    return (
      <LocationFormModal
        onClose={() => setShowCreateView(false)}
        onSuccess={() => {
          setShowCreateView(false)
          notification.success(
            tWithFallback("ui.app.booking.location.notifications.created_title", "Location created"),
            tWithFallback("ui.app.booking.location.notifications.created_body", "Your location has been created successfully."),
          )
        }}
      />
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
      case "branch": return tWithFallback("ui.app.booking.location.subtype.branch", "Branch")
      case "venue": return tWithFallback("ui.app.booking.location.subtype.venue", "Venue")
      case "virtual": return tWithFallback("ui.app.booking.location.subtype.virtual", "Virtual")
      default: return subtype
    }
  }

  const formatAddress = (address: { street?: string; city?: string; state?: string } | undefined) => {
    if (!address) return tWithFallback("ui.app.booking.location.list.no_address", "No address")
    const parts = [address.street, address.city, address.state].filter(Boolean)
    return parts.join(", ") || tWithFallback("ui.app.booking.location.list.no_address", "No address")
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with search and filters */}
      <div className="p-3 border-b space-y-2" style={{ background: "var(--desktop-shell-accent)", borderColor: "var(--window-document-border)" }}>
        {/* Search bar */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: "var(--desktop-menu-text-muted)" }} />
            <input
              type="text"
              placeholder={tWithFallback("ui.app.booking.location.list.search_placeholder", "Search locations...")}
              aria-label={tWithFallback("ui.app.booking.location.list.search_aria_label", "Search locations")}
              className="desktop-interior-input w-full h-8 pl-8 pr-2 py-1.5 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`desktop-interior-button px-3 py-1.5 flex items-center gap-1 ${
              showFilters ? "desktop-interior-button-primary" : "desktop-interior-button-subtle"
            }`}
            aria-pressed={showFilters}
            aria-label={tWithFallback("ui.app.booking.location.filters.toggle", "Toggle location filters")}
            title={tWithFallback("ui.app.booking.location.filters.toggle", "Toggle location filters")}
          >
            <Filter size={14} />
          </button>
          <button
            type="button"
            onClick={() => setShowCreateView(true)}
            className="desktop-interior-button desktop-interior-button-primary px-3 py-1.5 flex items-center gap-1"
            title={tWithFallback("ui.app.booking.location.actions.new", "Create location")}
          >
            <Plus size={14} />
            <span className="text-xs">{tWithFallback("ui.app.booking.actions.new", "New")}</span>
          </button>
        </div>

        {/* Filter row */}
        {showFilters && (
          <div className="flex gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LocationStatus)}
              aria-label={tWithFallback("ui.app.booking.location.filters.status", "Filter by location status")}
              className="desktop-interior-select h-8 w-auto px-2 py-1 text-xs"
            >
              <option value="">{tWithFallback("ui.app.booking.location.filters.all_status", "All Status")}</option>
              <option value="active">{tWithFallback("ui.app.booking.location.status.active", "Active")}</option>
              <option value="inactive">{tWithFallback("ui.app.booking.location.status.inactive", "Inactive")}</option>
              <option value="archived">{tWithFallback("ui.app.booking.location.status.archived", "Archived")}</option>
            </select>
            <select
              value={subtypeFilter}
              onChange={(e) => setSubtypeFilter(e.target.value as LocationSubtype)}
              aria-label={tWithFallback("ui.app.booking.location.filters.subtype", "Filter by location type")}
              className="desktop-interior-select h-8 w-auto px-2 py-1 text-xs"
            >
              <option value="">{tWithFallback("ui.app.booking.filters.all_types", "All Types")}</option>
              <option value="branch">{tWithFallback("ui.app.booking.location.subtype.branch", "Branch")}</option>
              <option value="venue">{tWithFallback("ui.app.booking.location.subtype.venue", "Venue")}</option>
              <option value="virtual">{tWithFallback("ui.app.booking.location.subtype.virtual", "Virtual")}</option>
            </select>
          </div>
        )}
        <p className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
          {tWithFallback(
            "ui.app.booking.location.list.result_count",
            "{count} locations",
            { count: filteredLocations?.length ?? 0 },
          )}
        </p>
      </div>

      {/* Locations list */}
      <div className="flex-1 overflow-y-auto">
        {!locations ? (
          <div className="p-4 text-center" style={{ color: "var(--desktop-menu-text-muted)" }}>
            <p className="text-sm">{tWithFallback("ui.app.booking.location.list.loading", "Loading locations...")}</p>
          </div>
        ) : filteredLocations?.length === 0 ? (
          <div className="p-4 text-center" style={{ color: "var(--desktop-menu-text-muted)" }}>
            <MapPin size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">{tWithFallback("ui.app.booking.location.list.empty", "No locations found")}</p>
            <p className="text-xs mt-1">
              {tWithFallback("ui.app.booking.location.list.empty_hint", "Create a new location to get started")}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--window-document-border)" }}>
            {filteredLocations?.map((location) => (
              <button
                key={location._id}
                type="button"
                onClick={() => onSelect(location._id)}
                className="w-full p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-inset hover:bg-[var(--desktop-menu-hover)]"
                aria-pressed={selectedId === location._id}
                aria-label={tWithFallback(
                  "ui.app.booking.location.list.row_aria_label",
                  "{name} in {city}",
                  {
                    name: location.name || tWithFallback("ui.app.booking.location.list.unknown_name", "Unnamed location"),
                    city: (location.customProperties?.address as { city?: string } | undefined)?.city || tWithFallback("ui.app.booking.location.list.unknown_city", "unknown city"),
                  },
                )}
                style={{
                  background: selectedId === location._id ? "var(--desktop-menu-hover)" : "transparent",
                  color: "var(--window-document-text)",
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="p-2 rounded"
                    style={{
                      background: selectedId === location._id ? "var(--window-document-border)" : "var(--desktop-menu-hover)",
                      color: "var(--window-document-text)",
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
                            color: "var(--window-document-text)"
                          }}
                        >
                          {location.status === "inactive"
                            ? tWithFallback("ui.app.booking.location.status.inactive", "Inactive")
                            : location.status === "archived"
                              ? tWithFallback("ui.app.booking.location.status.archived", "Archived")
                              : location.status}
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
                          background: "var(--desktop-menu-hover)",
                          color: "var(--window-document-text)",
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

    </div>
  )
}
