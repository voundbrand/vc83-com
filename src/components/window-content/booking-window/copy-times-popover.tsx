"use client"

import { useState } from "react"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"

interface CopyTimesPopoverProps {
  sourceDayIndex: number
  onApply: (targetDays: number[]) => void
  onClose: () => void
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function CopyTimesPopover({ sourceDayIndex, onApply, onClose }: CopyTimesPopoverProps) {
  const { tWithFallback } = useNamespaceTranslations("ui.app.booking")
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set([sourceDayIndex]))

  const getDayLabel = (dayIndex: number) => {
    switch (dayIndex) {
      case 0: return tWithFallback("ui.app.booking.days.sunday", "Sunday")
      case 1: return tWithFallback("ui.app.booking.days.monday", "Monday")
      case 2: return tWithFallback("ui.app.booking.days.tuesday", "Tuesday")
      case 3: return tWithFallback("ui.app.booking.days.wednesday", "Wednesday")
      case 4: return tWithFallback("ui.app.booking.days.thursday", "Thursday")
      case 5: return tWithFallback("ui.app.booking.days.friday", "Friday")
      case 6: return tWithFallback("ui.app.booking.days.saturday", "Saturday")
      default: return DAYS[dayIndex] || ""
    }
  }

  const isAllSelected = selectedDays.size === 7

  const toggleAll = () => {
    if (isAllSelected) {
      setSelectedDays(new Set([sourceDayIndex]))
    } else {
      setSelectedDays(new Set([0, 1, 2, 3, 4, 5, 6]))
    }
  }

  const toggleDay = (dayIndex: number) => {
    if (dayIndex === sourceDayIndex) return
    const newSet = new Set(selectedDays)
    if (newSet.has(dayIndex)) newSet.delete(dayIndex)
    else newSet.add(dayIndex)
    setSelectedDays(newSet)
  }

  const handleApply = () => {
    const targets = Array.from(selectedDays).filter(d => d !== sourceDayIndex)
    onApply(targets)
    onClose()
  }

  return (
    <div
      className="absolute z-50 border-2 shadow-lg p-3 min-w-[180px]"
      style={{
        borderColor: 'var(--shell-border)',
        background: 'var(--shell-surface-elevated)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="font-pixel text-xs font-bold mb-2" style={{ color: 'var(--shell-text)' }}>
        {tWithFallback("ui.app.booking.availability.copy_popover.title", "COPY TIMES TO")}
      </div>

      {/* Select All */}
      <label className="flex items-center gap-2 py-1 cursor-pointer">
        <input
          type="checkbox"
          checked={isAllSelected}
          onChange={toggleAll}
        />
        <span className="font-pixel text-xs">
          {tWithFallback("ui.app.booking.availability.copy_popover.select_all", "Select all")}
        </span>
      </label>

      {/* Divider */}
      <div className="border-t my-1" style={{ borderColor: 'var(--shell-border)' }} />

      {/* Day checkboxes */}
      {DAYS.map((day, index) => (
        <label
          key={day}
          className="flex items-center gap-2 py-1 cursor-pointer"
          style={{
            opacity: index === sourceDayIndex ? 0.6 : 1,
          }}
        >
          <input
            type="checkbox"
            checked={selectedDays.has(index)}
            disabled={index === sourceDayIndex}
            onChange={() => toggleDay(index)}
          />
          <span className="font-pixel text-xs">{getDayLabel(index)}</span>
        </label>
      ))}

      {/* Footer buttons */}
      <div className="flex justify-end gap-2 mt-3">
        <button
          className="desktop-interior-button px-3 py-1 font-pixel text-xs"
          onClick={onClose}
        >
          {tWithFallback("ui.app.booking.actions.cancel", "Cancel")}
        </button>
        <button
          className="desktop-interior-button px-3 py-1 font-pixel text-xs"
          style={{
            background: 'var(--shell-selection-bg)',
            color: 'var(--shell-selection-text)',
          }}
          onClick={handleApply}
        >
          {tWithFallback("ui.app.booking.actions.apply", "Apply")}
        </button>
      </div>
    </div>
  )
}
