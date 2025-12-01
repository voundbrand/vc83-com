"use client"

import { useDroppable } from '@dnd-kit/core'
import { Trash2 } from 'lucide-react'
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { ContactCard } from "./contact-card"
import type { Doc, Id } from "../../../../convex/_generated/dataModel"

interface KanbanColumnProps {
  stageId: string
  stageLabel: string
  contacts: Doc<"objects">[]
  isEditMode?: boolean
  onDeleteStage?: (stageId: Id<"objects">) => void
}

// Stage color mappings (theme-aware)
const STAGE_COLORS = {
  lead: {
    light: 'rgba(254, 243, 199, 0.3)',    // Lighter yellow tint
    border: 'rgba(250, 204, 21, 0.5)',    // Yellow border
  },
  prospect: {
    light: 'rgba(219, 234, 254, 0.3)',    // Lighter blue tint
    border: 'rgba(147, 197, 253, 0.5)',   // Blue border
  },
  customer: {
    light: 'rgba(220, 252, 231, 0.3)',    // Lighter green tint
    border: 'rgba(134, 239, 172, 0.5)',   // Green border
  },
  partner: {
    light: 'rgba(224, 231, 255, 0.3)',    // Lighter purple tint
    border: 'rgba(199, 210, 254, 0.5)',   // Purple border
  },
}

export function KanbanColumn({ stageId, stageLabel, contacts, isEditMode = false, onDeleteStage }: KanbanColumnProps) {
  const { t } = useNamespaceTranslations("ui.crm")
  const { setNodeRef, isOver } = useDroppable({
    id: stageId,
  })

  const totalValue = contacts.reduce((sum, contact) => {
    const value = contact.customProperties?.totalSpent || 0
    return sum + (typeof value === 'number' ? value : 0)
  }, 0)

  const stageColors = STAGE_COLORS[stageId as keyof typeof STAGE_COLORS] || STAGE_COLORS.lead

  const handleDeleteStage = () => {
    if (contacts.length > 0) {
      alert(t("ui.crm.pipeline.cannot_delete_stage_with_contacts") || "Cannot delete stage with contacts. Move contacts first.");
      return;
    }

    const confirmMessage = t("ui.crm.pipeline.confirm_delete_stage") || `Are you sure you want to delete the "${stageLabel}" stage?`;
    if (confirm(confirmMessage) && onDeleteStage) {
      onDeleteStage(stageId as Id<"objects">);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className="flex-1 min-w-[280px] flex flex-col border-2"
      style={{
        background: isOver ? stageColors.light : 'var(--win95-bg-light)',
        borderColor: isOver ? stageColors.border : 'var(--win95-border)',
        opacity: isOver ? 0.9 : 1,
      }}
    >
      {/* Column Header */}
      <div
        className="p-3 border-b-2"
        style={{
          background: stageColors.light,
          borderColor: stageColors.border
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="font-pixel text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
              {stageLabel}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              {contacts.length} {t("ui.crm.pipeline.contact_count", { count: contacts.length })}
              {totalValue > 0 && ` • $${(totalValue / 100).toFixed(2)}`}
            </div>
          </div>

          {/* Delete Button (Edit Mode Only) */}
          {isEditMode && (
            <button
              onClick={handleDeleteStage}
              className="retro-button p-1.5 hover:bg-red-500 transition-colors"
              style={{ background: "var(--win95-button-face)" }}
              title={t("ui.crm.pipeline.delete_stage") || "Delete stage"}
            >
              <Trash2 size={12} style={{ color: "var(--error)" }} />
            </button>
          )}
        </div>
      </div>

      {/* Contact Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {contacts.map(contact => (
          <ContactCard key={contact._id} contact={contact} />
        ))}
        {contacts.length === 0 && (
          <div
            className="text-center py-8 text-xs"
            style={{ color: 'var(--neutral-gray)' }}
          >
            {t("ui.crm.pipeline.no_contacts")}
          </div>
        )}
      </div>
    </div>
  )
}
