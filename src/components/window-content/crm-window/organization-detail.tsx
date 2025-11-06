"use client"

import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth } from "@/hooks/use-auth"
import { Globe, Building2, Users, Tag, Calendar } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"

interface OrganizationDetailProps {
  organizationId: Id<"objects">
}

export function OrganizationDetail({ organizationId }: OrganizationDetailProps) {
  const { t } = useNamespaceTranslations("ui.crm")
  const { sessionId } = useAuth()

  // Get organization
  const organization = useQuery(
    api.crmOntology.getCrmOrganization,
    sessionId ? { sessionId, crmOrganizationId: organizationId } : "skip"
  )

  // Get linked contacts
  const contacts = useQuery(
    api.crmOntology.getOrganizationContacts,
    sessionId ? { sessionId, crmOrganizationId: organizationId } : "skip"
  )

  if (!sessionId) {
    return <div className="p-4" style={{ color: 'var(--neutral-gray)' }}>{t("ui.crm.organizations.login_required")}</div>
  }

  if (!organization) {
    return <div className="p-4" style={{ color: 'var(--neutral-gray)' }}>{t("ui.crm.organizations.loading")}</div>
  }

  const props = organization.customProperties || {}
  const website = props.website?.toString()
  const industry = props.industry?.toString()
  const size = props.size?.toString()
  const phone = props.phone?.toString()
  const billingEmail = props.billingEmail?.toString()
  const address = props.address as { street?: string; city?: string; state?: string; postalCode?: string; country?: string } | undefined
  const tags = Array.isArray(props.tags) ? props.tags : []
  const notes = props.notes?.toString()
  const createdAt = typeof organization.createdAt === "number" ? organization.createdAt : Date.now()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="pb-4 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Building2 size={24} style={{ color: 'var(--win95-highlight)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--win95-text)' }}>{organization.name}</h2>
        </div>
        <div className="space-y-1">
          {website && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--neutral-gray)' }}>
              <Globe size={14} />
              <a
                href={website.startsWith("http") ? website : `https://${website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
                style={{ color: 'var(--win95-highlight)' }}
              >
                {website}
              </a>
            </div>
          )}
          {billingEmail && (
            <div className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
              {t("ui.crm.organizations.email")}: <a href={`mailto:${billingEmail}`} className="hover:underline" style={{ color: 'var(--win95-highlight)' }}>{billingEmail}</a>
            </div>
          )}
          {phone && (
            <div className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
              {t("ui.crm.organizations.phone")}: <a href={`tel:${phone}`} className="hover:underline" style={{ color: 'var(--win95-highlight)' }}>{phone}</a>
            </div>
          )}
        </div>
      </div>

      {/* Company Info */}
      {(industry || size) && (
        <div className="border-2 p-3" style={{ background: 'var(--win95-bg-light)', borderColor: 'var(--win95-border)' }}>
          <div className="text-xs font-pixel mb-2" style={{ color: 'var(--win95-text)' }}>{t("ui.crm.organizations.company_info")}</div>
          <div className="space-y-1 text-sm">
            {industry && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--neutral-gray)' }}>{t("ui.crm.organizations.industry")}:</span>
                <span className="font-semibold" style={{ color: 'var(--win95-text)' }}>{industry}</span>
              </div>
            )}
            {size && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--neutral-gray)' }}>{t("ui.crm.organizations.company_size")}:</span>
                <span className="font-semibold" style={{ color: 'var(--win95-text)' }}>{size}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Address */}
      {address && (address.street || address.city || address.state || address.postalCode || address.country) && (
        <div>
          <div className="text-xs font-pixel mb-2" style={{ color: 'var(--win95-text)' }}>{t("ui.crm.organizations.address")}</div>
          <div className="border-2 p-3 text-sm" style={{ background: 'var(--win95-bg-light)', borderColor: 'var(--win95-border)', color: 'var(--win95-text)' }}>
            {address.street && <div>{address.street}</div>}
            <div>
              {[address.city, address.state, address.postalCode].filter(Boolean).join(", ")}
            </div>
            {address.country && <div>{address.country}</div>}
          </div>
        </div>
      )}

      {/* Contacts in this Organization */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} style={{ color: 'var(--win95-text)' }} />
          <span className="text-xs font-pixel" style={{ color: 'var(--win95-text)' }}>{t("ui.crm.organizations.contacts")} ({contacts?.length || 0})</span>
        </div>
        {contacts && contacts.length > 0 ? (
          <div className="space-y-2">
            {contacts.map((contact) => {
              const contactProps = contact.customProperties || {}
              const relationship = contact.relationship || {}
              const fullName = contactProps.fullName || `${contactProps.firstName || ""} ${contactProps.lastName || ""}`.trim() || t("ui.crm.organizations.unnamed_contact")
              const email = contactProps.email?.toString() || ""

              return (
                <div key={contact._id} className="p-3 border-2" style={{ background: 'var(--win95-bg)', borderColor: 'var(--win95-border)' }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-sm" style={{ color: 'var(--win95-text)' }}>{fullName}</div>
                      <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>{email}</div>
                      {relationship.jobTitle && (
                        <div className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>{relationship.jobTitle}</div>
                      )}
                      {relationship.department && (
                        <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>{relationship.department}</div>
                      )}
                    </div>
                    {relationship.isPrimaryContact && (
                      <span className="px-2 py-0.5 text-[10px] font-pixel border-2" style={{ background: 'var(--win95-bg-light)', borderColor: 'var(--win95-highlight)', color: 'var(--win95-highlight)' }}>
                        {t("ui.crm.organizations.primary")}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-4 text-center border-2" style={{ color: 'var(--neutral-gray)', borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
            <p className="text-sm">{t("ui.crm.organizations.no_contacts")}</p>
          </div>
        )}
      </div>

      {/* Stage */}
      {organization.subtype && (
        <div>
          <div className="text-xs font-pixel mb-2" style={{ color: 'var(--win95-text)' }}>{t("ui.crm.organizations.status")}</div>
          <div>
            <span
              className="px-2 py-1 text-xs font-pixel border-2"
              style={{
                background: 'var(--win95-bg-light)',
                borderColor: organization.subtype === "customer" ? 'var(--success)' : organization.subtype === "prospect" ? 'var(--win95-highlight)' : organization.subtype === "partner" ? 'var(--win95-highlight)' : 'var(--win95-border)',
                color: organization.subtype === "customer" ? 'var(--success)' : organization.subtype === "prospect" ? 'var(--win95-highlight)' : organization.subtype === "partner" ? 'var(--win95-highlight)' : 'var(--win95-text)'
              }}
            >
              {organization.subtype.toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Tag size={14} style={{ color: 'var(--win95-text)' }} />
            <span className="text-xs font-pixel" style={{ color: 'var(--win95-text)' }}>{t("ui.crm.organizations.tags")}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag: unknown, index: number) => (
              <span
                key={index}
                className="px-2 py-1 text-xs border-2"
                style={{
                  background: 'var(--win95-bg-light)',
                  borderColor: 'var(--win95-highlight)',
                  color: 'var(--win95-highlight)'
                }}
              >
                {String(tag)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {notes && (
        <div>
          <div className="text-xs font-pixel mb-2" style={{ color: 'var(--win95-text)' }}>{t("ui.crm.organizations.notes")}</div>
          <div className="border-2 p-3 text-sm whitespace-pre-wrap" style={{ background: 'var(--win95-bg-light)', borderColor: 'var(--win95-border)', color: 'var(--win95-text)' }}>
            {notes}
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      <div className="pt-4 border-t-2" style={{ borderColor: 'var(--win95-border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={14} style={{ color: 'var(--win95-text)' }} />
          <span className="text-xs font-pixel" style={{ color: 'var(--win95-text)' }}>{t("ui.crm.organizations.activity")}</span>
        </div>
        <div className="space-y-2 text-xs" style={{ color: 'var(--neutral-gray)' }}>
          <div className="flex justify-between">
            <span>{t("ui.crm.organizations.created")}:</span>
            <span>{new Date(createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
