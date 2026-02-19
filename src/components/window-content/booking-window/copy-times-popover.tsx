"use client"

import { useState } from "react"

interface CopyTimesPopoverProps {
  sourceDayIndex: number
  onApply: (targetDays: number[]) => void
  onClose: () => void
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function CopyTimesPopover({ sourceDayIndex, onApply, onClose }: CopyTimesPopoverProps) {
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set([sourceDayIndex]))

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
        COPY TIMES TO
      </div>

      {/* Select All */}
      <label className="flex items-center gap-2 py-1 cursor-pointer">
        <input
          type="checkbox"
          checked={isAllSelected}
          onChange={toggleAll}
        />
        <span className="font-pixel text-xs">Select all</span>
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
          <span className="font-pixel text-xs">{day}</span>
        </label>
      ))}

      {/* Footer buttons */}
      <div className="flex justify-end gap-2 mt-3">
        <button
          className="desktop-interior-button px-3 py-1 font-pixel text-xs"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="desktop-interior-button px-3 py-1 font-pixel text-xs"
          style={{
            background: 'var(--shell-selection-bg)',
            color: 'var(--shell-selection-text)',
          }}
          onClick={handleApply}
        >
          Apply
        </button>
      </div>
    </div>
  )
}
