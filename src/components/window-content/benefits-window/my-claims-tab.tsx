"use client"

import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { ClipboardList, Gift, Clock, Check, X, AlertCircle } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"

export function MyClaimsTab() {
  const { sessionId, user } = useAuth()
  const currentOrganization = useCurrentOrganization()
  const currentOrganizationId = currentOrganization?.id

  const claims = useQuery(
    api.benefitsOntology.getMyClaims,
    sessionId && currentOrganizationId && user?.id
      ? { sessionId, organizationId: currentOrganizationId as Id<"organizations"> }
      : "skip"
  )

  if (!sessionId || !currentOrganizationId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8" style={{ color: 'var(--neutral-gray)' }}>
        <ClipboardList size={48} className="mb-4 opacity-30" />
        <p className="font-pixel text-sm">Please log in</p>
        <p className="text-xs mt-2">Login required to view your claims</p>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock size={14} />
      case "approved": return <Check size={14} />
      case "redeemed": return <Gift size={14} />
      case "rejected": return <X size={14} />
      case "expired": return <AlertCircle size={14} />
      default: return <Clock size={14} />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return { bg: 'var(--win95-warning-bg)', text: 'var(--win95-warning-text)' }
      case "approved": return { bg: 'var(--win95-success-bg)', text: 'var(--win95-success-text)' }
      case "redeemed": return { bg: 'var(--win95-selected-bg)', text: 'var(--win95-selected-text)' }
      case "rejected": return { bg: 'var(--win95-error-bg)', text: 'var(--win95-error-text)' }
      case "expired": return { bg: 'var(--win95-bg-light)', text: 'var(--neutral-gray)' }
      default: return { bg: 'var(--win95-bg-light)', text: 'var(--win95-text)' }
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "Pending"
      case "approved": return "Approved"
      case "redeemed": return "Redeemed"
      case "rejected": return "Rejected"
      case "expired": return "Expired"
      default: return status
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <h2 className="font-pixel text-lg mb-4" style={{ color: 'var(--win95-text)' }}>
        My Benefit Claims
      </h2>

      {!claims ? (
        <div className="text-center py-8" style={{ color: 'var(--neutral-gray)' }}>
          <p className="text-sm">Loading claims...</p>
        </div>
      ) : claims.length === 0 ? (
        <div className="text-center py-8" style={{ color: 'var(--neutral-gray)' }}>
          <ClipboardList size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-pixel text-sm">No claims yet</p>
          <p className="text-xs mt-2">Browse benefits and claim one to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => {
            const statusColors = getStatusColor(claim.status)
            return (
              <div
                key={claim._id}
                className="p-4 border-2 rounded"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-bg-light)'
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Gift size={16} style={{ color: 'var(--win95-selected-bg)' }} />
                      <span className="font-medium truncate">
                        {claim.benefit?.name || "Unknown Benefit"}
                      </span>
                    </div>
                    {claim.benefit?.description && (
                      <p className="text-xs opacity-60 mt-1 truncate">
                        {claim.benefit.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="opacity-60">
                        Claimed {formatDate(claim.claimedAt)}
                      </span>
                      {claim.approvedAt && (
                        <span className="opacity-60">
                          Approved {formatDate(claim.approvedAt)}
                        </span>
                      )}
                      {claim.redeemedAt && (
                        <span className="opacity-60">
                          Redeemed {formatDate(claim.redeemedAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                    style={{
                      background: statusColors.bg,
                      color: statusColors.text
                    }}
                  >
                    {getStatusIcon(claim.status)}
                    <span>{getStatusLabel(claim.status)}</span>
                  </div>
                </div>

                {claim.rejectionReason && (
                  <div
                    className="mt-3 p-2 rounded text-xs"
                    style={{
                      background: 'var(--win95-error-bg)',
                      color: 'var(--win95-error-text)'
                    }}
                  >
                    Reason: {claim.rejectionReason}
                  </div>
                )}

                {claim.notes && (
                  <div
                    className="mt-3 p-2 rounded text-xs"
                    style={{
                      background: 'var(--win95-bg)',
                      color: 'var(--win95-text)'
                    }}
                  >
                    Note: {claim.notes}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
