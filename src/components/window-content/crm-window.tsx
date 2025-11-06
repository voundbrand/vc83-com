"use client"

import { useState } from "react"
import { Users, Building2 } from "lucide-react"
import { ContactsList } from "./crm-window/contacts-list"
import { ContactDetail } from "./crm-window/contact-detail"
import { OrganizationsList } from "./crm-window/organizations-list"
import { OrganizationDetail } from "./crm-window/organization-detail"
import type { Id } from "../../../convex/_generated/dataModel"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"

type ViewType = "contacts" | "organizations"

export function CRMWindow() {
  const { t } = useNamespaceTranslations("ui.crm")
  const [activeView, setActiveView] = useState<ViewType>("contacts")
  const [selectedContactId, setSelectedContactId] = useState<Id<"objects"> | null>(null)
  const [selectedOrgId, setSelectedOrgId] = useState<Id<"objects"> | null>(null)

  // Reset selection when switching views
  const handleViewSwitch = (view: ViewType) => {
    setActiveView(view)
    setSelectedContactId(null)
    setSelectedOrgId(null)
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--win95-bg)' }}>
      {/* View Switcher Tabs */}
      <div
        className="flex gap-1 border-b-2 p-2"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg-light)'
        }}
      >
        <button
          onClick={() => handleViewSwitch("contacts")}
          className={`retro-button px-4 py-2 flex items-center gap-2 ${
            activeView === "contacts" ? "shadow-inner" : ""
          }`}
          style={{
            background: activeView === "contacts" ? 'var(--win95-selected-bg)' : 'var(--win95-button-face)',
            color: activeView === "contacts" ? 'var(--win95-selected-text)' : 'var(--win95-text)',
          }}
        >
          <Users size={16} />
          <span className="font-pixel text-xs">{t("ui.crm.tabs.contacts")}</span>
        </button>
        <button
          onClick={() => handleViewSwitch("organizations")}
          className={`retro-button px-4 py-2 flex items-center gap-2 ${
            activeView === "organizations" ? "shadow-inner" : ""
          }`}
          style={{
            background: activeView === "organizations" ? 'var(--win95-selected-bg)' : 'var(--win95-button-face)',
            color: activeView === "organizations" ? 'var(--win95-selected-text)' : 'var(--win95-text)',
          }}
        >
          <Building2 size={16} />
          <span className="font-pixel text-xs">{t("ui.crm.tabs.organizations")}</span>
        </button>
      </div>

      {/* Split Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: List View */}
        <div
          className="w-1/2 border-r-2 overflow-y-auto"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg-light)'
          }}
        >
          {activeView === "contacts" ? (
            <ContactsList
              selectedId={selectedContactId}
              onSelect={setSelectedContactId}
            />
          ) : (
            <OrganizationsList
              selectedId={selectedOrgId}
              onSelect={setSelectedOrgId}
            />
          )}
        </div>

        {/* Right: Detail View */}
        <div
          className="w-1/2 overflow-y-auto p-4"
          style={{ background: 'var(--win95-bg)' }}
        >
          {activeView === "contacts" ? (
            selectedContactId ? (
              <ContactDetail contactId={selectedContactId} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: 'var(--neutral-gray)' }}>
                <Users size={48} className="mb-4 opacity-30" />
                <p className="font-pixel text-sm">{t("ui.crm.contacts.select_contact")}</p>
                <p className="text-xs mt-2">{t("ui.crm.contacts.select_contact_hint")}</p>
              </div>
            )
          ) : (
            selectedOrgId ? (
              <OrganizationDetail organizationId={selectedOrgId} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: 'var(--neutral-gray)' }}>
                <Building2 size={48} className="mb-4 opacity-30" />
                <p className="font-pixel text-sm">{t("ui.crm.organizations.select_organization")}</p>
                <p className="text-xs mt-2">{t("ui.crm.organizations.select_organization_hint")}</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
