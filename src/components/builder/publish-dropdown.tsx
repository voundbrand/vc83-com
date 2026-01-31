"use client";

/**
 * PUBLISH DROPDOWN (v0-style)
 *
 * Dropdown menu for the header "Publish" button.
 * Handles the full inline publish flow via Vercel API:
 * - Not deployed: GitHub push + Vercel project creation + auto-deploy
 * - Deploying: Inline step-by-step progress tracker
 * - Deployed: Live URL, Visit Site, Update
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useBuilder } from "@/contexts/builder-context";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import {
  Check,
  Loader2,
  Github,
  ExternalLink,
  AlertCircle,
  Globe,
  ChevronRight,
  Settings2,
  BarChart3,
  CircleDot,
  Circle,
  XCircle,
  RotateCcw,
  FileText,
  Wrench,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { EnvVarsSection } from "./env-vars-section";
import { MessageSquare } from "lucide-react";

// ── Deploy step definitions ──
type DeployStep =
  | "idle"
  | "pushing_github"
  | "creating_project"
  | "setting_env"
  | "deploying"
  | "ready"
  | "error";

const DEPLOY_STEPS: { key: DeployStep; label: string }[] = [
  { key: "pushing_github", label: "Pushing to GitHub" },
  { key: "creating_project", label: "Creating Vercel project" },
  { key: "setting_env", label: "Setting environment variables" },
  { key: "deploying", label: "Building & deploying" },
  { key: "ready", label: "Going live" },
];

function getStepIndex(step: DeployStep): number {
  return DEPLOY_STEPS.findIndex((s) => s.key === step);
}

export function PublishDropdown({ onSwitchToChat }: { onSwitchToChat?: () => void } = {}) {
  const { sessionId, organizationId, builderAppId, addAssistantMessage, addSystemMessage } = useBuilder();
  const { sessionId: authSessionId } = useAuth();
  const effectiveSessionId = authSessionId || sessionId;

  // State
  const [repoName, setRepoName] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [deployStep, setDeployStep] = useState<DeployStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [vercelProjectId, setVercelProjectId] = useState<string | null>(null);
  const [deployStartTime, setDeployStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Queries
  const builderApp = useQuery(
    // @ts-expect-error - TS2589: Deep type instantiation in Convex generated types
    api.builderAppOntology.getBuilderApp,
    effectiveSessionId && builderAppId
      ? { sessionId: effectiveSessionId, appId: builderAppId }
      : "skip"
  );

  const githubConnection = useQuery(
    api.integrations.github.checkGitHubConnection,
    effectiveSessionId && organizationId
      ? { sessionId: effectiveSessionId, organizationId }
      : "skip"
  );

  const vercelConnection = useQuery(
    api.integrations.vercel.checkVercelConnection,
    effectiveSessionId && organizationId
      ? { sessionId: effectiveSessionId, organizationId }
      : "skip"
  );

  // Actions & mutations
  const createRepo = useAction(api.integrations.github.createRepoFromBuilderApp);
  const deployToVercel = useAction(api.integrations.vercel.deployToVercel);
  const checkDeployStatus = useAction(api.integrations.vercel.checkVercelDeploymentStatus);
  const getBuildLogs = useAction(api.integrations.vercel.getVercelBuildLogs);
  const selfHealDeploy = useAction(api.integrations.selfHealDeploy.selfHealDeploy);
  const startChatHeal = useAction(api.integrations.selfHealChat.startChatHeal);
  const runChatHealAttempt = useAction(api.integrations.selfHealChat.runChatHealAttempt);
  const updateDeployment = useMutation(api.builderAppOntology.updateBuilderAppDeployment);
  const initiateGitHubOAuth = useMutation(api.oauth.github.initiateGitHubOAuth);
  const initiateVercelOAuth = useMutation(api.oauth.vercel.initiateVercelOAuth);

  // Pre-flight: query file count so we can warn before attempting publish
  const builderFiles = useQuery(
    api.fileSystemOntology.getFilesByApp,
    effectiveSessionId && builderAppId
      ? { sessionId: effectiveSessionId, appId: builderAppId }
      : "skip"
  );
  const fileCount = builderFiles?.length ?? 0;

  // OAuth connect state
  const [isConnectingGitHub, setIsConnectingGitHub] = useState(false);
  const [isConnectingVercel, setIsConnectingVercel] = useState(false);

  // Build log state
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [showBuildLogs, setShowBuildLogs] = useState(false);
  const [buildLogs, setBuildLogs] = useState<string | null>(null);
  const [buildLogError, setBuildLogError] = useState<string | null>(null);
  const [suggestedFixes, setSuggestedFixes] = useState<string[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [deploymentIdForLogs, setDeploymentIdForLogs] = useState<string | null>(null);

  // Redeploy state
  const [isRedeploying, setIsRedeploying] = useState(false);

  // Self-heal state
  const [isHealing, setIsHealing] = useState(false);
  const [healResult, setHealResult] = useState<{
    success: boolean;
    strategy: string;
    fixCount: number;
    rootCause: string;
    error?: string;
  } | null>(null);

  // Derive deployment state from builder app
  const deployment = (builderApp?.customProperties as Record<string, unknown>)?.deployment as {
    githubRepo?: string | null;
    vercelDeployUrl?: string | null;
    productionUrl?: string | null;
    status?: string;
    lastDeployedAt?: number | null;
    vercelProjectId?: string | null;
    deploymentError?: string | null;
    healAttempts?: number;
    isHealing?: boolean;
  } | undefined;

  const deployStatus = deployment?.status || "not_deployed";
  const productionUrl = deployment?.productionUrl;
  const isDeployed = deployStatus === "deployed" && productionUrl;

  // Derive env vars from backend query
  const envVarsResult = useQuery(
    api.builderAppOntology.getBuilderAppEnvVars,
    effectiveSessionId && builderAppId
      ? { sessionId: effectiveSessionId, appId: builderAppId }
      : "skip"
  );
  const envVars = envVarsResult?.envVars || [];

  // Pre-fill repo name
  useEffect(() => {
    if (builderApp && !repoName) {
      const appCode = (builderApp.customProperties as { appCode?: string })?.appCode || "";
      const defaultName = builderApp.name
        ? builderApp.name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-")
        : `v0-app-${appCode.toLowerCase()}`;
      setRepoName(defaultName);
    }
  }, [builderApp, repoName]);

  // Resume polling if page reopens mid-deploy
  useEffect(() => {
    if (
      deployStatus === "deploying" &&
      deployment?.vercelProjectId &&
      deployStep === "idle"
    ) {
      setVercelProjectId(deployment.vercelProjectId);
      setDeployStep("deploying");
      setDeployStartTime(Date.now());
    }
  }, [deployStatus, deployment?.vercelProjectId, deployStep]);

  // Elapsed time ticker
  useEffect(() => {
    if (deployStartTime && deployStep !== "idle" && deployStep !== "ready" && deployStep !== "error") {
      elapsedRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - deployStartTime) / 1000));
      }, 1000);
      return () => {
        if (elapsedRef.current) clearInterval(elapsedRef.current);
      };
    }
    return undefined;
  }, [deployStartTime, deployStep]);

  // Polling for deployment status (max 10 minutes = 120 polls at 5s)
  const pollCountRef = useRef(0);
  useEffect(() => {
    if (deployStep !== "deploying" || !vercelProjectId || !effectiveSessionId || !organizationId || !builderAppId) {
      return;
    }

    pollCountRef.current = 0;

    pollingRef.current = setInterval(async () => {
      pollCountRef.current += 1;

      // Timeout after 10 minutes of polling
      if (pollCountRef.current > 120) {
        setDeployStep("error");
        setError("Deployment timed out after 10 minutes. Check Vercel dashboard for status.");
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (elapsedRef.current) clearInterval(elapsedRef.current);
        return;
      }

      try {
        const status = await checkDeployStatus({
          sessionId: effectiveSessionId,
          organizationId,
          appId: builderAppId,
          vercelProjectId,
          pollCount: pollCountRef.current,
        });

        if (status.readyState === "READY") {
          setDeployStep("ready");
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (elapsedRef.current) clearInterval(elapsedRef.current);
        } else if (status.readyState === "ERROR" || status.readyState === "CANCELED") {
          setDeployStep("error");
          setError(status.error || "Deployment failed");
          if (status.deploymentId) {
            setDeploymentIdForLogs(status.deploymentId);
          }
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (elapsedRef.current) clearInterval(elapsedRef.current);
        }
      } catch (err) {
        console.error("[PublishDropdown] Poll error:", err);
      }
    }, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [deployStep, vercelProjectId, effectiveSessionId, organizationId, builderAppId, checkDeployStatus]);

  // ── MAIN PUBLISH HANDLER ──
  const handlePublish = useCallback(async () => {
    if (!effectiveSessionId || !organizationId || !builderAppId || !repoName) return;
    setError(null);
    setDeployStartTime(Date.now());

    // Pre-flight: ensure files exist before calling GitHub
    if (fileCount === 0) {
      setError("No files found for this app. Try sending another message to v0 first to regenerate files.");
      setDeployStep("error");
      return;
    }

    try {
      // Step 1: Push to GitHub
      setDeployStep("pushing_github");
      const repoResult = await createRepo({
        sessionId: effectiveSessionId,
        organizationId,
        appId: builderAppId,
        repoName: repoName.trim(),
        description: builderApp?.description || "Built with l4yercak3 Builder",
        isPrivate,
      });

      // Step 2: Create Vercel project + set env vars
      setDeployStep("creating_project");
      const envPayload = envVars
        .filter((ev) => ev.value)
        .map((ev) => ({
          key: ev.key,
          value: ev.value,
          sensitive: ev.sensitive,
        }));

      const deployResult = await deployToVercel({
        sessionId: effectiveSessionId,
        organizationId,
        appId: builderAppId,
        projectName: repoName.trim(),
        githubRepo: repoResult.repoUrl,
        envVars: envPayload,
      });

      // Step 3: Polling for build
      setVercelProjectId(deployResult.vercelProjectId);
      setDeployStep("deploying");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Deployment failed";
      setError(errorMessage);
      setDeployStep("error");
      // Persist error to deployment record
      try {
        await updateDeployment({
          sessionId: effectiveSessionId,
          appId: builderAppId,
          status: "failed",
          deploymentError: errorMessage,
        });
      } catch { /* best effort */ }
    }
  }, [
    effectiveSessionId, organizationId, builderAppId, repoName,
    isPrivate, builderApp, envVars, fileCount,
    createRepo, deployToVercel, updateDeployment,
  ]);

  // ── RETRY HANDLER ──
  const handleRetry = useCallback(async () => {
    // Stop polling
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (elapsedRef.current) clearInterval(elapsedRef.current);

    // Reset local state
    setDeployStep("idle");
    setError(null);
    setVercelProjectId(null);
    setDeployStartTime(null);
    setElapsed(0);
    setBuildLogs(null);
    setBuildLogError(null);
    setSuggestedFixes([]);
    setShowBuildLogs(false);
    setShowErrorDetails(false);
    setDeploymentIdForLogs(null);
    setHealResult(null);
    setIsHealing(false);

    // Reset DB deployment status so resume doesn't re-trigger
    if (effectiveSessionId && builderAppId) {
      try {
        await updateDeployment({
          sessionId: effectiveSessionId,
          appId: builderAppId,
          status: "not_deployed",
        });
      } catch { /* best effort */ }
    }
  }, [effectiveSessionId, builderAppId, updateDeployment]);

  // ── REDEPLOY HANDLER (re-push to GitHub, Vercel auto-deploys) ──
  const handleRedeploy = useCallback(async () => {
    if (!effectiveSessionId || !organizationId || !builderAppId || !repoName) return;
    setIsRedeploying(true);
    setError(null);

    try {
      // Re-push files to GitHub (updates existing repo, triggers Vercel rebuild)
      await createRepo({
        sessionId: effectiveSessionId,
        organizationId,
        appId: builderAppId,
        repoName: repoName.trim(),
        description: builderApp?.description || "Built with l4yercak3 Builder",
        isPrivate,
      });

      // Update deployment status and start polling
      await updateDeployment({
        sessionId: effectiveSessionId,
        appId: builderAppId,
        status: "deploying",
        deploymentError: undefined,
      });

      setDeployStep("deploying");
      setVercelProjectId(deployment?.vercelProjectId || null);
      setDeployStartTime(Date.now());
      setElapsed(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Redeploy failed");
    } finally {
      setIsRedeploying(false);
    }
  }, [
    effectiveSessionId, organizationId, builderAppId, repoName,
    isPrivate, builderApp, deployment?.vercelProjectId,
    createRepo, updateDeployment,
  ]);

  // ── VIEW BUILD LOGS ──
  const handleViewBuildLogs = useCallback(async () => {
    if (!effectiveSessionId || !organizationId || !deploymentIdForLogs) return;
    setIsLoadingLogs(true);
    setBuildLogError(null);
    setShowBuildLogs(true);

    try {
      const result = await getBuildLogs({
        sessionId: effectiveSessionId,
        organizationId,
        deploymentId: deploymentIdForLogs,
      });
      setBuildLogs(result.logs);
      setSuggestedFixes(result.suggestedFixes);
    } catch (err) {
      setBuildLogError(err instanceof Error ? err.message : "Failed to fetch build logs");
    } finally {
      setIsLoadingLogs(false);
    }
  }, [effectiveSessionId, organizationId, deploymentIdForLogs, getBuildLogs]);

  // ── FIX IN CHAT (Self-Heal via Chat) ──
  const handleFixInChat = useCallback(async () => {
    if (!effectiveSessionId || !organizationId || !builderAppId || !deploymentIdForLogs) return;

    // Fetch logs first if not already loaded
    let logs = buildLogs;
    if (!logs) {
      try {
        const logResult = await getBuildLogs({
          sessionId: effectiveSessionId,
          organizationId,
          deploymentId: deploymentIdForLogs,
        });
        logs = logResult.logs;
        setBuildLogs(logs);
        setSuggestedFixes(logResult.suggestedFixes);
      } catch {
        setError("Failed to fetch build logs for analysis");
        return;
      }
    }

    setIsHealing(true);
    setError(null);

    try {
      // 1. Start the chat heal - get context message
      const { healState: newHealState, contextMessage } = await startChatHeal({
        sessionId: effectiveSessionId,
        organizationId,
        appId: builderAppId,
        buildLogs: logs || "",
        deploymentId: deploymentIdForLogs,
        repoName: repoName.trim(),
        isPrivate,
        errorMessage: error || undefined,
      });

      // 2. Post context message to chat
      addSystemMessage(contextMessage, undefined, {
        type: "heal_start",
        attemptNumber: newHealState.attemptNumber,
        maxAttempts: newHealState.maxAttempts,
      });

      // 3. Run the heal attempt
      const result = await runChatHealAttempt({
        sessionId: effectiveSessionId,
        organizationId,
        appId: builderAppId,
      });

      // 4. Post result messages to chat
      if (result.progressMessages.length > 0) {
        const message = result.progressMessages.join("\n");
        if (result.success) {
          addAssistantMessage(message, {
            healData: {
              type: "heal_progress",
              strategy: result.strategy,
              fixCount: result.fixCount,
              rootCause: result.rootCause,
            },
          });
        } else {
          addSystemMessage(message, {
            type: "api",
            canRetry: result.fixCount === 0 && (deployment?.healAttempts || 0) < 3,
          }, {
            type: "heal_failed",
            strategy: result.strategy,
            rootCause: result.rootCause,
          });
        }
      }

      // 5. If success, resume deploy polling
      if (result.success) {
        setDeployStep("deploying");
        setDeployStartTime(Date.now());
        setElapsed(0);
        setError(null);
        addAssistantMessage("Fixes pushed to GitHub. Vercel is rebuilding - I'll update you when it's done.", {
          healData: { type: "heal_progress" },
        });
      }

      setHealResult({
        success: result.success,
        strategy: result.strategy,
        fixCount: result.fixCount,
        rootCause: result.rootCause,
        error: result.error,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Auto-fix failed";
      setError(errMsg);
      addSystemMessage(`Failed to start auto-fix: ${errMsg}`, {
        type: "api",
        canRetry: true,
      });
    } finally {
      setIsHealing(false);
      // Switch to chat panel so user sees the messages
      onSwitchToChat?.();
    }
  }, [
    effectiveSessionId, organizationId, builderAppId, deploymentIdForLogs,
    buildLogs, repoName, isPrivate, error, deployment?.healAttempts,
    getBuildLogs, startChatHeal, runChatHealAttempt,
    addSystemMessage, addAssistantMessage, onSwitchToChat,
  ]);

  // ── CONNECT GITHUB ──
  const handleConnectGitHub = useCallback(async () => {
    if (!effectiveSessionId) return;
    setIsConnectingGitHub(true);
    setError(null);
    try {
      const result = await initiateGitHubOAuth({
        sessionId: effectiveSessionId,
        connectionType: "organizational",
        returnUrl: window.location.pathname + window.location.search,
      });
      window.open(result.authUrl, "_blank");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect GitHub");
    } finally {
      setIsConnectingGitHub(false);
    }
  }, [effectiveSessionId, initiateGitHubOAuth]);

  // ── CONNECT VERCEL ──
  const handleConnectVercel = useCallback(async () => {
    if (!effectiveSessionId) return;
    setIsConnectingVercel(true);
    setError(null);
    try {
      const result = await initiateVercelOAuth({
        sessionId: effectiveSessionId,
        connectionType: "organizational",
        returnUrl: window.location.pathname + window.location.search,
      });
      window.open(result.authUrl, "_blank");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect Vercel");
    } finally {
      setIsConnectingVercel(false);
    }
  }, [effectiveSessionId, initiateVercelOAuth]);

  // Format elapsed time
  const formatElapsed = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  // ── NO BUILDER APP ──
  if (!builderAppId || !builderApp) {
    return (
      <DropdownContainer>
        <div className="p-4 text-center">
          <p className="text-sm text-zinc-400">Connect your app first</p>
          <p className="text-xs text-zinc-600 mt-1">
            Use the Connect panel to set up API capabilities.
          </p>
        </div>
      </DropdownContainer>
    );
  }

  // ── DEPLOYED STATE ──
  if (isDeployed && deployStep === "idle") {
    return (
      <DropdownContainer>
        <div className="p-3">
          <p className="text-xs font-medium text-zinc-400 mb-2">Published App</p>

          {/* App preview card */}
          <div className="bg-zinc-800 rounded-lg p-3 mb-3 flex items-start gap-3">
            <div className="w-16 h-12 rounded bg-zinc-700 flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-zinc-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-zinc-200 font-medium truncate">
                {productionUrl.replace(/^https?:\/\//, "")}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs text-zinc-400">Ready</span>
              </div>
            </div>
          </div>

          {/* Action links */}
          <div className="space-y-0.5">
            {deployment?.githubRepo && (
              <DropdownLink
                icon={<Github className="w-4 h-4" />}
                label="View on GitHub"
                href={deployment.githubRepo}
              />
            )}
            <DropdownLink
              icon={<Settings2 className="w-4 h-4" />}
              label="Inspect on Vercel"
              href="https://vercel.com/dashboard"
            />
            <DropdownLink
              icon={<BarChart3 className="w-4 h-4" />}
              label="Analytics"
              href={productionUrl}
            />
          </div>

          {/* Env vars toggle for deployed state */}
          {envVars.length > 0 && (
            <EnvVarsSection envVars={envVars} compact />
          )}
        </div>

        {/* Footer buttons */}
        <div className="border-t border-zinc-800 p-3 flex gap-2">
          <a
            href={productionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 text-zinc-200 text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors border border-zinc-700"
          >
            Visit Site
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={handleRedeploy}
            disabled={isRedeploying}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-zinc-100 text-zinc-900 text-sm font-medium rounded-lg hover:bg-white disabled:opacity-50 transition-colors"
          >
            {isRedeploying ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            {isRedeploying ? "Deploying..." : "Redeploy"}
          </button>
        </div>
      </DropdownContainer>
    );
  }

  // ── DEPLOYING / PROGRESS STATE ──
  if (deployStep !== "idle") {
    const currentStepIdx = getStepIndex(deployStep);
    const isError = deployStep === "error";
    const isComplete = deployStep === "ready";

    return (
      <DropdownContainer>
        <div className="p-3">
          <p className="text-xs font-medium text-zinc-400 mb-3">
            {isComplete ? "Published App" : isError ? "Deployment Failed" : "Deploying to Production"}
          </p>

          {/* Step progress */}
          <div className="space-y-1 mb-3">
            {DEPLOY_STEPS.map((step, idx) => {
              const isActive = step.key === deployStep;
              const isDone = isComplete || idx < currentStepIdx;
              const isFailed = isError && isActive;
              const isPending = !isDone && !isActive;

              return (
                <div key={step.key} className="flex items-center gap-2.5 py-1">
                  {/* Step icon */}
                  {isDone ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  ) : isFailed ? (
                    <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  ) : isActive ? (
                    <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin flex-shrink-0" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-zinc-700 flex-shrink-0" />
                  )}
                  {/* Step label */}
                  <span
                    className={`text-xs ${
                      isDone
                        ? "text-emerald-300"
                        : isFailed
                          ? "text-red-300"
                          : isActive
                            ? "text-zinc-200"
                            : "text-zinc-600"
                    }`}
                  >
                    {step.label}
                    {isActive && !isDone && !isFailed && elapsed > 0 && (
                      <span className="text-zinc-500 ml-1.5">({formatElapsed(elapsed)})</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          {!isComplete && !isError && (
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(((currentStepIdx + 1) / DEPLOY_STEPS.length) * 100, 95)}%`,
                }}
              />
            </div>
          )}

          {/* Error message — collapsible accordion */}
          {isError && error && (
            <div className="bg-red-950/50 border border-red-800 rounded-lg mb-3 overflow-hidden">
              <button
                onClick={() => setShowErrorDetails(!showErrorDetails)}
                className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-red-950/30 transition-colors"
              >
                <AlertCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                <span className="text-xs text-red-300 truncate flex-1">
                  {error.length > 80 ? error.substring(0, 80) + "..." : error}
                </span>
                {showErrorDetails ? <ChevronUp className="h-3 w-3 text-red-400 flex-shrink-0" /> : <ChevronDown className="h-3 w-3 text-red-400 flex-shrink-0" />}
              </button>

              {showErrorDetails && (
                <div className="px-2.5 pb-2.5 space-y-2 border-t border-red-800/50 max-h-48 overflow-y-auto">
                  {/* Full error message */}
                  <p className="text-xs text-red-300 whitespace-pre-wrap break-words pt-2">
                    {error}
                  </p>

                  {/* Suggested fixes */}
                  {suggestedFixes.length > 0 && (
                    <div className="border-t border-red-800/50 pt-2">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Wrench className="h-3 w-3 text-amber-400" />
                        <span className="text-[10px] font-medium text-amber-300 uppercase tracking-wider">Suggested Fixes</span>
                      </div>
                      <ul className="space-y-1">
                        {suggestedFixes.map((fix, i) => (
                          <li key={i} className="text-[11px] text-amber-200/80 pl-4 relative">
                            <span className="absolute left-1.5 top-1.5 w-1 h-1 rounded-full bg-amber-500" />
                            {fix}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* View Build Logs toggle */}
                  {deploymentIdForLogs && (
                    <div className="border-t border-red-800/50 pt-2">
                      <button
                        onClick={showBuildLogs ? () => setShowBuildLogs(false) : handleViewBuildLogs}
                        disabled={isLoadingLogs}
                        className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-300 transition-colors"
                      >
                        {isLoadingLogs ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <FileText className="h-3 w-3" />
                        )}
                        {showBuildLogs ? "Hide" : "View"} Build Logs
                        {showBuildLogs ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>

                      {showBuildLogs && buildLogs && (
                        <pre className="mt-2 p-2 bg-black/50 rounded text-[10px] text-zinc-400 font-mono overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
                          {buildLogs}
                        </pre>
                      )}
                      {showBuildLogs && buildLogError && (
                        <p className="mt-1 text-[10px] text-red-400">{buildLogError}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Success: show production URL */}
          {isComplete && productionUrl && (
            <div className="bg-zinc-800 rounded-lg p-3 mb-3 flex items-start gap-3">
              <div className="w-16 h-12 rounded bg-zinc-700 flex items-center justify-center flex-shrink-0">
                <Globe className="w-5 h-5 text-zinc-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-zinc-200 font-medium truncate">
                  {productionUrl.replace(/^https?:\/\//, "")}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs text-zinc-400">Ready</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 p-3">
          {isError && (
            <div className="space-y-2">
              {/* Fix in Chat button */}
              {deploymentIdForLogs && !isHealing && (
                <button
                  onClick={handleFixInChat}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-500 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Fix in Chat
                  {deployment?.healAttempts ? (
                    <span className="text-purple-200 text-xs">
                      ({deployment.healAttempts}/3)
                    </span>
                  ) : null}
                </button>
              )}

              {/* Healing progress */}
              {isHealing && (
                <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-950/50 border border-purple-800 rounded-lg">
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                  <span className="text-sm text-purple-300">
                    Analyzing & fixing build errors...
                  </span>
                </div>
              )}

              {/* Heal result summary */}
              {healResult && !healResult.success && (
                <div className="bg-amber-950/30 border border-amber-800/50 rounded-lg p-2 text-xs text-amber-300">
                  Auto-fix failed. See chat for details.
                </div>
              )}
              {healResult && healResult.success && (
                <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-lg p-2 text-xs text-emerald-300">
                  Applied {healResult.fixCount} fix{healResult.fixCount !== 1 ? "es" : ""} ({healResult.strategy}). Redeploying...
                </div>
              )}

              {/* Manual retry */}
              <button
                onClick={handleRetry}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors border border-zinc-700"
              >
                <RotateCcw className="w-4 h-4" />
                Start Over
              </button>
            </div>
          )}
          {isComplete && productionUrl && (
            <div className="flex gap-2">
              <a
                href={productionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 text-zinc-200 text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors border border-zinc-700"
              >
                Visit Site
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={handleRetry}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-zinc-100 text-zinc-900 text-sm font-medium rounded-lg hover:bg-white transition-colors"
              >
                Done
              </button>
            </div>
          )}
          {!isError && !isComplete && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 text-center">
                This may take a few minutes. You can close this dropdown.
              </p>
              <button
                onClick={handleRetry}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-400 text-xs font-medium rounded-lg hover:bg-zinc-700 hover:text-zinc-300 transition-colors border border-zinc-700"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </DropdownContainer>
    );
  }

  // ── NOT DEPLOYED (idle) ──
  const bothConnected = githubConnection?.connected && vercelConnection?.connected;

  return (
    <DropdownContainer>
      <div className="p-3">
        <p className="text-xs font-medium text-zinc-400 mb-3">Publish to the Web</p>

        {/* Error */}
        {error && (
          <div className="bg-red-950/50 border border-red-800 rounded-lg p-2.5 mb-3 flex items-start gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        {/* Connection checks */}
        {!githubConnection?.connected && (
          <ConnectionWarning
            icon={<Github className="w-4 h-4 text-amber-400" />}
            label="GitHub not connected"
            detail="Connect your GitHub account to push code."
            buttonLabel="Connect GitHub"
            isConnecting={isConnectingGitHub}
            onConnect={handleConnectGitHub}
          />
        )}
        {githubConnection?.connected && !vercelConnection?.connected && (
          <ConnectionWarning
            icon={<CircleDot className="w-4 h-4 text-amber-400" />}
            label="Vercel not connected"
            detail="Connect your Vercel account to deploy."
            buttonLabel="Connect Vercel"
            isConnecting={isConnectingVercel}
            onConnect={handleConnectVercel}
          />
        )}

        {/* Deployment error from previous attempt — collapsible */}
        {deployment?.deploymentError && (
          <div className="bg-red-950/50 border border-red-800 rounded-lg mb-3 overflow-hidden">
            <button
              onClick={() => setShowErrorDetails(!showErrorDetails)}
              className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-red-950/30 transition-colors"
            >
              <AlertCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
              <span className="text-xs text-red-300 font-medium flex-1">Previous deployment failed</span>
              {showErrorDetails ? <ChevronUp className="h-3 w-3 text-red-400 flex-shrink-0" /> : <ChevronDown className="h-3 w-3 text-red-400 flex-shrink-0" />}
            </button>
            {showErrorDetails && (
              <div className="px-2.5 pb-2.5 border-t border-red-800/50">
                <p className="text-xs text-red-400/70 mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap break-words">
                  {deployment.deploymentError}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Repo name input */}
        {bothConnected && (
          <div className="space-y-2.5 mb-3">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Repository Name</label>
              <input
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value.replace(/[^a-zA-Z0-9-_.]/g, "-"))}
                placeholder="my-v0-app"
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsPrivate(true)}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                  isPrivate
                    ? "bg-purple-950/30 border border-purple-700 text-purple-300"
                    : "border border-zinc-700 text-zinc-500 hover:border-zinc-600"
                }`}
              >
                Private
              </button>
              <button
                onClick={() => setIsPrivate(false)}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                  !isPrivate
                    ? "bg-purple-950/30 border border-purple-700 text-purple-300"
                    : "border border-zinc-700 text-zinc-500 hover:border-zinc-600"
                }`}
              >
                Public
              </button>
            </div>
          </div>
        )}

        {/* Environment Variables section */}
        {envVars.length > 0 && (
          <EnvVarsSection
            envVars={envVars}
            footerHint="These will be automatically injected into your Vercel project."
          />
        )}
      </div>

      {/* Footer action */}
      <div className="border-t border-zinc-800 p-3">
        {bothConnected ? (
          <button
            onClick={handlePublish}
            disabled={!repoName.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-100 text-zinc-900 text-sm font-medium rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Publish to Production
          </button>
        ) : (
          <button
            disabled
            className="w-full px-4 py-2.5 bg-zinc-800 text-zinc-500 text-sm font-medium rounded-lg cursor-not-allowed"
          >
            {!githubConnection?.connected
              ? "Connect GitHub to publish"
              : "Connect Vercel to publish"}
          </button>
        )}
      </div>
    </DropdownContainer>
  );
}

// ── Shared wrapper ──
function DropdownContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-80 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
      {children}
    </div>
  );
}

// ── Connection warning with optional connect button ──
function ConnectionWarning({
  icon,
  label,
  detail,
  buttonLabel,
  isConnecting,
  onConnect,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  buttonLabel?: string;
  isConnecting?: boolean;
  onConnect?: () => void;
}) {
  return (
    <div className="bg-amber-950/30 border border-amber-800 rounded-lg p-3 mb-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <div className="min-w-0">
            <span className="text-xs text-amber-300 font-medium">{label}</span>
            <p className="text-xs text-amber-400/70 mt-0.5">{detail}</p>
          </div>
        </div>
        {onConnect && buttonLabel && (
          <button
            onClick={onConnect}
            disabled={isConnecting}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-800/50 text-amber-200 rounded-md text-[11px] font-medium hover:bg-amber-800/70 transition-colors border border-amber-700/50 disabled:opacity-50 flex-shrink-0"
          >
            {isConnecting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <ExternalLink className="w-3 h-3" />
            )}
            {isConnecting ? "Opening..." : buttonLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Link item inside dropdown ──
function DropdownLink({
  icon,
  label,
  href,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const className =
    "w-full flex items-center justify-between px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer";

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        <span className="flex items-center gap-2.5">
          {icon}
          {label}
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
      </a>
    );
  }

  return (
    <button onClick={onClick} className={className}>
      <span className="flex items-center gap-2.5">
        {icon}
        {label}
      </span>
      <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
    </button>
  );
}
