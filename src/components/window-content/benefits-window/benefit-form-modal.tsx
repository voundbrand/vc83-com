"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { X } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"

interface BenefitFormModalProps {
  onClose: () => void
  onSuccess: () => void
  editingBenefit?: {
    _id: Id<"objects">
    name: string
    description?: string
    subtype?: string
    customProperties?: Record<string, unknown>
  }
}

export function BenefitFormModal({ onClose, onSuccess, editingBenefit }: BenefitFormModalProps) {
  const { sessionId } = useAuth()
  const currentOrganization = useCurrentOrganization()
  const currentOrganizationId = currentOrganization?.id

  // TODO: Get member ID from session
  const memberId = null

  const createBenefit = useMutation(api.benefitsOntology.createBenefit)
  const updateBenefit = useMutation(api.benefitsOntology.updateBenefit)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: editingBenefit?.name || "",
    description: editingBenefit?.description || "",
    subtype: editingBenefit?.subtype || "discount",
    category: (editingBenefit?.customProperties?.category as string) || "",
    discountType: (editingBenefit?.customProperties?.discountType as string) || "percentage",
    discountValue: (editingBenefit?.customProperties?.discountValue as number) || 0,
    validUntil: "",
    maxTotalClaims: (editingBenefit?.customProperties?.maxTotalClaims as number) || 0,
    requirements: (editingBenefit?.customProperties?.requirements as string) || "",
    contactEmail: (editingBenefit?.customProperties?.contactEmail as string) || "",
    contactPhone: (editingBenefit?.customProperties?.contactPhone as string) || "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!sessionId || !currentOrganizationId || !memberId) {
      return
    }

    setIsSubmitting(true)
    try {
      if (editingBenefit) {
        await updateBenefit({
          sessionId,
          benefitId: editingBenefit._id,
          memberId: memberId as Id<"objects">,
          updates: {
            title: formData.title,
            description: formData.description,
            subtype: formData.subtype,
            category: formData.category || undefined,
            discountType: formData.subtype === "discount" ? formData.discountType : undefined,
            discountValue: formData.subtype === "discount" ? formData.discountValue : undefined,
            validUntil: formData.validUntil ? new Date(formData.validUntil).getTime() : undefined,
            maxTotalClaims: formData.maxTotalClaims || undefined,
            requirements: formData.requirements || undefined,
            contactEmail: formData.contactEmail || undefined,
            contactPhone: formData.contactPhone || undefined,
          },
        })
      } else {
        await createBenefit({
          sessionId,
          organizationId: currentOrganizationId as Id<"organizations">,
          memberId: memberId as Id<"objects">,
          title: formData.title,
          description: formData.description,
          subtype: formData.subtype,
          category: formData.category || undefined,
          discountType: formData.subtype === "discount" ? formData.discountType : undefined,
          discountValue: formData.subtype === "discount" ? formData.discountValue : undefined,
          validUntil: formData.validUntil ? new Date(formData.validUntil).getTime() : undefined,
          maxTotalClaims: formData.maxTotalClaims || undefined,
          requirements: formData.requirements || undefined,
          contactEmail: formData.contactEmail,
          contactPhone: formData.contactPhone || undefined,
        })
      }
      onSuccess()
    } catch (error) {
      console.error("Failed to save benefit:", error)
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
          <span className="font-pixel text-xs text-white">
            {editingBenefit ? "Edit Benefit" : "New Benefit"}
          </span>
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
                <option value="discount">Discount</option>
                <option value="service">Service</option>
                <option value="product">Product</option>
                <option value="event">Event</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Software, Design"
                className="w-full px-2 py-1.5 border-2 text-sm"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-input-bg)',
                  color: 'var(--win95-input-text)'
                }}
              />
            </div>
          </div>

          {/* Discount fields */}
          {formData.subtype === "discount" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1">Discount Type</label>
                <select
                  value={formData.discountType}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
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
                  Value {formData.discountType === "percentage" ? "(%)" : "(EUR)"}
                </label>
                <input
                  type="number"
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
                  min={0}
                  max={formData.discountType === "percentage" ? 100 : undefined}
                  className="w-full px-2 py-1.5 border-2 text-sm"
                  style={{
                    borderColor: 'var(--win95-border)',
                    background: 'var(--win95-input-bg)',
                    color: 'var(--win95-input-text)'
                  }}
                />
              </div>
            </div>
          )}

          {/* Validity and Claims */}
          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <label className="text-xs font-medium block mb-1">Max Claims (0 = unlimited)</label>
              <input
                type="number"
                value={formData.maxTotalClaims}
                onChange={(e) => setFormData({ ...formData, maxTotalClaims: parseInt(e.target.value) || 0 })}
                min={0}
                className="w-full px-2 py-1.5 border-2 text-sm"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-input-bg)',
                  color: 'var(--win95-input-text)'
                }}
              />
            </div>
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
              {isSubmitting ? "Saving..." : editingBenefit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
