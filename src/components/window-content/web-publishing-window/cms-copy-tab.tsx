"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, Save, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useNotification } from "@/hooks/use-notification";
import { InteriorButton } from "@/components/ui/interior-button";
import { useWindowManager } from "@/hooks/use-window-manager";
import { getVoiceAssistantWindowContract } from "@/components/window-content/ai-chat-window/voice-assistant-contract";
import { AIChatWindow } from "@/components/window-content/ai-chat-window";
import {
  flattenCmsCopyRegistryFields,
  resolveCmsCopyRegistry,
  type FlattenedCmsCopyField,
} from "@/lib/web-publishing/cms-copy-field-registry";

// Dynamic require avoids TS2589 deep type instantiation in window surface components.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api: apiAny } = require("../../../../convex/_generated/api") as { api: any };

interface CmsCopyTabProps {
  applicationId: Id<"objects">;
  applicationName: string;
}

interface ApplicationLike {
  _id: Id<"objects">;
  name: string;
  description?: string;
  customProperties?: Record<string, unknown>;
}

interface CmsCopyRecord {
  _id: Id<"objects">;
  value?: string;
  status?: string;
  locale?: string;
  updatedAt?: number;
}

interface CmsCopyFieldResult {
  page: string;
  section: string;
  key: string;
  resolvedLocale: string | null;
  recordSource: "scoped" | "legacy" | "none";
  record: CmsCopyRecord | null;
}

interface CmsCopyQueryResult {
  fields: CmsCopyFieldResult[];
}

interface SaveCmsFieldArgs {
  sessionId: string;
  applicationId: Id<"objects">;
  page: string;
  section: string;
  key: string;
  locale: string;
  value: string;
}

interface EnsureCmsRegistryArgs {
  sessionId: string;
  applicationId: Id<"objects">;
}

interface EnsureCmsRegistryResult {
  updated: boolean;
  registryId: string | null;
  reason: string;
}

interface MigrateLegacyCmsArgs {
  sessionId: string;
  applicationId: Id<"objects">;
  locales: string[];
  fields: Array<{
    page: string;
    section: string;
    key: string;
    subtype?: string;
  }>;
  overwriteScoped?: boolean;
}

interface MigrateLegacyCmsResult {
  summary: {
    operations: number;
    migrated: number;
    skippedNoLegacy: number;
    skippedScopedNewerOrEqual: number;
  };
}

