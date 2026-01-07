"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { Search, Filter, Plus, DollarSign, Briefcase, Users } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"
import { CommissionFormModal } from "./commission-form-modal"
import { useNotification } from "@/hooks/use-notification"

interface CommissionsListProps {
  selectedId: Id<"objects"> | null
  onSelect: (id: Id<"objects">) => void
}

type CommissionSubtype = "sales" | "consulting" | "referral" | "partnership" | ""

export function CommissionsList({ selectedId, onSelect }: CommissionsListProps) {
  const { sessionId } = useAuth()
  const currentOrganization = useCurrentOrganization()
  const currentOrganizationId = currentOrganization?.id
  const notification = useNotification()

  const [searchQuery, setSearchQuery] = useState("")
  const [subtypeFilter, setSubtypeFilter] = useState<CommissionSubtype>("")
  const [showFilters, setShowFilters] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  // Query commissions
  const commissions = useQuery(
    api.commissionsOntology.listCommissions,
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
        <p className="text-xs mt-2">Login required to view commissions</p>
      </div>
    )
  }

  // Filter commissions by search
  const filteredCommissions = commissions?.filter((commission) => {
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      const name = commission.name?.toLowerCase() || ""
      const description = commission.description?.toLowerCase() || ""
      const category = (commission.customProperties?.category as string)?.toLowerCase() || ""

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
      case "sales": return <DollarSign size={14} />
      case "consulting": return <Briefcase size={14} />
      case "referral": return <Users size={14} />
      case "partnership": return <Users size={14} />
      default: return <DollarSign size={14} />
    }
  }

  const getSubtypeLabel = (subtype: string) => {
    switch (subtype) {
      case "sales": return "Sales"
      case "consulting": return "Consulting"
      case "referral": return "Referral"
      case "partnership": return "Partnership"
      default: return subtype
    }
  }

  const formatCurrency = (cents: number, currency: string = "EUR") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(cents / 100)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with search and filters */}
      <div className="p-3 border-b-2 space-y-2" style={{ background: 'var(--win95-bg)', borderColor: 'var(--win95-border)' }}>
        {/* Search bar */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--neutral-gray)' }} />
            <input
              type="text"
              placeholder="Search commissions..."
              className="w-full pl-8 pr-2 py-1.5 border-2 focus:outline-none text-sm"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-input-bg)',
                color: 'var(--win95-input-text)'
              }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`retro-button px-3 py-1.5 flex items-center gap-1 ${
              showFilters ? "shadow-inner" : ""
            }`}
            style={{
              background: showFilters ? 'var(--win95-selected-bg)' : 'var(--win95-button-face)',
              color: showFilters ? 'var(--win95-selected-text)' : 'var(--win95-text)'
            }}
          >
            <Filter size={14} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="retro-button px-3 py-1.5 flex items-center gap-1"
            style={{
              background: 'var(--win95-button-face)',
              color: 'var(--win95-text)'
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
              onChange={(e) => setSubtypeFilter(e.target.value as CommissionSubtype)}
              className="px-2 py-1 border-2 text-xs"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-input-bg)',
                color: 'var(--win95-input-text)'
              }}
            >
              <option value="">All Types</option>
              <option value="sales">Sales</option>
              <option value="consulting">Consulting</option>
              <option value="referral">Referral</option>
              <option value="partnership">Partnership</option>
            </select>
          </div>
        )}
      </div>

      {/* Commissions list */}
      <div className="flex-1 overflow-y-auto">
        {!commissions ? (
          <div className="p-4 text-center" style={{ color: 'var(--neutral-gray)' }}>
            <p className="text-sm">Loading commissions...</p>
          </div>
        ) : filteredCommissions?.length === 0 ? (
          <div className="p-4 text-center" style={{ color: 'var(--neutral-gray)' }}>
            <DollarSign size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No commissions found</p>
            <p className="text-xs mt-1">Create a new commission to get started</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--win95-border)' }}>
            {filteredCommissions?.map((commission) => (
              <button
                key={commission._id}
                onClick={() => onSelect(commission._id)}
                className="w-full p-3 text-left hover:opacity-80 transition-opacity"
                style={{
                  background: selectedId === commission._id ? 'var(--win95-selected-bg)' : 'transparent',
                  color: selectedId === commission._id ? 'var(--win95-selected-text)' : 'var(--win95-text)'
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="p-2 rounded"
                    style={{
                      background: selectedId === commission._id ? 'var(--win95-selected-text)' : 'var(--win95-selected-bg)',
                      color: selectedId === commission._id ? 'var(--win95-selected-bg)' : 'var(--win95-selected-text)'
                    }}
                  >
                    {getSubtypeIcon(commission.subtype || "sales")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{commission.name}</span>
                      {commission.customProperties?.commissionValue && (
                        <span
                          className="px-1.5 py-0.5 text-xs rounded"
                          style={{
                            background: 'var(--win95-success-bg)',
                            color: 'var(--win95-success-text)'
                          }}
                        >
                          {commission.customProperties.commissionType === "percentage"
                            ? `${commission.customProperties.commissionValue}%`
                            : formatCurrency(commission.customProperties.commissionValue as number * 100, commission.customProperties.currency as string || "EUR")
                          }
                        </span>
                      )}
                    </div>
                    <p className="text-xs truncate opacity-70 mt-0.5">
                      {commission.description || "No description"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="px-1.5 py-0.5 text-xs rounded"
                        style={{
                          background: 'var(--win95-bg-light)',
                          color: 'var(--win95-text)'
                        }}
                      >
                        {getSubtypeLabel(commission.subtype || "")}
                      </span>
                      {commission.offerer && (
                        <span className="text-xs opacity-60">
                          by {commission.offerer.name}
                        </span>
                      )}
                      <span className="text-xs opacity-60">
                        {formatCurrency(commission.totalPaidOut || 0)} paid
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
        <CommissionFormModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            notification.success("Commission created", "Your commission has been published.")
          }}
        />
      )}
    </div>
  )
}
