"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { useNotification } from "@/hooks/use-notification"
import { ArrowLeft, Edit3, Trash2, Plus, Copy, X, Globe, Info } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"
import { CopyTimesPopover } from "./copy-times-popover"

interface AvailabilityScheduleEditorProps {
  scheduleId: Id<"objects"> | null
  onBack: () => void
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

interface TimeRange {
  startTime: string
  endTime: string
}

interface DayConfig {
  dayOfWeek: number
  isAvailable: boolean
  timeRanges: TimeRange[]
}

const TIME_OPTIONS = (() => {
  const options: { value: string; label: string }[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const value = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
      const ampm = h < 12 ? "am" : "pm"
      const label = `${hour12}:${m.toString().padStart(2, "0")}${ampm}`
      options.push({ value, label })
    }
  }
  return options
})()

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
]

function getTimezoneList(): string[] {
  try {
    const all = Intl.supportedValuesOf("timeZone")
    const rest = all.filter((tz) => !COMMON_TIMEZONES.includes(tz))
    return [...COMMON_TIMEZONES, ...rest]
  } catch {
    return COMMON_TIMEZONES
  }
}

function buildHoursSummary(days: DayConfig[]): string {
  const activeDays = days.filter((d) => d.isAvailable)
  if (activeDays.length === 0) return "No availability set"

  const allSame = activeDays.every(
    (d) =>
      d.timeRanges.length === activeDays[0].timeRanges.length &&
      d.timeRanges.every(
        (r, i) =>
          r.startTime === activeDays[0].timeRanges[i]?.startTime &&
          r.endTime === activeDays[0].timeRanges[i]?.endTime
      )
  )

  const formatTime = (t: string) => {
    const opt = TIME_OPTIONS.find((o) => o.value === t)
    return opt?.label ?? t
  }

  const rangeStr = activeDays[0].timeRanges
    .map((r) => `${formatTime(r.startTime)} - ${formatTime(r.endTime)}`)
    .join(", ")

  if (allSame && activeDays.length > 1) {
    const indices = activeDays.map((d) => d.dayOfWeek).sort((a, b) => a - b)
    const isConsecutive = indices.every((v, i) => i === 0 || v === indices[i - 1] + 1)
    if (isConsecutive) {
      return `${DAYS[indices[0]].slice(0, 3)} - ${DAYS[indices[indices.length - 1]].slice(0, 3)}, ${rangeStr}`
    }
    return `${activeDays.map((d) => DAYS[d.dayOfWeek].slice(0, 3)).join(", ")}, ${rangeStr}`
  }

  return `${activeDays.length} day${activeDays.length !== 1 ? "s" : ""} configured`
}

