"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth } from "@/hooks/use-auth"
import { DollarSign, Briefcase, Users, Send } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"
import { useNotification } from "@/hooks/use-notification"
import { useState } from "react"

interface CommissionDetailProps {
  commissionId: Id<"objects">
}

export function CommissionDetail({ commissionId }: CommissionDetailProps) {
  const { sessionId } = useAuth()
  const notification = useNotification()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [referralDetails, setReferralDetails] = useState("")
  const [referralCustomerName, setReferralCustomerName] = useState("")
  const [referralCustomerEmail, setReferralCustomerEmail] = useState("")
  const [referralValue, setReferralValue] = useState("")

  // TODO: Get from session
  const memberId = null

  const commission = useQuery(
    api.commissionsOntology.getCommission,
    sessionId && commissionId
      ? { sessionId, commissionId }
      : "skip"
  )

  const submitReferral = useMutation(api.commissionsOntology.submitReferral)

  if (!commission) {
    return (
      <div className="p-4 text-center" style={{ color: 'var(--neutral-gray)' }}>
        <p className="text-sm">Loading commission details...</p>
      </div>
    )
  }

  const getSubtypeIcon = (subtype: string) => {
    switch (subtype) {
      case "sales": return <DollarSign size={20} />
      case "consulting": return <Briefcase size={20} />
      case "referral": return <Users size={20} />
      case "partnership": return <Users size={20} />
      default: return <DollarSign size={20} />
    }
  }

  const getSubtypeLabel = (subtype: string) => {
    switch (subtype) {
      case "sales": return "Sales Commission"
      case "consulting": return "Consulting Referral"
      case "referral": return "Referral Program"
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

  const handleSubmitReferral = async () => {
    if (!sessionId || !memberId || !referralDetails.trim()) {
      notification.error("Missing information", "Please provide referral details.")
      return
    }

    setIsSubmitting(true)
    try {
      await submitReferral({
        sessionId,
        commissionId,
        affiliateId: memberId as Id<"objects">,
        referralDetails: referralDetails.trim(),
        referralCustomerName: referralCustomerName.trim() || undefined,
        referralCustomerEmail: referralCustomerEmail.trim() || undefined,
        referralValue: referralValue ? parseFloat(referralValue) : undefined,
      })
      notification.success("Referral submitted!", "The merchant will review your referral.")
      setReferralDetails("")
      setReferralCustomerName("")
      setReferralCustomerEmail("")
      setReferralValue("")
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Please try again."
      notification.error("Failed to submit", errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const props = commission.customProperties || {}

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className="p-3 rounded-lg"
          style={{
            background: 'var(--win95-selected-bg)',
            color: 'var(--win95-selected-text)'
          }}
        >
          {getSubtypeIcon(commission.subtype || "sales")}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-pixel text-sm" style={{ color: 'var(--window-document-text)' }}>
              {commission.name}
            </h2>
            {props.commissionValue && (
              <span
                className="px-2 py-1 text-sm font-bold rounded-lg"
                style={{
                  background: 'var(--win95-success-bg)',
                  color: 'var(--win95-success-text)'
                }}
              >
                {props.commissionType === "percentage"
                  ? `${props.commissionValue}%`
                    : formatCurrency((props.commissionValue as number) * 100, props.currency as string || "EUR")
                }
              </span>
            )}
            <span
              className="px-2 py-0.5 text-xs rounded-lg"
              style={{
                background: 'var(--desktop-shell-accent)',
                color: 'var(--window-document-text)'
              }}
            >
              {getSubtypeLabel(commission.subtype || "")}
            </span>
            {props.category && (
              <span className="text-xs opacity-60">{props.category as string}</span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <div
        className="p-3 border rounded-lg"
        style={{
          borderColor: 'var(--window-document-border)',
          background: 'var(--desktop-shell-accent)'
        }}
      >
        <p className="text-sm" style={{ color: 'var(--window-document-text)' }}>
          {commission.description || "No description provided."}
        </p>
      </div>

      {/* Target Description */}
      {props.targetDescription && (
        <div
          className="p-3 border rounded-lg"
          style={{
            borderColor: 'var(--window-document-border)',
            background: 'var(--window-document-bg)'
          }}
        >
          <h3 className="font-pixel text-xs mb-2 opacity-60">LOOKING FOR</h3>
          <p className="text-sm">{props.targetDescription as string}</p>
        </div>
      )}

      {/* Offerer Info */}
      {commission.offerer && (
        <div
          className="p-3 border rounded-lg"
          style={{
            borderColor: 'var(--window-document-border)',
            background: 'var(--window-document-bg)'
          }}
        >
          <h3 className="font-pixel text-xs mb-2 opacity-60">OFFERED BY</h3>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{
                background: 'var(--win95-selected-bg)',
                color: 'var(--win95-selected-text)'
              }}
            >
              {commission.offerer.name?.charAt(0) || "?"}
            </div>
            <div>
              <p className="text-sm font-medium">{commission.offerer.name}</p>
              {commission.offerer.email && (
                <p className="text-xs opacity-60">{commission.offerer.email}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="p-3 border rounded-lg"
          style={{
            borderColor: 'var(--window-document-border)',
            background: 'var(--window-document-bg)'
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Send size={14} style={{ color: 'var(--neutral-gray)' }} />
            <span className="text-xs opacity-60">Payouts</span>
          </div>
          <p className="text-sm">
            {commission.stats?.totalPayouts || 0} total
          </p>
          <p className="text-xs opacity-60">
            {commission.stats?.pendingPayouts || 0} pending
          </p>
        </div>

        <div
          className="p-3 border rounded-lg"
          style={{
            borderColor: 'var(--window-document-border)',
            background: 'var(--window-document-bg)'
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={14} style={{ color: 'var(--neutral-gray)' }} />
            <span className="text-xs opacity-60">Total Paid</span>
          </div>
          <p className="text-sm font-medium">
            {formatCurrency(commission.stats?.totalPaidAmount || 0, props.currency as string || "EUR")}
          </p>
        </div>
      </div>

      {/* Submit Referral Form */}
      <div
        className="p-4 border rounded-lg"
        style={{
          borderColor: 'var(--window-document-border)',
          background: 'var(--desktop-shell-accent)'
        }}
      >
        <h3 className="font-pixel text-sm mb-3">Submit a Referral</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs opacity-60 block mb-1">Referral Details *</label>
            <textarea
              value={referralDetails}
              onChange={(e) => setReferralDetails(e.target.value)}
              placeholder="Describe the referral..."
              className="w-full px-2 py-1.5 border text-sm resize-none"
              rows={3}
              style={{
                borderColor: 'var(--window-document-border)',
                background: 'var(--win95-input-bg)',
                color: 'var(--win95-input-text)'
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs opacity-60 block mb-1">Customer Name</label>
              <input
                type="text"
                value={referralCustomerName}
                onChange={(e) => setReferralCustomerName(e.target.value)}
                placeholder="Customer name"
                className="w-full px-2 py-1.5 border text-sm"
                style={{
                  borderColor: 'var(--window-document-border)',
                  background: 'var(--win95-input-bg)',
                  color: 'var(--win95-input-text)'
                }}
              />
            </div>
            <div>
              <label className="text-xs opacity-60 block mb-1">Customer Email</label>
              <input
                type="email"
                value={referralCustomerEmail}
                onChange={(e) => setReferralCustomerEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full px-2 py-1.5 border text-sm"
                style={{
                  borderColor: 'var(--window-document-border)',
                  background: 'var(--win95-input-bg)',
                  color: 'var(--win95-input-text)'
                }}
              />
            </div>
          </div>

          {props.commissionType === "percentage" && (
            <div>
              <label className="text-xs opacity-60 block mb-1">Deal Value ({props.currency || "EUR"})</label>
              <input
                type="number"
                value={referralValue}
                onChange={(e) => setReferralValue(e.target.value)}
                placeholder="0.00"
                className="w-full px-2 py-1.5 border text-sm"
                style={{
                  borderColor: 'var(--window-document-border)',
                  background: 'var(--win95-input-bg)',
                  color: 'var(--win95-input-text)'
                }}
              />
            </div>
          )}

          <button
            onClick={handleSubmitReferral}
            disabled={isSubmitting || !referralDetails.trim()}
            className="retro-button w-full py-2 flex items-center justify-center gap-2"
            style={{
              background: referralDetails.trim() ? 'var(--win95-selected-bg)' : 'var(--win95-button-face)',
              color: referralDetails.trim() ? 'var(--win95-selected-text)' : 'var(--neutral-gray)',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            <Send size={14} />
            <span className="text-sm">
              {isSubmitting ? "Submitting..." : "Submit Referral"}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
