"use client";

import { useState } from "react";
import { ArrowLeft, Building2, LayoutGrid, Library, Maximize2, Settings, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import type { Id } from "../../../convex/_generated/dataModel";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { ContactsList } from "./crm-window/contacts-list";
import { ContactDetail } from "./crm-window/contact-detail";
import { OrganizationsList } from "./crm-window/organizations-list";
import { OrganizationDetail } from "./crm-window/organization-detail";
import { ActivePipelinesTab } from "./crm-window/active-pipelines-tab";
import { PipelineTemplatesTab } from "./crm-window/pipeline-templates-tab";
import { PipelineSettingsTab } from "./crm-window/pipeline-settings-tab";
import {
  InteriorRoot,
  InteriorTabButton,
  InteriorTabRow,
} from "@/components/window-content/shared/interior-primitives";

type ViewType = "contacts" | "organizations" | "pipeline";
type PipelineSubView = "active" | "templates" | "settings";

interface CRMWindowProps {
  /** When true, shows back-to-desktop navigation (for /crm route) */
  fullScreen?: boolean;
}

export function CRMWindow({ fullScreen = false }: CRMWindowProps) {
  const { t } = useNamespaceTranslations("ui.crm");
  const [activeView, setActiveView] = useState<ViewType>("contacts");
  const [pipelineSubView, setPipelineSubView] = useState<PipelineSubView>("active");
  const [selectedContactId, setSelectedContactId] = useState<Id<"objects"> | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<Id<"objects"> | null>(null);
  const [newlyCreatedPipelineId, setNewlyCreatedPipelineId] = useState<Id<"objects"> | null>(null);

  const handleViewSwitch = (view: ViewType) => {
    setActiveView(view);
    setSelectedContactId(null);
    setSelectedOrgId(null);
  };

  const handleTemplateCreated = (pipelineId: Id<"objects">) => {
    setNewlyCreatedPipelineId(pipelineId);
    setPipelineSubView("active");
  };

  return (
    <InteriorRoot className="flex h-full flex-col">
      <InteriorTabRow className="gap-2 px-2 py-2">
        {fullScreen && (
          <Link href="/" className="desktop-interior-button inline-flex h-9 items-center gap-2 px-3 text-xs" title="Back to Desktop">
            <ArrowLeft size={14} />
          </Link>
        )}

        <InteriorTabButton
          active={activeView === "contacts"}
          onClick={() => handleViewSwitch("contacts")}
          className="flex items-center gap-2"
        >
          <Users size={14} />
          <span>{t("ui.crm.tabs.contacts")}</span>
        </InteriorTabButton>

        <InteriorTabButton
          active={activeView === "organizations"}
          onClick={() => handleViewSwitch("organizations")}
          className="flex items-center gap-2"
        >
          <Building2 size={14} />
          <span>{t("ui.crm.tabs.organizations")}</span>
        </InteriorTabButton>

        <InteriorTabButton
          active={activeView === "pipeline"}
          onClick={() => handleViewSwitch("pipeline")}
          className="flex items-center gap-2"
        >
          <LayoutGrid size={14} />
          <span>{t("ui.crm.tabs.pipeline")}</span>
        </InteriorTabButton>

        <div className="flex-1" />

        {!fullScreen && (
          <Link href="/crm" className="desktop-interior-button inline-flex h-9 items-center gap-2 px-3 text-xs" title="Open Full Screen">
            <Maximize2 size={14} />
          </Link>
        )}
      </InteriorTabRow>

      {activeView === "pipeline" ? (
        <div className="flex h-full flex-col">
          <InteriorTabRow className="gap-2 px-2 py-2">
            <InteriorTabButton
              active={pipelineSubView === "active"}
              onClick={() => setPipelineSubView("active")}
              className="flex items-center gap-2"
            >
              <TrendingUp size={14} />
              <span>{t("ui.crm.pipeline.tabs.active") || "Active Pipelines"}</span>
            </InteriorTabButton>

            <InteriorTabButton
              active={pipelineSubView === "templates"}
              onClick={() => setPipelineSubView("templates")}
              className="flex items-center gap-2"
            >
              <Library size={14} />
              <span>{t("ui.crm.pipeline.tabs.templates") || "Templates"}</span>
            </InteriorTabButton>

            <InteriorTabButton
              active={pipelineSubView === "settings"}
              onClick={() => setPipelineSubView("settings")}
              className="flex items-center gap-2"
            >
              <Settings size={14} />
              <span>{t("ui.crm.pipeline.tabs.settings") || "Settings"}</span>
            </InteriorTabButton>
          </InteriorTabRow>

          <div className="flex-1 overflow-hidden">
            {pipelineSubView === "active" && <ActivePipelinesTab initialPipelineId={newlyCreatedPipelineId} />}
            {pipelineSubView === "templates" && <PipelineTemplatesTab onTemplateCreated={handleTemplateCreated} />}
            {pipelineSubView === "settings" && <PipelineSettingsTab />}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div
            className="w-1/2 overflow-y-auto border-r"
            style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
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
                onNavigateToPipelines={() => {
                  setActiveView("pipeline");
                  setPipelineSubView("active");
                }}
              />
            )}
          </div>

          <div className="w-1/2 overflow-y-auto p-4" style={{ background: "var(--window-document-bg)" }}>
            {activeView === "contacts" ? (
              selectedContactId ? (
                <ContactDetail contactId={selectedContactId} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center" style={{ color: "var(--desktop-menu-text-muted)" }}>
                  <Users size={48} className="mb-4 opacity-30" />
                  <p className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                    {t("ui.crm.contacts.select_contact")}
                  </p>
                  <p className="mt-2 text-xs">{t("ui.crm.contacts.select_contact_hint")}</p>
                </div>
              )
            ) : selectedOrgId ? (
              <OrganizationDetail organizationId={selectedOrgId} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center" style={{ color: "var(--desktop-menu-text-muted)" }}>
                <Building2 size={48} className="mb-4 opacity-30" />
                <p className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                  {t("ui.crm.organizations.select_organization")}
                </p>
                <p className="mt-2 text-xs">{t("ui.crm.organizations.select_organization_hint")}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </InteriorRoot>
  );
}
