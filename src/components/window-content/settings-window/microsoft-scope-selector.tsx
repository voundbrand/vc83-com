"use client";

import { useState } from "react";
import { RetroButton } from "@/components/retro-button";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

// Import scope data from backend
const SCOPE_CATEGORIES = [
  { id: "mail", name: "Email & Messages", icon: "📧" },
  { id: "calendar", name: "Calendar & Events", icon: "📅" },
  { id: "contacts", name: "Contacts & People", icon: "👤" },
  { id: "files", name: "Files & OneDrive", icon: "📁" },
  { id: "teams", name: "Teams & Chat", icon: "💬" },
  { id: "sites", name: "SharePoint Sites", icon: "🌐" },
  { id: "tasks", name: "Tasks & To-Do", icon: "✅" },
  { id: "notes", name: "OneNote", icon: "📝" },
] as const;

const SCOPE_PRESETS = {
  minimal: {
    name: "Minimal",
    description: "Only required permissions",
    scopes: [],
  },
  email: {
    name: "Email",
    description: "Read and send emails",
    scopes: ["Mail.Read", "Mail.Send"],
  },
  crm: {
    name: "CRM Suite",
    description: "Email, calendar, contacts",
    scopes: ["Mail.ReadWrite", "Mail.Send", "Calendars.ReadWrite", "Contacts.ReadWrite"],
  },
  productivity: {
    name: "Full Productivity",
    description: "Email, calendar, contacts, tasks, files",
    scopes: [
      "Mail.ReadWrite",
      "Mail.Send",
      "Calendars.ReadWrite",
      "Contacts.ReadWrite",
      "Tasks.ReadWrite",
      "Files.ReadWrite",
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
}

export function MicrosoftScopeSelector({
  selectedScopes,
  onChange,
  existingConnection,
}: MicrosoftScopeSelectorProps) {
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
    onChange(SCOPE_PRESETS[presetKey].scopes);
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
            <strong>Permission Scopes:</strong> Select which Microsoft data you want to sync. You can always add or remove permissions later.
          </div>
        </div>
      </div>

      {/* Existing Connection Warning */}
      {existingConnection && (
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
              <strong>Reconnection Required:</strong> Changing permissions requires reconnecting your Microsoft account.
            </div>
          </div>
        </div>
      )}

      {/* Presets */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--win95-text)' }}>
          Quick Presets
        </label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(SCOPE_PRESETS).map(([key, preset]) => (
            <RetroButton
              key={key}
              onClick={() => applyPreset(key as keyof typeof SCOPE_PRESETS)}
              variant="secondary"
              size="sm"
            >
              <div className="text-left">
                <div className="font-bold">{preset.name}</div>
                <div className="text-xs opacity-70">{preset.description}</div>
              </div>
            </RetroButton>
          ))}
        </div>
      </div>

      {/* Category Selection */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--win95-text)' }}>
          Permission Categories
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
                      <div className="font-bold">{category.name}</div>
                      <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                        {stats.selected} of {stats.total} selected
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
                          className="w-4 h-4 mt-1"
                        />
                        <div className="flex-1">
                          <div className="font-bold text-sm flex items-center gap-2">
                            {scope.name}
                            {scope.adminRequired && (
                              <span
                                className="text-xs px-2 py-0.5 rounded"
                                style={{
                                  background: 'var(--win95-bg-light)',
                                  borderColor: 'var(--warning)',
                                  color: 'var(--warning)'
                                }}
                              >
                                Admin Consent
                              </span>
                            )}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                            {scope.description}
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
          <strong>{selectedScopes.length}</strong> permission{selectedScopes.length !== 1 ? "s" : ""} selected
          {selectedScopes.length > 0 && (
            <span className="ml-2" style={{ color: 'var(--neutral-gray)' }}>
              (+ 5 required)
            </span>
          )}
        </div>
        {selectedScopes.length > 0 && (
          <RetroButton
            onClick={() => onChange([])}
            variant="secondary"
            size="sm"
          >
            Clear All
          </RetroButton>
        )}
      </div>
    </div>
  );
}
