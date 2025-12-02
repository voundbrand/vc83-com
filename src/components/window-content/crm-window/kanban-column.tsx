"use client"

import { useDroppable } from '@dnd-kit/core'
import { Trash2 } from 'lucide-react'
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { useNotification } from "@/hooks/use-notification"
import { useRetroConfirm } from "@/components/retro-confirm-dialog"
import { ContactCard } from "./contact-card"
import type { Doc, Id } from "../../../../convex/_generated/dataModel"

interface KanbanColumnProps {
  stageId: string
  stageLabel: string
  contacts: Doc<"objects">[]
  isEditMode?: boolean
  onDeleteStage?: (stageId: Id<"objects">) => void
}

// Stage color mappings (theme-aware with CSS variable fallbacks)
const STAGE_COLORS = {
  lead: {
    light: 'var(--stage-lead-bg, rgba(254, 243, 199, 0.3))',
    border: 'var(--stage-lead-border, rgba(250, 204, 21, 0.5))',
  },
  prospect: {
    light: 'var(--stage-prospect-bg, rgba(219, 234, 254, 0.3))',
    border: 'var(--stage-prospect-border, rgba(147, 197, 253, 0.5))',
  },
  customer: {
    light: 'var(--stage-customer-bg, rgba(220, 252, 231, 0.3))',
    border: 'var(--stage-customer-border, rgba(134, 239, 172, 0.5))',
  },
  partner: {
    light: 'var(--stage-partner-bg, rgba(224, 231, 255, 0.3))',
    border: 'var(--stage-partner-border, rgba(199, 210, 254, 0.5))',
  },
}

export function KanbanColumn({ stageId, stageLabel, contacts, isEditMode = false, onDeleteStage }: KanbanColumnProps) {
  const { t } = useNamespaceTranslations("ui.crm")
  const notification = useNotification()
  const confirmDialog = useRetroConfirm()
  const { setNodeRef, isOver } = useDroppable({
    id: stageId,
  })

  const totalValue = contacts.reduce((sum, contact) => {
    const value = contact.customProperties?.totalSpent || 0
    return sum + (typeof value === 'number' ? value : 0)
  }, 0)

  const stageColors = STAGE_COLORS[stageId as keyof typeof STAGE_COLORS] || STAGE_COLORS.lead

  const handleDeleteStage = async () => {
    if (contacts.length > 0) {
      notification.error(
        t("ui.crm.pipeline.cannot_delete_stage_with_contacts") || "Cannot delete stage with contacts",
        "Please move all contacts to another stage first."
      );
      return;
    }

    const confirmed = await confirmDialog.confirm({
      title: t("ui.crm.pipeline.delete_stage") || "Delete Stage",
      message: t("ui.crm.pipeline.confirm_delete_stage") || `Are you sure you want to delete the "${stageLabel}" stage?`,
      confirmText: t("ui.crm.pipeline.delete") || "Delete",
      confirmVariant: "primary",
    });

    if (confirmed && onDeleteStage) {
      onDeleteStage(stageId as Id<"objects">);
    }
  };

  return (
    <>
      <confirmDialog.Dialog />
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
    </>
  )
}
