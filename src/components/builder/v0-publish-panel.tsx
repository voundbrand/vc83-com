"use client";

/**
 * V0 PUBLISH PANEL
 *
 * Multi-step publish workflow for v0-generated apps:
 * 1. Pre-check: Verify GitHub OAuth is connected
 * 2. Push to GitHub: Create repo and commit v0 files + scaffold
 * 3. Deploy: Generate Vercel deploy URL or show production link
 */

import { useState, useCallback } from "react";
import { useBuilder } from "@/contexts/builder-context";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import {
  X,
  Check,
  Copy,
  Loader2,
  Rocket,
  Github,
  ExternalLink,
  AlertCircle,
  Plug,
  ChevronRight,
} from "lucide-react";
import type { Id } from "@/../convex/_generated/dataModel";

type PublishStep = "precheck" | "github" | "deploy" | "done";

interface V0PublishPanelProps {
  onClose: () => void;
}

export function V0PublishPanel({ onClose }: V0PublishPanelProps) {
  const { sessionId, organizationId, builderAppId } = useBuilder();
  const { sessionId: authSessionId } = useAuth();

  const effectiveSessionId = authSessionId || sessionId;

  const [step, setStep] = useState<PublishStep>("precheck");
  const [repoName, setRepoName] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);
  const [repoResult, setRepoResult] = useState<{
    repoUrl: string;
    cloneUrl: string;
    fileCount: number;
  } | null>(null);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [isGeneratingDeploy, setIsGeneratingDeploy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Check GitHub connection
  const githubConnection = useQuery(
    api.integrations.github.checkGitHubConnection,
    effectiveSessionId && organizationId
      ? { sessionId: effectiveSessionId, organizationId }
      : "skip"
  );

  // Actions
  const createRepo = useAction(api.integrations.github.createRepoFromBuilderApp);
  const generateDeployUrl = useMutation(api.builderAppOntology.generateBuilderAppDeployUrl);

  // Pre-fill repo name from builderAppId
  const builderApp = useQuery(
    api.builderAppOntology.getBuilderApp,
    effectiveSessionId && builderAppId
      ? { sessionId: effectiveSessionId, appId: builderAppId }
      : "skip"
  );

  // Set default repo name when app loads
  if (builderApp && !repoName) {
    const appCode = (builderApp.customProperties as { appCode?: string })?.appCode || "";
    const defaultName = builderApp.name
      ? builderApp.name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-")
      : `v0-app-${appCode.toLowerCase()}`;
    setRepoName(defaultName);
  }

  const copyToClipboard = useCallback(async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const handleCreateRepo = useCallback(async () => {
    if (!effectiveSessionId || !organizationId || !builderAppId || !repoName) return;

    setIsCreatingRepo(true);
    setError(null);

    try {
      const result = await createRepo({
        sessionId: effectiveSessionId,
        organizationId,
        appId: builderAppId,
        repoName: repoName.trim(),
        description: builderApp?.description || `Built with l4yercak3 Builder`,
        isPrivate,
      });

      setRepoResult({
        repoUrl: result.repoUrl,
        cloneUrl: result.cloneUrl,
        fileCount: result.fileCount,
      });
      setStep("deploy");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create repository");
    } finally {
      setIsCreatingRepo(false);
    }
  }, [effectiveSessionId, organizationId, builderAppId, repoName, isPrivate, createRepo, builderApp]);

  const handleGenerateDeployUrl = useCallback(async () => {
    if (!effectiveSessionId || !builderAppId || !repoResult) return;

    setIsGeneratingDeploy(true);
    setError(null);

    try {
      const result = await generateDeployUrl({
        sessionId: effectiveSessionId,
        appId: builderAppId,
        githubRepo: repoResult.repoUrl,
      });

      setDeployUrl(result.vercelDeployUrl);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate deploy URL");
    } finally {
      setIsGeneratingDeploy(false);
    }
  }, [effectiveSessionId, builderAppId, repoResult, generateDeployUrl]);

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
          <Plug className="h-8 w-8 mx-auto mb-3 text-zinc-600" />
          <p className="text-zinc-300 font-medium">Connect your app first</p>
          <p className="text-xs text-zinc-500 mt-1">
            Switch to Connect mode and select API capabilities before publishing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Publish</h2>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-zinc-800 text-zinc-400">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs">
        <StepBadge label="1. GitHub" active={step === "precheck" || step === "github"} done={step === "deploy" || step === "done"} />
        <ChevronRight className="h-3 w-3 text-zinc-600" />
        <StepBadge label="2. Deploy" active={step === "deploy"} done={step === "done"} />
        <ChevronRight className="h-3 w-3 text-zinc-600" />
        <StepBadge label="3. Live" active={step === "done"} done={false} />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-950/50 border border-red-800 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Step 1: Pre-check + GitHub push */}
      {(step === "precheck" || step === "github") && (
        <div className="space-y-4">
          {/* GitHub connection status */}
          <div className={`border rounded-lg p-3 ${
            githubConnection?.connected
              ? "border-emerald-800 bg-emerald-950/30"
              : "border-amber-800 bg-amber-950/30"
          }`}>
            <div className="flex items-center gap-2">
              <Github className={`h-4 w-4 ${githubConnection?.connected ? "text-emerald-400" : "text-amber-400"}`} />
              {githubConnection?.connected ? (
                <span className="text-sm text-emerald-300">
                  Connected as {githubConnection.username}
                </span>
              ) : (
                <span className="text-sm text-amber-300">
                  GitHub not connected
                </span>
              )}
            </div>
            {!githubConnection?.connected && (
              <p className="text-xs text-amber-400/70 mt-1 ml-6">
                Connect GitHub in your organization&apos;s Integrations settings.
              </p>
            )}
          </div>

          {/* Repo creation form */}
          {githubConnection?.connected && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Repository Name
                </label>
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value.replace(/[^a-zA-Z0-9-_.]/g, "-"))}
                  placeholder="my-v0-app"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPrivate(true)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    isPrivate
                      ? "border-purple-700 bg-purple-950/30 text-purple-300"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  Private
                </button>
                <button
                  onClick={() => setIsPrivate(false)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    !isPrivate
                      ? "border-purple-700 bg-purple-950/30 text-purple-300"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  Public
                </button>
              </div>

              <button
                onClick={handleCreateRepo}
                disabled={!repoName.trim() || isCreatingRepo}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium border border-zinc-700"
              >
                {isCreatingRepo ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating repository...
                  </>
                ) : (
                  <>
                    <Github className="h-4 w-4" />
                    Push to GitHub
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Deploy */}
      {step === "deploy" && repoResult && (
        <div className="space-y-4">
          {/* Repo created success */}
          <div className="bg-emerald-950/50 border border-emerald-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-emerald-200 font-medium">Repository created</span>
            </div>
            <div className="mt-2 ml-6 space-y-1">
              <a
                href={repoResult.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300"
              >
                <ExternalLink className="h-3 w-3" />
                {repoResult.repoUrl}
              </a>
              <p className="text-xs text-zinc-500">{repoResult.fileCount} files committed</p>
            </div>
          </div>

          {/* Clone URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Clone URL</label>
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 flex items-center justify-between gap-2">
              <code className="text-xs text-zinc-300 font-mono truncate">{repoResult.cloneUrl}</code>
              <button
                onClick={() => copyToClipboard(repoResult.cloneUrl, "clone")}
                className="p-1 rounded hover:bg-zinc-700 text-zinc-400 flex-shrink-0"
              >
                {copiedField === "clone" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Deploy to Vercel */}
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
        </div>
      )}

      {/* Step 3: Done */}
      {step === "done" && (
        <div className="space-y-4">
          {/* Repo info */}
          {repoResult && (
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 flex items-center gap-3">
              <Github className="h-4 w-4 text-zinc-400 flex-shrink-0" />
              <a
                href={repoResult.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-purple-400 hover:text-purple-300 truncate"
              >
                {repoResult.repoUrl.replace("https://github.com/", "")}
              </a>
            </div>
          )}

          {/* Deploy URL */}
          {deployUrl && (
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

          {/* Next steps */}
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3">
            <p className="text-xs font-medium text-zinc-300 mb-2">Next steps:</p>
            <ol className="text-xs text-zinc-500 space-y-1 list-decimal list-inside">
              <li>Click &quot;Open Vercel Deploy&quot; to start deployment</li>
              <li>Add your environment variables during Vercel setup</li>
              <li>Your app will be live on a .vercel.app URL</li>
              <li>Optionally add a custom domain in Vercel settings</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STEP BADGE
// ============================================================================

function StepBadge({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
        done
          ? "bg-emerald-950/50 text-emerald-400 border border-emerald-800"
          : active
            ? "bg-purple-950/50 text-purple-300 border border-purple-800"
            : "bg-zinc-900 text-zinc-600 border border-zinc-800"
      }`}
    >
      {done && <Check className="h-2.5 w-2.5 inline mr-0.5" />}
      {label}
    </span>
  );
}
