"use client";

import { useState } from "react";
import { RetroButton } from "@/components/retro-button";
import { AlertCircle, Info } from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

// Helper function to convert scope name to translation key
function getScopeTranslationKey(scope: string, field: 'name' | 'description'): string {
  // Convert scope like "Mail.Read" to "ui.manage.integrations.scopes.mail.read.name"
  const normalized = scope
    .toLowerCase()
    .replace(/\./g, '.');

  return `ui.manage.integrations.scopes.${normalized}.${field}`;
}

// Import scope data from backend (names will be translated in component)
const SCOPE_CATEGORIES = [
  { id: "mail", translationKey: "integrations.scopes.categories.mail.name", icon: "📧" },
  { id: "calendar", translationKey: "integrations.scopes.categories.calendar.name", icon: "📅" },
  { id: "contacts", translationKey: "integrations.scopes.categories.contacts.name", icon: "👤" },
  { id: "files", translationKey: "integrations.scopes.categories.files.name", icon: "📁" },
  { id: "teams", translationKey: "integrations.scopes.categories.teams.name", icon: "💬" },
  { id: "sites", translationKey: "integrations.scopes.categories.sites.name", icon: "🌐" },
  { id: "tasks", translationKey: "integrations.scopes.categories.tasks.name", icon: "✅" },
  { id: "notes", translationKey: "integrations.scopes.categories.notes.name", icon: "📝" },
] as const;

const SCOPE_PRESETS = {
  minimal: {
    nameKey: "integrations.scopes.presets.minimal.name",
    descriptionKey: "integrations.scopes.presets.minimal.description",
    scopes: [],
  },
  email: {
    nameKey: "integrations.scopes.presets.email.name",
    descriptionKey: "integrations.scopes.presets.email.description",
    scopes: ["Mail.Read", "Mail.Send"],
  },
  crm: {
    nameKey: "integrations.scopes.presets.crm.name",
    descriptionKey: "integrations.scopes.presets.crm.description",
    scopes: ["Mail.ReadWrite", "Mail.Send", "Calendars.ReadWrite", "Contacts.ReadWrite"],
  },
  productivity: {
    nameKey: "integrations.scopes.presets.productivity.name",
    descriptionKey: "integrations.scopes.presets.productivity.description",
    scopes: [
      // 📧 Email & Messages (5 scopes)
      "Mail.Read",
      "Mail.ReadWrite",
      "Mail.Send",
      "MailboxSettings.Read",
      "MailboxSettings.ReadWrite",
      // 📅 Calendar & Events (4 scopes)
      "Calendars.Read",
      "Calendars.ReadWrite",
      "Calendars.Read.Shared",
      "Calendars.ReadWrite.Shared",
      // 👤 Contacts & People (4 scopes)
      "Contacts.Read",
      "Contacts.ReadWrite",
      "Contacts.Read.Shared",
      "Contacts.ReadWrite.Shared",
      // 📁 Files & OneDrive (4 scopes)
      "Files.Read",
      "Files.ReadWrite",
      "Files.Read.All",
      "Files.ReadWrite.All",
      // 💬 Teams & Chat (4 scopes)
      "Chat.Read",
      "Chat.ReadWrite",
      "ChatMessage.Send",
      "Team.ReadBasic.All",
      // 🌐 SharePoint Sites (2 scopes)
      "Sites.Read.All",
      "Sites.ReadWrite.All",
      // ✅ Tasks & To-Do (4 scopes)
      "Tasks.Read",
      "Tasks.ReadWrite",
      "Tasks.Read.Shared",
      "Tasks.ReadWrite.Shared",
      // 📝 OneNote (3 scopes)
      "Notes.Read",
      "Notes.Create",
      "Notes.ReadWrite",
    ],
  },
};

