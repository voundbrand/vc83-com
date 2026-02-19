"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { Search, Filter, Plus, Gift, Percent, Tag, Calendar } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"
import { BenefitFormModal } from "./benefit-form-modal"
import { useNotification } from "@/hooks/use-notification"

interface BenefitsListProps {
  selectedId: Id<"objects"> | null
  onSelect: (id: Id<"objects">) => void
}

type BenefitSubtype = "discount" | "service" | "product" | "event" | ""

export function BenefitsList({ selectedId, onSelect }: BenefitsListProps) {
  const { sessionId } = useAuth()
  const currentOrganization = useCurrentOrganization()
  const currentOrganizationId = currentOrganization?.id
  const notification = useNotification()

  const [searchQuery, setSearchQuery] = useState("")
  const [subtypeFilter, setSubtypeFilter] = useState<BenefitSubtype>("")
  const [showFilters, setShowFilters] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  // Query benefits
  const benefits = useQuery(
    api.benefitsOntology.listBenefits,
    sessionId && currentOrganizationId
      ? {
          sessionId,
          organizationId: currentOrganizationId as Id<"organizations">,
          subtype: subtypeFilter || undefined,
        }
      : "skip"
  )

  if (!sessionId || !currentOrganizationId) {
    return (
      <div className="p-4 text-center" style={{ color: 'var(--neutral-gray)' }}>
        <p className="font-pixel text-sm">Please log in</p>
        <p className="text-xs mt-2">Login required to view benefits</p>
      </div>
    )
  }

  // Filter benefits by search
  const filteredBenefits = benefits?.filter((benefit) => {
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      const name = benefit.name?.toLowerCase() || ""
      const description = benefit.description?.toLowerCase() || ""
      const category = (benefit.customProperties?.category as string)?.toLowerCase() || ""

      if (
        !name.includes(searchLower) &&
        !description.includes(searchLower) &&
        !category.includes(searchLower)
      ) {
        return false
      }
    }
    return true
  })

  const getSubtypeIcon = (subtype: string) => {
    switch (subtype) {
      case "discount": return <Percent size={14} />
      case "service": return <Tag size={14} />
      case "product": return <Gift size={14} />
      case "event": return <Calendar size={14} />
      default: return <Gift size={14} />
    }
  }

  const getSubtypeLabel = (subtype: string) => {
    switch (subtype) {
      case "discount": return "Discount"
      case "service": return "Service"
      case "product": return "Product"
      case "event": return "Event"
      default: return subtype
    }
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
              placeholder="Search benefits..."
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
            className={`desktop-shell-button px-3 py-1.5 flex items-center gap-1 ${
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
            className="desktop-shell-button px-3 py-1.5 flex items-center gap-1"
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
              value={subtypeFilter}
              onChange={(e) => setSubtypeFilter(e.target.value as BenefitSubtype)}
              className="px-2 py-1 border-2 text-xs"
              style={{
                borderColor: 'var(--shell-border)',
                background: 'var(--shell-input-surface)',
                color: 'var(--shell-input-text)'
              }}
            >
              <option value="">All Types</option>
              <option value="discount">Discount</option>
              <option value="service">Service</option>
              <option value="product">Product</option>
              <option value="event">Event</option>
            </select>
          </div>
        )}
      </div>

      {/* Benefits list */}
      <div className="flex-1 overflow-y-auto">
        {!benefits ? (
          <div className="p-4 text-center" style={{ color: 'var(--neutral-gray)' }}>
            <p className="text-sm">Loading benefits...</p>
          </div>
        ) : filteredBenefits?.length === 0 ? (
          <div className="p-4 text-center" style={{ color: 'var(--neutral-gray)' }}>
            <Gift size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No benefits found</p>
            <p className="text-xs mt-1">Create a new benefit to get started</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--shell-border)' }}>
            {filteredBenefits?.map((benefit) => (
              <button
                key={benefit._id}
                onClick={() => onSelect(benefit._id)}
                className="w-full p-3 text-left hover:opacity-80 transition-opacity"
                style={{
                  background: selectedId === benefit._id ? 'var(--shell-selection-bg)' : 'transparent',
                  color: selectedId === benefit._id ? 'var(--shell-selection-text)' : 'var(--shell-text)'
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="p-2 rounded"
                    style={{
                      background: selectedId === benefit._id ? 'var(--shell-selection-text)' : 'var(--shell-selection-bg)',
                      color: selectedId === benefit._id ? 'var(--shell-selection-bg)' : 'var(--shell-selection-text)'
                    }}
                  >
                    {getSubtypeIcon(benefit.subtype || "discount")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{benefit.name}</span>
                      {benefit.customProperties?.discountValue && (
                        <span
                          className="px-1.5 py-0.5 text-xs rounded"
                          style={{
                            background: 'var(--success-bg)',
                            color: 'var(--success)'
                          }}
                        >
                          {benefit.customProperties.discountValue}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs truncate opacity-70 mt-0.5">
                      {benefit.description || "No description"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="px-1.5 py-0.5 text-xs rounded"
                        style={{
                          background: 'var(--shell-surface-elevated)',
                          color: 'var(--shell-text)'
                        }}
                      >
                        {getSubtypeLabel(benefit.subtype || "")}
                      </span>
                      {benefit.offerer && (
                        <span className="text-xs opacity-60">
                          by {benefit.offerer.name}
                        </span>
                      )}
                      <span className="text-xs opacity-60">
                        {benefit.claimCount || 0} claims
                      </span>
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
        <BenefitFormModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            notification.success("Benefit created", "Your benefit has been published.")
          }}
        />
      )}
    </div>
  )
}
