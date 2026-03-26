"use client"

import { useQuery } from "convex/react"
import { useAuth } from "@/hooks/use-auth"
import { Mail, Phone, Building2, Tag, Calendar, DollarSign, ShoppingCart } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { ContactPipelineManager } from "./contact-pipeline-manager"
import { OrgActivityTimeline } from "../agents/org-activity-timeline"

interface ContactDetailProps {
  contactId: Id<"objects">
}

interface OrgActionContextView {
  totalsByPipelineState: Record<string, number>
  items: Array<{
    _id: string
    title: string
    pipelineState: string
    updatedAt: number
  }>
  total: number
}

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any }

export function ContactDetail({ contactId }: ContactDetailProps) {
  const { t } = useNamespaceTranslations("ui.crm")
  const { sessionId } = useAuth()

  // Get contact
  const contact = (useQuery as any)(
    (api.crmOntology as any).getContact,
    sessionId ? { sessionId, contactId } : "skip"
  )

  // Get linked organizations
  const organizations = (useQuery as any)(
    (api.crmOntology as any).getContactOrganizations,
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
  const sourceSessionId =
    typeof props.sourceSessionId === "string"
      ? props.sourceSessionId
      : typeof props.sessionId === "string"
        ? props.sessionId
        : null
  const linkedActionItemId = (
    typeof props.actionItemObjectId === "string"
      ? props.actionItemObjectId
      : typeof props.latestActionItemObjectId === "string"
        ? props.latestActionItemObjectId
        : null
  ) as Id<"objects"> | null

  // Purchase tracking
  const totalSpent = typeof props.totalSpent === "number" ? props.totalSpent : 0
  const purchaseCount = typeof props.purchaseCount === "number" ? props.purchaseCount : 0
  const firstPurchaseAt = typeof props.firstPurchaseAt === "number" ? props.firstPurchaseAt : null
  const lastPurchaseAt = typeof props.lastPurchaseAt === "number" ? props.lastPurchaseAt : null

  // Activity tracking
  const lastActivityAt = typeof props.lastActivityAt === "number" ? props.lastActivityAt : null
  const createdAt = typeof contact.createdAt === "number" ? contact.createdAt : Date.now()
  const orgActionContextView = (useQuery as any)(
    (api.ai.orgActionCenter as any).getActionCenterView,
    sessionId && contact.organizationId
      ? {
          sessionId,
          organizationId: contact.organizationId,
        }
      : "skip",
  ) as OrgActionContextView | undefined
  const openActionCount = orgActionContextView
    ? (orgActionContextView.totalsByPipelineState.pending || 0)
      + (orgActionContextView.totalsByPipelineState.assigned || 0)
      + (orgActionContextView.totalsByPipelineState.approved || 0)
      + (orgActionContextView.totalsByPipelineState.executing || 0)
    : 0
  const contextPreviewItems = Array.isArray(orgActionContextView?.items)
    ? orgActionContextView.items.slice(0, 3)
    : []

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="pb-4 border-b" style={{ borderColor: 'var(--window-document-border)' }}>
        <h2 className="text-sm font-bold mb-1" style={{ color: 'var(--window-document-text)' }}>{fullName}</h2>
        <div className="space-y-1">
          {email && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--neutral-gray)' }}>
              <Mail size={14} />
              <a href={`mailto:${email}`} className="hover:underline" style={{ color: 'var(--tone-accent-strong)' }}>
                {email}
              </a>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--neutral-gray)' }}>
              <Phone size={14} />
              <a href={`tel:${phone}`} className="hover:underline" style={{ color: 'var(--tone-accent-strong)' }}>
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
        <div className="border rounded-lg p-3" style={{ background: 'var(--desktop-shell-accent)', borderColor: 'var(--window-document-border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={16} style={{ color: 'var(--tone-accent-strong)' }} />
            <span className="text-xs font-pixel" style={{ color: 'var(--tone-accent-strong)' }}>ORGANIZATION</span>
          </div>
          {organizations.map((org: any) => {
            const relationship = org.relationship || {}
            return (
              <div key={org._id} className="space-y-1">
                <div className="font-bold" style={{ color: 'var(--window-document-text)' }}>{org.name}</div>
                {relationship.jobTitle && (
                  <div className="text-sm" style={{ color: 'var(--window-document-text)' }}>{relationship.jobTitle}</div>
                )}
                {relationship.department && (
                  <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>{relationship.department}</div>
                )}
                {relationship.isPrimaryContact && (
                  <div className="text-xs font-semibold" style={{ color: 'var(--tone-accent-strong)' }}>Primary Contact</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pipeline Management */}
      <ContactPipelineManager contactId={contactId} />

      <div
        className="border rounded-lg p-3 space-y-3"
        style={{ background: 'var(--desktop-shell-accent)', borderColor: 'var(--window-document-border)' }}
        data-testid="crm-contact-org-action-context"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-pixel" style={{ color: 'var(--window-document-text)' }}>
              ORG ACTION CONTEXT
            </div>
            <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
              Open actions: {openActionCount} · Total tracked: {orgActionContextView?.total ?? 0}
            </div>
          </div>
          <a
            href="/agents?view=action-center"
            className="px-2 py-1 text-xs border rounded hover:opacity-90"
            style={{ borderColor: 'var(--window-document-border)', color: 'var(--window-document-text)' }}
          >
            Open Action Center
          </a>
        </div>

        {contextPreviewItems.length > 0 ? (
          <div className="space-y-1">
            {contextPreviewItems.map((item) => (
              <div
                key={String(item._id)}
                className="flex items-center justify-between text-xs border rounded px-2 py-1"
                style={{ borderColor: 'var(--window-document-border)', color: 'var(--window-document-text)' }}
              >
                <span className="truncate pr-2">{item.title}</span>
                <span style={{ color: 'var(--neutral-gray)' }}>{item.pipelineState}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
            No org action items are currently linked to this organization.
          </div>
        )}

        {sourceSessionId || linkedActionItemId ? (
          <OrgActivityTimeline
            sessionId={sessionId}
            organizationId={contact.organizationId}
            actionItemId={linkedActionItemId || undefined}
            sourceSessionId={sourceSessionId || undefined}
            title="Related runtime activity"
            embedded
            limit={40}
          />
        ) : (
          <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
            No linked runtime session or action item is recorded on this contact yet.
          </div>
        )}
      </div>

      {/* Purchase Stats */}
      {totalSpent > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="border p-3" style={{ borderColor: 'var(--window-document-border)', background: 'var(--desktop-shell-accent)' }}>
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={14} style={{ color: 'var(--success)' }} />
              <span className="text-xs" style={{ color: 'var(--neutral-gray)' }}>TOTAL SPENT</span>
            </div>
            <div className="text-lg font-bold" style={{ color: 'var(--success)' }}>
              ${(totalSpent / 100).toFixed(2)}
            </div>
          </div>
          <div className="border p-3" style={{ borderColor: 'var(--window-document-border)', background: 'var(--desktop-shell-accent)' }}>
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart size={14} style={{ color: 'var(--tone-accent-strong)' }} />
              <span className="text-xs" style={{ color: 'var(--neutral-gray)' }}>PURCHASES</span>
            </div>
            <div className="text-lg font-bold" style={{ color: 'var(--tone-accent-strong)' }}>{purchaseCount}</div>
          </div>
        </div>
      )}

      {/* Status & Source */}
      <div>
        <div className="text-xs font-pixel mb-2" style={{ color: 'var(--window-document-text)' }}>STATUS</div>
        <div className="flex gap-2 flex-wrap">
          <span
            className="px-2 py-1 text-xs font-pixel border"
            style={{
              background: stage === "customer" ? 'var(--desktop-shell-accent)' : stage === "prospect" ? 'var(--desktop-shell-accent)' : stage === "lead" ? 'var(--desktop-shell-accent)' : 'var(--desktop-shell-accent)',
              borderColor: stage === "customer" ? 'var(--success)' : stage === "prospect" ? 'var(--tone-accent-strong)' : stage === "lead" ? 'var(--neutral-gray)' : 'var(--window-document-border)',
              color: stage === "customer" ? 'var(--success)' : stage === "prospect" ? 'var(--tone-accent-strong)' : stage === "lead" ? 'var(--neutral-gray)' : 'var(--window-document-text)'
            }}
          >
            {stage.toUpperCase()}
          </span>
          <span className="px-2 py-1 text-xs border" style={{ background: 'var(--desktop-shell-accent)', borderColor: 'var(--window-document-border)', color: 'var(--window-document-text)' }}>
            SOURCE: {source.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Tag size={14} style={{ color: 'var(--window-document-text)' }} />
            <span className="text-xs font-pixel" style={{ color: 'var(--window-document-text)' }}>
              {t("ui.crm.contact_detail.tags_label")}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag: unknown, index: number) => (
              <span
                key={index}
                className="px-2 py-1 text-xs border"
                style={{
                  background: 'var(--desktop-shell-accent)',
                  borderColor: 'var(--tone-accent-strong)',
                  color: 'var(--tone-accent-strong)'
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
          <div className="text-xs font-pixel mb-2" style={{ color: 'var(--window-document-text)' }}>
            {t("ui.crm.contact_detail.notes_label")}
          </div>
          <div className="border p-3 text-sm whitespace-pre-wrap" style={{ background: 'var(--desktop-shell-accent)', borderColor: 'var(--window-document-border)', color: 'var(--window-document-text)' }}>
            {notes}
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      <div className="pt-4 border-t" style={{ borderColor: 'var(--window-document-border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={14} style={{ color: 'var(--window-document-text)' }} />
          <span className="text-xs font-pixel" style={{ color: 'var(--window-document-text)' }}>
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
