"use client"

import { useQuery } from "convex/react"
import { useAuth } from "@/hooks/use-auth"
import { Globe, Building2, Users, Tag, Calendar } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { OrgActivityTimeline } from "../agents/org-activity-timeline"

interface OrganizationDetailProps {
  organizationId: Id<"objects">
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

export function OrganizationDetail({ organizationId }: OrganizationDetailProps) {
  const { t } = useNamespaceTranslations("ui.crm")
  const { sessionId } = useAuth()

  // Get organization
  const organization = (useQuery as any)(
    (api.crmOntology as any).getCrmOrganization,
    sessionId ? { sessionId, crmOrganizationId: organizationId } : "skip"
  )

  // Get linked contacts
  const contacts = (useQuery as any)(
    (api.crmOntology as any).getOrganizationContacts,
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
  const createdAt = typeof organization.createdAt === "number" ? organization.createdAt : Date.now()
  const organizationContacts = (contacts ?? []) as Array<{
    linkId: string
    customProperties?: Record<string, unknown>
    relationship?: Record<string, unknown>
  }>
  const orgActionContextView = (useQuery as any)(
    (api.ai.orgActionCenter as any).getActionCenterView,
    sessionId && organization.organizationId
      ? {
          sessionId,
          organizationId: organization.organizationId,
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
        <div className="flex items-center gap-2 mb-2">
          <Building2 size={18} style={{ color: 'var(--tone-accent-strong)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--window-document-text)' }}>{organization.name}</h2>
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
                style={{ color: 'var(--tone-accent-strong)' }}
              >
                {website}
              </a>
            </div>
          )}
          {billingEmail && (
            <div className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
              Email: <a href={`mailto:${billingEmail}`} className="hover:underline" style={{ color: 'var(--tone-accent-strong)' }}>{billingEmail}</a>
            </div>
          )}
          {phone && (
            <div className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
              Phone: <a href={`tel:${phone}`} className="hover:underline" style={{ color: 'var(--tone-accent-strong)' }}>{phone}</a>
            </div>
          )}
        </div>
      </div>

      {/* Company Info */}
      {(industry || size) && (
        <div className="border p-3" style={{ background: 'var(--desktop-shell-accent)', borderColor: 'var(--window-document-border)' }}>
          <div className="text-xs font-pixel mb-2" style={{ color: 'var(--window-document-text)' }}>{t("ui.crm.organization_detail.company_info")}</div>
          <div className="space-y-1 text-sm">
            {industry && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--neutral-gray)' }}>{t("ui.crm.organization_detail.industry")}</span>
                <span className="font-semibold" style={{ color: 'var(--window-document-text)' }}>{industry}</span>
              </div>
            )}
            {size && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--neutral-gray)' }}>{t("ui.crm.organization_detail.company_size")}</span>
                <span className="font-semibold" style={{ color: 'var(--window-document-text)' }}>{size}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Address */}
      {address && (address.street || address.city || address.state || address.postalCode || address.country) && (
        <div>
          <div className="text-xs font-pixel mb-2" style={{ color: 'var(--window-document-text)' }}>{t("ui.crm.organization_detail.address_label")}</div>
          <div className="border p-3 text-sm" style={{ background: 'var(--desktop-shell-accent)', borderColor: 'var(--window-document-border)', color: 'var(--window-document-text)' }}>
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
          <Users size={16} style={{ color: 'var(--window-document-text)' }} />
          <span className="text-xs font-pixel" style={{ color: 'var(--window-document-text)' }}>{t("ui.crm.organization_detail.contacts_label", { count: organizationContacts.length })}</span>
        </div>
        {organizationContacts.length > 0 ? (
          <div className="space-y-2">
            {organizationContacts.map((contact) => {
              const contactProps = contact.customProperties || {}
              const relationship = contact.relationship || {}
              const firstName = typeof contactProps.firstName === "string" ? contactProps.firstName : ""
              const lastName = typeof contactProps.lastName === "string" ? contactProps.lastName : ""
              const fullName = typeof contactProps.fullName === "string" && contactProps.fullName.trim().length > 0
                ? contactProps.fullName
                : `${firstName} ${lastName}`.trim() || "Unnamed Contact"
              const email = typeof contactProps.email === "string" ? contactProps.email : ""
              const jobTitle = typeof relationship.jobTitle === "string" ? relationship.jobTitle : ""
              const department = typeof relationship.department === "string" ? relationship.department : ""
              const isPrimaryContact = relationship.isPrimaryContact === true

              return (
                <div key={String(contact.linkId)} className="p-3 border" style={{ background: 'var(--window-document-bg)', borderColor: 'var(--window-document-border)' }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-sm" style={{ color: 'var(--window-document-text)' }}>{fullName}</div>
                      <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>{email}</div>
                      {jobTitle && (
                        <div className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>{jobTitle}</div>
                      )}
                      {department && (
                        <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>{department}</div>
                      )}
                    </div>
                    {isPrimaryContact && (
                      <span className="px-2 py-0.5 text-[10px] font-pixel border" style={{ background: 'var(--desktop-shell-accent)', borderColor: 'var(--tone-accent-strong)', color: 'var(--tone-accent-strong)' }}>
                        {t("ui.crm.organization_detail.primary_tag")}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-4 text-center border" style={{ color: 'var(--neutral-gray)', borderColor: 'var(--window-document-border)', background: 'var(--desktop-shell-accent)' }}>
            <p className="text-sm">{t("ui.crm.organization_detail.no_contacts")}</p>
          </div>
        )}
      </div>

      <div
        className="border rounded-lg p-3 space-y-3"
        style={{ background: 'var(--desktop-shell-accent)', borderColor: 'var(--window-document-border)' }}
        data-testid="crm-organization-org-action-context"
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
            organizationId={organization.organizationId}
            actionItemId={linkedActionItemId || undefined}
            sourceSessionId={sourceSessionId || undefined}
            title="Related runtime activity"
            embedded
            limit={40}
          />
        ) : (
          <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
            No linked runtime session or action item is recorded on this organization yet.
          </div>
        )}
      </div>

      {/* Stage */}
      {organization.subtype && (
        <div>
          <div className="text-xs font-pixel mb-2" style={{ color: 'var(--window-document-text)' }}>STATUS</div>
          <div>
            <span
              className="px-2 py-1 text-xs font-pixel border"
              style={{
                background: 'var(--desktop-shell-accent)',
                borderColor: organization.subtype === "customer" ? 'var(--success)' : organization.subtype === "prospect" ? 'var(--tone-accent-strong)' : organization.subtype === "partner" ? 'var(--tone-accent-strong)' : 'var(--window-document-border)',
                color: organization.subtype === "customer" ? 'var(--success)' : organization.subtype === "prospect" ? 'var(--tone-accent-strong)' : organization.subtype === "partner" ? 'var(--tone-accent-strong)' : 'var(--window-document-text)'
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
            <Tag size={14} style={{ color: 'var(--window-document-text)' }} />
            <span className="text-xs font-pixel" style={{ color: 'var(--window-document-text)' }}>TAGS</span>
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
          <div className="text-xs font-pixel mb-2" style={{ color: 'var(--window-document-text)' }}>NOTES</div>
          <div className="border p-3 text-sm whitespace-pre-wrap" style={{ background: 'var(--desktop-shell-accent)', borderColor: 'var(--window-document-border)', color: 'var(--window-document-text)' }}>
            {notes}
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      <div className="pt-4 border-t" style={{ borderColor: 'var(--window-document-border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={14} style={{ color: 'var(--window-document-text)' }} />
          <span className="text-xs font-pixel" style={{ color: 'var(--window-document-text)' }}>ACTIVITY</span>
        </div>
        <div className="space-y-2 text-xs" style={{ color: 'var(--neutral-gray)' }}>
          <div className="flex justify-between">
            <span>Created:</span>
            <span>{new Date(createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
