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
        className="w-full flex-shrink-0 overflow-y-auto border-b sm:w-48 sm:border-b-0 sm:border-r"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--desktop-shell-accent)",
        }}
      >
        <div className="p-2 space-y-1">
          <p
            className="text-xs px-2 py-2 font-semibold"
            style={{ color: "var(--desktop-menu-text-muted)" }}
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
                className={`desktop-interior-button w-full justify-start px-3 py-2 text-xs ${
                  activeSection === item.id
                    ? "desktop-interior-button-primary"
                    : "desktop-interior-button-subtle"
                }`}
                aria-current={activeSection === item.id ? "page" : undefined}
              >
                <Icon size={14} />
                <span>{tWithFallback(item.labelKey, item.fallback)}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right Content */}
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-6"
        style={{ background: "var(--window-document-bg)" }}
      >
        {activeSection === "calendar" && <CalendarSettings />}
      </div>
    </div>
  )
}
