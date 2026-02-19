"use client";

/**
 * V0 CONNECTION PANEL
 *
 * API catalog UI for connecting v0-generated apps to the platform backend.
 * Shows selectable API categories (Forms, CRM, Events, etc.) with
 * endpoint details. Generates a scoped API key on connect.
 */

import { useState, useCallback, useEffect } from "react";
import { useBuilder } from "@/contexts/builder-context";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import type { Id } from "@/../convex/_generated/dataModel";
import {
  X,
  Check,
  Copy,
  Loader2,
  ChevronDown,
  ChevronRight,
  Plug,
  FileText,
  Users,
  Calendar,
  ShoppingBag,
  Zap,
  Receipt,
  Ticket,
  CalendarCheck,
  Key,
  Download,
  Save,
  Rocket,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import {
  API_CATEGORIES,
  getScopesForCategories,
  type ApiCategory,
} from "@/lib/api-catalog";
import { EnvVarsSection } from "./env-vars-section";

// Icon map for dynamic rendering
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Users,
  Calendar,
  ShoppingBag,
  Zap,
  Receipt,
  Ticket,
  CalendarCheck,
};

function useBuilderTx() {
  const { translationsMap } = useNamespaceTranslations("ui.builder");
  return useCallback(
    (key: string, fallback: string): string => translationsMap?.[key] ?? fallback,
    [translationsMap],
  );
}

interface V0ConnectionPanelProps {
  onClose: () => void;
  /** Callback to switch UI to Publish mode after successful connection */
  onSwitchToPublish?: () => void;
}

interface ConnectionResult {
  apiKey: string;
  baseUrl: string;
  appCode: string;
  selectedCategories: string[];
  envFileId: string | null;
}

