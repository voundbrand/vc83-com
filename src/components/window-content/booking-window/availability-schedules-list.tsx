"use client"

import { useState, useRef, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { useNotification } from "@/hooks/use-notification"
import { Clock, Plus, MoreHorizontal, Globe, Trash2, Star, Edit3 } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"

interface AvailabilitySchedulesListProps {
  onEdit: (scheduleId: Id<"objects">) => void
  onCreate: () => void
}

export function AvailabilitySchedulesList({ onEdit, onCreate }: AvailabilitySchedulesListProps) {
  const { sessionId } = useAuth()
  const currentOrganization = useCurrentOrganization()
  const notification = useNotification()
  const { tWithFallback } = useNamespaceTranslations("ui.app.booking")

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const schedules = useQuery(
    api.availabilityOntology.getAvailabilitySchedules,
    sessionId && currentOrganization?.id
      ? { sessionId, organizationId: currentOrganization.id as Id<"organizations"> }
      : "skip"
  )

  const setDefault = useMutation(api.availabilityOntology.setDefaultSchedule)
  const deleteSchedule = useMutation(api.availabilityOntology.deleteAvailabilitySchedule)

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    if (openMenuId) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [openMenuId])

  async function handleSetDefault(scheduleId: Id<"objects">) {
    if (!sessionId) return
    setOpenMenuId(null)
    try {
      await setDefault({ sessionId, scheduleId })
      notification.success(
        tWithFallback("ui.app.booking.notifications.success_title", "Success"),
        tWithFallback("ui.app.booking.availability.notifications.default_updated", "Default schedule updated."),
      )
    } catch (err) {
      notification.error(
        tWithFallback("ui.app.booking.notifications.error_title", "Error"),
        tWithFallback("ui.app.booking.availability.notifications.default_failed", "Failed to set default schedule."),
      )
    }
  }

  async function handleDelete(scheduleId: Id<"objects">) {
    if (!sessionId) return
    setConfirmDeleteId(null)
    setOpenMenuId(null)
    try {
      await deleteSchedule({ sessionId, scheduleId })
      notification.success(
        tWithFallback("ui.app.booking.notifications.success_title", "Success"),
        tWithFallback("ui.app.booking.availability.notifications.deleted", "Schedule deleted."),
      )
    } catch (err: any) {
      const message =
        err?.message?.includes("in use")
          ? tWithFallback("ui.app.booking.availability.notifications.delete_in_use", "Cannot delete a schedule that is currently in use.")
          : tWithFallback("ui.app.booking.availability.notifications.delete_failed", "Failed to delete schedule.")
      notification.error(tWithFallback("ui.app.booking.notifications.error_title", "Error"), message)
    }
  }

  const isEmpty = schedules && schedules.length === 0

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--shell-surface)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b-2" style={{ borderColor: "var(--shell-border)" }}>
        <div>
          <h2 className="font-pixel text-base" style={{ color: "var(--shell-text)" }}>
            {tWithFallback("ui.app.booking.availability.title", "Availability")}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--shell-text)", opacity: 0.6 }}>
            {tWithFallback("ui.app.booking.availability.subtitle", "Configure times when you are available for bookings.")}
          </p>
        </div>
        <button
          type="button"
          className="desktop-interior-button flex items-center gap-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-inset"
          onClick={onCreate}
        >
          <Plus size={14} />
          {tWithFallback("ui.app.booking.actions.new", "New")}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Loading */}
        {schedules === undefined && (
          <div className="flex items-center justify-center py-12">
            <p className="font-pixel text-xs" style={{ color: "var(--shell-text)", opacity: 0.5 }}>
              {tWithFallback("ui.app.booking.availability.loading", "Loading schedules...")}
            </p>
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Clock size={48} style={{ color: "var(--shell-text)", opacity: 0.3 }} />
            <p className="font-pixel text-sm" style={{ color: "var(--shell-text)" }}>
              {tWithFallback("ui.app.booking.availability.empty_title", "No availability schedules")}
            </p>
            <p className="text-xs text-center max-w-[280px]" style={{ color: "var(--shell-text)", opacity: 0.6 }}>
              {tWithFallback("ui.app.booking.availability.empty_hint", "Create your first schedule to set when you're available for bookings.")}
            </p>
            <button
              type="button"
              className="desktop-interior-button flex items-center gap-1 text-xs mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-inset"
              onClick={onCreate}
            >
              <Plus size={14} />
              {tWithFallback("ui.app.booking.availability.actions.create_schedule", "Create Schedule")}
            </button>
          </div>
        )}

        {/* Schedule cards */}
        {schedules && schedules.length > 0 && (
          <div className="flex flex-col gap-2" ref={menuRef}>
            {schedules.map((schedule) => (
              <div
                key={schedule._id}
                className="border-2 px-3 py-2.5 flex items-center justify-between cursor-pointer transition-colors"
                role="button"
                tabIndex={0}
                aria-label={tWithFallback(
                  "ui.app.booking.availability.schedule_row_aria_label",
                  "Edit schedule {name}",
                  { name: schedule.name },
                )}
                style={{
                  background: "var(--shell-surface-elevated)",
                  borderColor: "var(--shell-border)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--shell-surface)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--shell-surface-elevated)"
                }}
                onClick={() => onEdit(schedule._id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onEdit(schedule._id)
                  }
                }}
              >
                {/* Left side */}
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-pixel text-sm font-bold truncate" style={{ color: "var(--shell-text)" }}>
                      {schedule.name}
                    </span>
                    {schedule.isDefault && (
                      <span
                        className="text-[10px] font-pixel px-1.5 py-0.5 rounded-sm shrink-0"
                        style={{
                          background: "var(--shell-selection-bg)",
                          color: "var(--shell-selection-text)",
                        }}
                      >
                        {tWithFallback("ui.app.booking.availability.badge.default", "Default")}
                      </span>
                    )}
                  </div>
                  {schedule.summary && (
                    <span className="text-xs truncate" style={{ color: "var(--shell-text)", opacity: 0.5 }}>
                      {schedule.summary}
                    </span>
                  )}
                  {schedule.timezone && (
                    <span className="text-xs flex items-center gap-1" style={{ color: "var(--shell-text)", opacity: 0.5 }}>
                      <Globe size={10} />
                      {schedule.timezone}
                    </span>
                  )}
                </div>

                {/* Right side - 3-dot menu */}
                <div className="relative shrink-0 ml-2">
                  <button
                    type="button"
                    className="desktop-interior-button p-1"
                    aria-label={tWithFallback("ui.app.booking.availability.actions.open_schedule_menu", "Open schedule actions")}
                    aria-haspopup="menu"
                    aria-expanded={openMenuId === schedule._id}
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMenuId(openMenuId === schedule._id ? null : schedule._id)
                    }}
                  >
                    <MoreHorizontal size={16} />
                  </button>

                  {openMenuId === schedule._id && (
                    <div
                      className="absolute right-0 top-full mt-1 z-50 border-2 shadow-md min-w-[140px]"
                      role="menu"
                      aria-label={tWithFallback("ui.app.booking.availability.actions.menu_label", "Schedule actions")}
                      style={{
                        background: "var(--shell-surface-elevated)",
                        borderColor: "var(--shell-border)",
                      }}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:opacity-80"
                        style={{ color: "var(--shell-text)" }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenMenuId(null)
                          onEdit(schedule._id)
                        }}
                      >
                        <Edit3 size={12} />
                        {tWithFallback("ui.app.booking.actions.edit", "Edit")}
                      </button>
                      {!schedule.isDefault && (
                        <button
                          type="button"
                          role="menuitem"
                          className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:opacity-80"
                          style={{ color: "var(--shell-text)" }}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSetDefault(schedule._id)
                          }}
                        >
                          <Star size={12} />
                          {tWithFallback("ui.app.booking.availability.actions.set_default", "Set as Default")}
                        </button>
                      )}
                      <button
                        type="button"
                        role="menuitem"
                        className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:opacity-80"
                        style={{ color: "var(--shell-text)" }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfirmDeleteId(schedule._id)
                          setOpenMenuId(null)
                        }}
                      >
                        <Trash2 size={12} />
                        {tWithFallback("ui.app.booking.actions.delete", "Delete")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30">
          <div
            className="border-2 p-4 shadow-lg max-w-[300px] w-full"
            style={{
              background: "var(--shell-surface)",
              borderColor: "var(--shell-border)",
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="availability-delete-dialog-title"
          >
            <p id="availability-delete-dialog-title" className="font-pixel text-sm mb-1" style={{ color: "var(--shell-text)" }}>
              {tWithFallback("ui.app.booking.availability.delete_dialog.title", "Delete Schedule")}
            </p>
            <p className="text-xs mb-4" style={{ color: "var(--shell-text)", opacity: 0.7 }}>
              {tWithFallback(
                "ui.app.booking.availability.delete_dialog.body",
                "Are you sure you want to delete this availability schedule? This action cannot be undone.",
              )}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="desktop-interior-button text-xs px-3 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-inset"
                onClick={() => setConfirmDeleteId(null)}
              >
                {tWithFallback("ui.app.booking.actions.cancel", "Cancel")}
              </button>
              <button
                type="button"
                className="desktop-interior-button text-xs px-3 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-inset"
                onClick={() => handleDelete(confirmDeleteId as Id<"objects">)}
              >
                {tWithFallback("ui.app.booking.actions.delete", "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
