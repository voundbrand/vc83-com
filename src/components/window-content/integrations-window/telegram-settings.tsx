"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
// Dynamic require to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };
import { RetroButton } from "@/components/retro-button";
import { useAuth } from "@/hooks/use-auth";
import { useNotification } from "@/hooks/use-notification";
import { useRetroConfirm } from "@/components/retro-confirm-dialog";
import {
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Copy,
  AlertCircle,
  Send,
  Eye,
  EyeOff,
  Users,
  Link2,
} from "lucide-react";

interface TelegramSettingsProps {
  onBack: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TelegramStatus = any;

export function TelegramSettings({ onBack }: TelegramSettingsProps) {
  const { sessionId } = useAuth();
  const notification = useNotification();
  const confirmDialog = useRetroConfirm();

  // UI state
  const [botToken, setBotToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [telegramLink, setTelegramLink] = useState<string | null>(null);
  const [linkExpiresAt, setLinkExpiresAt] = useState<number | null>(null);

  // Queries & mutations
  const status = useQuery(
    api.integrations.telegram.getTelegramIntegrationStatus,
    sessionId ? { sessionId } : "skip"
  ) as TelegramStatus;

  const deployBot = useAction(api.integrations.telegram.deployCustomBot);
  const disconnectBot = useMutation(api.integrations.telegram.disconnectCustomBot);
  const toggleMirror = useMutation(api.integrations.telegram.toggleTeamGroupMirror);
  const generateLinkToken = useMutation(api.integrations.telegram.generateTelegramLinkToken);

  const isLoading = status === undefined;

  const handleDeploy = async () => {
    if (!sessionId || !botToken.trim()) return;

    setIsDeploying(true);
    try {
      const result = await deployBot({ sessionId, botToken: botToken.trim() });
      if (result.success) {
        notification.success("Bot Deployed", result.message || `@${result.botUsername} is live!`);
        setBotToken("");
      } else {
        notification.error("Deploy Failed", result.error || "Could not deploy bot");
      }
    } catch (error) {
      notification.error(
        "Deploy Failed",
        error instanceof Error ? error.message : "Unexpected error"
      );
    } finally {
      setIsDeploying(false);
    }
  };

  const handleDisconnect = async () => {
    if (!sessionId) return;

    const confirmed = await confirmDialog.confirm({
      title: "Disconnect Custom Bot",
      message:
        "This will remove your custom bot deployment. Customers will be served by the platform bot instead. Continue?",
      confirmText: "Disconnect",
      cancelText: "Cancel",
      confirmVariant: "primary",
    });

    if (!confirmed) return;

    setIsDisconnecting(true);
    try {
      await disconnectBot({ sessionId });
      notification.success("Disconnected", "Custom bot has been removed");
    } catch (error) {
      notification.error(
        "Error",
        error instanceof Error ? error.message : "Disconnect failed"
      );
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleToggleMirror = async (enabled: boolean) => {
    if (!sessionId) return;
    try {
      await toggleMirror({ sessionId, enabled });
      notification.success(
        enabled ? "Mirror Enabled" : "Mirror Disabled",
        enabled
          ? "Conversations will be forwarded to your team group"
          : "Team group mirroring paused"
      );
    } catch (error) {
      notification.error(
        "Error",
        error instanceof Error ? error.message : "Toggle failed"
      );
    }
  };

  const handleGenerateLink = async () => {
    if (!sessionId) return;

    setIsGeneratingLink(true);
    try {
      const result = await generateLinkToken({ sessionId });
      if (result.success) {
        setTelegramLink(result.telegramLink);
        setLinkExpiresAt(Date.now() + (result.expiresInMinutes ?? 15) * 60 * 1000);
        notification.success("Link Generated", "Click or share the link to connect Telegram");
      } else {
        notification.error("Error", result.error || "Could not generate link");
      }
    } catch (error) {
      notification.error(
        "Error",
        error instanceof Error ? error.message : "Could not generate link"
      );
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const isLinkExpired = linkExpiresAt ? Date.now() > linkExpiresAt : false;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    notification.success("Copied", "Copied to clipboard");
  };

  const formatDate = (timestamp?: number | null) => {
    if (!timestamp) return "Unknown";
    return new Date(timestamp).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <>
      <confirmDialog.Dialog />
      <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
        {/* Header */}
        <div
          className="px-4 py-3 border-b-2 flex items-center gap-3"
          style={{ borderColor: "var(--win95-border)" }}
        >
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm hover:underline"
            style={{ color: "var(--win95-highlight)" }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="flex items-center gap-2">
            <Send size={24} style={{ color: "#0088cc" }} />
            <div>
              <h2 className="font-bold text-sm" style={{ color: "var(--win95-text)" }}>
                Telegram
              </h2>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Bot messaging &amp; team group chat
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div
              className="p-6 border-2 rounded flex flex-col items-center justify-center gap-2"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg-light)",
              }}
            >
              <Loader2
                size={24}
                className="animate-spin"
                style={{ color: "var(--win95-text)" }}
              />
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Loading...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* ============ SECTION 1: Connection Status ============ */}
              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg-light)",
                }}
              >
                <p
                  className="text-xs font-bold mb-3 uppercase tracking-wide"
                  style={{ color: "var(--win95-text)" }}
                >
                  Connection Status
                </p>

