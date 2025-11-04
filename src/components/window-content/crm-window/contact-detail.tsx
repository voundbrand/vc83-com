"use client"

import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth } from "@/hooks/use-auth"
import { Mail, Phone, Building2, Tag, Calendar, DollarSign, ShoppingCart } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"

interface ContactDetailProps {
  contactId: Id<"objects">
}

export function ContactDetail({ contactId }: ContactDetailProps) {
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
    return <div className="p-4 text-gray-500">Please log in</div>
  }

  if (!contact) {
    return <div className="p-4 text-gray-500">Loading...</div>
  }

  const props = contact.customProperties || {}
  const fullName = props.fullName || `${props.firstName || ""} ${props.lastName || ""}`.trim() || "Unnamed Contact"
  const email = props.email?.toString() || ""
  const phone = props.phone?.toString()
  const jobTitle = props.jobTitle?.toString()
  const stage = props.lifecycleStage?.toString() || "lead"
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
      <div className="pb-4 border-b-2 border-gray-300">
        <h2 className="text-lg font-bold mb-1">{fullName}</h2>
        <div className="space-y-1">
          {email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail size={14} />
              <a href={`mailto:${email}`} className="hover:text-blue-600 hover:underline">
                {email}
              </a>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone size={14} />
              <a href={`tel:${phone}`} className="hover:text-blue-600 hover:underline">
                {phone}
              </a>
            </div>
          )}
          {jobTitle && (
            <div className="text-sm text-gray-600">
              {jobTitle}
            </div>
          )}
        </div>
      </div>

      {/* Linked Organization */}
      {organizations && organizations.length > 0 && (
        <div className="bg-purple-50 border-2 border-purple-300 rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={16} className="text-purple-600" />
            <span className="text-xs font-pixel text-purple-700">ORGANIZATION</span>
          </div>
          {organizations.map((org) => {
            const relationship = org.relationship || {}
            return (
              <div key={org._id} className="space-y-1">
                <div className="font-bold">{org.name}</div>
                {relationship.jobTitle && (
                  <div className="text-sm">{relationship.jobTitle}</div>
                )}
                {relationship.department && (
                  <div className="text-xs text-gray-600">{relationship.department}</div>
                )}
                {relationship.isPrimaryContact && (
                  <div className="text-xs text-purple-600 font-semibold">Primary Contact</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Purchase Stats */}
      {totalSpent > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="border-2 border-gray-300 p-3 bg-white">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={14} className="text-green-600" />
              <span className="text-xs text-gray-500">TOTAL SPENT</span>
            </div>
            <div className="text-lg font-bold text-green-600">
              ${(totalSpent / 100).toFixed(2)}
            </div>
          </div>
          <div className="border-2 border-gray-300 p-3 bg-white">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart size={14} className="text-blue-600" />
              <span className="text-xs text-gray-500">PURCHASES</span>
            </div>
            <div className="text-lg font-bold text-blue-600">{purchaseCount}</div>
          </div>
        </div>
      )}

      {/* Status & Source */}
      <div>
        <div className="text-xs font-pixel mb-2">STATUS</div>
        <div className="flex gap-2 flex-wrap">
          <span
            className={`px-2 py-1 text-xs font-pixel border-2 ${
              stage === "customer"
                ? "bg-green-100 border-green-400 text-green-700"
                : stage === "prospect"
                ? "bg-blue-100 border-blue-400 text-blue-700"
                : stage === "lead"
                ? "bg-yellow-100 border-yellow-400 text-yellow-700"
                : "bg-gray-100 border-gray-400 text-gray-700"
            }`}
          >
            {stage.toUpperCase()}
          </span>
          <span className="px-2 py-1 text-xs bg-gray-100 border-2 border-gray-400">
            SOURCE: {source.toUpperCase()}
          </span>
        </div>
      </div>

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
          {firstPurchaseAt && (
            <div className="flex justify-between">
              <span>First Purchase:</span>
              <span>{new Date(firstPurchaseAt).toLocaleDateString()}</span>
            </div>
          )}
          {lastPurchaseAt && (
            <div className="flex justify-between">
              <span>Last Purchase:</span>
              <span>{new Date(lastPurchaseAt).toLocaleDateString()}</span>
            </div>
          )}
          {lastActivityAt && (
            <div className="flex justify-between">
              <span>Last Activity:</span>
              <span>{new Date(lastActivityAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
