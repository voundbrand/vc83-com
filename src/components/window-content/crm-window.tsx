"use client"

import { useState } from "react"
import { Users, Building2, LayoutGrid, TrendingUp, Library, Settings } from "lucide-react"
import { ContactsList } from "./crm-window/contacts-list"
import { ContactDetail } from "./crm-window/contact-detail"
import { OrganizationsList } from "./crm-window/organizations-list"
import { OrganizationDetail } from "./crm-window/organization-detail"
import { ActivePipelinesTab } from "./crm-window/active-pipelines-tab"
import { PipelineTemplatesTab } from "./crm-window/pipeline-templates-tab"
import { PipelineSettingsTab } from "./crm-window/pipeline-settings-tab"
import type { Id } from "../../../convex/_generated/dataModel"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"

type ViewType = "contacts" | "organizations" | "pipeline"
type PipelineSubView = "active" | "templates" | "settings"

export function CRMWindow() {
  const { t } = useNamespaceTranslations("ui.crm")
  const [activeView, setActiveView] = useState<ViewType>("contacts")
  const [pipelineSubView, setPipelineSubView] = useState<PipelineSubView>("active")
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
        <button
          onClick={() => handleViewSwitch("pipeline")}
          className={`retro-button px-4 py-2 flex items-center gap-2 ${
            activeView === "pipeline" ? "shadow-inner" : ""
          }`}
          style={{
            background: activeView === "pipeline" ? 'var(--win95-selected-bg)' : 'var(--win95-button-face)',
            color: activeView === "pipeline" ? 'var(--win95-selected-text)' : 'var(--win95-text)',
          }}
        >
          <LayoutGrid size={16} />
          <span className="font-pixel text-xs">{t("ui.crm.tabs.pipeline")}</span>
        </button>
      </div>

      {/* Content Area */}
      {activeView === "pipeline" ? (
        <div className="h-full flex flex-col">
          {/* Pipeline Sub-Tabs */}
          <div
            className="flex gap-1 border-b-2 p-2"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-bg-light)'
            }}
          >
            <button
              onClick={() => setPipelineSubView("active")}
              className={`retro-button px-3 py-1.5 flex items-center gap-2 ${
                pipelineSubView === "active" ? "shadow-inner" : ""
              }`}
              style={{
                background: pipelineSubView === "active" ? 'var(--win95-selected-bg)' : 'var(--win95-button-face)',
                color: pipelineSubView === "active" ? 'var(--win95-selected-text)' : 'var(--win95-text)',
              }}
            >
              <TrendingUp size={14} />
              <span className="font-pixel text-xs">{t("ui.crm.pipeline.tabs.active") || "Active Pipelines"}</span>
            </button>
            <button
              onClick={() => setPipelineSubView("templates")}
              className={`retro-button px-3 py-1.5 flex items-center gap-2 ${
                pipelineSubView === "templates" ? "shadow-inner" : ""
              }`}
              style={{
                background: pipelineSubView === "templates" ? 'var(--win95-selected-bg)' : 'var(--win95-button-face)',
                color: pipelineSubView === "templates" ? 'var(--win95-selected-text)' : 'var(--win95-text)',
              }}
            >
              <Library size={14} />
              <span className="font-pixel text-xs">{t("ui.crm.pipeline.tabs.templates") || "Templates"}</span>
            </button>
            <button
              onClick={() => setPipelineSubView("settings")}
              className={`retro-button px-3 py-1.5 flex items-center gap-2 ${
                pipelineSubView === "settings" ? "shadow-inner" : ""
              }`}
              style={{
                background: pipelineSubView === "settings" ? 'var(--win95-selected-bg)' : 'var(--win95-button-face)',
                color: pipelineSubView === "settings" ? 'var(--win95-selected-text)' : 'var(--win95-text)',
              }}
            >
              <Settings size={14} />
              <span className="font-pixel text-xs">{t("ui.crm.pipeline.tabs.settings") || "Settings"}</span>
            </button>
          </div>

          {/* Pipeline Sub-View Content */}
          <div className="flex-1 overflow-hidden">
            {pipelineSubView === "active" && <ActivePipelinesTab />}
            {pipelineSubView === "templates" && <PipelineTemplatesTab />}
            {pipelineSubView === "settings" && <PipelineSettingsTab />}
          </div>
        </div>
      ) : (
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
                onNavigateToPipelines={() => {
                  setActiveView("pipeline");
                  setPipelineSubView("templates");
                }}
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
      )}
    </div>
  )
}
