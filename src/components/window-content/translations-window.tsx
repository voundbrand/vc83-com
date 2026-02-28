"use client";

import { useState } from "react";
import { Globe, Save, X, Download, Upload, Settings, KeyRound, CheckCircle2, Search, Hourglass } from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useTranslation } from "@/contexts/translation-context";
import { useQuery } from "convex/react";
// Dynamic require avoids deep generated API type expansion in window components.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../convex/_generated/api") as { api: any };
import { useAuth } from "@/hooks/use-auth";
import { PermissionButton } from "@/components/permission/permission-button";

/**
 * TRANSLATIONS WINDOW
 *
 * Dedicated window for managing translations across the app.
 * Features:
 * - Browse translations with filters
 * - Edit translations inline
 * - Import/Export translations
 * - Translation settings and locale management
 */

type TabType = "browse" | "edit" | "import-export" | "settings";
type TxFn = (
  key: string,
  fallback: string,
  params?: Record<string, string | number>
) => string;

export function TranslationsWindow() {
  const { sessionId } = useAuth();
  const { t, isLoading } = useNamespaceTranslations("ui.translations");
  const tx: TxFn = (
    key: string,
    fallback: string,
    params?: Record<string, string | number>
  ): string => {
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  };
  useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>("browse");

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--win95-bg)' }}
    >
      {/* Header */}
      <div
        className="p-4 border-b-2"
        style={{
          background: 'var(--win95-highlight)',
          color: 'var(--win95-titlebar-text)',
          borderColor: 'var(--win95-border)'
        }}
      >
        <div className="flex items-center gap-2">
          <Globe className="w-6 h-6" />
          <h2 className="text-lg font-bold" style={{ fontFamily: 'Press Start 2P' }}>
            {tx("window.title", "TRANSLATIONS")}
          </h2>
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        className="border-b-2 flex"
        style={{
          background: 'var(--win95-bg-light)',
          borderColor: 'var(--win95-border)'
        }}
      >
        <TabButton
          active={activeTab === "browse"}
          onClick={() => setActiveTab("browse")}
          icon={<Globe className="w-4 h-4" />}
        >
          {tx("tabs.browse", "Browse")}
        </TabButton>
        <TabButton
          active={activeTab === "edit"}
          onClick={() => setActiveTab("edit")}
          icon={<Save className="w-4 h-4" />}
        >
          {tx("tabs.edit", "Edit")}
        </TabButton>
        <TabButton
          active={activeTab === "import-export"}
          onClick={() => setActiveTab("import-export")}
          icon={<Download className="w-4 h-4" />}
        >
          {tx("tabs.import_export", "Import/Export")}
        </TabButton>
        <TabButton
          active={activeTab === "settings"}
          onClick={() => setActiveTab("settings")}
          icon={<Settings className="w-4 h-4" />}
        >
          {tx("tabs.settings", "Settings")}
        </TabButton>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === "browse" && (
          <BrowseTranslationsTab sessionId={sessionId} tx={tx} />
        )}
        {activeTab === "edit" && (
          <EditTranslationsTab tx={tx} />
        )}
        {activeTab === "import-export" && (
          <ImportExportTranslationsTab tx={tx} />
        )}
        {activeTab === "settings" && (
          <TranslationSettingsTab tx={tx} />
        )}
      </div>

      {/* Footer Stats */}
      <div
        className="border-t-2 p-3 text-xs"
        style={{
          background: 'var(--win95-bg-light)',
          borderColor: 'var(--win95-border)',
          color: 'var(--win95-text)'
        }}
      >
        <div className="flex justify-between items-center">
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" />
              {tx("footer.label", "Translation Management System")}
            </span>
          </div>
          {isLoading && (
            <span
              className="font-bold"
              style={{ color: 'var(--win95-highlight)' }}
            >
              {tx("footer.loading", "Loading...")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Tab Button Component
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function TabButton({ active, onClick, icon, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-3 flex items-center gap-2 border-r-2 text-sm font-bold desktop-interior-button"
      style={{
        background: active ? 'var(--win95-bg)' : 'var(--win95-bg-light)',
        color: active ? 'var(--win95-highlight)' : 'var(--win95-text)',
        borderColor: 'var(--win95-border)',
      }}
    >
      {icon}
      {children}
    </button>
  );
}

interface BrowseTranslationsTabProps {
  sessionId: string | null;
  tx: TxFn;
}

// Browse Tab - Translation List (Grouped by Key)
function BrowseTranslationsTab({ sessionId, tx }: BrowseTranslationsTabProps) {
  const { availableLocales } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [localeFilter, setLocaleFilter] = useState("all"); // Default to "all" locales
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  interface Translation {
    _id: string;
    name: string;
    value?: string;
    locale?: string;
    status?: string;
    updatedAt?: number;
  }

  // Query ALL translations (not filtered by locale anymore)
  const translations = useQuery(
    (api as any).ontologyTranslations.getAllTranslationObjects,
    sessionId ? {
      sessionId,
      type: typeFilter === "all" ? undefined : typeFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
    } : "skip"
  ) as Translation[] | undefined;

  // Group translations by key
  const groupedByKey = (translations || []).reduce((acc: Record<string, Translation[]>, t: Translation) => {
    if (!acc[t.name]) acc[t.name] = [];
    acc[t.name].push(t);
    return acc;
  }, {});

  // Filter by search query and locale
  const filteredKeys = Object.keys(groupedByKey).filter(key => {
    const matchesSearch = !searchQuery || key.toLowerCase().includes(searchQuery.toLowerCase());
    const translationsForKey = groupedByKey[key];
    const matchesLocale = localeFilter === "all" || translationsForKey.some(t => t.locale === localeFilter);
    return matchesSearch && matchesLocale;
  });

  // Count statistics
  const totalKeys = filteredKeys.length;
  const totalTranslations = translations?.length || 0;

  return (
    <>
      <div className="flex gap-4 h-full">
        {/* Left Panel - Filters (20% width) */}
        <div
          className="w-1/5 border-2 rounded p-4 flex-shrink-0 overflow-auto"
          style={{
            background: 'var(--win95-bg-light)',
            borderColor: 'var(--win95-border)'
          }}
        >
          <h3
            className="font-bold mb-3 text-sm"
            style={{ color: 'var(--win95-highlight)' }}
          >
            {tx("browse.filters.title", "FILTERS")}
          </h3>

          <div className="space-y-4">
            {/* Search */}
            <div>
              <label
                className="block text-xs font-bold mb-2"
                style={{ color: 'var(--win95-text)' }}
              >
                {tx("browse.filters.search_label", "Search Keys")}
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tx("browse.filters.search_placeholder", "Type to search...")}
                className="desktop-interior-input w-full px-3 py-2 text-sm"
              />
            </div>

            {/* Locale Filter */}
            <div>
              <label
                className="block text-xs font-bold mb-2"
                style={{ color: 'var(--win95-text)' }}
              >
                {tx("browse.filters.locale_label", "Locale")}
              </label>
              <select
                value={localeFilter}
                onChange={(e) => setLocaleFilter(e.target.value)}
                className="desktop-interior-input w-full px-3 py-2 text-sm"
              >
                <option value="all">{tx("browse.filters.locale_all", "All Locales")}</option>
                {availableLocales.map(loc => (
                  <option key={loc} value={loc}>
                    {loc.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label
                className="block text-xs font-bold mb-2"
                style={{ color: 'var(--win95-text)' }}
              >
                {tx("browse.filters.type_label", "Type")}
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="desktop-interior-input w-full px-3 py-2 text-sm"
              >
                <option value="all">{tx("browse.filters.type_all", "All Types")}</option>
                <option value="system">{tx("browse.filters.type_system", "System")}</option>
                <option value="app">{tx("browse.filters.type_app", "App")}</option>
                <option value="content">{tx("browse.filters.type_content", "Content")}</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label
                className="block text-xs font-bold mb-2"
                style={{ color: 'var(--win95-text)' }}
              >
                {tx("browse.filters.status_label", "Status")}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="desktop-interior-input w-full px-3 py-2 text-sm"
              >
                <option value="all">{tx("browse.filters.status_all", "All Status")}</option>
                <option value="approved">{tx("browse.filters.status_approved", "Approved")}</option>
                <option value="pending">{tx("browse.filters.status_pending", "Pending")}</option>
                <option value="needs_review">{tx("browse.filters.status_needs_review", "Needs Review")}</option>
              </select>
            </div>
          </div>

          <div
            className="mt-6 pt-4 border-t-2"
            style={{ borderColor: 'var(--win95-border)' }}
          >
            <div
              className="text-xs space-y-1"
              style={{ color: 'var(--win95-text)' }}
            >
              <div className="flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5" />
                {tx("browse.stats.keys", "Keys:")} <strong>{totalKeys}</strong>
              </div>
              <div className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                {tx("browse.stats.translations", "Translations:")} <strong>{totalTranslations}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Translation Keys Table (80% width) */}
        <div
          className="flex-1 border-2 rounded overflow-auto"
          style={{
            background: 'var(--win95-bg-light)',
            borderColor: 'var(--win95-border)'
          }}
        >
          <table className="w-full text-sm">
            <thead
              className="sticky top-0"
              style={{
                background: 'var(--win95-highlight)',
                color: 'var(--win95-titlebar-text)'
              }}
            >
              <tr>
                <th className="p-3 text-left font-bold w-1/3">{tx("browse.table.key", "Key")}</th>
                <th className="p-3 text-left font-bold w-1/3">{tx("browse.table.locales", "Locales")}</th>
                <th className="p-3 text-left font-bold w-1/6">{tx("browse.table.last_modified", "Last Modified")}</th>
                <th className="p-3 text-left font-bold w-1/6">{tx("browse.table.actions", "Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {!translations ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-8 text-center"
                    style={{ color: 'var(--win95-text-secondary)' }}
                  >
                    <Globe
                      className="w-12 h-12 mx-auto mb-3"
                      style={{ color: 'var(--win95-border)' }}
                    />
                    <div className="text-sm">{tx("browse.table.loading", "Loading translations...")}</div>
                  </td>
                </tr>
              ) : filteredKeys.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-8 text-center"
                    style={{ color: 'var(--win95-text-secondary)' }}
                  >
                    <Globe
                      className="w-12 h-12 mx-auto mb-3"
                      style={{ color: 'var(--win95-border)' }}
                    />
                    <div className="text-sm">{tx("browse.table.empty", "No translation keys found")}</div>
                  </td>
                </tr>
              ) : (
                filteredKeys.map((key) => {
                  const translationsForKey = groupedByKey[key];
                  const locales = translationsForKey.map(t => t.locale).filter(Boolean);
                  const latestUpdate = Math.max(...translationsForKey.map(t => t.updatedAt || 0));

                  return (
                    <tr
                      key={key}
                      className="border-b-2"
                      style={{ borderColor: 'var(--win95-border)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--win95-hover-light)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td
                        className="p-3 font-mono text-xs"
                        style={{ color: 'var(--neutral-gray)' }}
                      >
                        {key}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {locales.map((loc, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 rounded text-xs font-bold"
                              style={{
                                background: 'var(--win95-highlight)',
                                color: 'var(--win95-titlebar-text)',
                              }}
                            >
                              {loc?.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td
                        className="p-3 text-xs"
                        style={{ color: 'var(--win95-text-secondary)' }}
                      >
                        {latestUpdate ? new Date(latestUpdate).toLocaleDateString() : tx("browse.table.na", "N/A")}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <PermissionButton
                            permission="manage_translations"
                            onClick={() => {
                              setSelectedKey(key);
                              setEditModalOpen(true);
                            }}
                            className="desktop-interior-button text-xs px-2 py-1"
                          >
                            {tx("browse.table.edit", "Edit")}
                          </PermissionButton>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editModalOpen && selectedKey && (
        <EditTranslationModal
          translationKey={selectedKey}
          translations={groupedByKey[selectedKey]}
          sessionId={sessionId}
          tx={tx}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedKey(null);
          }}
        />
      )}
    </>
  );
}

interface TranslationTabProps {
  tx: TxFn;
}

// Edit Tab - Single Translation Editor
function EditTranslationsTab({ tx }: TranslationTabProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <div
        className="border-2 rounded p-6"
        style={{
          background: 'var(--win95-bg-light)',
          borderColor: 'var(--win95-border)'
        }}
      >
        <h3
          className="font-bold mb-6"
          style={{ color: 'var(--win95-highlight)' }}
        >
          {tx("edit.title", "EDIT TRANSLATION")}
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs font-bold mb-2"
                style={{ color: 'var(--win95-text)' }}
              >
                {tx("edit.type_label", "Type")}
              </label>
              <select className="desktop-interior-input w-full px-3 py-2 text-sm">
                <option value="system">{tx("edit.type_system", "System")}</option>
                <option value="app">{tx("edit.type_app", "App")}</option>
                <option value="content">{tx("edit.type_content", "Content")}</option>
              </select>
            </div>
            <div>
              <label
                className="block text-xs font-bold mb-2"
                style={{ color: 'var(--win95-text)' }}
              >
                {tx("edit.namespace_label", "Namespace")}
              </label>
              <input
                type="text"
                placeholder={tx("edit.namespace_placeholder", "e.g., desktop, windows, buttons")}
                className="desktop-interior-input w-full px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label
              className="block text-xs font-bold mb-2"
              style={{ color: 'var(--win95-text)' }}
            >
              {tx("edit.key_label", "Key")}
            </label>
            <input
              type="text"
              placeholder={tx("edit.key_placeholder", "e.g., welcome-icon")}
              className="desktop-interior-input w-full px-3 py-2 text-sm font-mono"
            />
          </div>

          <div>
            <label
              className="block text-xs font-bold mb-2"
              style={{ color: 'var(--win95-text)' }}
            >
              {tx("edit.value_label", "Value")}
            </label>
            <textarea
              rows={4}
              placeholder={tx("edit.value_placeholder", "Enter translation value...")}
              className="desktop-interior-input w-full px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs font-bold mb-2"
                style={{ color: 'var(--win95-text)' }}
              >
                {tx("edit.locale_label", "Locale")}
              </label>
              <select className="desktop-interior-input w-full px-3 py-2 text-sm">
                <option value="en">{tx("edit.locale_en", "EN - English")}</option>
                <option value="de">{tx("edit.locale_de", "DE - German")}</option>
                <option value="pl">{tx("edit.locale_pl", "PL - Polish")}</option>
              </select>
            </div>
            <div>
              <label
                className="block text-xs font-bold mb-2"
                style={{ color: 'var(--win95-text)' }}
              >
                {tx("edit.status_label", "Status")}
              </label>
              <select className="desktop-interior-input w-full px-3 py-2 text-sm">
                <option value="approved">{tx("edit.status_approved", "Approved")}</option>
                <option value="pending">{tx("edit.status_pending", "Pending")}</option>
                <option value="needs_review">{tx("edit.status_needs_review", "Needs Review")}</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button className="desktop-interior-button desktop-interior-button-primary px-6 py-3 font-bold flex items-center gap-2">
              <Save className="w-4 h-4" />
              {tx("edit.save_translation", "Save Translation")}
            </button>
            <button className="desktop-interior-button px-6 py-3 font-bold">
              {tx("edit.cancel", "Cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Import/Export Tab
function ImportExportTranslationsTab({ tx }: TranslationTabProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Export Section */}
      <div
        className="border-2 rounded p-6"
        style={{
          background: 'var(--win95-bg-light)',
          borderColor: 'var(--win95-border)'
        }}
      >
        <h3
          className="font-bold mb-4 flex items-center gap-2"
          style={{ color: 'var(--win95-highlight)' }}
        >
          <Download className="w-5 h-5" />
          {tx("import_export.export.title", "EXPORT TRANSLATIONS")}
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label
                className="block text-xs font-bold mb-2"
                style={{ color: 'var(--win95-text)' }}
              >
                {tx("import_export.export.type_label", "Type")}
              </label>
              <select className="desktop-interior-input w-full px-3 py-2 text-sm">
                <option value="all">{tx("import_export.export.type_all", "All")}</option>
                <option value="system">{tx("import_export.export.type_system", "System")}</option>
              </select>
            </div>
            <div>
              <label
                className="block text-xs font-bold mb-2"
                style={{ color: 'var(--win95-text)' }}
              >
                {tx("import_export.export.locale_label", "Locale")}
              </label>
              <select className="desktop-interior-input w-full px-3 py-2 text-sm">
                <option value="all">{tx("import_export.export.locale_all", "All Locales")}</option>
                <option value="en">{tx("import_export.export.locale_english", "English")}</option>
              </select>
            </div>
            <div>
              <label
                className="block text-xs font-bold mb-2"
                style={{ color: 'var(--win95-text)' }}
              >
                {tx("import_export.export.format_label", "Format")}
              </label>
              <select className="desktop-interior-input w-full px-3 py-2 text-sm">
                <option value="json">{tx("import_export.export.format_json", "JSON")}</option>
                <option value="csv">{tx("import_export.export.format_csv", "CSV")}</option>
              </select>
            </div>
          </div>
          <button className="desktop-interior-button desktop-interior-button-primary px-6 py-3 font-bold flex items-center gap-2">
            <Download className="w-4 h-4" />
            {tx("import_export.export.download", "Download Translations")}
          </button>
        </div>
      </div>

      {/* Import Section */}
      <div
        className="border-2 rounded p-6"
        style={{
          background: 'var(--win95-bg-light)',
          borderColor: 'var(--win95-border)'
        }}
      >
        <h3
          className="font-bold mb-4 flex items-center gap-2"
          style={{ color: 'var(--win95-highlight)' }}
        >
          <Upload className="w-5 h-5" />
          {tx("import_export.import.title", "IMPORT TRANSLATIONS")}
        </h3>
        <div className="space-y-4">
          <div
            className="border-4 border-dashed rounded p-8 text-center"
            style={{ borderColor: 'var(--win95-border)' }}
          >
            <Upload
              className="w-12 h-12 mx-auto mb-3"
              style={{ color: 'var(--win95-text-secondary)' }}
            />
            <div
              className="text-sm mb-3"
              style={{ color: 'var(--win95-text)' }}
            >
              {tx("import_export.import.dropzone_text", "Drop JSON or CSV file here, or click to browse")}
            </div>
            <button className="desktop-interior-button desktop-interior-button-primary px-6 py-3 font-bold">
              {tx("import_export.import.choose_file", "Choose File")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Settings Tab
function TranslationSettingsTab({ tx }: TranslationTabProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <div
        className="border-2 rounded p-6"
        style={{
          background: 'var(--win95-bg-light)',
          borderColor: 'var(--win95-border)'
        }}
      >
        <h3
          className="font-bold mb-6"
          style={{ color: 'var(--win95-highlight)' }}
        >
          {tx("settings.title", "TRANSLATION SETTINGS")}
        </h3>

        <div className="space-y-6">
          <div>
            <label
              className="block text-xs font-bold mb-2"
              style={{ color: 'var(--win95-text)' }}
            >
              {tx("settings.default_locale_label", "Default Locale")}
            </label>
            <select className="desktop-interior-input w-full px-3 py-2 text-sm">
              <option value="en">{tx("settings.locale_en", "EN - English")}</option>
              <option value="de">{tx("settings.locale_de", "DE - German")}</option>
              <option value="pl">{tx("settings.locale_pl", "PL - Polish")}</option>
            </select>
            <p
              className="text-xs mt-1"
              style={{ color: 'var(--win95-text-secondary)' }}
            >
              {tx("settings.default_locale_help", "Default language for new users")}
            </p>
          </div>

          <div>
            <label
              className="block text-xs font-bold mb-2"
              style={{ color: 'var(--win95-text)' }}
            >
              {tx("settings.fallback_locale_label", "Fallback Locale")}
            </label>
            <select className="desktop-interior-input w-full px-3 py-2 text-sm">
              <option value="en">{tx("settings.locale_en", "EN - English")}</option>
            </select>
            <p
              className="text-xs mt-1"
              style={{ color: 'var(--win95-text-secondary)' }}
            >
              {tx("settings.fallback_locale_help", "Used when translation is missing")}
            </p>
          </div>

          <div
            className="flex items-center gap-3 p-4 border-2 rounded"
            style={{
              background: 'var(--win95-bg)',
              borderColor: 'var(--win95-border)'
            }}
          >
            <input type="checkbox" id="auto-approve" className="w-4 h-4" />
            <label
              htmlFor="auto-approve"
              className="text-sm font-bold"
              style={{ color: 'var(--win95-text)' }}
            >
              {tx("settings.auto_approve", "Auto-approve new translations")}
            </label>
          </div>

          <div className="pt-4">
            <button className="desktop-interior-button desktop-interior-button-primary px-6 py-3 font-bold flex items-center gap-2">
              <Save className="w-4 h-4" />
              {tx("settings.save", "Save Settings")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Edit Translation Modal - Multi-locale editing for a single key
interface EditTranslationModalProps {
  translationKey: string;
  translations: Array<{
    _id: string;
    name: string;
    value?: string;
    locale?: string;
    status?: string;
  }>;
  sessionId: string | null;
  tx: TxFn;
  onClose: () => void;
}

function EditTranslationModal({ translationKey, translations, sessionId, tx, onClose }: EditTranslationModalProps) {
  const { availableLocales } = useTranslation();
  const [translationValues, setTranslationValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    translations.forEach(t => {
      if (t.locale && t.value) {
        initial[t.locale] = t.value;
      }
    });
    return initial;
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!sessionId) return;

    setSaving(true);
    try {
      // TODO: Implement bulk update mutation
      // For now, just close the modal
      console.log('Saving translations:', { key: translationKey, values: translationValues });
      onClose();
    } catch (error) {
      console.error('Failed to save translations:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "var(--modal-overlay-bg)" }}
      onClick={onClose}
    >
      <div
        className="border-4 rounded-lg  max-w-3xl w-full max-h-[80vh] overflow-auto m-4"
        style={{
          background: 'var(--win95-bg)',
          borderColor: 'var(--win95-border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="p-4 border-b-2 flex items-center justify-between"
          style={{
            background: 'var(--win95-highlight)',
            color: 'var(--win95-titlebar-text)',
            borderColor: 'var(--win95-border)'
          }}
        >
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Globe className="w-5 h-5" />
            {tx("modal.title_prefix", "EDIT TRANSLATIONS:")} {translationKey}
          </h3>
          <button
            onClick={onClose}
            className="desktop-interior-button p-2"
            title={tx("modal.close_title", "Close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div
            className="text-xs font-bold mb-4 p-3 border-2 rounded"
            style={{
              background: 'var(--win95-bg-light)',
              borderColor: 'var(--win95-border)',
              color: 'var(--win95-text)'
            }}
          >
            {tx("modal.tip", "Tip: Edit translations for all languages below. Empty fields will be skipped.")}
          </div>

          {availableLocales.map((locale) => {
            const translation = translations.find(t => t.locale === locale);

            return (
              <div key={locale}>
                <label
                  className="block text-xs font-bold mb-2"
                  style={{ color: 'var(--win95-text)' }}
                >
                  {locale.toUpperCase()} - {getLanguageName(locale)}
                  {translation && (
                    <span
                      className="ml-2 px-2 py-1 rounded text-xs"
                      style={{
                        background: translation.status === "approved"
                          ? 'var(--success)'
                          : translation.status === "pending"
                          ? 'var(--warning)'
                          : 'var(--neutral-gray)',
                        color: "var(--btn-accent-text)",
                      }}
                    >
                      {translation.status === "approved" && (
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {tx("modal.status.approved", "Approved")}
                        </span>
                      )}
                      {translation.status === "pending" && (
                        <span className="inline-flex items-center gap-1">
                          <Hourglass className="w-3 h-3" />
                          {tx("modal.status.pending", "Pending")}
                        </span>
                      )}
                      {translation.status === "needs_review" && (
                        <span className="inline-flex items-center gap-1">
                          <Search className="w-3 h-3" />
                          {tx("modal.status.review", "Review")}
                        </span>
                      )}
                    </span>
                  )}
                </label>
                <textarea
                  value={translationValues[locale] || ''}
                  onChange={(e) => setTranslationValues({
                    ...translationValues,
                    [locale]: e.target.value
                  })}
                  rows={3}
                  placeholder={tx(
                    "modal.translation_placeholder",
                    "Enter {{language}} translation...",
                    { language: getLanguageName(locale) }
                  )}
                  className="desktop-interior-input w-full px-3 py-2 text-sm"
                />
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div
          className="p-4 border-t-2 flex gap-3 justify-end"
          style={{
            background: 'var(--win95-bg-light)',
            borderColor: 'var(--win95-border)'
          }}
        >
          <button
            onClick={onClose}
            className="desktop-interior-button px-6 py-3 font-bold"
            disabled={saving}
          >
            {tx("modal.cancel", "Cancel")}
          </button>
          <button
            onClick={handleSave}
            className="desktop-interior-button desktop-interior-button-primary px-6 py-3 font-bold flex items-center gap-2"
            disabled={saving}
          >
            <Save className="w-4 h-4" />
            {saving
              ? tx("modal.saving", "Saving...")
              : tx("modal.save_all", "Save All Translations")}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function to get language name from locale code
function getLanguageName(locale: string): string {
  const names: Record<string, string> = {
    'en': 'English',
    'de': 'German',
    'pl': 'Polish',
    'es': 'Spanish',
    'fr': 'French',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'zh': 'Chinese',
  };
  return names[locale] || locale.toUpperCase();
}
