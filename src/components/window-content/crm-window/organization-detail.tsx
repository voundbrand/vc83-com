"use client"

import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth } from "@/hooks/use-auth"
import { Globe, Building2, Users, Tag, Calendar } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"

interface OrganizationDetailProps {
  organizationId: Id<"objects">
}

export function OrganizationDetail({ organizationId }: OrganizationDetailProps) {
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
    return <div className="p-4 text-gray-500">Please log in</div>
  }

  if (!organization) {
    return <div className="p-4 text-gray-500">Loading...</div>
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
      <div className="pb-4 border-b-2 border-gray-300">
        <div className="flex items-center gap-2 mb-2">
          <Building2 size={24} className="text-purple-600" />
          <h2 className="text-lg font-bold">{organization.name}</h2>
        </div>
        <div className="space-y-1">
          {website && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Globe size={14} />
              <a
                href={website.startsWith("http") ? website : `https://${website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 hover:underline"
              >
                {website}
              </a>
            </div>
          )}
          {billingEmail && (
            <div className="text-sm text-gray-600">
              Email: <a href={`mailto:${billingEmail}`} className="hover:text-blue-600 hover:underline">{billingEmail}</a>
            </div>
          )}
          {phone && (
            <div className="text-sm text-gray-600">
              Phone: <a href={`tel:${phone}`} className="hover:text-blue-600 hover:underline">{phone}</a>
            </div>
          )}
        </div>
      </div>

      {/* Company Info */}
      {(industry || size) && (
        <div className="bg-gray-50 border-2 border-gray-300 p-3">
          <div className="text-xs font-pixel mb-2">COMPANY INFO</div>
          <div className="space-y-1 text-sm">
            {industry && (
              <div className="flex justify-between">
                <span className="text-gray-600">Industry:</span>
                <span className="font-semibold">{industry}</span>
              </div>
            )}
            {size && (
              <div className="flex justify-between">
                <span className="text-gray-600">Company Size:</span>
                <span className="font-semibold">{size}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Address */}
      {address && (address.street || address.city || address.state || address.postalCode || address.country) && (
        <div>
          <div className="text-xs font-pixel mb-2">ADDRESS</div>
          <div className="bg-gray-50 border-2 border-gray-300 p-3 text-sm">
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
          <Users size={16} />
          <span className="text-xs font-pixel">CONTACTS ({contacts?.length || 0})</span>
        </div>
        {contacts && contacts.length > 0 ? (
          <div className="space-y-2">
            {contacts.map((contact) => {
              const contactProps = contact.customProperties || {}
              const relationship = contact.relationship || {}
              const fullName = contactProps.fullName || `${contactProps.firstName || ""} ${contactProps.lastName || ""}`.trim() || "Unnamed Contact"
              const email = contactProps.email?.toString() || ""

              return (
                <div key={contact._id} className="p-3 bg-white border-2 border-gray-300">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{fullName}</div>
                      <div className="text-xs text-gray-600">{email}</div>
                      {relationship.jobTitle && (
                        <div className="text-xs text-gray-500 mt-1">{relationship.jobTitle}</div>
                      )}
                      {relationship.department && (
                        <div className="text-xs text-gray-500">{relationship.department}</div>
                      )}
                    </div>
                    {relationship.isPrimaryContact && (
                      <span className="px-2 py-0.5 text-[10px] font-pixel bg-purple-100 border border-purple-400 text-purple-700">
                        PRIMARY
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500 border-2 border-gray-300 bg-gray-50">
            <p className="text-sm">No contacts linked to this organization</p>
          </div>
        )}
      </div>

      {/* Stage */}
      {organization.subtype && (
        <div>
          <div className="text-xs font-pixel mb-2">STATUS</div>
          <div>
            <span
              className={`px-2 py-1 text-xs font-pixel border-2 ${
                organization.subtype === "customer"
                  ? "bg-green-100 border-green-400 text-green-700"
                  : organization.subtype === "prospect"
                  ? "bg-blue-100 border-blue-400 text-blue-700"
                  : organization.subtype === "partner"
                  ? "bg-purple-100 border-purple-400 text-purple-700"
                  : "bg-gray-100 border-gray-400 text-gray-700"
              }`}
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
            <Tag size={14} />
            <span className="text-xs font-pixel">TAGS</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag: unknown, index: number) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-blue-50 border border-blue-300 text-blue-700"
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
          <div className="text-xs font-pixel mb-2">NOTES</div>
          <div className="bg-yellow-50 border-2 border-yellow-300 p-3 text-sm whitespace-pre-wrap">
            {notes}
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      <div className="pt-4 border-t-2 border-gray-300">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={14} />
          <span className="text-xs font-pixel">ACTIVITY</span>
        </div>
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Created:</span>
            <span>{new Date(createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
