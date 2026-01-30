"use client";

/**
 * PUBLISH CONFIG WIZARD
 *
 * Multi-step wizard that replaces the old V0PublishPanel.
 * Walks the user through configuring their app for production:
 *
 * 1. App Info — Name, repo, visibility
 * 2. Capabilities — Review selected API categories
 * 3. Architecture — Thin client (Phase 1 default)
 * 4. Auth — None, OAuth, NextAuth, Clerk
 * 5. Payments — Stripe, l4yercak3 invoicing
 * 6. Env Vars — Required environment variables summary
 * 7. Review — Final review + push button
 */

import { useState, useCallback } from "react";
import { usePublishConfig, type PublishStep } from "@/contexts/publish-context";
import { useBuilder } from "@/contexts/builder-context";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { API_CATEGORIES } from "@/lib/api-catalog";
import { generateThinClientScaffold } from "@/lib/scaffold-generators/thin-client";
import {
  X,
  Check,
  Copy,
  Loader2,
  Rocket,
  Github,
  ExternalLink,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  FileText,
  Users,
  Calendar,
  ShoppingBag,
  Zap,
  Receipt,
  Ticket,
  CalendarCheck,
  Lock,
  CreditCard,
  Settings,
  Eye,
  ArrowRight,
  Plug,
} from "lucide-react";
import type { Id } from "@/../convex/_generated/dataModel";

// ============================================================================
// ICON MAP
// ============================================================================

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

// ============================================================================
// STEP COMPONENTS
// ============================================================================

function AppInfoStep() {
  const { config, updateConfig } = usePublishConfig();

  const handleNameChange = (name: string) => {
    updateConfig({
      appName: name,
      repoName: name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider block mb-1.5">
          App Name
        </label>
        <input
          type="text"
          value={config.appName}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="My App"
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider block mb-1.5">
          Repository Name
        </label>
        <input
          type="text"
          value={config.repoName}
          onChange={(e) =>
            updateConfig({
              repoName: e.target.value.replace(/[^a-zA-Z0-9-_.]/g, "-"),
            })
          }
          placeholder="my-app"
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider block mb-1.5">
          Description
        </label>
        <input
          type="text"
          value={config.description}
          onChange={(e) => updateConfig({ description: e.target.value })}
          placeholder="A brief description of your app"
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider block mb-1.5">
          Visibility
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => updateConfig({ isPrivate: true })}
            className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
              config.isPrivate
                ? "border-purple-700 bg-purple-950/30 text-purple-300"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
            }`}
          >
            Private
          </button>
          <button
            onClick={() => updateConfig({ isPrivate: false })}
            className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
              !config.isPrivate
                ? "border-purple-700 bg-purple-950/30 text-purple-300"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
            }`}
          >
            Public
          </button>
        </div>
      </div>
    </div>
  );
}

