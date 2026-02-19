"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { Clock, Save, ChevronDown, ChevronRight } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"
import { useNotification } from "@/hooks/use-notification"

interface ResourceAvailabilityProps {
  selectedResourceId: Id<"objects"> | null
  onSelectResource: (id: Id<"objects"> | null) => void
}

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
]

export function ResourceAvailability({ selectedResourceId, onSelectResource }: ResourceAvailabilityProps) {
  const { sessionId } = useAuth()
  const currentOrganization = useCurrentOrganization()
  const currentOrganizationId = currentOrganization?.id
  const notification = useNotification()

  const [expandedResource, setExpandedResource] = useState<string | null>(null)

  // Get bookable products (resources)
  const products = useQuery(
    api.productOntology.getProducts,
    sessionId && currentOrganizationId
      ? {
          sessionId,
          organizationId: currentOrganizationId as Id<"organizations">,
        }
      : "skip"
  )

  // Bookable subtypes that can have availability configured
  const BOOKABLE_SUBTYPES = [
    "room", "staff", "equipment", "space", "vehicle", "accommodation",
    "appointment", "class", "treatment"
  ]

  // Filter to only bookable types
  const bookableResources = (products ?? []).filter((p: { subtype?: string | null }) =>
    BOOKABLE_SUBTYPES.includes(p.subtype || "")
  )

  if (!sessionId || !currentOrganizationId) {
    return (
      <div className="p-4 text-center" style={{ color: 'var(--neutral-gray)' }}>
        <p className="font-pixel text-sm">Please log in</p>
        <p className="text-xs mt-2">Login required to manage availability</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="p-3 border-b-2"
        style={{
          background: 'var(--shell-surface)',
          borderColor: 'var(--shell-border)'
        }}
      >
        <h2 className="font-pixel text-sm flex items-center gap-2">
          <Clock size={16} />
          Resource Availability
        </h2>
        <p className="text-xs opacity-70 mt-1">
          Configure when each resource is available for booking
        </p>
      </div>

      {/* Resource List */}
      <div className="flex-1 overflow-y-auto p-3">
        {!products ? (
          <div className="text-center py-4" style={{ color: 'var(--neutral-gray)' }}>
            <p className="text-sm">Loading resources...</p>
          </div>
        ) : bookableResources.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--neutral-gray)' }}>
            <Clock size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No bookable resources found</p>
            <p className="text-xs mt-1">
              Create a bookable product (room, equipment, service, etc.) first
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {bookableResources.map((resource) => (
              <ResourceCard
                key={resource._id}
                resource={resource}
                isExpanded={expandedResource === resource._id}
                onToggle={() => setExpandedResource(
                  expandedResource === resource._id ? null : resource._id
                )}
                sessionId={sessionId}
                organizationId={currentOrganizationId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface ResourceCardProps {
  resource: {
    _id: Id<"objects">
    name?: string | null
    subtype?: string | null
    status?: string | null
  }
  isExpanded: boolean
  onToggle: () => void
  sessionId: string
  organizationId: string
}

function ResourceCard({ resource, isExpanded, onToggle, sessionId, organizationId }: ResourceCardProps) {
  const notification = useNotification()
  const [schedule, setSchedule] = useState<Record<string, { isOpen: boolean; open: string; close: string }>>(() => {
    // Default schedule - weekdays 9-5
    const defaultSchedule: Record<string, { isOpen: boolean; open: string; close: string }> = {}
    DAYS_OF_WEEK.forEach(day => {
      defaultSchedule[day.key] = {
        isOpen: ["monday", "tuesday", "wednesday", "thursday", "friday"].includes(day.key),
        open: "09:00",
        close: "17:00"
      }
    })
    return defaultSchedule
  })
  const [bufferTime, setBufferTime] = useState(15)
  const [slotDuration, setSlotDuration] = useState(60)
  const [isSaving, setIsSaving] = useState(false)

  // Get existing schedule
  const existingAvailability = useQuery(
    api.availabilityOntology.getResourceAvailability,
    sessionId
      ? { sessionId, resourceId: resource._id }
      : "skip"
  )

  const setWeeklyScheduleMutation = useMutation(api.availabilityOntology.setWeeklySchedule)

  // Map day names to numbers (0=Sunday, 6=Saturday)
  const dayToNumber: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Convert schedule to API format (array of dayOfWeek, startTime, endTime, isAvailable)
      const schedules: Array<{ dayOfWeek: number; startTime: string; endTime: string; isAvailable: boolean }> = []

      DAYS_OF_WEEK.forEach(day => {
        const dayConfig = schedule[day.key]
        schedules.push({
          dayOfWeek: dayToNumber[day.key],
          startTime: dayConfig.open,
          endTime: dayConfig.close,
          isAvailable: dayConfig.isOpen,
        })
      })

      await setWeeklyScheduleMutation({
        sessionId,
        resourceId: resource._id,
        schedules,
        timezone: "America/Los_Angeles", // TODO: Make configurable
      })

      notification.success("Schedule saved", "The availability schedule has been updated.")
    } catch (error) {
      notification.error("Error", "Failed to save schedule.")
    } finally {
      setIsSaving(false)
    }
  }

  const updateDay = (dayKey: string, field: "isOpen" | "open" | "close", value: boolean | string) => {
    setSchedule(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [field]: value
      }
    }))
  }

  return (
    <div
      className="border-2 rounded"
      style={{
        borderColor: 'var(--shell-border)',
        background: 'var(--shell-surface-elevated)'
      }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center justify-between hover:opacity-80"
        style={{ color: 'var(--shell-text)' }}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="font-medium text-sm">{resource.name}</span>
          <span
            className="px-2 py-0.5 text-xs rounded"
            style={{
              background: 'var(--shell-surface)',
              color: 'var(--shell-text)'
            }}
          >
            {resource.subtype?.replace("_", " ")}
          </span>
        </div>
        <span
          className={`px-2 py-0.5 text-xs rounded ${
            resource.status === "active" ? "" : "opacity-60"
          }`}
          style={{
            background: resource.status === "active" ? 'var(--success-bg)' : 'var(--warning-bg)',
            color: 'white'
          }}
        >
          {resource.status}
        </span>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div
          className="p-3 border-t-2 space-y-4"
          style={{ borderColor: 'var(--shell-border)' }}
        >
          {/* Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium block mb-1">Slot Duration (min)</label>
              <input
                type="number"
                min={15}
                step={15}
                value={slotDuration}
                onChange={(e) => setSlotDuration(parseInt(e.target.value) || 60)}
                className="w-full px-2 py-1 border-2 text-sm"
                style={{
                  borderColor: 'var(--shell-border)',
                  background: 'var(--shell-input-surface)',
                  color: 'var(--shell-input-text)'
                }}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Buffer Time (min)</label>
              <input
                type="number"
                min={0}
                step={5}
                value={bufferTime}
                onChange={(e) => setBufferTime(parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1 border-2 text-sm"
                style={{
                  borderColor: 'var(--shell-border)',
                  background: 'var(--shell-input-surface)',
                  color: 'var(--shell-input-text)'
                }}
              />
            </div>
          </div>

          {/* Weekly Schedule */}
          <div>
            <label className="text-xs font-medium block mb-2">Weekly Schedule</label>
            <div className="space-y-2">
              {DAYS_OF_WEEK.map(day => (
                <div
                  key={day.key}
                  className="flex items-center gap-2 p-2 rounded"
                  style={{ background: 'var(--shell-surface)' }}
                >
                  <label className="flex items-center gap-2 w-24">
                    <input
                      type="checkbox"
                      checked={schedule[day.key].isOpen}
                      onChange={(e) => updateDay(day.key, "isOpen", e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-xs">{day.label}</span>
                  </label>
                  {schedule[day.key].isOpen && (
                    <>
                      <input
                        type="time"
                        value={schedule[day.key].open}
                        onChange={(e) => updateDay(day.key, "open", e.target.value)}
                        className="px-2 py-1 border text-xs"
                        style={{
                          borderColor: 'var(--shell-border)',
                          background: 'var(--shell-input-surface)',
                          color: 'var(--shell-input-text)'
                        }}
                      />
                      <span className="text-xs">to</span>
                      <input
                        type="time"
                        value={schedule[day.key].close}
                        onChange={(e) => updateDay(day.key, "close", e.target.value)}
                        className="px-2 py-1 border text-xs"
                        style={{
                          borderColor: 'var(--shell-border)',
                          background: 'var(--shell-input-surface)',
                          color: 'var(--shell-input-text)'
                        }}
                      />
                    </>
                  )}
                  {!schedule[day.key].isOpen && (
                    <span className="text-xs opacity-50">Closed</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="desktop-interior-button w-full py-2 flex items-center justify-center gap-2 text-sm"
            style={{
              background: 'var(--shell-selection-bg)',
              color: 'var(--shell-selection-text)',
              opacity: isSaving ? 0.5 : 1
            }}
          >
            <Save size={14} />
            {isSaving ? "Saving..." : "Save Schedule"}
          </button>
        </div>
      )}
    </div>
  )
}
