"use client";

import { useState } from "react";
import { Globe, Save, X, Download, Upload, Settings } from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useTranslation } from "@/contexts/translation-context";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
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

export function TranslationsWindow() {
  const { sessionId } = useAuth();
  const { t, isLoading } = useNamespaceTranslations("ui.translations");
  const { availableLocales } = useTranslation();
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
            TRANSLATIONS
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
          Browse
        </TabButton>
        <TabButton
          active={activeTab === "edit"}
          onClick={() => setActiveTab("edit")}
          icon={<Save className="w-4 h-4" />}
        >
          Edit
        </TabButton>
        <TabButton
          active={activeTab === "import-export"}
          onClick={() => setActiveTab("import-export")}
          icon={<Download className="w-4 h-4" />}
        >
          Import/Export
        </TabButton>
        <TabButton
          active={activeTab === "settings"}
          onClick={() => setActiveTab("settings")}
          icon={<Settings className="w-4 h-4" />}
        >
          Settings
        </TabButton>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === "browse" && (
          <BrowseTab sessionId={sessionId} />
        )}
        {activeTab === "edit" && (
          <EditTab />
        )}
        {activeTab === "import-export" && (
          <ImportExportTab />
        )}
        {activeTab === "settings" && (
          <SettingsTab />
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
            <span>🌍 Translation Management System</span>
          </div>
          {isLoading && (
            <span
              className="font-bold"
              style={{ color: 'var(--win95-highlight)' }}
            >
              Loading...
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
      className="px-4 py-3 flex items-center gap-2 border-r-2 text-sm font-bold retro-button"
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

// Browse Tab - Translation List (Grouped by Key)
function BrowseTab({ sessionId }: { sessionId: string | null }) {
  const { availableLocales } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [localeFilter, setLocaleFilter] = useState("all"); // Default to "all" locales
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Query ALL translations (not filtered by locale anymore)
  const translations = useQuery(
    api.ontologyTranslations.getAllTranslationObjects,
    sessionId ? {
      sessionId,
      type: typeFilter === "all" ? undefined : typeFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
    } : "skip"
  );

  interface Translation {
    _id: string;
    name: string;
    value?: string;
    locale?: string;
    status?: string;
    updatedAt?: number;
  }

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
            FILTERS
          </h3>

          <div className="space-y-4">
            {/* Search */}
            <div>
              <label
                className="block text-xs font-bold mb-2"
                style={{ color: 'var(--win95-text)' }}
              >
                Search Keys
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search..."
                className="retro-input w-full px-3 py-2 text-sm"
              />
            </div>

            {/* Locale Filter */}
            <div>
              <label
                className="block text-xs font-bold mb-2"
                style={{ color: 'var(--win95-text)' }}
              >
                Locale
              </label>
              <select
                value={localeFilter}
                onChange={(e) => setLocaleFilter(e.target.value)}
                className="retro-input w-full px-3 py-2 text-sm"
              >
                <option value="all">All Locales</option>
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
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="retro-input w-full px-3 py-2 text-sm"
              >
                <option value="all">All Types</option>
                <option value="system">System</option>
                <option value="app">App</option>
                <option value="content">Content</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label
                className="block text-xs font-bold mb-2"
                style={{ color: 'var(--win95-text)' }}
              >
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="retro-input w-full px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="needs_review">Needs Review</option>
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
              <div>🔑 Keys: <strong>{totalKeys}</strong></div>
              <div>🌍 Translations: <strong>{totalTranslations}</strong></div>
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
                <th className="p-3 text-left font-bold w-1/3">Key</th>
                <th className="p-3 text-left font-bold w-1/3">Locales</th>
                <th className="p-3 text-left font-bold w-1/6">Last Modified</th>
                <th className="p-3 text-left font-bold w-1/6">Actions</th>
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
                    <div className="text-sm">Loading translations...</div>
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
                    <div className="text-sm">No translation keys found</div>
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
                        {latestUpdate ? new Date(latestUpdate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <PermissionButton
                            permission="manage_translations"
                            onClick={() => {
                              setSelectedKey(key);
                              setEditModalOpen(true);
                            }}
                            className="retro-button text-xs px-2 py-1"
                          >
                            Edit
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
          onClose={() => {
            setEditModalOpen(false);
            setSelectedKey(null);
          }}
        />
      )}
    </>
  );
}

// Edit Tab - Single Translation Editor
function EditTab() {
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
          EDIT TRANSLATION
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs font-bold mb-2"
                style={{ color: 'var(--win95-text)' }}
              >
                Type
              </label>
              <select className="retro-input w-full px-3 py-2 text-sm">
                <option value="system">System</option>
                <option value="app">App</option>
                <option value="content">Content</option>
              </select>
            </div>
            <div>
              <label
                className="block text-xs font-bold mb-2"
                style={{ color: 'var(--win95-text)' }}
              >
                Namespace
              </label>
              <input
                type="text"
                placeholder="e.g., desktop, windows, buttons"
                className="retro-input w-full px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label
              className="block text-xs font-bold mb-2"
              style={{ color: 'var(--win95-text)' }}
            >
              Key
            </label>
            <input
              type="text"
              placeholder="e.g., welcome-icon"
              className="retro-input w-full px-3 py-2 text-sm font-mono"
            />
          </div>

          <div>
            <label
              className="block text-xs font-bold mb-2"
              style={{ color: 'var(--win95-text)' }}
            >
              Value
            </label>
            <textarea
              rows={4}
              placeholder="Enter translation value..."
              className="retro-input w-full px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs font-bold mb-2"
                style={{ color: 'var(--win95-text)' }}
              >
                Locale
              </label>
              <select className="retro-input w-full px-3 py-2 text-sm">
                <option value="en">EN - English</option>
                <option value="de">DE - German</option>
                <option value="pl">PL - Polish</option>
              </select>
            </div>
            <div>
              <label
                className="block text-xs font-bold mb-2"
                style={{ color: 'var(--win95-text)' }}
              >
                Status
              </label>
              <select className="retro-input w-full px-3 py-2 text-sm">
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="needs_review">Needs Review</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button className="retro-button-primary px-6 py-3 font-bold flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save Translation
            </button>
            <button className="retro-button px-6 py-3 font-bold">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Import/Export Tab
function ImportExportTab() {
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
          EXPORT TRANSLATIONS
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label
                className="block text-xs font-bold mb-2"
                style={{ color: 'var(--win95-text)' }}
              >
                Type
              </label>
              <select className="retro-input w-full px-3 py-2 text-sm">
                <option value="all">All</option>
                <option value="system">System</option>
              </select>
            </div>
            <div>
              <label
                className="block text-xs font-bold mb-2"
                style={{ color: 'var(--win95-text)' }}
              >
                Locale
              </label>
              <select className="retro-input w-full px-3 py-2 text-sm">
                <option value="all">All Locales</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label
                className="block text-xs font-bold mb-2"
                style={{ color: 'var(--win95-text)' }}
              >
                Format
              </label>
              <select className="retro-input w-full px-3 py-2 text-sm">
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
            </div>
          </div>
          <button className="retro-button-primary px-6 py-3 font-bold flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download Translations
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
          IMPORT TRANSLATIONS
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
              Drop JSON or CSV file here, or click to browse
            </div>
            <button className="retro-button-primary px-6 py-3 font-bold">
              Choose File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Settings Tab
function SettingsTab() {
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
          TRANSLATION SETTINGS
        </h3>

        <div className="space-y-6">
          <div>
            <label
              className="block text-xs font-bold mb-2"
              style={{ color: 'var(--win95-text)' }}
            >
              Default Locale
            </label>
            <select className="retro-input w-full px-3 py-2 text-sm">
              <option value="en">EN - English</option>
              <option value="de">DE - German</option>
              <option value="pl">PL - Polish</option>
            </select>
            <p
              className="text-xs mt-1"
              style={{ color: 'var(--win95-text-secondary)' }}
            >
              Default language for new users
            </p>
          </div>

          <div>
            <label
              className="block text-xs font-bold mb-2"
              style={{ color: 'var(--win95-text)' }}
            >
              Fallback Locale
            </label>
            <select className="retro-input w-full px-3 py-2 text-sm">
              <option value="en">EN - English</option>
            </select>
            <p
              className="text-xs mt-1"
              style={{ color: 'var(--win95-text-secondary)' }}
            >
              Used when translation is missing
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
              Auto-approve new translations
            </label>
          </div>

          <div className="pt-4">
            <button className="retro-button-primary px-6 py-3 font-bold flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save Settings
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
  onClose: () => void;
}

function EditTranslationModal({ translationKey, translations, sessionId, onClose }: EditTranslationModalProps) {
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
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="border-4 rounded-lg shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-auto m-4"
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
            EDIT TRANSLATIONS: {translationKey}
          </h3>
          <button
            onClick={onClose}
            className="retro-button p-2"
            title="Close"
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
            💡 Edit translations for all languages below. Empty fields will be skipped.
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
                        color: '#ffffff',
                      }}
                    >
                      {translation.status === "approved" && "✓ Approved"}
                      {translation.status === "pending" && "⏳ Pending"}
                      {translation.status === "needs_review" && "🔍 Review"}
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
                  placeholder={`Enter ${getLanguageName(locale)} translation...`}
                  className="retro-input w-full px-3 py-2 text-sm"
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
            className="retro-button px-6 py-3 font-bold"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="retro-button-primary px-6 py-3 font-bold flex items-center gap-2"
            disabled={saving}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save All Translations'}
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