function getFieldLookupKey(args: { page: string; section: string; key: string }): string {
  return `${args.page}::${args.section}::${args.key}`;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function readConfiguredRegistryId(customProperties: unknown): string | undefined {
  const props = asRecord(customProperties);
  if (!props) {
    return undefined;
  }

  const topLevel = normalizeOptionalString(props.cmsCopyRegistryId);
  if (topLevel) {
    return topLevel;
  }

  const cms = asRecord(props.cms);
  const cmsRegistryId = cms ? normalizeOptionalString(cms.copyRegistryId) : undefined;
  if (cmsRegistryId) {
    return cmsRegistryId;
  }

  const webPublishing = asRecord(props.webPublishing);
  return webPublishing
    ? normalizeOptionalString(webPublishing.cmsCopyRegistryId)
    : undefined;
}

function encodeUtf8Base64(value: string): string {
  if (typeof window === "undefined") {
    return "";
  }
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return window.btoa(binary);
}

function formatRelativeTimestamp(timestamp?: number): string {
  if (!timestamp) {
    return "not saved yet";
  }
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) {
    return "just now";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) {
    return `${seconds}s ago`;
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function CmsCopyTab({ applicationId, applicationName }: CmsCopyTabProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const notification = useNotification();
  const { openWindow } = useWindowManager();
  const unsafeUseQuery = useQuery as unknown as (queryRef: unknown, args?: unknown) => unknown;
  const unsafeUseMutation = useMutation as unknown as (mutationRef: unknown) => unknown;
  const saveCmsField = unsafeUseMutation(
    apiAny.publishingOntology.saveApplicationCmsCopyField
  ) as (args: SaveCmsFieldArgs) => Promise<unknown>;
  const ensureCmsRegistryMetadata = unsafeUseMutation(
    apiAny.applicationOntology.ensureApplicationCmsRegistryMetadata
  ) as (args: EnsureCmsRegistryArgs) => Promise<EnsureCmsRegistryResult>;
  const migrateLegacyCmsCopy = unsafeUseMutation(
    apiAny.publishingOntology.migrateApplicationCmsCopyLegacyToScoped
  ) as (args: MigrateLegacyCmsArgs) => Promise<MigrateLegacyCmsResult>;

  const application = unsafeUseQuery(
    apiAny.applicationOntology.getApplication,
    sessionId ? { sessionId, applicationId } : "skip"
  ) as ApplicationLike | null | undefined;

  const registry = useMemo(
    () =>
      resolveCmsCopyRegistry({
        _id: applicationId,
        name: application?.name || applicationName,
        description: application?.description,
        customProperties: application?.customProperties,
      }),
    [application?.customProperties, application?.description, application?.name, applicationId, applicationName]
  );

  const flattenedFields = useMemo(
    () => flattenCmsCopyRegistryFields(registry),
    [registry]
  );

  const [locale, setLocale] = useState(registry.defaultLocale);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingByFieldId, setSavingByFieldId] = useState<Record<string, boolean>>({});
  const [errorsByFieldId, setErrorsByFieldId] = useState<Record<string, string>>({});
  const [savedAtByFieldId, setSavedAtByFieldId] = useState<Record<string, number>>({});
  const [openSuggestionFieldId, setOpenSuggestionFieldId] = useState<string | null>(null);
  const [suggestionByFieldId, setSuggestionByFieldId] = useState<Record<string, string>>({});
  const [isMigratingLegacy, setIsMigratingLegacy] = useState(false);
  const [lastMigrationSummary, setLastMigrationSummary] = useState<{
    localeScope: "current" | "all";
    operations: number;
    migrated: number;
    skippedNoLegacy: number;
    skippedScopedNewerOrEqual: number;
  } | null>(null);
  const [registryAutoconfigStatus, setRegistryAutoconfigStatus] = useState<EnsureCmsRegistryResult | null>(null);
  const [registryAutoconfigInFlight, setRegistryAutoconfigInFlight] = useState(false);

  useEffect(() => {
    if (!registry.locales.includes(locale)) {
      setLocale(registry.defaultLocale);
    }
  }, [locale, registry.defaultLocale, registry.locales]);

  useEffect(() => {
    setDrafts({});
    setErrorsByFieldId({});
    setSavedAtByFieldId({});
    setOpenSuggestionFieldId(null);
    setSuggestionByFieldId({});
    setLastMigrationSummary(null);
  }, [applicationId, locale]);

  useEffect(() => {
    setRegistryAutoconfigStatus(null);
    setRegistryAutoconfigInFlight(false);
  }, [applicationId]);

  const configuredRegistryId = useMemo(
    () => readConfiguredRegistryId(application?.customProperties),
    [application?.customProperties]
  );

  useEffect(() => {
    if (
      !sessionId ||
      !application ||
      registryAutoconfigInFlight ||
      configuredRegistryId ||
      registryAutoconfigStatus
    ) {
      return;
    }

    let canceled = false;
    setRegistryAutoconfigInFlight(true);

    void ensureCmsRegistryMetadata({ sessionId, applicationId })
      .then((result) => {
        if (canceled) {
          return;
        }
        setRegistryAutoconfigStatus(result);
        if (result.updated && result.registryId) {
          notification.success(
            "CMS Registry Linked",
            `Connected app metadata now explicitly pins ${result.registryId}.`
          );
        }
      })
      .catch((error) => {
        if (canceled) {
          return;
        }
        const message =
          error instanceof Error ? error.message : "Could not auto-configure CMS registry metadata";
        notification.error("CMS Registry", message);
      })
      .finally(() => {
        if (!canceled) {
          setRegistryAutoconfigInFlight(false);
        }
      });

    return () => {
      canceled = true;
    };
  }, [
    application,
    applicationId,
    configuredRegistryId,
    ensureCmsRegistryMetadata,
    notification,
    registryAutoconfigStatus,
    registryAutoconfigInFlight,
    sessionId,
  ]);

  const cmsCopy = unsafeUseQuery(
    apiAny.publishingOntology.getApplicationCmsCopy,
    sessionId
      ? {
          sessionId,
          applicationId,
          locale,
          defaultLocale: registry.defaultLocale,
          fields: flattenedFields.map((field) => ({
            page: field.page,
            section: field.section,
            key: field.key,
            subtype: field.subtype,
          })),
        }
      : "skip"
  ) as CmsCopyQueryResult | undefined;

  const fieldResultMap = useMemo(() => {
    const map = new Map<string, CmsCopyFieldResult>();
    for (const field of cmsCopy?.fields || []) {
      map.set(getFieldLookupKey(field), field);
    }
    return map;
  }, [cmsCopy?.fields]);

  const groupedPages = useMemo(() => {
    const pages = new Map<
      string,
      {
        pageLabel: string;
        sections: Map<string, { sectionLabel: string; fields: FlattenedCmsCopyField[] }>;
      }
    >();

    for (const field of flattenedFields) {
      if (!pages.has(field.page)) {
        pages.set(field.page, {
          pageLabel: field.pageLabel,
          sections: new Map(),
        });
      }
      const page = pages.get(field.page)!;
      if (!page.sections.has(field.section)) {
        page.sections.set(field.section, {
          sectionLabel: field.sectionLabel,
          fields: [],
        });
      }
      page.sections.get(field.section)!.fields.push(field);
    }

    return pages;
  }, [flattenedFields]);

  if (!sessionId) {
    return (
      <div className="p-4 text-xs" style={{ color: "var(--neutral-gray)" }}>
        Please log in to edit CMS copy.
      </div>
    );
  }

  if (application === undefined) {
    return (
      <div className="p-4 text-xs" style={{ color: "var(--neutral-gray)" }}>
        Loading application...
      </div>
    );
  }

  if (registry.pages.length === 0) {
    return (
      <div className="p-4 space-y-2">
        <h4 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
          CMS Copy
        </h4>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          No CMS field registry is configured for this application.
        </p>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          Set `cmsCopyRegistryId` in connected application custom properties to enable deterministic page/section grouping.
        </p>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          Automatic mapping currently supports segelschule/altwarp naming patterns.
        </p>
      </div>
    );
  }

  if (cmsCopy === undefined) {
    return (
      <div className="p-4 text-xs" style={{ color: "var(--neutral-gray)" }}>
        Loading CMS copy...
      </div>
    );
  }

  const handleRewriteWithOneOfOne = (field: FlattenedCmsCopyField, currentValue: string) => {
    const payload = {
      contractVersion: "cms_copy_rewrite_v1",
      application: {
        id: String(applicationId),
        name: application?.name || applicationName,
      },
      field: {
        page: field.page,
        section: field.section,
        key: field.key,
        label: field.label,
        locale,
      },
      currentText: currentValue,
      instruction:
        "Rewrite this CMS field for One-of-One tone while preserving factual meaning. Return 3 options and a recommended option.",
      requestedAt: Date.now(),
    };

    const encodedPayload = encodeUtf8Base64(JSON.stringify(payload));
    const openContext = `cms_rewrite:${encodedPayload}`;
    const windowContract = getVoiceAssistantWindowContract("ai-assistant");

    openWindow(
      windowContract.windowId,
      windowContract.title,
      (
        <AIChatWindow
          initialLayoutMode="slick"
          initialPanel="cms-rewrite"
          openContext={openContext}
          sourceSessionId={sessionId}
          sourceOrganizationId={currentOrg?.id ? String(currentOrg.id) : undefined}
        />
      ),
      windowContract.position,
      windowContract.size,
      windowContract.titleKey,
      windowContract.iconId,
      {
        initialLayoutMode: "slick",
        initialPanel: "cms-rewrite",
        openContext,
        sourceSessionId: sessionId,
        ...(currentOrg?.id ? { sourceOrganizationId: String(currentOrg.id) } : {}),
      }
    );

    notification.info(
      "Rewrite Started",
      "One-of-One Assistant opened with field context. Review a suggestion there, then apply it here with confirmation."
    );
  };

  const handleMigrateLegacyToScoped = async (scope: "current" | "all") => {
    const locales = scope === "all" ? registry.locales : [locale];
    const scopeLabel =
      scope === "all"
        ? `all locales (${locales.join(", ")})`
        : `current locale (${locale})`;

    const proceed = window.confirm(
      `Migrate legacy CMS keys into scoped app keys for ${scopeLabel}? ` +
        "This writes scoped keys and keeps legacy records unchanged."
    );
    if (!proceed) {
      return;
    }

    setIsMigratingLegacy(true);
    try {
      const result = await migrateLegacyCmsCopy({
        sessionId,
        applicationId,
        locales,
        fields: flattenedFields.map((field) => ({
          page: field.page,
          section: field.section,
          key: field.key,
          subtype: field.subtype,
        })),
      });

      setLastMigrationSummary({
        localeScope: scope,
        operations: result.summary.operations,
        migrated: result.summary.migrated,
        skippedNoLegacy: result.summary.skippedNoLegacy,
        skippedScopedNewerOrEqual: result.summary.skippedScopedNewerOrEqual,
      });

      notification.success(
        "Migration Complete",
        `${result.summary.migrated} migrated, ${result.summary.skippedNoLegacy} missing legacy, ${result.summary.skippedScopedNewerOrEqual} unchanged`
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to migrate legacy CMS content";
      notification.error("Migration Failed", message);
    } finally {
      setIsMigratingLegacy(false);
    }
  };

  const handleSaveField = async (field: FlattenedCmsCopyField, nextValue: string) => {
    setSavingByFieldId((prev) => ({ ...prev, [field.id]: true }));
    setErrorsByFieldId((prev) => {
      const next = { ...prev };
      delete next[field.id];
      return next;
    });

    try {
      await saveCmsField({
        sessionId,
        applicationId,
        page: field.page,
        section: field.section,
        key: field.key,
        locale,
        value: nextValue,
      });

      setDrafts((prev) => {
        const next = { ...prev };
        delete next[field.id];
        return next;
      });
      setSavedAtByFieldId((prev) => ({ ...prev, [field.id]: Date.now() }));
      notification.success("Saved", `${field.page}/${field.section}/${field.key} updated`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to save CMS copy field";
      setErrorsByFieldId((prev) => ({ ...prev, [field.id]: message }));
      notification.error("Save Failed", message);
    } finally {
      setSavingByFieldId((prev) => ({ ...prev, [field.id]: false }));
    }
  };

  const handleApplySuggestionToDraft = (field: FlattenedCmsCopyField, currentValue: string) => {
    const suggestedValue = (suggestionByFieldId[field.id] || "").trim();
    if (!suggestedValue) {
      notification.error("Suggestion Required", "Paste a rewrite suggestion before applying.");
      return;
    }

    if (suggestedValue === currentValue) {
      notification.info("No Changes", "Suggestion matches current text.");
      return;
    }

    const confirmed = window.confirm(
      `Apply suggestion to draft for ${field.page}/${field.section}/${field.key}? ` +
        "This does not save yet."
    );
    if (!confirmed) {
      return;
    }

    setDrafts((prev) => ({
      ...prev,
      [field.id]: suggestedValue,
    }));
    setOpenSuggestionFieldId(null);
    notification.success("Suggestion Applied", "Review the field and click Save when ready.");
  };

  return (
    <div className="h-full flex flex-col">
      <div
        className="px-4 py-3 border-b flex items-center justify-between gap-3"
        style={{ borderColor: "var(--window-document-border)" }}
      >
        <div>
          <h4 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
            CMS Copy - {application?.name || applicationName}
          </h4>
          <p className="text-xs mt-0.5" style={{ color: "var(--neutral-gray)" }}>
            Registry: {registry.name} ({flattenedFields.length} fields)
          </p>
          {configuredRegistryId && (
            <p className="text-[11px] mt-0.5" style={{ color: "var(--neutral-gray)" }}>
              Registry ID: {configuredRegistryId}
            </p>
          )}
          {registryAutoconfigStatus?.updated && registryAutoconfigStatus.registryId && (
            <p className="text-[11px] mt-0.5" style={{ color: "var(--tone-accent)" }}>
              Auto-configured registry metadata: {registryAutoconfigStatus.registryId}
            </p>
          )}
          {lastMigrationSummary && (
            <p className="text-[11px] mt-0.5" style={{ color: "var(--neutral-gray)" }}>
              Migration ({lastMigrationSummary.localeScope === "all" ? "all locales" : "current locale"}):{" "}
              {lastMigrationSummary.migrated}/{lastMigrationSummary.operations} migrated,{" "}
              {lastMigrationSummary.skippedNoLegacy} missing legacy,{" "}
              {lastMigrationSummary.skippedScopedNewerOrEqual} unchanged
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs flex items-center gap-2" style={{ color: "var(--neutral-gray)" }}>
            Locale
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value)}
              className="px-2 py-1 text-xs border-2"
              style={{
                borderColor: "var(--window-document-border)",
                background: "white",
                color: "var(--window-document-text)",
              }}
            >
              {registry.locales.map((registryLocale) => (
                <option key={registryLocale} value={registryLocale}>
                  {registryLocale}
                </option>
              ))}
            </select>
          </label>
          <InteriorButton
            variant="secondary"
            size="sm"
            onClick={() => handleMigrateLegacyToScoped("current")}
            disabled={isMigratingLegacy || flattenedFields.length === 0}
          >
            {isMigratingLegacy ? "Migrating..." : "Migrate Current Locale"}
          </InteriorButton>
          <InteriorButton
            variant="secondary"
            size="sm"
            onClick={() => handleMigrateLegacyToScoped("all")}
            disabled={isMigratingLegacy || flattenedFields.length === 0}
          >
            Migrate All Locales
          </InteriorButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Array.from(groupedPages.entries()).map(([pageId, page]) => (
          <section
            key={pageId}
            className="border-2"
            style={{
              borderColor: "var(--window-document-border)",
              background: "white",
            }}
          >
            <div
              className="px-3 py-2 border-b text-xs font-bold uppercase tracking-wide"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg-elevated)",
                color: "var(--window-document-text)",
              }}
            >
              Page: {page.pageLabel}
            </div>

            <div className="p-3 space-y-4">
              {Array.from(page.sections.entries()).map(([sectionId, section]) => (
                <div key={sectionId} className="space-y-3">
                  <h5 className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                    Section: {section.sectionLabel}
                  </h5>

                  <div className="space-y-3">
                    {section.fields.map((field) => {
                      const fieldResult = fieldResultMap.get(getFieldLookupKey(field));
                      const serverValue =
                        typeof fieldResult?.record?.value === "string"
                          ? fieldResult.record.value
                          : "";
                      const draftValue = drafts[field.id];
                      const effectiveValue = draftValue ?? serverValue;
                      const dirty = draftValue !== undefined && draftValue !== serverValue;
                      const saving = savingByFieldId[field.id] === true;
                      const error = errorsByFieldId[field.id];
                      const savedAt = savedAtByFieldId[field.id];
                      const resolvedLocale = fieldResult?.resolvedLocale;
                      const recordSource = fieldResult?.recordSource || "none";

                      return (
                        <div
                          key={field.id}
                          className="border p-3 space-y-2"
                          style={{ borderColor: "var(--window-document-border)" }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
                                {field.label}
                              </p>
                              <p className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>
                                {field.page}/{field.section}/{field.key}
                              </p>
                            </div>
                            <div className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>
                              source: {recordSource}
                              {resolvedLocale ? ` | locale: ${resolvedLocale}` : ""}
                            </div>
                          </div>

                          <textarea
                            value={effectiveValue}
                            rows={field.multilineRows || 3}
                            onChange={(event) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [field.id]: event.target.value,
                              }))
                            }
                            className="w-full border rounded-sm px-2 py-1.5 text-xs leading-relaxed"
                            style={{
                              borderColor: "var(--window-document-border)",
                              background: "white",
                              color: "var(--window-document-text)",
                            }}
                          />

                          <div className="flex items-center justify-between gap-3">
                            <div className="text-[11px]" style={{ color: error ? "var(--error)" : "var(--neutral-gray)" }}>
                              {error
                                ? error
                                : dirty
                                  ? "Unsaved changes"
                                  : `Last save: ${formatRelativeTimestamp(savedAt || fieldResult?.record?.updatedAt)}`}
                            </div>

                            <div className="flex items-center gap-2">
                              <InteriorButton
                                variant="secondary"
                                size="sm"
                                onClick={() => handleRewriteWithOneOfOne(field, effectiveValue)}
                                className="flex items-center gap-1"
                              >
                                <Sparkles size={12} />
                                Rewrite with One-of-One
                              </InteriorButton>
                              <InteriorButton
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  setOpenSuggestionFieldId((current) =>
                                    current === field.id ? null : field.id
                                  )
                                }
                              >
                                {openSuggestionFieldId === field.id ? "Hide Suggestion" : "Apply Suggestion"}
                              </InteriorButton>
                              <InteriorButton
                                variant="primary"
                                size="sm"
                                onClick={() => handleSaveField(field, effectiveValue)}
                                disabled={saving || !dirty}
                                className="flex items-center gap-1"
                              >
                                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                Save
                              </InteriorButton>
                            </div>
                          </div>

                          {openSuggestionFieldId === field.id && (
                            <div
                              className="border rounded-sm p-2 space-y-2"
                              style={{
                                borderColor: "var(--window-document-border)",
                                background: "var(--window-document-bg-elevated)",
                              }}
                            >
                              <p className="text-[11px] font-semibold" style={{ color: "var(--window-document-text)" }}>
                                Paste suggestion from One-of-One, review, then confirm apply.
                              </p>
                              <textarea
                                value={suggestionByFieldId[field.id] || ""}
                                rows={field.multilineRows || 3}
                                onChange={(event) =>
                                  setSuggestionByFieldId((prev) => ({
                                    ...prev,
                                    [field.id]: event.target.value,
                                  }))
                                }
                                className="w-full border rounded-sm px-2 py-1.5 text-xs leading-relaxed"
                                style={{
                                  borderColor: "var(--window-document-border)",
                                  background: "white",
                                  color: "var(--window-document-text)",
                                }}
                                placeholder="Paste rewrite suggestion here"
                              />
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div
                                  className="border rounded-sm p-2 text-[11px] whitespace-pre-wrap"
                                  style={{ borderColor: "var(--window-document-border)" }}
                                >
                                  <p className="font-semibold mb-1" style={{ color: "var(--window-document-text)" }}>
                                    Current
                                  </p>
                                  <p style={{ color: "var(--neutral-gray)" }}>{effectiveValue || "(empty)"}</p>
                                </div>
                                <div
                                  className="border rounded-sm p-2 text-[11px] whitespace-pre-wrap"
                                  style={{ borderColor: "var(--window-document-border)" }}
                                >
                                  <p className="font-semibold mb-1" style={{ color: "var(--window-document-text)" }}>
                                    Suggestion
                                  </p>
                                  <p style={{ color: "var(--neutral-gray)" }}>
                                    {suggestionByFieldId[field.id]?.trim() || "(empty)"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center justify-end gap-2">
                                <InteriorButton
                                  variant="secondary"
                                  size="sm"
                                  onClick={() =>
                                    setSuggestionByFieldId((prev) => ({
                                      ...prev,
                                      [field.id]: "",
                                    }))
                                  }
                                >
                                  Clear
                                </InteriorButton>
                                <InteriorButton
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleApplySuggestionToDraft(field, effectiveValue)}
                                >
                                  Confirm Apply to Draft
                                </InteriorButton>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