function CapabilitiesStep({ onSwitchToConnect }: { onSwitchToConnect?: () => void }) {
  const { config } = usePublishConfig();
  const selected = new Set(config.selectedCategories);
  const selectedCats = API_CATEGORIES.filter((c) => selected.has(c.id));
  const unselectedCats = API_CATEGORIES.filter((c) => !selected.has(c.id));

  return (
    <div className="space-y-3 w-full min-w-0 max-w-full overflow-hidden">
      {selectedCats.length > 0 ? (
        <>
          <p className="text-xs text-zinc-500">
            These API capabilities were configured during the Connect step and are locked to your API key&apos;s scopes.
          </p>
          <div className="grid gap-2 w-full min-w-0 max-w-full">
            {selectedCats.map((cat) => {
              const Icon = ICON_MAP[cat.icon];
              return (
                <div
                  key={cat.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-purple-700 bg-purple-950/20 text-white w-full min-w-0 max-w-full overflow-hidden box-border"
                >
                  {Icon && <Icon className="h-4 w-4 flex-shrink-0 text-purple-400 mt-0.5" />}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm font-medium break-words">{cat.label}</p>
                    <p className="text-xs text-zinc-500 break-words">{cat.description}</p>
                  </div>
                  <Check className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
                </div>
              );
            })}
          </div>
          {unselectedCats.length > 0 && (
            <p className="text-[10px] text-zinc-600">
              {unselectedCats.length} other {unselectedCats.length === 1 ? "category" : "categories"} available
            </p>
          )}
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-zinc-400">No API categories connected yet.</p>
          <p className="text-xs text-zinc-500 mt-1">
            Connect your app first to select API capabilities.
          </p>
        </div>
      )}

      {onSwitchToConnect && (
        <button
          onClick={onSwitchToConnect}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-xs font-medium hover:bg-zinc-700 transition-colors border border-zinc-700"
        >
          <Plug className="h-3.5 w-3.5" />
          {selectedCats.length > 0 ? "Edit in Connect" : "Go to Connect"}
        </button>
      )}
    </div>
  );
}

function ArchitectureStep() {
  const { config, updateConfig } = usePublishConfig();

  const options = [
    {
      value: "thin-client" as const,
      label: "Thin Client",
      description: "Frontend app calling l4yercak3 APIs. Simplest to deploy.",
      available: true,
    },
    {
      value: "full-stack" as const,
      label: "Full-Stack",
      description: "Own database + API routes. Coming in Phase 2.",
      available: false,
    },
    {
      value: "hybrid" as const,
      label: "Hybrid",
      description: "l4yercak3 auth + own DB. Coming in Phase 3.",
      available: false,
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Choose how your app connects to data. Thin Client is recommended for Phase 1.
      </p>
      <div className="space-y-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => opt.available && updateConfig({ architecture: opt.value })}
            disabled={!opt.available}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
              config.architecture === opt.value
                ? "border-purple-700 bg-purple-950/20 text-white"
                : opt.available
                  ? "border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  : "border-zinc-800/50 text-zinc-600 opacity-50 cursor-not-allowed"
            }`}
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{opt.label}</p>
              <p className="text-xs text-zinc-500">{opt.description}</p>
            </div>
            {config.architecture === opt.value && (
              <Check className="h-4 w-4 text-purple-400 flex-shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function AuthStep() {
  const { config, updateConfig } = usePublishConfig();

  const options = [
    {
      value: "none" as const,
      label: "No Auth",
      description: "Public app, no login required.",
      icon: null,
    },
    {
      value: "l4yercak3-oauth" as const,
      label: "l4yercak3 OAuth",
      description: "Users log in with l4yercak3 accounts. Phase 3.",
      icon: Lock,
      disabled: true,
    },
    {
      value: "clerk" as const,
      label: "Clerk",
      description: "Drop-in auth with Clerk. Add your keys.",
      icon: Lock,
    },
    {
      value: "nextauth" as const,
      label: "NextAuth.js",
      description: "Flexible auth with NextAuth providers.",
      icon: Lock,
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Choose how users authenticate in your published app.
      </p>
      <div className="space-y-2">
        {options.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              onClick={() => !opt.disabled && updateConfig({ auth: opt.value })}
              disabled={opt.disabled}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                config.auth === opt.value
                  ? "border-purple-700 bg-purple-950/20 text-white"
                  : opt.disabled
                    ? "border-zinc-800/50 text-zinc-600 opacity-50 cursor-not-allowed"
                    : "border-zinc-800 text-zinc-400 hover:border-zinc-700"
              }`}
            >
              {Icon && <Icon className="h-4 w-4 text-zinc-500 flex-shrink-0" />}
              <div className="flex-1">
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-zinc-500">{opt.description}</p>
              </div>
              {config.auth === opt.value && (
                <Check className="h-4 w-4 text-purple-400 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PaymentsStep() {
  const { config, updateConfig } = usePublishConfig();

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Enable payment processing for your app. You can enable both.
      </p>
      <div className="space-y-2">
        <button
          onClick={() =>
            updateConfig({
              payments: { ...config.payments, stripe: !config.payments.stripe },
            })
          }
          className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
            config.payments.stripe
              ? "border-purple-700 bg-purple-950/20 text-white"
              : "border-zinc-800 text-zinc-400 hover:border-zinc-700"
          }`}
        >
          <CreditCard className="h-4 w-4 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Stripe</p>
            <p className="text-xs text-zinc-500">Direct checkout and payment processing.</p>
          </div>
          {config.payments.stripe && <Check className="h-4 w-4 text-purple-400 flex-shrink-0" />}
        </button>

        <button
          onClick={() =>
            updateConfig({
              payments: { ...config.payments, l4yercak3Invoicing: !config.payments.l4yercak3Invoicing },
            })
          }
          className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
            config.payments.l4yercak3Invoicing
              ? "border-purple-700 bg-purple-950/20 text-white"
              : "border-zinc-800 text-zinc-400 hover:border-zinc-700"
          }`}
        >
          <Receipt className="h-4 w-4 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">l4yercak3 Invoicing</p>
            <p className="text-xs text-zinc-500">B2B invoicing through the platform.</p>
          </div>
          {config.payments.l4yercak3Invoicing && <Check className="h-4 w-4 text-purple-400 flex-shrink-0" />}
        </button>

        <button
          onClick={() =>
            updateConfig({
              payments: { stripe: false, l4yercak3Invoicing: false },
            })
          }
          className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
            !config.payments.stripe && !config.payments.l4yercak3Invoicing
              ? "border-purple-700 bg-purple-950/20 text-white"
              : "border-zinc-800 text-zinc-400 hover:border-zinc-700"
          }`}
        >
          <div className="flex-1">
            <p className="text-sm font-medium">No Payments</p>
            <p className="text-xs text-zinc-500">Skip payment integration for now.</p>
          </div>
        </button>
      </div>
    </div>
  );
}

function EnvVarsStep() {
  const { envVars } = usePublishConfig();

  // Group by source
  const grouped = new Map<string, typeof envVars>();
  for (const v of envVars) {
    const group = grouped.get(v.source) || [];
    group.push(v);
    grouped.set(v.source, group);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        These environment variables will be required. They&apos;ll be listed in the generated <code className="text-zinc-400">.env.example</code>.
      </p>
      {envVars.length === 0 ? (
        <div className="text-center py-4 text-zinc-500 text-sm">
          No environment variables needed for this configuration.
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from(grouped).map(([source, vars]) => (
            <div key={source} className="space-y-1">
              <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                {source}
              </p>
              {vars.map((v) => (
                <div
                  key={v.key}
                  className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-xs min-w-0"
                >
                  <code className="text-purple-400 font-mono flex-1 truncate min-w-0">{v.key}</code>
                  {v.required && (
                    <span className="text-[10px] text-amber-500 font-medium">Required</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewStep() {
  const { config, envVars } = usePublishConfig();

  const selectedCats = config.selectedCategories
    .map((id) => API_CATEGORIES.find((c) => c.id === id)?.label)
    .filter(Boolean);

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Review your configuration before publishing.
      </p>

      <div className="space-y-2">
        <ReviewRow label="App Name" value={config.appName} />
        <ReviewRow label="Repository" value={config.repoName} />
        <ReviewRow label="Visibility" value={config.isPrivate ? "Private" : "Public"} />
        <ReviewRow label="Architecture" value={config.architecture} />
        <ReviewRow label="Auth" value={config.auth === "none" ? "None" : config.auth} />
        <ReviewRow
          label="Payments"
          value={
            [config.payments.stripe && "Stripe", config.payments.l4yercak3Invoicing && "l4yercak3"]
              .filter(Boolean)
              .join(", ") || "None"
          }
        />
        <ReviewRow label="Capabilities" value={selectedCats.join(", ")} />
        <ReviewRow label="Env Vars" value={`${envVars.length} required`} />
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded min-w-0">
      <span className="text-xs text-zinc-500 flex-shrink-0">{label}</span>
      <span className="text-xs text-zinc-200 font-medium truncate min-w-0">{value}</span>
    </div>
  );
}

// ============================================================================
// STEP CONFIG
// ============================================================================

const STEP_CONFIG: Record<
  PublishStep,
  { title: string; icon: React.ComponentType<{ className?: string }> }
> = {
  "app-info": { title: "App Info", icon: FileText },
  capabilities: { title: "Capabilities", icon: Zap },
  architecture: { title: "Architecture", icon: Settings },
  auth: { title: "Authentication", icon: Lock },
  payments: { title: "Payments", icon: CreditCard },
  "env-vars": { title: "Environment", icon: Settings },
  review: { title: "Review", icon: Eye },
};

const STEP_COMPONENTS: Record<PublishStep, React.ComponentType<{ onSwitchToConnect?: () => void }>> = {
  "app-info": AppInfoStep,
  capabilities: CapabilitiesStep,
  architecture: ArchitectureStep,
  auth: AuthStep,
  payments: PaymentsStep,
  "env-vars": EnvVarsStep,
  review: ReviewStep,
};

// ============================================================================
// MAIN WIZARD COMPONENT
// ============================================================================

interface PublishConfigWizardProps {
  onClose: () => void;
  /** Callback to switch the UI to Connect mode (for "Edit in Connect" link) */
  onSwitchToConnect?: () => void;
}

export function PublishConfigWizard({ onClose, onSwitchToConnect }: PublishConfigWizardProps) {
  const {
    config,
    currentStep,
    currentStepIndex,
    totalSteps,
    goNext,
    goBack,
    canGoNext,
    canGoBack,
    isLastStep,
    isFirstStep,
    isStepValid,
    saveNow,
  } = usePublishConfig();

  const { sessionId, organizationId, builderAppId } = useBuilder();
  const { sessionId: authSessionId } = useAuth();
  const effectiveSessionId = authSessionId || sessionId;

  // Save on step navigation and panel close
  const handleGoNext = useCallback(() => { saveNow(); goNext(); }, [saveNow, goNext]);
  const handleGoBack = useCallback(() => { saveNow(); goBack(); }, [saveNow, goBack]);
  const handleClose = useCallback(() => { saveNow(); onClose(); }, [saveNow, onClose]);

  // Publishing state
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    repoUrl: string;
    cloneUrl: string;
    fileCount: number;
  } | null>(null);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [isGeneratingDeploy, setIsGeneratingDeploy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // GitHub connection check
  const githubConnection = useQuery(
    api.integrations.github.checkGitHubConnection,
    effectiveSessionId && organizationId
      ? { sessionId: effectiveSessionId, organizationId }
      : "skip"
  );

  // GitHub OAuth initiation
  const initiateGitHubOAuth = useMutation(api.oauth.github.initiateGitHubOAuth);
  const [isConnectingGitHub, setIsConnectingGitHub] = useState(false);

  const handleConnectGitHub = useCallback(async () => {
    if (!effectiveSessionId) return;
    setIsConnectingGitHub(true);
    try {
      const result = await initiateGitHubOAuth({
        sessionId: effectiveSessionId,
        connectionType: "organizational",
      });
      // Open the GitHub OAuth page in a new tab
      window.open(result.authUrl, "_blank");
    } catch (err) {
      console.error("[PublishWizard] Failed to initiate GitHub OAuth:", err);
      setError(err instanceof Error ? err.message : "Failed to connect GitHub");
    } finally {
      setIsConnectingGitHub(false);
    }
  }, [effectiveSessionId, initiateGitHubOAuth]);

  // Actions
  const createRepo = useAction(api.integrations.github.createRepoFromBuilderApp);
  const generateDeployUrl = useMutation(api.builderAppOntology.generateBuilderAppDeployUrl);

  const copyToClipboard = useCallback(async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  // Handle publish (final step action)
  const handlePublish = useCallback(async () => {
    if (!effectiveSessionId || !organizationId || !builderAppId) return;

    setIsPublishing(true);
    setError(null);

    try {
      // Generate scaffold files from the publish config
      // These are ADDITIVE — they sit alongside the v0-generated app files
      const scaffoldFiles = generateThinClientScaffold(config);

      console.log("[PublishWizard] Generated scaffold:", {
        totalFiles: scaffoldFiles.length,
        files: scaffoldFiles.map((f) => f.path),
      });

      const result = await createRepo({
        sessionId: effectiveSessionId,
        organizationId,
        appId: builderAppId,
        repoName: config.repoName.trim(),
        description: config.description || `${config.appName} - Built with l4yercak3`,
        isPrivate: config.isPrivate,
        scaffoldFiles: scaffoldFiles.map((f) => ({
          path: f.path,
          content: f.content,
          label: f.label,
        })),
      });

      setPublishResult({
        repoUrl: result.repoUrl,
        cloneUrl: result.cloneUrl,
        fileCount: result.fileCount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create repository");
    } finally {
      setIsPublishing(false);
    }
  }, [effectiveSessionId, organizationId, builderAppId, config, createRepo]);

  const handleGenerateDeployUrl = useCallback(async () => {
    if (!effectiveSessionId || !builderAppId || !publishResult) return;

    setIsGeneratingDeploy(true);
    setError(null);

    try {
      const result = await generateDeployUrl({
        sessionId: effectiveSessionId,
        appId: builderAppId,
        githubRepo: publishResult.repoUrl,
      });

      setDeployUrl(result.vercelDeployUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate deploy URL");
    } finally {
      setIsGeneratingDeploy(false);
    }
  }, [effectiveSessionId, builderAppId, publishResult, generateDeployUrl]);

  // Current step component
  const StepComponent = STEP_COMPONENTS[currentStep];
  const stepConfig = STEP_CONFIG[currentStep];
  const StepIcon = stepConfig.icon;

  // No builder app connected
  if (!builderAppId) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Publish</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-zinc-800 text-zinc-400">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 text-center">
          <Settings className="h-8 w-8 mx-auto mb-3 text-zinc-600" />
          <p className="text-zinc-300 font-medium">Connect your app first</p>
          <p className="text-xs text-zinc-500 mt-1">
            Switch to Connect mode and select API capabilities before publishing.
          </p>
        </div>
      </div>
    );
  }

  // If published, show success state
  if (publishResult) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Published</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-zinc-800 text-zinc-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Repo created success */}
        <div className="bg-emerald-950/50 border border-emerald-800 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400" />
            <span className="text-sm text-emerald-200 font-medium">Repository created</span>
          </div>
          <div className="mt-2 ml-6 space-y-1">
            <a
              href={publishResult.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300"
            >
              <ExternalLink className="h-3 w-3" />
              {publishResult.repoUrl}
            </a>
            <p className="text-xs text-zinc-500">{publishResult.fileCount} files committed</p>
          </div>
        </div>

        {/* Clone URL */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Clone URL</label>
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 flex items-center justify-between gap-2">
            <code className="text-xs text-zinc-300 font-mono truncate">{publishResult.cloneUrl}</code>
            <button
              onClick={() => copyToClipboard(publishResult.cloneUrl, "clone")}
              className="p-1 rounded hover:bg-zinc-700 text-zinc-400 flex-shrink-0"
            >
              {copiedField === "clone" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Deploy */}
        {!deployUrl ? (
          <button
            onClick={handleGenerateDeployUrl}
            disabled={isGeneratingDeploy}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isGeneratingDeploy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating deploy link...
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" />
                Deploy to Vercel
              </>
            )}
          </button>
        ) : (
          <div className="space-y-2">
            <a
              href={deployUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              <Rocket className="h-4 w-4" />
              Open Vercel Deploy
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              onClick={() => copyToClipboard(deployUrl, "deploy")}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors text-sm border border-zinc-700"
            >
              {copiedField === "deploy" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy deploy URL
                </>
              )}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-950/50 border border-red-800 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // Wizard flow
  return (
    <div className="p-4 space-y-4 flex flex-col h-full min-w-0 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Publish</h2>
        </div>
        <button onClick={handleClose} className="p-1 rounded hover:bg-zinc-800 text-zinc-400">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] text-zinc-500">
          <span>Step {currentStepIndex + 1} of {totalSteps}</span>
          <span>{stepConfig.title}</span>
        </div>
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-600 rounded-full transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* GitHub connection warning */}
      {!githubConnection?.connected && currentStep === "review" && (
        <div className="bg-amber-950/50 border border-amber-800 rounded-lg p-3 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-amber-300">GitHub not connected</p>
            <p className="text-xs text-amber-400/70 mt-0.5">Required to push your app.</p>
          </div>
          <button
            onClick={handleConnectGitHub}
            disabled={isConnectingGitHub}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 text-white rounded-md text-xs font-medium hover:bg-zinc-700 transition-colors border border-zinc-700 disabled:opacity-50 flex-shrink-0"
          >
            {isConnectingGitHub ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Github className="h-3.5 w-3.5" />
            )}
            {isConnectingGitHub ? "Opening..." : "Connect"}
            {!isConnectingGitHub && <ExternalLink className="h-3 w-3 text-zinc-400" />}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-950/50 border border-red-800 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Step content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 w-full">
        <div className="flex items-center gap-2 mb-3">
          <StepIcon className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-white">{stepConfig.title}</h3>
        </div>
        <div className="w-full min-w-0 overflow-hidden">
          <StepComponent onSwitchToConnect={onSwitchToConnect} />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
        {!isFirstStep && (
          <button
            onClick={handleGoBack}
            disabled={!canGoBack}
            className="flex items-center gap-1 px-3 py-2 text-xs text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <ChevronLeft className="h-3 w-3" />
            Back
          </button>
        )}
        <div className="flex-1" />
        {isLastStep ? (
          <button
            onClick={handlePublish}
            disabled={isPublishing || !githubConnection?.connected || !isStepValid(currentStep)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPublishing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Github className="h-3.5 w-3.5" />
                Push to GitHub
                <ArrowRight className="h-3 w-3" />
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleGoNext}
            disabled={!canGoNext}
            className="flex items-center gap-1 px-4 py-2 bg-zinc-800 text-white rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-zinc-700"
          >
            Next
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
