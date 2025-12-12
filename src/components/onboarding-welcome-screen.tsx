"use client"

import { useWindowManager } from "@/hooks/use-window-manager"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { Rocket, Settings, BookOpen, Palette, Key, Eye, Users } from "lucide-react"

interface OnboardingWelcomeScreenProps {
  onDismiss?: () => void
}

export function OnboardingWelcomeScreen({ onDismiss }: OnboardingWelcomeScreenProps) {
  const { openWindow } = useWindowManager()
  const { t } = useNamespaceTranslations("ui.onboarding.welcome")

  const handleDeployClick = () => {
    openWindow("web-publishing", "Web Publishing", undefined, undefined, undefined, "ui.windows.web_publishing.title", "🌐")
    onDismiss?.()
  }

  const handleDocsClick = () => {
    openWindow("tutorials-docs", "Tutorials & Docs", undefined, undefined, undefined, "ui.windows.tutorials_docs.title", "📚")
    onDismiss?.()
  }

  const handleCRMClick = () => {
    openWindow("crm", "CRM", undefined, undefined, undefined, "ui.windows.crm.title", "👥")
    onDismiss?.()
  }

  const handleSettingsClick = () => {
    openWindow("settings", "Settings", undefined, undefined, undefined, "ui.windows.settings.title", "⚙️")
    onDismiss?.()
  }

  const handleCustomizeClick = () => {
    openWindow("manage", "Manage", undefined, undefined, undefined, "ui.windows.manage.title", "🎨", { activeTab: "domain_config" })
    onDismiss?.()
  }

  const handleOAuthClick = () => {
    openWindow("integrations", "Integrations & API", undefined, undefined, undefined, "ui.windows.integrations.title", "🔗", { initialPanel: "api-keys" })
    onDismiss?.()
  }

  const handleLookAroundClick = () => {
    onDismiss?.()
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
      {/* Header */}
      <div
        className="px-6 py-4 border-b"
        style={{
          background: "var(--win95-highlight)",
          borderColor: "var(--win95-border)"
        }}
      >
        <h2 className="font-pixel text-sm text-white flex items-center gap-2">
          <Rocket className="w-4 h-4" />
          {t("ui.onboarding.welcome.header_title")}
        </h2>
        <p className="text-xs mt-1 text-white/80">
          {t("ui.onboarding.welcome.header_subtitle")}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Main CTA Section */}
        <div className="mb-6">
          <button
            onClick={handleDeployClick}
            className="w-full p-6 border-2 rounded-lg transition-all hover:scale-[1.02] group"
            style={{
              borderColor: "var(--win95-highlight)",
              background: "var(--win95-bg-light)",
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="p-4 rounded-lg"
                style={{
                  background: "var(--win95-highlight)",
                }}
              >
                <Rocket className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                  {t("ui.onboarding.welcome.deploy_now")}
                </h3>
                <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.onboarding.welcome.deploy_description")}
                </p>
              </div>
              <div
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: "var(--win95-highlight)" }}
              >
                →
              </div>
            </div>
          </button>
        </div>

        {/* Quick Actions Grid */}
        <div>
          <h3 className="text-sm font-bold mb-3" style={{ color: "var(--win95-text)" }}>
            {t("ui.onboarding.welcome.quick_actions")}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <ActionTile
              icon={<BookOpen className="w-5 h-5" />}
              title={t("ui.onboarding.welcome.docs_tutorials")}
              description={t("ui.onboarding.welcome.docs_tutorials_desc")}
              onClick={handleDocsClick}
            />
            <ActionTile
              icon={<Users className="w-5 h-5" />}
              title={t("ui.onboarding.welcome.explore_crm")}
              description={t("ui.onboarding.welcome.explore_crm_desc")}
              onClick={handleCRMClick}
            />
            <ActionTile
              icon={<Settings className="w-5 h-5" />}
              title={t("ui.onboarding.welcome.settings")}
              description={t("ui.onboarding.welcome.settings_desc")}
              onClick={handleSettingsClick}
            />
            <ActionTile
              icon={<Palette className="w-5 h-5" />}
              title={t("ui.onboarding.welcome.customize_desktop")}
              description={t("ui.onboarding.welcome.customize_desktop_desc")}
              onClick={handleCustomizeClick}
            />
            <ActionTile
              icon={<Key className="w-5 h-5" />}
              title={t("ui.onboarding.welcome.setup_oauth")}
              description={t("ui.onboarding.welcome.setup_oauth_desc")}
              onClick={handleOAuthClick}
            />
            <ActionTile
              icon={<Eye className="w-5 h-5" />}
              title={t("ui.onboarding.welcome.look_around")}
              description={t("ui.onboarding.welcome.look_around_desc")}
              onClick={handleLookAroundClick}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

interface ActionTileProps {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
}

function ActionTile({ icon, title, description, onClick }: ActionTileProps) {
  return (
    <button
      onClick={onClick}
      className="p-4 border-2 rounded-lg text-left transition-all hover:scale-105"
      style={{
        borderColor: "var(--win95-border)",
        background: "var(--win95-bg-light)",
      }}
    >
      <div
        className="mb-2"
        style={{ color: "var(--win95-highlight)" }}
      >
        {icon}
      </div>
      <h4 className="text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
        {title}
      </h4>
      <p className="text-xs leading-tight" style={{ color: "var(--neutral-gray)" }}>
        {description}
      </p>
    </button>
  )
}
