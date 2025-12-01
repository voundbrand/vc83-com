"use client"

import { useDroppable } from '@dnd-kit/core'
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { ContactCard } from "./contact-card"
import type { Doc } from "../../../../convex/_generated/dataModel"

interface KanbanColumnProps {
  stageId: string
  stageLabel: string
  contacts: Doc<"objects">[]
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

export function KanbanColumn({ stageId, stageLabel, contacts }: KanbanColumnProps) {
  const { t } = useNamespaceTranslations("ui.crm")
  const { setNodeRef, isOver } = useDroppable({
    id: stageId,
  })

  const totalValue = contacts.reduce((sum, contact) => {
    const value = contact.customProperties?.totalSpent || 0
    return sum + (typeof value === 'number' ? value : 0)
  }, 0)

  const stageColors = STAGE_COLORS[stageId as keyof typeof STAGE_COLORS] || STAGE_COLORS.lead

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
        <div className="font-pixel text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
          {stageLabel}
        </div>
        <div className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
          {contacts.length} {t("ui.crm.pipeline.contact_count", { count: contacts.length })}
          {totalValue > 0 && ` • $${(totalValue / 100).toFixed(2)}`}
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
