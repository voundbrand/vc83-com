"use client"

import { useState } from "react"
import { Calendar } from "lucide-react"
import { CalendarSettings } from "./calendar-settings"

type SettingsSection = "calendar"

const SETTINGS_MENU: Array<{
  id: SettingsSection
  label: string
  icon: typeof Calendar
}> = [
  { id: "calendar", label: "Calendar", icon: Calendar },
]

export function BookingSettings() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("calendar")

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      <div
        className="w-48 border-r-2 overflow-y-auto flex-shrink-0"
        style={{
          borderColor: 'var(--shell-border)',
          background: 'var(--shell-surface-elevated)'
        }}
      >
        <div className="p-2">
          <p
            className="font-pixel text-xs px-2 py-2 mb-1"
            style={{ color: 'var(--neutral-gray)' }}
          >
            Settings
          </p>
          {SETTINGS_MENU.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full text-left px-3 py-2 flex items-center gap-2 rounded ${
                  activeSection === item.id ? "font-bold" : ""
                }`}
                style={{
                  background: activeSection === item.id
                    ? 'var(--shell-selection-bg)'
                    : 'transparent',
                  color: activeSection === item.id
                    ? 'var(--shell-selection-text)'
                    : 'var(--shell-text)',
                }}
              >
                <Icon size={14} />
                <span className="font-pixel text-xs">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right Content */}
      <div
        className="flex-1 overflow-y-auto p-6"
        style={{ background: 'var(--shell-surface)' }}
      >
        {activeSection === "calendar" && <CalendarSettings />}
      </div>
    </div>
  )
}
