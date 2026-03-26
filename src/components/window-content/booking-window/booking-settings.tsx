"use client"

import { useState } from "react"
import { Calendar } from "lucide-react"
import { CalendarSettings } from "./calendar-settings"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"

type SettingsSection = "calendar"

const SETTINGS_MENU: Array<{
  id: SettingsSection
  labelKey: string
  fallback: string
  icon: typeof Calendar
}> = [
  {
    id: "calendar",
    labelKey: "ui.app.booking.settings.menu.calendar",
    fallback: "Calendar",
    icon: Calendar,
  },
]

export function BookingSettings() {
  const { tWithFallback } = useNamespaceTranslations("ui.app.booking")
  const [activeSection, setActiveSection] = useState<SettingsSection>("calendar")

  return (
    <div className="flex h-full flex-col sm:flex-row">
      {/* Left Sidebar */}
      <div
        className="w-full flex-shrink-0 overflow-y-auto border-b-2 sm:w-48 sm:border-b-0 sm:border-r-2"
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
            {tWithFallback("ui.app.booking.settings.title", "Settings")}
          </p>
          {SETTINGS_MENU.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`w-full text-left px-3 py-2 flex items-center gap-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-inset ${
                  activeSection === item.id ? "font-bold" : ""
                }`}
                aria-current={activeSection === item.id ? "page" : undefined}
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
                <span className="font-pixel text-xs">{tWithFallback(item.labelKey, item.fallback)}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right Content */}
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-6"
        style={{ background: 'var(--shell-surface)' }}
      >
        {activeSection === "calendar" && <CalendarSettings />}
      </div>
    </div>
  )
}