// Comprehensive scope definitions
const SCOPES_BY_CATEGORY: Record<string, Array<{
  scope: string;
  name: string;
  description: string;
  adminRequired?: boolean;
}>> = {
  mail: [
    { scope: "Mail.Read", name: "Read mail", description: "Read your email" },
    { scope: "Mail.ReadWrite", name: "Read & write mail", description: "Read, update, create, and delete email" },
    { scope: "Mail.Send", name: "Send mail", description: "Send email on your behalf" },
    { scope: "MailboxSettings.Read", name: "Read mailbox settings", description: "Read your mailbox settings" },
    { scope: "MailboxSettings.ReadWrite", name: "Manage mailbox settings", description: "Update your mailbox settings" },
  ],
  calendar: [
    { scope: "Calendars.Read", name: "Read calendars", description: "Read your calendars" },
    { scope: "Calendars.ReadWrite", name: "Manage calendars", description: "Read and write to your calendars" },
    { scope: "Calendars.Read.Shared", name: "Read shared calendars", description: "Read calendars shared with you" },
    { scope: "Calendars.ReadWrite.Shared", name: "Manage shared calendars", description: "Read and write to shared calendars" },
  ],
  contacts: [
    { scope: "Contacts.Read", name: "Read contacts", description: "Read your contacts" },
    { scope: "Contacts.ReadWrite", name: "Manage contacts", description: "Read and write to your contacts" },
    { scope: "Contacts.Read.Shared", name: "Read shared contacts", description: "Read contacts shared with you" },
    { scope: "Contacts.ReadWrite.Shared", name: "Manage shared contacts", description: "Read and write to shared contacts" },
  ],
  files: [
    { scope: "Files.Read", name: "Read files", description: "Read your files" },
    { scope: "Files.ReadWrite", name: "Manage files", description: "Read and write to your files" },
    { scope: "Files.Read.All", name: "Read all accessible files", description: "Read all files you can access" },
    { scope: "Files.ReadWrite.All", name: "Manage all accessible files", description: "Read and write to all accessible files" },
  ],
  teams: [
    { scope: "Chat.Read", name: "Read chats", description: "Read your chat messages" },
    { scope: "Chat.ReadWrite", name: "Read & write chats", description: "Read and send chat messages" },
    { scope: "ChatMessage.Send", name: "Send chat messages", description: "Send messages in chats" },
    { scope: "Team.ReadBasic.All", name: "Read team info", description: "Read team names and descriptions", adminRequired: true },
  ],
  sites: [
    { scope: "Sites.Read.All", name: "Read sites", description: "Read documents and lists in all sites" },
    { scope: "Sites.ReadWrite.All", name: "Manage sites", description: "Edit documents and lists in all sites" },
  ],
  tasks: [
    { scope: "Tasks.Read", name: "Read tasks", description: "Read your tasks" },
    { scope: "Tasks.ReadWrite", name: "Manage tasks", description: "Read and write to your tasks" },
    { scope: "Tasks.Read.Shared", name: "Read shared tasks", description: "Read shared tasks" },
    { scope: "Tasks.ReadWrite.Shared", name: "Manage shared tasks", description: "Read and write to shared tasks" },
  ],
  notes: [
    { scope: "Notes.Read", name: "Read notebooks", description: "Read your OneNote notebooks" },
    { scope: "Notes.Create", name: "Create pages", description: "Create new OneNote pages" },
    { scope: "Notes.ReadWrite", name: "Manage notebooks", description: "Read and write to your notebooks" },
  ],
};

interface MicrosoftScopeSelectorProps {
  selectedScopes: string[];
  onChange: (scopes: string[]) => void;
  existingConnection?: {
    scopes: string[];
  };
  readOnly?: boolean;
}