export function AvailabilityScheduleEditor({ scheduleId, onBack }: AvailabilityScheduleEditorProps) {
  const { sessionId } = useAuth()
  const currentOrganization = useCurrentOrganization()
  const notification = useNotification()

  const [scheduleName, setScheduleName] = useState("New Schedule")
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [isDefault, setIsDefault] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [days, setDays] = useState<DayConfig[]>(
    DAYS.map((_, i) => ({
      dayOfWeek: i,
      isAvailable: i >= 1 && i <= 5,
      timeRanges: [{ startTime: "09:00", endTime: "17:00" }],
    }))
  )
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [copyPopoverDay, setCopyPopoverDay] = useState<number | null>(null)

  const timezoneList = getTimezoneList()

  // Load existing schedule
  const scheduleDetail = useQuery(
    api.availabilityOntology.getScheduleDetail,
    scheduleId && sessionId ? { sessionId, scheduleId } : "skip"
  )

  useEffect(() => {
    if (scheduleDetail) {
      setScheduleName(scheduleDetail.template.name)
      setTimezone(scheduleDetail.template.timezone)
      setIsDefault(scheduleDetail.template.isDefault)
      setDays(
        scheduleDetail.days.map((d: { dayOfWeek: number; isAvailable: boolean; timeRanges: TimeRange[] }) => ({
          dayOfWeek: d.dayOfWeek,
          isAvailable: d.isAvailable,
          timeRanges: d.timeRanges.length > 0 ? d.timeRanges : [{ startTime: "09:00", endTime: "17:00" }],
        }))
      )
    }
  }, [scheduleDetail])

  // Mutations
  const createSchedule = useMutation(api.availabilityOntology.createAvailabilitySchedule)
  const updateSchedule = useMutation(api.availabilityOntology.updateAvailabilitySchedule)
  const updateDay = useMutation(api.availabilityOntology.updateScheduleDay)
  const deleteSchedule = useMutation(api.availabilityOntology.deleteAvailabilitySchedule)

  // Handlers
  const toggleDay = (dayIndex: number) => {
    setDays((prev) => prev.map((d, i) => (i === dayIndex ? { ...d, isAvailable: !d.isAvailable } : d)))
    setIsDirty(true)
  }

  const updateTimeRange = (dayIndex: number, rangeIndex: number, field: "startTime" | "endTime", value: string) => {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIndex) return d
        const newRanges = [...d.timeRanges]
        newRanges[rangeIndex] = { ...newRanges[rangeIndex], [field]: value }
        return { ...d, timeRanges: newRanges }
      })
    )
    setIsDirty(true)
  }

  const addTimeRange = (dayIndex: number) => {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIndex) return d
        return { ...d, timeRanges: [...d.timeRanges, { startTime: "09:00", endTime: "17:00" }] }
      })
    )
    setIsDirty(true)
  }

  const removeTimeRange = (dayIndex: number, rangeIndex: number) => {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIndex) return d
        return { ...d, timeRanges: d.timeRanges.filter((_, ri) => ri !== rangeIndex) }
      })
    )
    setIsDirty(true)
  }

  const handleCopyTimes = (sourceDayIndex: number, targetDays: number[]) => {
    setDays((prev) =>
      prev.map((d, i) => {
        if (!targetDays.includes(i)) return d
        return {
          ...d,
          isAvailable: true,
          timeRanges: [...prev[sourceDayIndex].timeRanges],
        }
      })
    )
    setIsDirty(true)
    setCopyPopoverDay(null)
  }

  const handleSave = async () => {
    if (!sessionId || !currentOrganization) return
    if (!scheduleName.trim()) {
      notification.error("Error", "Please enter a schedule name")
      return
    }

    setIsSaving(true)
    try {
      if (!scheduleId) {
        await createSchedule({
          sessionId,
          organizationId: currentOrganization.id as Id<"organizations">,
          name: scheduleName,
          timezone,
          isDefault,
          days: days.map((d) => ({
            dayOfWeek: d.dayOfWeek,
            timeRanges: d.isAvailable ? d.timeRanges : [],
            isAvailable: d.isAvailable,
          })),
        })
        notification.success("Success", "Schedule created")
      } else {
        await updateSchedule({
          sessionId,
          scheduleId,
          name: scheduleName,
          timezone,
          isDefault,
        })
        if (scheduleDetail) {
          for (const day of days) {
            const existingEntry = scheduleDetail.days.find(
              (d: { dayOfWeek: number }) => d.dayOfWeek === day.dayOfWeek
            )
            if (existingEntry) {
              await updateDay({
                sessionId,
                scheduleEntryId: existingEntry._id,
                timeRanges: day.isAvailable ? day.timeRanges : [],
                isAvailable: day.isAvailable,
              })
            }
          }
        }
        notification.success("Success", "Schedule updated")
      }
      setIsDirty(false)
      onBack()
    } catch (err) {
      notification.error("Error", (err as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!scheduleId || !sessionId) return
    const confirmed = window.confirm("Are you sure you want to delete this schedule?")
    if (!confirmed) return
    try {
      await deleteSchedule({ sessionId, scheduleId })
      notification.success("Success", "Schedule deleted")
      onBack()
    } catch (err) {
      notification.error("Error", (err as Error).message)
    }
  }

  const inputStyle = {
    borderColor: "var(--win95-border)",
    background: "var(--win95-input-bg)",
    color: "var(--win95-input-text)",
  }

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--win95-bg)" }}>
      {/* Header Bar */}
      <div
        className="p-4 border-b-2 flex items-center gap-3"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <button className="desktop-interior-button p-1.5" onClick={onBack} title="Back">
          <ArrowLeft size={14} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <input
                className="font-pixel text-sm border-2 px-2 py-0.5 min-w-[200px]"
                style={inputStyle}
                value={scheduleName}
                onChange={(e) => {
                  setScheduleName(e.target.value)
                  setIsDirty(true)
                }}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setIsEditingName(false)
                }}
                autoFocus
              />
            ) : (
              <button
                className="font-pixel text-sm flex items-center gap-1.5 hover:underline"
                onClick={() => setIsEditingName(true)}
              >
                {scheduleName}
                <Edit3 size={12} className="opacity-50" />
              </button>
            )}
          </div>
          <p className="font-pixel text-xs mt-0.5" style={{ color: "var(--neutral-gray)" }}>
            {buildHoursSummary(days)}
          </p>
        </div>

        <label className="flex items-center gap-2 font-pixel text-xs cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => {
              setIsDefault(e.target.checked)
              setIsDirty(true)
            }}
          />
          Set as default
        </label>

        {scheduleId && (
          <button className="desktop-interior-button p-1.5" onClick={handleDelete} title="Delete schedule">
            <Trash2 size={14} />
          </button>
        )}

        <button
          className="desktop-interior-button px-4 py-1.5 font-pixel text-xs"
          style={{
            background: "var(--win95-selected-bg)",
            color: "var(--win95-selected-text)",
          }}
          onClick={handleSave}
          disabled={isSaving || !isDirty}
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex gap-4">
          {/* Left Column - Day Rows */}
          <div className="flex-[7] min-w-0">
            <div
              className="border-2 rounded"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
            >
              {days.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`p-3 flex items-start gap-3 ${dayIndex < days.length - 1 ? "border-b" : ""}`}
                  style={{ borderColor: "var(--win95-border)" }}
                >
                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer mt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      checked={day.isAvailable}
                      onChange={() => toggleDay(dayIndex)}
                      className="sr-only peer"
                    />
                    <div
                      className="w-8 h-4 border-2 rounded-full peer peer-checked:bg-[var(--win95-selected-bg)] transition-colors"
                      style={{
                        borderColor: "var(--win95-border)",
                        background: day.isAvailable ? "var(--win95-selected-bg)" : "var(--win95-input-bg)",
                      }}
                    >
                      <div
                        className="absolute top-[3px] w-2.5 h-2.5 rounded-full border transition-transform"
                        style={{
                          borderColor: "var(--win95-border)",
                          background: "var(--win95-bg-light)",
                          left: day.isAvailable ? "14px" : "3px",
                        }}
                      />
                    </div>
                  </label>

                  {/* Day Name */}
                  <span
                    className={`font-pixel text-xs w-20 shrink-0 pt-0.5 ${!day.isAvailable ? "opacity-40" : ""}`}
                  >
                    {DAYS[dayIndex]}
                  </span>

                  {/* Time Ranges */}
                  {day.isAvailable ? (
                    <div className="flex-1 space-y-1.5">
                      {day.timeRanges.map((range, rangeIndex) => (
                        <div key={rangeIndex} className="flex items-center gap-2">
                          <select
                            className="border-2 font-pixel text-xs px-1.5 py-1 rounded-none"
                            style={inputStyle}
                            value={range.startTime}
                            onChange={(e) => updateTimeRange(dayIndex, rangeIndex, "startTime", e.target.value)}
                          >
                            {TIME_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <span className="font-pixel text-xs" style={{ color: "var(--neutral-gray)" }}>
                            -
                          </span>
                          <select
                            className="border-2 font-pixel text-xs px-1.5 py-1 rounded-none"
                            style={inputStyle}
                            value={range.endTime}
                            onChange={(e) => updateTimeRange(dayIndex, rangeIndex, "endTime", e.target.value)}
                          >
                            {TIME_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>

                          {rangeIndex === 0 ? (
                            <>
                              <button
                                className="desktop-interior-button p-1"
                                onClick={() => addTimeRange(dayIndex)}
                                title="Add time range"
                              >
                                <Plus size={12} />
                              </button>
                              <div className="relative">
                                <button
                                  className="desktop-interior-button p-1"
                                  onClick={() =>
                                    setCopyPopoverDay(copyPopoverDay === dayIndex ? null : dayIndex)
                                  }
                                  title="Copy times to other days"
                                >
                                  <Copy size={12} />
                                </button>
                                {copyPopoverDay === dayIndex && (
                                  <CopyTimesPopover
                                    sourceDayIndex={dayIndex}
                                    onApply={(targetDays) => handleCopyTimes(dayIndex, targetDays)}
                                    onClose={() => setCopyPopoverDay(null)}
                                  />
                                )}
                              </div>
                            </>
                          ) : (
                            <button
                              className="desktop-interior-button p-1"
                              onClick={() => removeTimeRange(dayIndex, rangeIndex)}
                              title="Remove time range"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="font-pixel text-xs opacity-40 pt-0.5">Unavailable</span>
                  )}
                </div>
              ))}
            </div>

            {/* Date Overrides */}
            <div
              className="border-2 rounded mt-4 p-4"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-pixel text-xs font-bold">Date overrides</h3>
                <Info size={12} style={{ color: "var(--neutral-gray)" }} />
              </div>
              <p className="font-pixel text-xs mb-3" style={{ color: "var(--neutral-gray)" }}>
                Add dates when your availability changes from your daily hours.
              </p>
              <button
                className="desktop-interior-button px-3 py-1.5 font-pixel text-xs opacity-50 cursor-not-allowed"
                disabled
                title="Coming soon"
              >
                <Plus size={12} className="inline mr-1" />
                Add an override
              </button>
            </div>
          </div>

          {/* Right Column - Timezone */}
          <div className="flex-[3] min-w-0">
            <div
              className="border-2 rounded p-4"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
            >
              <label className="font-pixel text-xs font-bold flex items-center gap-1.5 mb-2">
                <Globe size={12} />
                Timezone
              </label>
              <select
                className="w-full border-2 font-pixel text-xs px-2 py-1.5 rounded-none"
                style={inputStyle}
                value={timezone}
                onChange={(e) => {
                  setTimezone(e.target.value)
                  setIsDirty(true)
                }}
              >
                <optgroup label="Common">
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace(/_/g, " ")}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="All Timezones">
                  {timezoneList
                    .filter((tz) => !COMMON_TIMEZONES.includes(tz))
                    .map((tz) => (
                      <option key={tz} value={tz}>
                        {tz.replace(/_/g, " ")}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
