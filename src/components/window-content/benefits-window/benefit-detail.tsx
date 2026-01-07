"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth } from "@/hooks/use-auth"
import { Gift, Percent, Tag, Calendar, Mail, Clock, Users, Check } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"
import { useNotification } from "@/hooks/use-notification"
import { useState } from "react"

interface BenefitDetailProps {
  benefitId: Id<"objects">
}

export function BenefitDetail({ benefitId }: BenefitDetailProps) {
  const { sessionId } = useAuth()
  const notification = useNotification()
  const [isClaiming, setIsClaiming] = useState(false)

  // Get the current user's member ID
  // TODO: This should come from the session/auth context
  const memberId = null // Will be set from session

  const benefit = useQuery(
    api.benefitsOntology.getBenefit,
    sessionId && benefitId
      ? { sessionId, benefitId }
      : "skip"
  )

  const claimBenefit = useMutation(api.benefitsOntology.claimBenefit)

  if (!benefit) {
    return (
      <div className="p-4 text-center" style={{ color: 'var(--neutral-gray)' }}>
        <p className="text-sm">Loading benefit details...</p>
      </div>
    )
  }

  const getSubtypeIcon = (subtype: string) => {
    switch (subtype) {
      case "discount": return <Percent size={20} />
      case "service": return <Tag size={20} />
      case "product": return <Gift size={20} />
      case "event": return <Calendar size={20} />
      default: return <Gift size={20} />
    }
  }

  const getSubtypeLabel = (subtype: string) => {
    switch (subtype) {
      case "discount": return "Discount"
      case "service": return "Service"
      case "product": return "Product"
      case "event": return "Event"
      default: return subtype
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const handleClaim = async () => {
    if (!sessionId || !memberId) {
      notification.error("Not logged in", "Please log in to claim this benefit.")
      return
    }

    setIsClaiming(true)
    try {
      await claimBenefit({
        sessionId,
        benefitId,
        memberId: memberId as Id<"objects">,
      })
      notification.success("Benefit claimed!", "Your claim has been submitted for approval.")
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Please try again."
      notification.error("Failed to claim", errorMessage)
    } finally {
      setIsClaiming(false)
    }
  }

  const props = benefit.customProperties || {}

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className="p-3 rounded"
          style={{
            background: 'var(--win95-selected-bg)',
            color: 'var(--win95-selected-text)'
          }}
        >
          {getSubtypeIcon(benefit.subtype || "discount")}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-pixel text-lg" style={{ color: 'var(--win95-text)' }}>
              {benefit.name}
            </h2>
            {props.discountValue && (
              <span
                className="px-2 py-1 text-sm font-bold rounded"
                style={{
                  background: 'var(--win95-success-bg)',
                  color: 'var(--win95-success-text)'
                }}
              >
                {props.discountValue}% OFF
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="px-2 py-0.5 text-xs rounded"
              style={{
                background: 'var(--win95-bg-light)',
                color: 'var(--win95-text)'
              }}
            >
              {getSubtypeLabel(benefit.subtype || "")}
            </span>
            {props.category && (
              <span className="text-xs opacity-60">{props.category as string}</span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <div
        className="p-3 border-2 rounded"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg-light)'
        }}
      >
        <p className="text-sm" style={{ color: 'var(--win95-text)' }}>
          {benefit.description || "No description provided."}
        </p>
      </div>

      {/* Offerer Info */}
      {benefit.offerer && (
        <div
          className="p-3 border-2 rounded"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg)'
          }}
        >
          <h3 className="font-pixel text-xs mb-2 opacity-60">OFFERED BY</h3>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold"
              style={{
                background: 'var(--win95-selected-bg)',
                color: 'var(--win95-selected-text)'
              }}
            >
              {benefit.offerer.name?.charAt(0) || "?"}
            </div>
            <div>
              <p className="text-sm font-medium">{benefit.offerer.name}</p>
              {benefit.offerer.email && (
                <p className="text-xs opacity-60">{benefit.offerer.email}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Details */}
      <div className="grid grid-cols-2 gap-3">
        {/* Contact */}
        {props.contactEmail && (
          <div
            className="p-3 border-2 rounded"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-bg)'
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Mail size={14} style={{ color: 'var(--neutral-gray)' }} />
              <span className="text-xs opacity-60">Contact</span>
            </div>
            <p className="text-sm">{props.contactEmail as string}</p>
            {props.contactPhone && (
              <p className="text-xs opacity-60 mt-1">{props.contactPhone as string}</p>
            )}
          </div>
        )}

        {/* Validity */}
        {(props.validFrom || props.validUntil) && (
          <div
            className="p-3 border-2 rounded"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-bg)'
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} style={{ color: 'var(--neutral-gray)' }} />
              <span className="text-xs opacity-60">Validity</span>
            </div>
            {props.validFrom && (
              <p className="text-xs">From: {formatDate(props.validFrom as number)}</p>
            )}
            {props.validUntil && (
              <p className="text-xs">Until: {formatDate(props.validUntil as number)}</p>
            )}
          </div>
        )}

        {/* Claims */}
        <div
          className="p-3 border-2 rounded"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg)'
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} style={{ color: 'var(--neutral-gray)' }} />
            <span className="text-xs opacity-60">Claims</span>
          </div>
          <p className="text-sm">
            {benefit.stats?.totalClaims || 0} / {props.maxTotalClaims || "Unlimited"}
          </p>
          <p className="text-xs opacity-60">
            {benefit.stats?.redeemedClaims || 0} redeemed
          </p>
        </div>
      </div>

      {/* Requirements */}
      {props.requirements && (
        <div
          className="p-3 border-2 rounded"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg)'
          }}
        >
          <h3 className="font-pixel text-xs mb-2 opacity-60">REQUIREMENTS</h3>
          <p className="text-sm">{props.requirements as string}</p>
        </div>
      )}

      {/* Claim Button */}
      <div className="pt-2">
        <button
          onClick={handleClaim}
          disabled={isClaiming || benefit.status !== "active"}
          className="retro-button w-full py-3 flex items-center justify-center gap-2"
          style={{
            background: benefit.status === "active" ? 'var(--win95-selected-bg)' : 'var(--win95-button-face)',
            color: benefit.status === "active" ? 'var(--win95-selected-text)' : 'var(--neutral-gray)',
            opacity: isClaiming ? 0.7 : 1,
          }}
        >
          {isClaiming ? (
            <>
              <span className="animate-spin">...</span>
              <span className="font-pixel text-sm">Claiming...</span>
            </>
          ) : (
            <>
              <Check size={16} />
              <span className="font-pixel text-sm">Claim This Benefit</span>
            </>
          )}
        </button>
        {benefit.status !== "active" && (
          <p className="text-xs text-center mt-2 opacity-60">
            This benefit is currently not available.
          </p>
        )}
      </div>
    </div>
  )
}
