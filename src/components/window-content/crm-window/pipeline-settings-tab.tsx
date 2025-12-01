"use client";

import { useState, useEffect } from "react";
import { Settings, Save, Loader2, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import type { Id } from "../../../../convex/_generated/dataModel";

/**
 * Pipeline Settings Tab
 *
 * Configure AI preferences for CRM:
 * - Approval rules for AI actions
 * - Data source access toggles
 * - Communication style preferences
 */

interface AISettings {
  approvalRules?: Record<string, "always" | "never" | "ask">;
  dataSources?: {
    enrichment?: boolean;
    externalAPIs?: boolean;
    webSearch?: boolean;
  };
  communication?: {
    style?: "professional" | "casual" | "formal";
    tone?: "friendly" | "neutral" | "assertive";
  };
  automation?: {
    autoScoring?: boolean;
    autoProgression?: boolean;
    suggestActions?: boolean;
  };
}

export function PipelineSettingsTab() {
  const { t } = useNamespaceTranslations("ui.crm");
  const { sessionId } = useAuth();
  const currentOrganization = useCurrentOrganization();
  const currentOrganizationId = currentOrganization?.id;

  // Query current AI settings
  const aiSettings = useQuery(
    api.crmAiTools.getAiSettings,
    sessionId && currentOrganizationId
      ? {
          sessionId,
          organizationId: currentOrganizationId as Id<"organizations">,
        }
      : "skip"
  );

  // Update settings mutation
  const updateSettings = useMutation(api.crmAiTools.updateAiSettings);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Local state for form
  const [localSettings, setLocalSettings] = useState<AISettings>({});

  // Initialize local settings when data loads
  useEffect(() => {
    if (aiSettings) {
      setLocalSettings(aiSettings as AISettings);
    }
  }, [aiSettings]);

  const handleSave = async () => {
    if (!sessionId || !currentOrganizationId) return;

    try {
      setSaving(true);
      setSaveSuccess(false);

      await updateSettings({
        sessionId,
        organizationId: currentOrganizationId as Id<"organizations">,
        settings: localSettings,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save settings:", error);
      // TODO: Show error toast
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(aiSettings || {});

  if (!sessionId || !currentOrganizationId) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p style={{ color: "var(--neutral-gray)" }} className="text-sm">
          {t("ui.crm.pipeline.settings.not_authenticated") || "Please sign in to view settings"}
        </p>
      </div>
    );
  }

  if (aiSettings === undefined) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Loader2 className="animate-spin" size={24} style={{ color: "var(--win95-highlight)" }} />
        <p className="ml-3 text-sm" style={{ color: "var(--win95-text)" }}>
          {t("ui.crm.pipeline.settings.loading") || "Loading settings..."}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
          <Settings size={16} />
          {t("ui.crm.pipeline.settings.title") || "AI & Automation Settings"}
        </h3>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          {t("ui.crm.pipeline.settings.description") ||
           "Configure how AI agents interact with your CRM data"}
        </p>
      </div>

      {/* Data Sources Section */}
      <div
        className="border-2 rounded-lg p-4"
        style={{
          background: "var(--win95-bg-light)",
          borderColor: "var(--win95-border)",
        }}
      >
        <h4 className="text-sm font-bold mb-3" style={{ color: "var(--win95-text)" }}>
          {t("ui.crm.pipeline.settings.data_sources.title") || "Data Source Access"}
        </h4>
        <p className="text-xs mb-4" style={{ color: "var(--neutral-gray)" }}>
          {t("ui.crm.pipeline.settings.data_sources.description") ||
           "Control what data sources AI can access for enrichment"}
        </p>

        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={localSettings.dataSources?.enrichment || false}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  dataSources: {
                    ...localSettings.dataSources,
                    enrichment: e.target.checked,
                  },
                })
              }
            />
            <div>
              <p className="text-sm" style={{ color: "var(--win95-text)" }}>
                {t("ui.crm.pipeline.settings.data_sources.enrichment") || "Contact Enrichment"}
              </p>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {t("ui.crm.pipeline.settings.data_sources.enrichment_hint") ||
                 "Allow AI to enrich contacts with publicly available data"}
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={localSettings.dataSources?.externalAPIs || false}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  dataSources: {
                    ...localSettings.dataSources,
                    externalAPIs: e.target.checked,
                  },
                })
              }
            />
            <div>
              <p className="text-sm" style={{ color: "var(--win95-text)" }}>
                {t("ui.crm.pipeline.settings.data_sources.external_apis") || "External APIs"}
              </p>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {t("ui.crm.pipeline.settings.data_sources.external_apis_hint") ||
                 "Access external data providers for company and contact information"}
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={localSettings.dataSources?.webSearch || false}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  dataSources: {
                    ...localSettings.dataSources,
                    webSearch: e.target.checked,
                  },
                })
              }
            />
            <div>
              <p className="text-sm" style={{ color: "var(--win95-text)" }}>
                {t("ui.crm.pipeline.settings.data_sources.web_search") || "Web Search"}
              </p>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {t("ui.crm.pipeline.settings.data_sources.web_search_hint") ||
                 "Search the web for recent news and updates about contacts/companies"}
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Communication Style Section */}
      <div
        className="border-2 rounded-lg p-4"
        style={{
          background: "var(--win95-bg-light)",
          borderColor: "var(--win95-border)",
        }}
      >
        <h4 className="text-sm font-bold mb-3" style={{ color: "var(--win95-text)" }}>
          {t("ui.crm.pipeline.settings.communication.title") || "Communication Style"}
        </h4>
        <p className="text-xs mb-4" style={{ color: "var(--neutral-gray)" }}>
          {t("ui.crm.pipeline.settings.communication.description") ||
           "Set how AI agents should communicate"}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-2" style={{ color: "var(--win95-text)" }}>
              {t("ui.crm.pipeline.settings.communication.style_label") || "Style"}
            </label>
            <select
              className="retro-input w-full p-2 text-sm"
              value={localSettings.communication?.style || "professional"}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  communication: {
                    ...localSettings.communication,
                    style: e.target.value as "professional" | "casual" | "formal",
                  },
                })
              }
            >
              <option value="professional">
                {t("ui.crm.pipeline.settings.communication.style_professional") || "Professional"}
              </option>
              <option value="casual">
                {t("ui.crm.pipeline.settings.communication.style_casual") || "Casual"}
              </option>
              <option value="formal">
                {t("ui.crm.pipeline.settings.communication.style_formal") || "Formal"}
              </option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-2" style={{ color: "var(--win95-text)" }}>
              {t("ui.crm.pipeline.settings.communication.tone_label") || "Tone"}
            </label>
            <select
              className="retro-input w-full p-2 text-sm"
              value={localSettings.communication?.tone || "friendly"}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  communication: {
                    ...localSettings.communication,
                    tone: e.target.value as "friendly" | "neutral" | "assertive",
                  },
                })
              }
            >
              <option value="friendly">
                {t("ui.crm.pipeline.settings.communication.tone_friendly") || "Friendly"}
              </option>
              <option value="neutral">
                {t("ui.crm.pipeline.settings.communication.tone_neutral") || "Neutral"}
              </option>
              <option value="assertive">
                {t("ui.crm.pipeline.settings.communication.tone_assertive") || "Assertive"}
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Automation Section */}
      <div
        className="border-2 rounded-lg p-4"
        style={{
          background: "var(--win95-bg-light)",
          borderColor: "var(--win95-border)",
        }}
      >
        <h4 className="text-sm font-bold mb-3" style={{ color: "var(--win95-text)" }}>
          {t("ui.crm.pipeline.settings.automation.title") || "Automation Preferences"}
        </h4>
        <p className="text-xs mb-4" style={{ color: "var(--neutral-gray)" }}>
          {t("ui.crm.pipeline.settings.automation.description") ||
           "Configure automatic AI actions"}
        </p>

        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={localSettings.automation?.autoScoring || false}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  automation: {
                    ...localSettings.automation,
                    autoScoring: e.target.checked,
                  },
                })
              }
            />
            <div>
              <p className="text-sm" style={{ color: "var(--win95-text)" }}>
                {t("ui.crm.pipeline.settings.automation.auto_scoring") || "Automatic Contact Scoring"}
              </p>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {t("ui.crm.pipeline.settings.automation.auto_scoring_hint") ||
                 "AI automatically scores contacts based on engagement and fit"}
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={localSettings.automation?.autoProgression || false}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  automation: {
                    ...localSettings.automation,
                    autoProgression: e.target.checked,
                  },
                })
              }
            />
            <div>
              <p className="text-sm" style={{ color: "var(--win95-text)" }}>
                {t("ui.crm.pipeline.settings.automation.auto_progression") || "Automatic Pipeline Progression"}
              </p>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {t("ui.crm.pipeline.settings.automation.auto_progression_hint") ||
                 "AI can automatically move contacts through pipeline stages (requires approval)"}
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={localSettings.automation?.suggestActions || false}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  automation: {
                    ...localSettings.automation,
                    suggestActions: e.target.checked,
                  },
                })
              }
            />
            <div>
              <p className="text-sm" style={{ color: "var(--win95-text)" }}>
                {t("ui.crm.pipeline.settings.automation.suggest_actions") || "Suggest Next Actions"}
              </p>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {t("ui.crm.pipeline.settings.automation.suggest_actions_hint") ||
                 "AI suggests next best actions for each contact"}
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-4 border-t-2" style={{ borderColor: "var(--win95-border)" }}>
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <>
              <CheckCircle2 size={16} style={{ color: "var(--success)" }} />
              <span className="text-xs" style={{ color: "var(--success)" }}>
                {t("ui.crm.pipeline.settings.save_success") || "Settings saved successfully"}
              </span>
            </>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="retro-button px-4 py-2 flex items-center gap-2"
          style={{
            background: hasChanges && !saving ? "var(--win95-highlight)" : "var(--neutral-gray)",
            color: "var(--win95-button-text)",
            opacity: hasChanges && !saving ? 1 : 0.6,
          }}
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span className="font-pixel text-xs">
                {t("ui.crm.pipeline.settings.saving") || "Saving..."}
              </span>
            </>
          ) : (
            <>
              <Save size={16} />
              <span className="font-pixel text-xs">
                {t("ui.crm.pipeline.settings.save") || "Save Changes"}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
