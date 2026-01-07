"use client"

import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { DollarSign, Clock, Check, X, AlertCircle, Send, Wallet } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"

export function MyEarningsTab() {
  const { sessionId, user } = useAuth()
  const currentOrganization = useCurrentOrganization()
  const currentOrganizationId = currentOrganization?.id

  const earnings = useQuery(
    api.commissionsOntology.getMyEarnedCommissions,
    sessionId && currentOrganizationId && user?.id
      ? { sessionId, organizationId: currentOrganizationId as Id<"organizations"> }
      : "skip"
  )

  if (!sessionId || !currentOrganizationId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8" style={{ color: 'var(--neutral-gray)' }}>
        <Wallet size={48} className="mb-4 opacity-30" />
        <p className="font-pixel text-sm">Please log in</p>
        <p className="text-xs mt-2">Login required to view your earnings</p>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending_verification": return <Clock size={14} />
      case "verified": return <Check size={14} />
      case "processing": return <Send size={14} />
      case "paid": return <DollarSign size={14} />
      case "disputed": return <AlertCircle size={14} />
      case "cancelled": return <X size={14} />
      default: return <Clock size={14} />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending_verification": return { bg: 'var(--win95-warning-bg)', text: 'var(--win95-warning-text)' }
      case "verified": return { bg: 'var(--win95-info-bg)', text: 'var(--win95-info-text)' }
      case "processing": return { bg: 'var(--win95-info-bg)', text: 'var(--win95-info-text)' }
      case "paid": return { bg: 'var(--win95-success-bg)', text: 'var(--win95-success-text)' }
      case "disputed": return { bg: 'var(--win95-error-bg)', text: 'var(--win95-error-text)' }
      case "cancelled": return { bg: 'var(--win95-bg-light)', text: 'var(--neutral-gray)' }
      default: return { bg: 'var(--win95-bg-light)', text: 'var(--win95-text)' }
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending_verification": return "Pending"
      case "verified": return "Verified"
      case "processing": return "Processing"
      case "paid": return "Paid"
      case "disputed": return "Disputed"
      case "cancelled": return "Cancelled"
      default: return status
    }
  }

  const formatCurrency = (cents: number, currency: string = "EUR") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(cents / 100)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  // Calculate totals
  const totalPending = earnings?.filter(e =>
    e.status === "pending_verification" || e.status === "verified" || e.status === "processing"
  ).reduce((sum, e) => sum + e.amountInCents, 0) || 0

  const totalPaid = earnings?.filter(e => e.status === "paid")
    .reduce((sum, e) => sum + e.amountInCents, 0) || 0

  return (
    <div className="h-full overflow-y-auto p-4">
      <h2 className="font-pixel text-lg mb-4" style={{ color: 'var(--win95-text)' }}>
        My Commission Earnings
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div
          className="p-4 border-2 rounded"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg-light)'
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} style={{ color: 'var(--neutral-gray)' }} />
            <span className="text-xs opacity-60">Pending</span>
          </div>
          <p className="font-pixel text-lg" style={{ color: 'var(--win95-warning-text)' }}>
            {formatCurrency(totalPending)}
          </p>
        </div>
        <div
          className="p-4 border-2 rounded"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg-light)'
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={14} style={{ color: 'var(--neutral-gray)' }} />
            <span className="text-xs opacity-60">Total Paid</span>
          </div>
          <p className="font-pixel text-lg" style={{ color: 'var(--win95-success-text)' }}>
            {formatCurrency(totalPaid)}
          </p>
        </div>
      </div>

      {/* Earnings List */}
      {!earnings ? (
        <div className="text-center py-8" style={{ color: 'var(--neutral-gray)' }}>
          <p className="text-sm">Loading earnings...</p>
        </div>
      ) : earnings.length === 0 ? (
        <div className="text-center py-8" style={{ color: 'var(--neutral-gray)' }}>
          <Wallet size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-pixel text-sm">No earnings yet</p>
          <p className="text-xs mt-2">Submit referrals for commissions to earn</p>
        </div>
      ) : (
        <div className="space-y-3">
          {earnings.map((earning) => {
            const statusColors = getStatusColor(earning.status)
            return (
              <div
                key={earning._id}
                className="p-4 border-2 rounded"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-bg-light)'
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <DollarSign size={16} style={{ color: 'var(--win95-selected-bg)' }} />
                      <span className="font-medium truncate">
                        {earning.commission?.name || "Unknown Commission"}
                      </span>
                    </div>
                    <p className="text-xs opacity-60 mt-1 truncate">
                      {earning.referralDetails}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="opacity-60">
                        Submitted {formatDate(earning.createdAt)}
                      </span>
                      {earning.merchant && (
                        <span className="opacity-60">
                          From: {earning.merchant.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-pixel text-sm" style={{ color: 'var(--win95-success-text)' }}>
                      {formatCurrency(earning.amountInCents, earning.currency)}
                    </p>
                    <div
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs mt-1"
                      style={{
                        background: statusColors.bg,
                        color: statusColors.text
                      }}
                    >
                      {getStatusIcon(earning.status)}
                      <span>{getStatusLabel(earning.status)}</span>
                    </div>
                  </div>
                </div>

                {earning.status === "paid" && earning.paidAt && (
                  <div
                    className="mt-3 p-2 rounded text-xs flex items-center gap-2"
                    style={{
                      background: 'var(--win95-success-bg)',
                      color: 'var(--win95-success-text)'
                    }}
                  >
                    <Check size={12} />
                    Paid on {formatDate(earning.paidAt)}
                    {earning.paymentMethod && ` via ${earning.paymentMethod}`}
                  </div>
                )}

                {earning.disputeReason && (
                  <div
                    className="mt-3 p-2 rounded text-xs"
                    style={{
                      background: 'var(--win95-error-bg)',
                      color: 'var(--win95-error-text)'
                    }}
                  >
                    Dispute: {earning.disputeReason}
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