export function V0ConnectionPanel({ onClose, onSwitchToPublish }: V0ConnectionPanelProps) {
  const { sessionId, organizationId, v0ChatId, v0DemoUrl, v0WebUrl, conversationId, builderAppId, setBuilderAppId } = useBuilder();
  const { sessionId: authSessionId } = useAuth();
  const tx = useBuilderTx();

  const effectiveSessionId = authSessionId || sessionId;

  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isUpdatingCategories, setIsUpdatingCategories] = useState(false);
  const [connectionResult, setConnectionResult] = useState<ConnectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Convex type instantiation is excessively deep
  const connectV0App = useAction(api.builderAppOntology.connectV0App);
  const updateConnectionCategories = useMutation(api.builderAppOntology.updateConnectionCategories);

  // Check for existing builder app by builderAppId or conversationId
  const existingAppById = useQuery(
    api.builderAppOntology.getBuilderApp,
    effectiveSessionId && builderAppId
      ? { sessionId: effectiveSessionId, appId: builderAppId }
      : "skip"
  );

  const existingAppByConversation = useQuery(
    api.builderAppOntology.getBuilderAppByConversationId,
    effectiveSessionId && organizationId && conversationId && !builderAppId
      ? { sessionId: effectiveSessionId, organizationId, conversationId }
      : "skip"
  );

  const existingAppByV0Chat = useQuery(
    api.builderAppOntology.getBuilderAppByV0ChatId,
    effectiveSessionId && organizationId && v0ChatId && !builderAppId && !conversationId
      ? { sessionId: effectiveSessionId, organizationId, v0ChatId }
      : "skip"
  );

  const existingApp = existingAppById || existingAppByConversation || existingAppByV0Chat;

  // Fetch env vars for the connected step (reads .env.example for full key + scans codebase)
  const envVarsResult = useQuery(
    api.builderAppOntology.getBuilderAppEnvVars,
    effectiveSessionId && builderAppId
      ? { sessionId: effectiveSessionId, appId: builderAppId }
      : "skip"
  );
  const detectedEnvVars = envVarsResult?.envVars || [];

  // Track whether we've already restored state from an existing app
  const [restoredFromExisting, setRestoredFromExisting] = useState(false);

  // Restore connection state: pre-select previously connected categories
  // instead of jumping straight to the result screen
  useEffect(() => {
    if (!existingApp || restoredFromExisting) return;

    const props = existingApp.customProperties as {
      appCode?: string;
      connectionConfig?: {
        apiKeyPrefix?: string;
        baseUrl?: string;
        selectedCategories?: string[];
        envFileId?: string;
      };
    };

    if (props?.connectionConfig) {
      // Pre-select previously connected categories in the picker
      const prevCategories = props.connectionConfig.selectedCategories || [];
      if (prevCategories.length > 0) {
        setSelectedCategories(new Set(prevCategories));
      }
      setRestoredFromExisting(true);

      // Also restore builderAppId in context if it was found by conversation
      if (!builderAppId) {
        setBuilderAppId(existingApp._id as Id<"objects">);
      }
    }
  }, [existingApp, restoredFromExisting, builderAppId, setBuilderAppId]);

  const toggleCategory = useCallback((categoryId: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const toggleExpanded = useCallback((categoryId: string) => {
    setExpandedCategory((prev) => (prev === categoryId ? null : categoryId));
  }, []);

  const handleConnect = useCallback(async () => {
    if (selectedCategories.size === 0 || !effectiveSessionId || !organizationId) return;

    setIsConnecting(true);
    setError(null);

    try {
      const categoryIds = Array.from(selectedCategories);
      const scopes = getScopesForCategories(categoryIds);

      const result = await connectV0App({
        sessionId: effectiveSessionId,
        organizationId,
        name: v0ChatId ? `v0-app-${v0ChatId.slice(0, 8)}` : "v0-app",
        v0ChatId: v0ChatId || undefined,
        v0WebUrl: v0WebUrl || undefined,
        v0DemoUrl: v0DemoUrl || undefined,
        conversationId: conversationId || undefined,
        selectedCategories: categoryIds,
        scopes,
      });

      setConnectionResult({
        apiKey: result.apiKey,
        baseUrl: result.baseUrl,
        appCode: result.appCode,
        selectedCategories: categoryIds,
        envFileId: result.envFileId,
      });

      // Store the builder app ID in context so Publish mode can use it
      setBuilderAppId(result.appId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect app");
    } finally {
      setIsConnecting(false);
    }
  }, [selectedCategories, effectiveSessionId, organizationId, v0ChatId, v0WebUrl, v0DemoUrl, conversationId, connectV0App, setBuilderAppId]);

  // Update categories without regenerating API key
  const handleUpdateCategories = useCallback(async () => {
    if (selectedCategories.size === 0 || !effectiveSessionId || !builderAppId) return;

    setIsUpdatingCategories(true);
    setError(null);

    try {
      const categoryIds = Array.from(selectedCategories);
      const scopes = getScopesForCategories(categoryIds);

      await updateConnectionCategories({
        sessionId: effectiveSessionId,
        appId: builderAppId,
        selectedCategories: categoryIds,
        scopes,
      });

      // Show the connection details with updated categories
      const props = existingApp?.customProperties as {
        appCode?: string;
        connectionConfig?: {
          apiKeyPrefix?: string;
          baseUrl?: string;
          envFileId?: string;
        };
      };
      setConnectionResult({
        apiKey: `${props?.connectionConfig?.apiKeyPrefix || "sk_****"}••••••••`,
        baseUrl: props?.connectionConfig?.baseUrl || "https://agreeable-lion-828.convex.site",
        appCode: props?.appCode || "",
        selectedCategories: categoryIds,
        envFileId: props?.connectionConfig?.envFileId || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update categories");
    } finally {
      setIsUpdatingCategories(false);
    }
  }, [selectedCategories, effectiveSessionId, builderAppId, updateConnectionCategories, existingApp]);

  const copyToClipboard = useCallback(async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  // ============================================================================
  // SAVE FILE STATE
  // ============================================================================

  const [saveFileName, setSaveFileName] = useState(".env.example");
  const [isSaving, setIsSaving] = useState(false);
  const [fileSaved, setFileSaved] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const saveAsMediaDocument = useMutation(api.organizationMedia.createLayerCakeDocument);

  const envContent = connectionResult
    ? [
        `# Generated by l4yercak3 Builder — ${connectionResult.appCode}`,
        `# Connected APIs: ${connectionResult.selectedCategories.join(", ")}`,
        ``,
        `NEXT_PUBLIC_L4YERCAK3_API_KEY=${connectionResult.apiKey}`,
        `NEXT_PUBLIC_L4YERCAK3_URL=${connectionResult.baseUrl}`,
        `L4YERCAK3_ORG_ID=${organizationId}`,
      ].join("\n")
    : "";

  const handleSaveToMediaLibrary = useCallback(async () => {
    if (!effectiveSessionId || !organizationId || !connectionResult) return;

    setIsSaving(true);
    setError(null);
    try {
      await saveAsMediaDocument({
        sessionId: effectiveSessionId,
        organizationId,
        filename: saveFileName,
        documentContent: envContent,
        description: `Environment variables for v0 app ${connectionResult.appCode}`,
        tags: ["builder-app", "env", connectionResult.appCode],
      });
      setFileSaved(true);
      setShowSaveDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save file");
    } finally {
      setIsSaving(false);
    }
  }, [effectiveSessionId, organizationId, connectionResult, saveFileName, envContent, saveAsMediaDocument]);

  const handleDownloadFile = useCallback(() => {
    if (!envContent) return;
    const blob = new Blob([envContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = saveFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [envContent, saveFileName]);

  // Connected state - show API key and config with save file UX
  if (connectionResult) {
    const envSnippet = [
      `NEXT_PUBLIC_L4YERCAK3_API_KEY=${connectionResult.apiKey}`,
      `NEXT_PUBLIC_L4YERCAK3_URL=${connectionResult.baseUrl}`,
      `L4YERCAK3_ORG_ID=${organizationId}`,
    ].join("\n");

    return (
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">
              {tx("ui.builder.connection.connected", "Connected")}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setConnectionResult(null)}
              className="px-2 py-1 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors"
              title={tx("ui.builder.connection.editConnectedApisTitle", "Edit connected APIs")}
            >
              {tx("ui.builder.connection.editApis", "Edit APIs")}
            </button>
            <button onClick={onClose} className="p-1 rounded hover:bg-neutral-800 text-neutral-400">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Success badge */}
        <div className="bg-emerald-950/50 border border-emerald-800 rounded-lg p-3 flex items-start gap-3">
          <Check className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-emerald-200 text-sm font-medium">
              {tx("ui.builder.connection.appConnectedSuccessfully", "App connected successfully")}
            </p>
            <p className="text-emerald-400/70 text-xs mt-1">
              {tx("ui.builder.connection.appCode", "App code:")} {connectionResult.appCode} <span aria-hidden="true">·</span>{" "}
              {connectionResult.selectedCategories.length} {tx("ui.builder.connection.api", "API")}{" "}
              {connectionResult.selectedCategories.length === 1
                ? tx("ui.builder.connection.category", "category")
                : tx("ui.builder.connection.categories", "categories")}{" "}
              {tx("ui.builder.connection.enabled", "enabled")}
            </p>
          </div>
        </div>

        {/* API Key */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <Key className="h-3.5 w-3.5" />
            {tx("ui.builder.connection.apiKey", "API Key")}
          </label>
          <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-3 flex items-center justify-between gap-2">
            <code className="text-sm text-amber-300 font-mono truncate">{connectionResult.apiKey}</code>
            <button
              onClick={() => copyToClipboard(connectionResult.apiKey, "apiKey")}
              className="p-1.5 rounded hover:bg-neutral-700 text-neutral-400 flex-shrink-0"
            >
              {copiedField === "apiKey" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-amber-500/80">
            {tx("ui.builder.connection.saveKeyNow", "Save this key now - it won't be shown again.")}
          </p>
        </div>

        {/* Base URL */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
            {tx("ui.builder.connection.baseUrl", "Base URL")}
          </label>
          <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-3 flex items-center justify-between gap-2">
            <code className="text-sm text-neutral-300 font-mono">{connectionResult.baseUrl}</code>
            <button
              onClick={() => copyToClipboard(connectionResult.baseUrl, "baseUrl")}
              className="p-1.5 rounded hover:bg-neutral-700 text-neutral-400 flex-shrink-0"
            >
              {copiedField === "baseUrl" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Environment variables - same UI as publish dropdown */}
        {detectedEnvVars.length > 0 ? (
          <EnvVarsSection
            envVars={detectedEnvVars}
            footerHint="Add these to your .env file or paste into Vercel during deployment."
          />
        ) : (
          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
              {tx("ui.builder.connection.environmentVariables", "Environment Variables")}
            </label>
            <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-3 relative">
              <pre className="text-xs text-neutral-300 font-mono whitespace-pre-wrap">{envSnippet}</pre>
              <button
                onClick={() => copyToClipboard(envSnippet, "env")}
                className="absolute top-2 right-2 p-1.5 rounded hover:bg-neutral-700 text-neutral-400"
              >
                {copiedField === "env" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Connected categories */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
            {tx("ui.builder.connection.enabledApis", "Enabled APIs")}
          </label>
          <div className="flex flex-wrap gap-2">
            {connectionResult.selectedCategories.map((catId) => {
              const cat = API_CATEGORIES.find((c) => c.id === catId);
              if (!cat) return null;
              return (
                <span key={catId} className="px-2.5 py-1 bg-amber-950/50 border border-amber-800 rounded-full text-xs text-amber-300">
                  {cat.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Save connection file */}
        {fileSaved ? (
          <div className="bg-emerald-950/30 border border-emerald-800 rounded-lg p-3 flex items-center gap-3">
            <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-emerald-200 font-medium">
                {saveFileName} {tx("ui.builder.connection.saved", "saved")}
              </p>
              <p className="text-xs text-emerald-400/70">
                {tx("ui.builder.connection.savedToMediaLibrary", "Saved to your organization's Media Library")}
              </p>
            </div>
          </div>
        ) : showSaveDialog ? (
          <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Save className="h-4 w-4 text-amber-400" />
              <p className="text-sm font-medium text-white">
                {tx("ui.builder.connection.saveConnectionFile", "Save Connection File")}
              </p>
            </div>

            <div>
              <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider block mb-1">
                {tx("ui.builder.connection.filename", "Filename")}
              </label>
              <input
                type="text"
                value={saveFileName}
                onChange={(e) => setSaveFileName(e.target.value)}
                className="w-full px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
              />
              <p className="text-[10px] text-neutral-600 mt-1">
                {tx("ui.builder.connection.savesToMediaLibrary", "Saves to your organization's Media Library")}
              </p>
            </div>

            {/* Preview */}
            <div className="bg-neutral-950 border border-neutral-800 rounded p-2.5">
              <pre className="text-[11px] text-neutral-400 font-mono whitespace-pre-wrap">{envContent}</pre>
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleSaveToMediaLibrary}
                disabled={isSaving || !saveFileName.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 text-white rounded text-xs font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {tx("ui.builder.connection.saving", "Saving...")}
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    {tx("ui.builder.connection.saveToMediaLibrary", "Save to Media Library")}
                  </>
                )}
              </button>
              <button
                onClick={handleDownloadFile}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-800 text-neutral-300 rounded text-xs font-medium hover:bg-neutral-700 transition-colors border border-neutral-700"
                title={tx("ui.builder.connection.downloadToComputer", "Download file to your computer")}
              >
                <Download className="h-3.5 w-3.5" />
                {tx("ui.builder.connection.download", "Download")}
              </button>
            </div>

            <button
              onClick={() => setShowSaveDialog(false)}
              className="w-full text-xs text-neutral-500 hover:text-neutral-400 transition-colors pt-1"
            >
              {tx("ui.builder.connection.skipForNow", "Skip for now")}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSaveDialog(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm"
            >
              <Save className="h-4 w-4" />
              {tx("ui.builder.connection.saveConnectionFile", "Save Connection File")}
            </button>
            <button
              onClick={handleDownloadFile}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors border border-neutral-700"
              title={tx("ui.builder.connection.downloadEnvExample", "Download .env.example")}
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Publish CTA - highlights the header Publish button */}
        <div className="pt-2 border-t border-neutral-800">
          <button
            onClick={() => {
              // Dispatch event to highlight the header Publish button
              window.dispatchEvent(new CustomEvent("highlight-publish-button"));
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 transition-colors font-medium text-sm border border-neutral-700"
          >
            <Rocket className="h-4 w-4 text-amber-400" />
            {tx("ui.builder.connection.readyToPublish", "Ready to publish?")}
            <ArrowRight className="h-3.5 w-3.5 text-neutral-400" />
          </button>
          <p className="text-[10px] text-neutral-600 text-center mt-1.5">
            {tx("ui.builder.connection.publishHint", "Use the Publish button in the top right to deploy")}
          </p>
        </div>
      </div>
    );
  }

  // Determine if already connected (existing app with connectionConfig)
  const existingConfig = (existingApp?.customProperties as { connectionConfig?: { selectedCategories?: string[] } })?.connectionConfig;
  const isAlreadyConnected = !!existingConfig;

  // Check if user has changed categories from the saved ones
  const savedCategories = new Set(existingConfig?.selectedCategories || []);
  const categoriesChanged = isAlreadyConnected && (
    selectedCategories.size !== savedCategories.size ||
    Array.from(selectedCategories).some(c => !savedCategories.has(c))
  );

  // Selection state - show API catalog
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plug className={`h-5 w-5 ${isAlreadyConnected ? "text-emerald-400" : "text-amber-400"}`} />
          <h2 className="text-lg font-semibold text-white">
            {isAlreadyConnected
              ? tx("ui.builder.connection.connectedApis", "Connected APIs")
              : tx("ui.builder.connection.connectToPlatform", "Connect to Platform")}
          </h2>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-neutral-800 text-neutral-400">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Already connected banner */}
      {isAlreadyConnected && (
        <div className="bg-emerald-950/50 border border-emerald-800 rounded-lg p-3 flex items-start gap-3">
          <Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-emerald-200 text-sm font-medium">
              {tx("ui.builder.connection.appAlreadyConnected", "App already connected")}
            </p>
            <p className="text-emerald-400/70 text-xs mt-0.5">
              {tx(
                "ui.builder.connection.appAlreadyConnectedDetail",
                "Select additional APIs and reconnect, or press Next to view your connection details.",
              )}
            </p>
          </div>
        </div>
      )}

      <p className="text-sm text-neutral-400">
        {isAlreadyConnected
          ? tx(
              "ui.builder.connection.connectedDescription",
              "Change your API selections and reconnect to generate a new key, or continue to your connection details.",
            )
          : tx(
              "ui.builder.connection.selectApiCapabilities",
              "Select the API capabilities your app needs. We'll generate a scoped API key with access to only what you select.",
            )
        }
      </p>

      {/* Error */}
      {error && (
        <div className="bg-red-950/50 border border-red-800 rounded-lg p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Category cards */}
      <div className="space-y-2">
        {API_CATEGORIES.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            isSelected={selectedCategories.has(category.id)}
            isExpanded={expandedCategory === category.id}
            onToggleSelect={() => toggleCategory(category.id)}
            onToggleExpand={() => toggleExpanded(category.id)}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="pt-2 space-y-2">
        {/* Regenerate key confirmation dialog */}
        {showRegenConfirm && (
          <div className="bg-amber-950/50 border border-amber-800 rounded-lg p-3 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-amber-200 font-medium">
                  {tx("ui.builder.connection.regenerateApiKeyQuestion", "Regenerate API key?")}
                </p>
                <p className="text-xs text-amber-400/70 mt-0.5">
                  {tx(
                    "ui.builder.connection.regenerateApiKeyWarning",
                    "This will create a new API key and revoke the current one. Your deployed app will need to be updated with the new key.",
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowRegenConfirm(false);
                  handleConnect();
                }}
                disabled={isConnecting}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors text-sm font-medium"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
                    {tx("ui.builder.connection.regenerating", "Regenerating...")}
                  </>
                ) : (
                  <>{tx("ui.builder.connection.yesRegenerate", "Yes, regenerate")}</>
                )}
              </button>
              <button
                onClick={() => setShowRegenConfirm(false)}
                className="flex-1 px-3 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors text-sm border border-neutral-700"
              >
                {tx("ui.builder.connection.cancel", "Cancel")}
              </button>
            </div>
          </div>
        )}

        {!showRegenConfirm && isAlreadyConnected && (
          <>
            {/* Next button - view existing connection details */}
            <button
              onClick={() => {
                const props = existingApp?.customProperties as {
                  appCode?: string;
                  connectionConfig?: {
                    apiKeyPrefix?: string;
                    baseUrl?: string;
                    selectedCategories?: string[];
                    envFileId?: string;
                  };
                };
                if (props?.connectionConfig) {
                  setConnectionResult({
                    apiKey: `${props.connectionConfig.apiKeyPrefix || "sk_****"}••••••••`,
                    baseUrl: props.connectionConfig.baseUrl || "https://agreeable-lion-828.convex.site",
                    appCode: props.appCode || "",
                    selectedCategories: props.connectionConfig.selectedCategories || [],
                    envFileId: props.connectionConfig.envFileId || null,
                  });
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
            >
              {tx("ui.builder.connection.next", "Next")}
              <ArrowRight className="h-4 w-4" />
            </button>

            {/* Update categories (keep existing key) */}
            {categoriesChanged && (
              <button
                onClick={handleUpdateCategories}
                disabled={selectedCategories.size === 0 || isUpdatingCategories}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-800 text-neutral-200 rounded-lg hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium border border-neutral-700"
              >
                {isUpdatingCategories ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />{" "}
                    {tx("ui.builder.connection.updating", "Updating...")}
                  </>
                ) : (
                  <>{tx("ui.builder.connection.updateCategories", "Update Categories (keep existing key)")}</>
                )}
              </button>
            )}

            {/* Regenerate key */}
            <button
              onClick={() => setShowRegenConfirm(true)}
              disabled={selectedCategories.size === 0}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-neutral-500 hover:text-neutral-300 text-xs transition-colors disabled:opacity-50"
            >
              <Key className="h-3 w-3" />
              {tx("ui.builder.connection.regenerateApiKey", "Regenerate API key")}
            </button>
          </>
        )}

        {/* Initial connect (not yet connected) */}
        {!showRegenConfirm && !isAlreadyConnected && (
          <>
            <button
              onClick={handleConnect}
              disabled={selectedCategories.size === 0 || isConnecting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />{" "}
                  {tx("ui.builder.connection.connecting", "Connecting...")}
                </>
              ) : (
                <>
                  <Plug className="h-4 w-4" /> {tx("ui.builder.connection.connect", "Connect")} (
                  {selectedCategories.size}{" "}
                  {selectedCategories.size === 1
                    ? tx("ui.builder.connection.category", "category")
                    : tx("ui.builder.connection.categories", "categories")}
                  )
                </>
              )}
            </button>
            {selectedCategories.size > 0 && (
              <p className="text-xs text-neutral-500 text-center">
                {getScopesForCategories(Array.from(selectedCategories)).length}{" "}
                {tx("ui.builder.connection.scopesWillBeGranted", "scopes will be granted")}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CATEGORY CARD
// ============================================================================

function CategoryCard({
  category,
  isSelected,
  isExpanded,
  onToggleSelect,
  onToggleExpand,
}: {
  category: ApiCategory;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
}) {
  const tx = useBuilderTx();
  const IconComponent = ICON_MAP[category.icon] || FileText;

  return (
    <div
      className={`border rounded-lg transition-colors ${
        isSelected
          ? "border-amber-700 bg-amber-950/30"
          : "border-neutral-700 bg-neutral-900/50 hover:border-neutral-600"
      }`}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 p-3">
        {/* Checkbox */}
        <button
          onClick={onToggleSelect}
          className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
            isSelected
              ? "bg-amber-600 border-amber-600"
              : "border-neutral-600 hover:border-neutral-500"
          }`}
        >
          {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
        </button>

        {/* Icon + info */}
        <div className="flex-1 min-w-0" onClick={onToggleSelect} role="button" tabIndex={0}>
          <div className="flex items-center gap-2">
            <IconComponent className={`h-4 w-4 flex-shrink-0 ${isSelected ? "text-amber-400" : "text-neutral-500"}`} />
            <span className={`text-sm font-medium ${isSelected ? "text-white" : "text-neutral-300"}`}>
              {category.label}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5 ml-6">{category.description}</p>
        </div>

        {/* Expand toggle */}
        <button
          onClick={onToggleExpand}
          className="p-1 rounded hover:bg-neutral-800 text-neutral-500"
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {/* Expanded endpoint list */}
      {isExpanded && (
        <div className="border-t border-neutral-800 px-3 py-2 space-y-1">
          {category.endpoints.map((endpoint, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <span
                className={`font-mono px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  endpoint.method === "GET"
                    ? "bg-emerald-950 text-emerald-400"
                    : endpoint.method === "POST"
                      ? "bg-blue-950 text-blue-400"
                      : endpoint.method === "PUT"
                        ? "bg-amber-950 text-amber-400"
                        : endpoint.method === "DELETE"
                          ? "bg-red-950 text-red-400"
                          : "bg-neutral-800 text-neutral-400"
                }`}
              >
                {endpoint.method}
              </span>
              <span className="text-neutral-500 font-mono">{endpoint.path}</span>
              <span className="text-neutral-600 ml-auto hidden sm:inline">{endpoint.description}</span>
            </div>
          ))}
          <div className="flex gap-1 mt-1.5 pt-1.5 border-t border-neutral-800/50">
            <span className="text-[10px] text-neutral-600">
              {tx("ui.builder.connection.scopes", "Scopes:")}
            </span>
            {category.scopes.map((scope) => (
              <span key={scope} className="text-[10px] px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-500 font-mono">
                {scope}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