                {status?.platformBot?.status === "active" ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                      <span className="text-xs font-bold" style={{ color: "#10b981" }}>
                        Connected via Platform Bot
                      </span>
                    </div>
                    {status.platformBot.chatId && (
                      <div>
                        <p className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                          Chat ID
                        </p>
                        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                          {status.platformBot.chatId}
                        </p>
                      </div>
                    )}
                    {status.platformBot.senderName && (
                      <div>
                        <p className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                          Sender
                        </p>
                        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                          {status.platformBot.senderName}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                        Connected
                      </p>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {formatDate(status.platformBot.connectedAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                        Active Chats
                      </p>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {status.activeChatCount ?? 0}
                      </p>
                    </div>
                  </div>
                ) : status?.platformBot?.status === "onboarding" ? (
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
                    <div>
                      <p className="text-xs font-bold" style={{ color: "#f59e0b" }}>
                        Onboarding in Progress
                      </p>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        Complete the setup interview to activate your Telegram connection.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div
                      className="p-3 border rounded text-xs"
                      style={{
                        borderColor: "var(--win95-border)",
                        background: "var(--win95-bg)",
                        color: "var(--neutral-gray)",
                      }}
                    >
                      <p>
                        Connect your Telegram to this organization. Generate a one-time link below,
                        then open it in Telegram to link your account.
                      </p>
                    </div>

                    {telegramLink && !isLinkExpired ? (
                      <div className="space-y-2">
                        <p className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                          Your Connect Link
                        </p>
                        <div className="flex items-center gap-2">
                          <a
                            href={telegramLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 p-2 border rounded font-mono text-xs break-all underline"
                            style={{
                              borderColor: "var(--win95-border)",
                              background: "var(--win95-bg)",
                              color: "var(--win95-highlight)",
                            }}
                          >
                            {telegramLink}
                          </a>
                          <button
                            onClick={() => copyToClipboard(telegramLink)}
                            title="Copy link"
                          >
                            <Copy size={14} style={{ color: "var(--neutral-gray)" }} />
                          </button>
                        </div>
                        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                          This link expires in 15 minutes and can only be used once.
                        </p>
                      </div>
                    ) : (
                      <RetroButton
                        onClick={handleGenerateLink}
                        disabled={isGeneratingLink}
                        className="w-full"
                      >
                        {isGeneratingLink ? (
                          <>
                            <Loader2 size={14} className="mr-1 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Link2 size={14} className="mr-1" />
                            {isLinkExpired ? "Generate New Link" : "Connect Telegram"}
                          </>
                        )}
                      </RetroButton>
                    )}
                  </div>
                )}
              </div>

              {/* ============ SECTION 2: Custom Bot Deployment ============ */}
              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg-light)",
                }}
              >
                <p
                  className="text-xs font-bold mb-3 uppercase tracking-wide"
                  style={{ color: "var(--win95-text)" }}
                >
                  Custom Bot
                </p>

                {status?.customBot?.deployed ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={14} style={{ color: "#10b981" }} />
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded"
                        style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}
                      >
                        Deployed
                      </span>
                    </div>

                    {status.customBot.botUsername && (
                      <div>
                        <p className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                          Bot Username
                        </p>
                        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                          @{status.customBot.botUsername}
                        </p>
                      </div>
                    )}

                    {status.customBot.webhookUrl && (
                      <div>
                        <p className="text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                          Webhook URL
                        </p>
                        <div className="flex items-center gap-2">
                          <div
                            className="flex-1 p-2 border rounded font-mono text-xs break-all"
                            style={{
                              borderColor: "var(--win95-border)",
                              background: "var(--win95-bg)",
                              color: "var(--win95-text)",
                            }}
                          >
                            {status.customBot.webhookUrl}
                          </div>
                          <button
                            onClick={() => copyToClipboard(status.customBot.webhookUrl)}
                            title="Copy"
                          >
                            <Copy size={14} style={{ color: "var(--neutral-gray)" }} />
                          </button>
                        </div>
                      </div>
                    )}

                    <RetroButton
                      variant="secondary"
                      onClick={handleDisconnect}
                      disabled={isDisconnecting}
                      className="w-full"
                    >
                      {isDisconnecting ? (
                        <>
                          <Loader2 size={14} className="mr-1 animate-spin" />
                          Disconnecting...
                        </>
                      ) : (
                        "Disconnect Custom Bot"
                      )}
                    </RetroButton>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Benefits */}
                    <div
                      className="space-y-1 text-xs"
                      style={{ color: "var(--neutral-gray)" }}
                    >
                      <div className="flex items-start gap-2">
                        <span>&#10003;</span>
                        <span>Your own branded bot username</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span>&#10003;</span>
                        <span>Custom webhook — full control over routing</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span>&#10003;</span>
                        <span>Deep links redirect to your bot, not the platform bot</span>
                      </div>
                    </div>