export function MicrosoftScopeSelector({
  selectedScopes,
  onChange,
  existingConnection,
  readOnly = false,
}: MicrosoftScopeSelectorProps) {
  const { t } = useNamespaceTranslations("ui.manage");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleScope = (scope: string) => {
    const newScopes = selectedScopes.includes(scope)
      ? selectedScopes.filter(s => s !== scope)
      : [...selectedScopes, scope];
    onChange(newScopes);
  };

  const toggleAllInCategory = (category: string, checked: boolean) => {
    const categoryScopes = SCOPES_BY_CATEGORY[category].map(s => s.scope);
    if (checked) {
      onChange([...new Set([...selectedScopes, ...categoryScopes])]);
    } else {
      onChange(selectedScopes.filter(s => !categoryScopes.includes(s)));
    }
  };

  const applyPreset = (presetKey: keyof typeof SCOPE_PRESETS) => {
    const presetScopes = SCOPE_PRESETS[presetKey].scopes;
    onChange(presetScopes);

    // Auto-expand categories that contain the selected scopes
    const categoriesToExpand = new Set<string>();
    presetScopes.forEach(scope => {
      // Find which category this scope belongs to
      Object.entries(SCOPES_BY_CATEGORY).forEach(([categoryId, categoryScopes]) => {
        if (categoryScopes.some(s => s.scope === scope)) {
          categoriesToExpand.add(categoryId);
        }
      });
    });

    setExpandedCategories(categoriesToExpand);
  };

  const getCategoryStats = (category: string) => {
    const categoryScopes = SCOPES_BY_CATEGORY[category].map(s => s.scope);
    const selected = categoryScopes.filter(s => selectedScopes.includes(s)).length;
    return { total: categoryScopes.length, selected };
  };

  return (
    <div className="space-y-4">
      {/* Info Alert */}
      <div
        className="border-2 p-3 rounded"
        style={{
          background: 'var(--win95-bg-light)',
          borderColor: 'var(--win95-highlight)'
        }}
      >
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--win95-highlight)' }} />
          <div className="text-sm" style={{ color: 'var(--win95-text)' }}>
            <strong>{t("ui.manage.integrations.scopes.info.title")}</strong> {t("ui.manage.integrations.scopes.info.description")}
          </div>
        </div>
      </div>

      {/* Read-Only Notice */}
      {readOnly && (
        <div
          className="border-2 p-3 rounded"
          style={{
            background: 'var(--win95-bg-light)',
            borderColor: 'var(--win95-highlight)'
          }}
        >
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--win95-highlight)' }} />
            <div className="text-sm" style={{ color: 'var(--win95-text)' }}>
              <strong>{t("ui.manage.integrations.scopes.readonly.title")}</strong> {t("ui.manage.integrations.scopes.readonly.description")}
            </div>
          </div>
        </div>
      )}

      {/* Existing Connection Warning */}
      {existingConnection && !readOnly && (
        <div
          className="border-2 p-3 rounded"
          style={{
            background: 'var(--win95-bg-light)',
            borderColor: 'var(--warning)'
          }}
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--warning)' }} />
            <div className="text-sm" style={{ color: 'var(--win95-text)' }}>
              <strong>{t("ui.manage.integrations.scopes.warning.title")}</strong> {t("ui.manage.integrations.scopes.warning.description")}
            </div>
          </div>
        </div>
      )}

      {/* Presets */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--win95-text)' }}>
          {t("ui.manage.integrations.scopes.presets.title")}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(SCOPE_PRESETS).map(([key, preset]) => (
            <RetroButton
              key={key}
              onClick={() => applyPreset(key as keyof typeof SCOPE_PRESETS)}
              variant="secondary"
              size="sm"
              disabled={readOnly}
            >
              <div className="text-left">
                <div className="font-bold">{t(`ui.manage.${preset.nameKey}`)}</div>
                <div className="text-xs opacity-70">{t(`ui.manage.${preset.descriptionKey}`)}</div>
              </div>
            </RetroButton>
          ))}
        </div>
      </div>

      {/* Category Selection */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--win95-text)' }}>
          {t("ui.manage.integrations.scopes.categories.title")}
        </label>
        <div className="space-y-2">
          {SCOPE_CATEGORIES.map(category => {
            const stats = getCategoryStats(category.id);
            const isExpanded = expandedCategories.has(category.id);

            return (
              <div
                key={category.id}
                className="border-2 rounded overflow-hidden"
                style={{ borderColor: 'var(--win95-border)' }}
              >
                {/* Category Header */}
                <div
                  className="p-3 cursor-pointer transition-colors flex items-center justify-between"
                  style={{
                    background: 'var(--win95-bg-light)',
                    color: 'var(--win95-text)'
                  }}
                  onClick={() => toggleCategory(category.id)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--win95-hover-light)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--win95-bg-light)';
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{category.icon}</span>
                    <div>
                      <div className="font-bold">{t(`ui.manage.${category.translationKey}`)}</div>
                      <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                        {t("ui.manage.integrations.scopes.category_stats", { selected: stats.selected.toString(), total: stats.total.toString() })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={stats.selected === stats.total}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleAllInCategory(category.id, e.target.checked);
                      }}
                      disabled={readOnly}
                      className="w-4 h-4"
                    />
                    <span style={{ color: 'var(--neutral-gray)' }}>{isExpanded ? "▼" : "▶"}</span>
                  </div>
                </div>

                {/* Category Scopes */}
                {isExpanded && (
                  <div className="p-3 space-y-2" style={{ background: 'var(--win95-bg)' }}>
                    {SCOPES_BY_CATEGORY[category.id].map(scope => (
                      <label
                        key={scope.scope}
                        className="flex items-start gap-3 p-2 rounded cursor-pointer"
                        style={{ color: 'var(--win95-text)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--win95-hover-light)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedScopes.includes(scope.scope)}
                          onChange={() => toggleScope(scope.scope)}
                          disabled={readOnly}
                          className="w-4 h-4 mt-1"
                        />
                        <div className="flex-1">
                          <div className="font-bold text-sm flex items-center gap-2">
                            {t(getScopeTranslationKey(scope.scope, 'name'))}
                            {scope.adminRequired && (
                              <span
                                className="text-xs px-2 py-0.5 rounded"
                                style={{
                                  background: 'var(--win95-bg-light)',
                                  borderColor: 'var(--warning)',
                                  color: 'var(--warning)'
                                }}
                              >
                                {t("ui.manage.integrations.scopes.admin_consent")}
                              </span>
                            )}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                            {t(getScopeTranslationKey(scope.scope, 'description'))}
                          </div>
                          <div className="text-xs font-mono mt-1" style={{ color: 'var(--neutral-gray)' }}>
                            {scope.scope}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Count */}
      <div
        className="p-3 rounded flex items-center justify-between"
        style={{ background: 'var(--win95-bg-light)' }}
      >
        <div className="text-sm" style={{ color: 'var(--win95-text)' }}>
          {t("ui.manage.integrations.scopes.selected_count", {
            count: selectedScopes.length.toString(),
            plural: selectedScopes.length !== 1 ? "s" : ""
          })}
          {selectedScopes.length > 0 && (
            <span className="ml-2" style={{ color: 'var(--neutral-gray)' }}>
              {t("ui.manage.integrations.scopes.required_additional")}
            </span>
          )}
        </div>
        {selectedScopes.length > 0 && !readOnly && (
          <RetroButton
            onClick={() => onChange([])}
            variant="secondary"
            size="sm"
          >
            {t("ui.manage.integrations.scopes.actions.clear_all")}
          </RetroButton>
        )}
      </div>
    </div>
  );
}
