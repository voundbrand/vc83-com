"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core'
import { api } from "../../../../convex/_generated/api"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { KanbanColumn } from "./kanban-column"
import { ContactCard } from "./contact-card"
import type { Id } from "../../../../convex/_generated/dataModel"

export function PipelineKanban() {
  const { sessionId } = useAuth()
  const currentOrganization = useCurrentOrganization()
  const currentOrganizationId = currentOrganization?.id as Id<"organizations"> | undefined
  const { t } = useNamespaceTranslations("ui.crm")

  const [activeId, setActiveId] = useState<string | null>(null)
  const updateContactStage = useMutation(api.crmOntology.updateContact)

  // Fetch all active contacts
  const contacts = useQuery(
    api.crmOntology.getContacts,
    sessionId && currentOrganizationId
      ? { sessionId, organizationId: currentOrganizationId, status: "active" }
      : "skip"
  )

  // Group contacts by lifecycle stage
  const contactsByStage = {
    lead: contacts?.filter(c => c.subtype === "lead") || [],
    prospect: contacts?.filter(c => c.subtype === "prospect") || [],
    customer: contacts?.filter(c => c.subtype === "customer") || [],
    partner: contacts?.filter(c => c.subtype === "partner") || [],
  }

  const stages = [
    { id: "lead", labelKey: "ui.crm.pipeline.stages.lead" },
    { id: "prospect", labelKey: "ui.crm.pipeline.stages.prospect" },
    { id: "customer", labelKey: "ui.crm.pipeline.stages.customer" },
    { id: "partner", labelKey: "ui.crm.pipeline.stages.partner" },
  ]

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || !sessionId) {
      setActiveId(null)
      return
    }

    const contactId = active.id as Id<"objects">
    const newStage = over.id as "lead" | "prospect" | "customer" | "partner"

    // Update contact lifecycle stage
    try {
      await updateContactStage({
        sessionId,
        contactId,
        updates: {
          subtype: newStage
        }
      })
    } catch (error) {
      console.error("Failed to update contact stage:", error)
      alert("Failed to move contact. Please try again.")
    }

    setActiveId(null)
  }

  // Find the active contact for the DragOverlay
  const activeContact = activeId
    ? contacts?.find(c => c._id === activeId)
    : null

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="h-full flex flex-col p-4" style={{ background: 'var(--win95-bg)' }}>
        {/* Kanban Board */}
        <div className="flex-1 flex gap-4 overflow-x-auto">
          {stages.map(stage => (
            <KanbanColumn
              key={stage.id}
              stageId={stage.id}
              stageLabel={t(stage.labelKey)}
              contacts={contactsByStage[stage.id as keyof typeof contactsByStage]}
            />
          ))}
        </div>
      </div>
      <DragOverlay>
        {activeContact && <ContactCard contact={activeContact} />}
      </DragOverlay>
    </DndContext>
  )
}