                    {/* Token input */}
                    <div>
                      <p className="text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                        Bot Token
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type={showToken ? "text" : "password"}
                            value={botToken}
                            onChange={(e) => setBotToken(e.target.value)}
                            placeholder="Paste token from @BotFather"
                            className="w-full p-2 pr-8 border-2 rounded text-xs font-mono"
                            style={{
                              borderColor: "var(--win95-border)",
                              background: "var(--win95-bg)",
                              color: "var(--win95-text)",
                            }}
                          />
                          <button
                            onClick={() => setShowToken(!showToken)}
                            className="absolute right-2 top-1/2 -translate-y-1/2"
                            title={showToken ? "Hide" : "Show"}
                          >
                            {showToken ? (
                              <EyeOff size={14} style={{ color: "var(--neutral-gray)" }} />
                            ) : (
                              <Eye size={14} style={{ color: "var(--neutral-gray)" }} />
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                        Get a token from{" "}
                        <a
                          href="https://t.me/BotFather"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                          style={{ color: "var(--win95-highlight)" }}
                        >
                          @BotFather
                        </a>{" "}
                        on Telegram. Use /newbot to create one.
                      </p>
                    </div>

                    <RetroButton
                      onClick={handleDeploy}
                      disabled={isDeploying || !botToken.trim()}
                      className="w-full"
                    >
                      {isDeploying ? (
                        <>
                          <Loader2 size={14} className="mr-1 animate-spin" />
                          Deploying...
                        </>
                      ) : (
                        "Deploy Bot"
                      )}
                    </RetroButton>
                  </div>
                )}
              </div>

              {/* ============ SECTION 3: Team Group Chat ============ */}
              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg-light)",
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Users size={14} style={{ color: "var(--win95-text)" }} />
                  <p
                    className="text-xs font-bold uppercase tracking-wide"
                    style={{ color: "var(--win95-text)" }}
                  >
                    Team Group Chat
                  </p>
                </div>

                {status?.teamGroup?.linked ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={14} style={{ color: "#10b981" }} />
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded"
                        style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}
                      >
                        Group Linked
                      </span>
                    </div>

                    {status.teamGroup.groupChatId && (
                      <div>
                        <p className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                          Group Chat ID
                        </p>
                        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                          {status.teamGroup.groupChatId}
                        </p>
                      </div>
                    )}

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={status.teamGroup.mirrorEnabled}
                        onChange={(e) => handleToggleMirror(e.target.checked)}
                        className="accent-[#10b981]"
                      />
                      <span className="text-xs" style={{ color: "var(--win95-text)" }}>
                        Mirror conversations to team group
                      </span>
                    </label>
                  </div>
                ) : (
                  <div
                    className="space-y-2 text-xs"
                    style={{ color: "var(--neutral-gray)" }}
                  >
                    <p>To link a team group:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Create a Telegram group for your team</li>
                      <li>Add your bot to the group</li>
                      <li>The group will be auto-detected and linked</li>
                    </ol>
                    <p className="mt-2" style={{ color: "var(--win95-text)" }}>
                      The bot must be added by the same Telegram user who completed onboarding.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
