"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { X } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"

interface CommissionFormModalProps {
  onClose: () => void
  onSuccess: () => void
}

export function CommissionFormModal({ onClose, onSuccess }: CommissionFormModalProps) {
  const { sessionId } = useAuth()
  const currentOrganization = useCurrentOrganization()
  const currentOrganizationId = currentOrganization?.id

  // TODO: Get member ID from session
  const memberId = null

  const createCommission = useMutation(api.commissionsOntology.createCommission)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subtype: "referral",
    category: "",
    commissionType: "percentage",
    commissionValue: 10,
    currency: "EUR",
    validUntil: "",
    requirements: "",
    targetDescription: "",
    contactEmail: "",
    contactPhone: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!sessionId || !currentOrganizationId || !memberId) {
      return
    }

    setIsSubmitting(true)
    try {
      await createCommission({
        sessionId,
        organizationId: currentOrganizationId as Id<"organizations">,
        memberId: memberId as Id<"objects">,
        title: formData.title,
        description: formData.description,
        subtype: formData.subtype,
        category: formData.category || undefined,
        commissionType: formData.commissionType,
        commissionValue: formData.commissionValue,
        currency: formData.currency,
        validUntil: formData.validUntil ? new Date(formData.validUntil).getTime() : undefined,
        requirements: formData.requirements || undefined,
        targetDescription: formData.targetDescription || undefined,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone || undefined,
      })
      onSuccess()
    } catch (error) {
      console.error("Failed to create commission:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 border-2 shadow-lg"
        style={{
          background: 'var(--win95-bg)',
          borderColor: 'var(--win95-border)'
        }}
      >
        {/* Title bar */}
        <div
          className="flex items-center justify-between px-2 py-1"
          style={{ background: 'var(--win95-title-bar)' }}
        >
          <span className="font-pixel text-xs text-white">New Commission</span>
          <button
            onClick={onClose}
            className="retro-button p-1"
            style={{ background: 'var(--win95-button-face)' }}
          >
            <X size={12} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="text-xs font-medium block mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g., Website Development Referral"
              className="w-full px-2 py-1.5 border-2 text-sm"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-input-bg)',
                color: 'var(--win95-input-text)'
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium block mb-1">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={3}
              placeholder="Describe what you're offering commission for..."
              className="w-full px-2 py-1.5 border-2 text-sm resize-none"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-input-bg)',
                color: 'var(--win95-input-text)'
              }}
            />
          </div>

          {/* Type and Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">Type *</label>
              <select
                value={formData.subtype}
                onChange={(e) => setFormData({ ...formData, subtype: e.target.value })}
                className="w-full px-2 py-1.5 border-2 text-sm"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-input-bg)',
                  color: 'var(--win95-input-text)'
                }}
              >
                <option value="sales">Sales</option>
                <option value="consulting">Consulting</option>
                <option value="referral">Referral</option>
                <option value="partnership">Partnership</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Software, Marketing"
                className="w-full px-2 py-1.5 border-2 text-sm"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-input-bg)',
                  color: 'var(--win95-input-text)'
                }}
              />
            </div>
          </div>

          {/* Commission Rate */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">Commission Type</label>
              <select
                value={formData.commissionType}
                onChange={(e) => setFormData({ ...formData, commissionType: e.target.value })}
                className="w-full px-2 py-1.5 border-2 text-sm"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-input-bg)',
                  color: 'var(--win95-input-text)'
                }}
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">
                Value {formData.commissionType === "percentage" ? "(%)" : ""}
              </label>
              <input
                type="number"
                value={formData.commissionValue}
                onChange={(e) => setFormData({ ...formData, commissionValue: parseFloat(e.target.value) || 0 })}
                min={0}
                max={formData.commissionType === "percentage" ? 100 : undefined}
                className="w-full px-2 py-1.5 border-2 text-sm"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-input-bg)',
                  color: 'var(--win95-input-text)'
                }}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-2 py-1.5 border-2 text-sm"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-input-bg)',
                  color: 'var(--win95-input-text)'
                }}
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="USDC">USDC</option>
              </select>
            </div>
          </div>

          {/* Target Description */}
          <div>
            <label className="text-xs font-medium block mb-1">Who are you looking for?</label>
            <textarea
              value={formData.targetDescription}
              onChange={(e) => setFormData({ ...formData, targetDescription: e.target.value })}
              placeholder="Describe the type of customers or leads you're looking for..."
              rows={2}
              className="w-full px-2 py-1.5 border-2 text-sm resize-none"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-input-bg)',
                color: 'var(--win95-input-text)'
              }}
            />
          </div>

          {/* Valid Until */}
          <div>
            <label className="text-xs font-medium block mb-1">Valid Until</label>
            <input
              type="date"
              value={formData.validUntil}
              onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
              className="w-full px-2 py-1.5 border-2 text-sm"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-input-bg)',
                color: 'var(--win95-input-text)'
              }}
            />
          </div>

          {/* Requirements */}
          <div>
            <label className="text-xs font-medium block mb-1">Requirements</label>
            <textarea
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              placeholder="Any requirements or conditions..."
              rows={2}
              className="w-full px-2 py-1.5 border-2 text-sm resize-none"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-input-bg)',
                color: 'var(--win95-input-text)'
              }}
            />
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">Contact Email *</label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                required
                className="w-full px-2 py-1.5 border-2 text-sm"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-input-bg)',
                  color: 'var(--win95-input-text)'
                }}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Contact Phone</label>
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full px-2 py-1.5 border-2 text-sm"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-input-bg)',
                  color: 'var(--win95-input-text)'
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="retro-button px-4 py-2"
              style={{ background: 'var(--win95-button-face)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="retro-button px-4 py-2"
              style={{
                background: 'var(--win95-selected-bg)',
                color: 'var(--win95-selected-text)',
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              {isSubmitting ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
