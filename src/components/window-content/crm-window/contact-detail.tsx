"use client"

import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth } from "@/hooks/use-auth"
import { Mail, Phone, Building2, Tag, Calendar, DollarSign, ShoppingCart } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { ContactPipelineManager } from "./contact-pipeline-manager"

interface ContactDetailProps {
  contactId: Id<"objects">
}

export function ContactDetail({ contactId }: ContactDetailProps) {
  const { t } = useNamespaceTranslations("ui.crm")
  const { sessionId } = useAuth()

  // Get contact
  const contact = useQuery(
    api.crmOntology.getContact,
    sessionId ? { sessionId, contactId } : "skip"
  )

  // Get linked organizations
  const organizations = useQuery(
    api.crmOntology.getContactOrganizations,
    sessionId ? { sessionId, contactId } : "skip"
  )

  if (!sessionId) {
    return <div className="p-4" style={{ color: 'var(--neutral-gray)' }}>{t("ui.crm.contacts.please_login")}</div>
  }

  if (!contact) {
    return <div className="p-4" style={{ color: 'var(--neutral-gray)' }}>{t("ui.crm.contacts.loading")}</div>
  }

  const props = contact.customProperties || {}
  const fullName = props.fullName || `${props.firstName || ""} ${props.lastName || ""}`.trim() || "Unnamed Contact"
  const email = props.email?.toString() || ""
  const phone = props.phone?.toString()
  const jobTitle = props.jobTitle?.toString()
  const stage = contact.subtype || "lead" // Read from contact.subtype, not customProperties
  const source = props.source?.toString() || "manual"
  const tags = Array.isArray(props.tags) ? props.tags : []
  const notes = props.notes?.toString()

  // Purchase tracking
  const totalSpent = typeof props.totalSpent === "number" ? props.totalSpent : 0
  const purchaseCount = typeof props.purchaseCount === "number" ? props.purchaseCount : 0
  const firstPurchaseAt = typeof props.firstPurchaseAt === "number" ? props.firstPurchaseAt : null
  const lastPurchaseAt = typeof props.lastPurchaseAt === "number" ? props.lastPurchaseAt : null

  // Activity tracking
  const lastActivityAt = typeof props.lastActivityAt === "number" ? props.lastActivityAt : null
  const createdAt = typeof contact.createdAt === "number" ? contact.createdAt : Date.now()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="pb-4 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--win95-text)' }}>{fullName}</h2>
        <div className="space-y-1">
          {email && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--neutral-gray)' }}>
              <Mail size={14} />
              <a href={`mailto:${email}`} className="hover:underline" style={{ color: 'var(--win95-highlight)' }}>
                {email}
              </a>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--neutral-gray)' }}>
              <Phone size={14} />
              <a href={`tel:${phone}`} className="hover:underline" style={{ color: 'var(--win95-highlight)' }}>
                {phone}
              </a>
            </div>
          )}
          {jobTitle && (
            <div className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
              {jobTitle}
            </div>
          )}
        </div>
      </div>

      {/* Linked Organization */}
      {organizations && organizations.length > 0 && (
        <div className="border-2 rounded p-3" style={{ background: 'var(--win95-bg-light)', borderColor: 'var(--win95-border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={16} style={{ color: 'var(--win95-highlight)' }} />
            <span className="text-xs font-pixel" style={{ color: 'var(--win95-highlight)' }}>ORGANIZATION</span>
          </div>
          {organizations.map((org) => {
            const relationship = org.relationship || {}
            return (
              <div key={org._id} className="space-y-1">
                <div className="font-bold" style={{ color: 'var(--win95-text)' }}>{org.name}</div>
                {relationship.jobTitle && (
                  <div className="text-sm" style={{ color: 'var(--win95-text)' }}>{relationship.jobTitle}</div>
                )}
                {relationship.department && (
                  <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>{relationship.department}</div>
                )}
                {relationship.isPrimaryContact && (
                  <div className="text-xs font-semibold" style={{ color: 'var(--win95-highlight)' }}>Primary Contact</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pipeline Management */}
      <ContactPipelineManager contactId={contactId} />

      {/* Purchase Stats */}
      {totalSpent > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="border-2 p-3" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={14} style={{ color: 'var(--success)' }} />
              <span className="text-xs" style={{ color: 'var(--neutral-gray)' }}>TOTAL SPENT</span>
            </div>
            <div className="text-lg font-bold" style={{ color: 'var(--success)' }}>
              ${(totalSpent / 100).toFixed(2)}
            </div>
          </div>
          <div className="border-2 p-3" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart size={14} style={{ color: 'var(--win95-highlight)' }} />
              <span className="text-xs" style={{ color: 'var(--neutral-gray)' }}>PURCHASES</span>
            </div>
            <div className="text-lg font-bold" style={{ color: 'var(--win95-highlight)' }}>{purchaseCount}</div>
          </div>
        </div>
      )}

      {/* Status & Source */}
      <div>
        <div className="text-xs font-pixel mb-2" style={{ color: 'var(--win95-text)' }}>STATUS</div>
        <div className="flex gap-2 flex-wrap">
          <span
            className="px-2 py-1 text-xs font-pixel border-2"
            style={{
              background: stage === "customer" ? 'var(--win95-bg-light)' : stage === "prospect" ? 'var(--win95-bg-light)' : stage === "lead" ? 'var(--win95-bg-light)' : 'var(--win95-bg-light)',
              borderColor: stage === "customer" ? 'var(--success)' : stage === "prospect" ? 'var(--win95-highlight)' : stage === "lead" ? 'var(--neutral-gray)' : 'var(--win95-border)',
              color: stage === "customer" ? 'var(--success)' : stage === "prospect" ? 'var(--win95-highlight)' : stage === "lead" ? 'var(--neutral-gray)' : 'var(--win95-text)'
            }}
          >
            {stage.toUpperCase()}
          </span>
          <span className="px-2 py-1 text-xs border-2" style={{ background: 'var(--win95-bg-light)', borderColor: 'var(--win95-border)', color: 'var(--win95-text)' }}>
            SOURCE: {source.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Tag size={14} style={{ color: 'var(--win95-text)' }} />
            <span className="text-xs font-pixel" style={{ color: 'var(--win95-text)' }}>
              {t("ui.crm.contact_detail.tags_label")}
            </span>
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
          <div className="text-xs font-pixel mb-2" style={{ color: 'var(--win95-text)' }}>
            {t("ui.crm.contact_detail.notes_label")}
          </div>
          <div className="border-2 p-3 text-sm whitespace-pre-wrap" style={{ background: 'var(--win95-bg-light)', borderColor: 'var(--win95-border)', color: 'var(--win95-text)' }}>
            {notes}
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      <div className="pt-4 border-t-2" style={{ borderColor: 'var(--win95-border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={14} style={{ color: 'var(--win95-text)' }} />
          <span className="text-xs font-pixel" style={{ color: 'var(--win95-text)' }}>
            {t("ui.crm.contact_detail.activity_label")}
          </span>
        </div>
        <div className="space-y-2 text-xs" style={{ color: 'var(--neutral-gray)' }}>
          <div className="flex justify-between">
            <span>{t("ui.crm.contact_detail.created")}</span>
            <span>{new Date(createdAt).toLocaleDateString()}</span>
          </div>
          {firstPurchaseAt && (
            <div className="flex justify-between">
              <span>{t("ui.crm.contact_detail.first_purchase")}</span>
              <span>{new Date(firstPurchaseAt).toLocaleDateString()}</span>
            </div>
          )}
          {lastPurchaseAt && (
            <div className="flex justify-between">
              <span>{t("ui.crm.contact_detail.last_purchase")}</span>
              <span>{new Date(lastPurchaseAt).toLocaleDateString()}</span>
            </div>
          )}
          {lastActivityAt && (
            <div className="flex justify-between">
              <span>{t("ui.crm.contact_detail.last_activity")}</span>
              <span>{new Date(lastActivityAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
