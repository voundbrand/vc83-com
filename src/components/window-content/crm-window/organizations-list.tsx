"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { Search, Plus, Building2, Edit } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"
import { OrganizationFormModal } from "./organization-form-modal"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"

interface OrganizationsListProps {
  selectedId: Id<"objects"> | null
  onSelect: (id: Id<"objects">) => void
}

export function OrganizationsList({ selectedId, onSelect }: OrganizationsListProps) {
  const { t } = useNamespaceTranslations("ui.crm")
  const { sessionId } = useAuth()
  const currentOrganization = useCurrentOrganization()
  const currentOrganizationId = currentOrganization?.id

  const [searchQuery, setSearchQuery] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingId, setEditingId] = useState<Id<"objects"> | null>(null)

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
      <div className="p-3 border-b-2 space-y-2" style={{ background: 'var(--win95-bg-light)', borderColor: 'var(--win95-border)' }}>
        {/* Search bar */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--neutral-gray)' }} />
            <input
              type="text"
              placeholder={t("ui.crm.organizations.search_placeholder")}
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
            className="retro-button px-3 py-1.5 flex items-center gap-1"
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
                style={{ color: 'var(--win95-highlight)' }}
              >
                {t("ui.crm.organizations.clear_search")}
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--win95-border)' }}>
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
                    background: selectedId === org._id ? 'var(--win95-selected-bg)' : 'transparent',
                    borderLeftWidth: selectedId === org._id ? '4px' : '0',
                    borderLeftColor: selectedId === org._id ? 'var(--win95-highlight)' : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedId !== org._id) {
                      e.currentTarget.style.background = 'var(--win95-hover-bg)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedId !== org._id) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <div
                    onClick={() => onSelect(org._id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-start gap-2">
                      <Building2 size={20} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--win95-highlight)' }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate" style={{ color: 'var(--win95-text)' }}>{org.name}</div>
                        {website && (
                          <div className="text-xs truncate" style={{ color: 'var(--neutral-gray)' }}>{website}</div>
                        )}
                        {(industry || size) && (
                          <div className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
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
                            background: 'var(--win95-bg-light)',
                            borderColor: org.subtype === "customer" ? 'var(--success)' : org.subtype === "prospect" ? 'var(--win95-highlight)' : org.subtype === "partner" ? 'var(--win95-highlight)' : org.subtype === "sponsor" ? 'var(--neutral-gray)' : 'var(--win95-border)',
                            color: org.subtype === "customer" ? 'var(--success)' : org.subtype === "prospect" ? 'var(--win95-highlight)' : org.subtype === "partner" ? 'var(--win95-highlight)' : org.subtype === "sponsor" ? 'var(--neutral-gray)' : 'var(--win95-text)'
                          }}
                        >
                          {org.subtype.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Edit button - appears on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingId(org._id)
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 border-2"
                    style={{
                      background: 'var(--win95-bg)',
                      borderColor: 'var(--win95-border)'
                    }}
                    title={t("ui.crm.organizations.edit_organization")}
                  >
                    <Edit size={14} style={{ color: 'var(--neutral-gray)' }} />
                  </button>
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
        />
      )}
    </div>
  )
}
