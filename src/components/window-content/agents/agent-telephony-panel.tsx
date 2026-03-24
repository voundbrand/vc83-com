"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { ArrowRight, Loader2, PhoneCall, RefreshCw, Save, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  parseManagedToolsJson,
  stringifyManagedToolsJson,
  TELEPHONY_PROVIDER_OPTIONS,
  type AgentTelephonyProviderKey,
  type AgentTelephonyTransferDestination,
} from "@/lib/telephony/agent-telephony";
import { formatAgentChannelLabel } from "./types";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };

interface AgentTelephonyPanelProps {
  agentId: Id<"objects">;
  sessionId: string;
  organizationId: Id<"organizations">;
  onOpenChannels?: () => void;
}

function formatTimestamp(value: number | undefined): string {
  if (!value) {
    return "Never";
  }
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "Never";
  }
}

function createEmptyTransferDestination(): AgentTelephonyTransferDestination {
  return {
    label: "",
    phoneNumber: "",
    condition: "",
    enabled: true,
    transferType: "conference",
  };
}

export function AgentTelephonyPanel({
  agentId,
  sessionId,
  organizationId,
  onOpenChannels,
}: AgentTelephonyPanelProps) {
  const panelState = useQuery(
    api.integrations.telephony.getAgentTelephonyPanelState,
    { sessionId, organizationId, agentId },
  ) as
    | {
        providerOptions: typeof TELEPHONY_PROVIDER_OPTIONS;
        phoneChannelEnabled: boolean;
        telephonyConfig: {
          selectedProvider: AgentTelephonyProviderKey;
          elevenlabs: {
            remoteAgentId?: string;
            systemPrompt: string;
            firstMessage: string;
            knowledgeBase: string;
            knowledgeBaseName: string;
            transferDestinations: AgentTelephonyTransferDestination[];
            managedTools: Record<string, unknown>;
            syncState?: {
              status?: "idle" | "success" | "error";
              lastSyncedAt?: number;
              lastSyncError?: string;
              lastSyncedProviderAgentId?: string;
              drift?: string[];
            };
          };
        };
        organizationBinding: {
          providerKey: AgentTelephonyProviderKey;
          enabled: boolean;
          routeKey?: string | null;
          providerConnectionId?: string | null;
          providerInstallationId?: string | null;
          providerProfileId?: string | null;
          baseUrl?: string | null;
          fromNumber?: string | null;
          hasWebhookSecret?: boolean;
          providerIdentity?: string | null;
          twilioIncomingNumberSid?: string | null;
          twilioWebhookAppliedAt?: number | null;
        };
        providerReadiness: {
          elevenlabs: {
            enabled: boolean;
            hasEffectiveApiKey: boolean;
            baseUrl?: string | null;
            healthStatus?: string;
            healthReason?: string | null;
          };
          twilio: {
            enabled: boolean;
            hasEffectiveCredentials: boolean;
            runtimeSource?: "platform" | "org" | null;
            accountSidLast4?: string | null;
          };
        };
        templateDeployment: {
          kind: "template" | "managed_clone" | "org_local_agent";
          templateId?: string | null;
          templateName?: string | null;
          templateRole?: string | null;
          templateVersionId?: string | null;
          templateVersionTag?: string | null;
          certification: {
            status: "certified" | "auto_certifiable" | "blocked" | "not_required";
            reasonCode?: string | null;
            message?: string | null;
            riskTier?: "low" | "medium" | "high" | null;
            requiredVerification: string[];
            dependencyDigest?: string | null;
            recordedAt?: number | null;
            autoCertificationEligible: boolean;
            evidenceSources: string[];
          };
          orgPreflight: {
            status: "pass" | "fail";
            blockers: string[];
            blockerCodes: string[];
            telephony: {
              required: boolean;
              providerKey: AgentTelephonyProviderKey;
              bindingEnabled: boolean;
              credentialReady: boolean;
              fromNumberReady: boolean;
              webhookSecretReady: boolean;
              missingTransferRoles: string[];
            };
          };
          deploymentReadiness: {
            status: "ready" | "blocked";
            blockers: string[];
            warnings: string[];
          };
        };
      }
    | undefined;

  const saveOrganizationTelephonySettings = useMutation(
    api.integrations.telephony.saveOrganizationTelephonySettings,
  );
  const saveAgentTelephonyConfig = useMutation(
    api.integrations.telephony.saveAgentTelephonyConfig,
  );
  const syncAgentTelephonyProvider = useAction(
    api.integrations.telephony.syncAgentTelephonyProvider,
  );

  const [selectedProvider, setSelectedProvider] = useState<AgentTelephonyProviderKey>("elevenlabs");
  const [orgEnabled, setOrgEnabled] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [fromNumber, setFromNumber] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [remoteAgentId, setRemoteAgentId] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [knowledgeBaseName, setKnowledgeBaseName] = useState("");
  const [knowledgeBase, setKnowledgeBase] = useState("");
  const [transferDestinations, setTransferDestinations] = useState<
    AgentTelephonyTransferDestination[]
  >([]);
  const [managedToolsJson, setManagedToolsJson] = useState("{}");
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!panelState) {
      return;
    }
    setSelectedProvider(panelState.telephonyConfig.selectedProvider);
    setOrgEnabled(panelState.organizationBinding.enabled);
    setBaseUrl(panelState.organizationBinding.baseUrl || "");
    setFromNumber(panelState.organizationBinding.fromNumber || "");
    setWebhookSecret("");
    setRemoteAgentId(panelState.telephonyConfig.elevenlabs.remoteAgentId || "");
    setSystemPrompt(panelState.telephonyConfig.elevenlabs.systemPrompt || "");
    setFirstMessage(panelState.telephonyConfig.elevenlabs.firstMessage || "");
    setKnowledgeBaseName(panelState.telephonyConfig.elevenlabs.knowledgeBaseName || "");
    setKnowledgeBase(panelState.telephonyConfig.elevenlabs.knowledgeBase || "");
    setTransferDestinations(
      panelState.telephonyConfig.elevenlabs.transferDestinations || [],
    );
    setManagedToolsJson(
      stringifyManagedToolsJson(panelState.telephonyConfig.elevenlabs.managedTools || {}),
    );
  }, [panelState]);

  const selectedProviderOption = useMemo(
    () =>
      (panelState?.providerOptions || TELEPHONY_PROVIDER_OPTIONS).find(
        (option) => option.key === selectedProvider,
      ) || TELEPHONY_PROVIDER_OPTIONS[0],
    [panelState?.providerOptions, selectedProvider],
  );

  const syncState = panelState?.telephonyConfig.elevenlabs.syncState;
  const elevenlabsReadiness = panelState?.providerReadiness.elevenlabs;
  const twilioReadiness = panelState?.providerReadiness.twilio;
  const phoneChannelLabel = formatAgentChannelLabel("phone_call");
  const certification = panelState?.templateDeployment.certification;
  const orgPreflight = panelState?.templateDeployment.orgPreflight;
  const deploymentReadiness = panelState?.templateDeployment.deploymentReadiness;
  const syncDisabledReason =
    !selectedProviderOption.implemented
      ? `${selectedProviderOption.label} is not implemented yet.`
      : deploymentReadiness?.status === "blocked"
        ? deploymentReadiness.blockers[0] || "Certification or org preflight blocks deployment."
        : null;

  const updateTransferDestination = (
    index: number,
    patch: Partial<AgentTelephonyTransferDestination>,
  ) => {
    setTransferDestinations((current) =>
      current.map((destination, currentIndex) =>
        currentIndex === index ? { ...destination, ...patch } : destination,
      ),
    );
  };

  const addTransferDestination = () => {
    setTransferDestinations((current) => [
      ...current,
      createEmptyTransferDestination(),
    ]);
  };

  const removeTransferDestination = (index: number) => {
    setTransferDestinations((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const persistState = async () => {
    const managedTools = parseManagedToolsJson(managedToolsJson);
    await saveOrganizationTelephonySettings({
      sessionId,
      organizationId,
      providerKey: selectedProvider,
      enabled: orgEnabled,
      baseUrl: baseUrl.trim() || undefined,
      fromNumber: fromNumber.trim() || undefined,
      webhookSecret: webhookSecret.trim() || undefined,
    });
    await saveAgentTelephonyConfig({
      sessionId,
      organizationId,
      agentId,
      telephonyConfig: {
        selectedProvider,
        elevenlabs: {
          remoteAgentId: remoteAgentId.trim() || undefined,
          systemPrompt,
          firstMessage,
          knowledgeBaseName,
          knowledgeBase,
          transferDestinations,
          managedTools,
          syncState,
        },
      },
    });
    setWebhookSecret("");
  };

  const handleSave = async () => {
    setMessage(null);
    setIsSaving(true);
    try {
      await persistState();
      setMessage({
        tone: "success",
        text: "Telephony settings saved.",
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Unable to save telephony settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSync = async () => {
    setMessage(null);
    setIsSyncing(true);
    try {
      await persistState();
      const result = (await syncAgentTelephonyProvider({
        sessionId,
        organizationId,
        agentId,
      })) as {
        success: boolean;
        status: string;
        message?: string;
        drift?: string[];
      };
      if (!result.success) {
        throw new Error(result.message || "Sync failed.");
      }
      setMessage({
        tone: "success",
        text:
          result.status === "noop"
            ? "Provider already in sync."
            : result.status === "validated"
              ? result.message || "Twilio Voice binding validated."
            : result.status === "provisioned"
              ? "Provisioned and synced to ElevenLabs."
              : `Synced to ElevenLabs${result.drift?.length ? ` (${result.drift.join(", ")})` : ""}.`,
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Unable to sync provider.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (!panelState) {
    return (
      <div className="p-4 text-xs" style={{ color: "var(--window-document-text)" }}>
        Loading telephony configuration...
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <section
        className="border rounded p-3 space-y-2"
        style={{ borderColor: "var(--window-document-border)" }}
      >
        <div className="flex items-center gap-2">
          <PhoneCall size={14} />
          <h3 className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
            Status
          </h3>
        </div>
        <div className="grid gap-2 md:grid-cols-3 text-xs">
          <div
            className="rounded border p-2"
            style={{ borderColor: "var(--window-document-border)" }}
          >
            <div style={{ color: "var(--neutral-gray)" }}>Certification + preflight</div>
            <div style={{ color: certification?.status === "blocked" ? "var(--error)" : "var(--window-document-text)" }}>
              Certification: {certification?.status?.replace(/_/g, " ") || "n/a"}
            </div>
            <div style={{ color: "var(--neutral-gray)" }}>
              Risk: {certification?.riskTier || "n/a"} / verification {certification?.requiredVerification.join(", ") || "none"}
            </div>
            <div style={{ color: orgPreflight?.status === "fail" ? "var(--error)" : "var(--window-document-text)" }}>
              Org preflight: {orgPreflight?.status || "n/a"}
            </div>
            {certification?.dependencyDigest ? (
              <div className="break-all" style={{ color: "var(--neutral-gray)" }}>
                Digest: {certification.dependencyDigest}
              </div>
            ) : null}
          </div>
          <div
            className="rounded border p-2"
            style={{ borderColor: "var(--window-document-border)" }}
          >
            <div style={{ color: "var(--neutral-gray)" }}>Provider readiness</div>
            {selectedProvider === "twilio_voice" ? (
              <>
                <div style={{ color: "var(--window-document-text)" }}>
                  Twilio: {twilioReadiness?.enabled ? "enabled" : "not enabled"} /{" "}
                  {twilioReadiness?.hasEffectiveCredentials ? "credential ready" : "missing credential"}
                </div>
                <div style={{ color: "var(--neutral-gray)" }}>
                  Runtime: {twilioReadiness?.runtimeSource || "none"}
                  {twilioReadiness?.accountSidLast4 ? ` (${twilioReadiness.accountSidLast4})` : ""}
                </div>
              </>
            ) : (
              <>
                <div style={{ color: "var(--window-document-text)" }}>
                  ElevenLabs: {elevenlabsReadiness?.enabled ? "enabled" : "not enabled"} /{" "}
                  {elevenlabsReadiness?.hasEffectiveApiKey ? "credential ready" : "missing credential"}
                </div>
                {elevenlabsReadiness?.healthStatus && (
                  <div style={{ color: "var(--neutral-gray)" }}>
                    Health: {elevenlabsReadiness.healthStatus}
                    {elevenlabsReadiness.healthReason ? ` (${elevenlabsReadiness.healthReason})` : ""}
                  </div>
                )}
              </>
            )}
          </div>
          <div
            className="rounded border p-2"
            style={{ borderColor: "var(--window-document-border)" }}
          >
            <div style={{ color: "var(--neutral-gray)" }}>Binding + sync</div>
            <div style={{ color: "var(--window-document-text)" }}>
              Org phone binding: {panelState.organizationBinding.enabled ? "enabled" : "disabled"}
            </div>
            <div style={{ color: "var(--window-document-text)" }}>
              Agent phone channel: {panelState.phoneChannelEnabled ? "enabled" : "disabled"}
            </div>
            {selectedProvider === "twilio_voice" && (
              <>
                <div style={{ color: "var(--neutral-gray)" }}>
                  Twilio number SID: {panelState.organizationBinding.twilioIncomingNumberSid || "Not applied"}
                </div>
                <div style={{ color: "var(--neutral-gray)" }}>
                  Last webhook apply: {formatTimestamp(panelState.organizationBinding.twilioWebhookAppliedAt || undefined)}
                </div>
              </>
            )}
            <div style={{ color: "var(--neutral-gray)" }}>
              Last sync: {formatTimestamp(syncState?.lastSyncedAt)}
            </div>
            {syncState?.lastSyncError && (
              <div style={{ color: "var(--error)" }}>Last error: {syncState.lastSyncError}</div>
            )}
          </div>
        </div>
        {(deploymentReadiness?.blockers.length || deploymentReadiness?.warnings.length) ? (
          <div
            className="rounded border p-2 text-xs space-y-1"
            style={{
              borderColor: deploymentReadiness.blockers.length ? "var(--error)" : "var(--warning)",
              background: "color-mix(in srgb, var(--window-document-bg) 88%, transparent)",
            }}
          >
            {deploymentReadiness.blockers.length > 0 && (
              <div style={{ color: "var(--error)" }}>
                Blockers: {deploymentReadiness.blockers.join(" • ")}
              </div>
            )}
            {deploymentReadiness.warnings.length > 0 && (
              <div style={{ color: "var(--warning)" }}>
                Warnings: {deploymentReadiness.warnings.join(" • ")}
              </div>
            )}
          </div>
        ) : null}
        {!panelState.phoneChannelEnabled && (
          <div
            className="rounded border p-2 flex flex-wrap items-center justify-between gap-3 text-xs"
            style={{
              color: "var(--warning)",
              borderColor: "color-mix(in srgb, var(--warning) 40%, var(--window-document-border))",
              background: "color-mix(in srgb, var(--warning) 8%, transparent)",
            }}
          >
            <div className="flex items-center gap-2">
              <ShieldAlert size={12} />
              <span>
                Enable the {phoneChannelLabel} channel in Channels before production use.
              </span>
            </div>
            {onOpenChannels ? (
              <button
                type="button"
                onClick={onOpenChannels}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border transition-colors"
                style={{
                  borderColor: "var(--window-document-border)",
                  color: "var(--window-document-text)",
                  background: "var(--desktop-shell-accent)",
                }}
              >
                Open Channels
                <ArrowRight size={12} />
              </button>
            ) : null}
          </div>
        )}
      </section>

      <section
        className="border rounded p-3 space-y-3"
        style={{ borderColor: "var(--window-document-border)" }}
      >
        <h3 className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
          Provider
        </h3>
        <div className="grid gap-2 md:grid-cols-3">
          {(panelState.providerOptions || TELEPHONY_PROVIDER_OPTIONS).map((option) => (
            <button
              key={option.key}
              type="button"
              disabled={!option.implemented}
              onClick={() => setSelectedProvider(option.key)}
              className="rounded border p-3 text-left disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                borderColor:
                  option.key === selectedProvider
                    ? "var(--tone-accent)"
                    : "var(--window-document-border)",
                background:
                  option.key === selectedProvider
                    ? "var(--desktop-shell-accent)"
                    : "var(--window-document-bg)",
              }}
            >
              <div className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
                {option.label}
              </div>
              <div className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>
                {option.description}
              </div>
            </button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
            <span className="block mb-1">Org phone binding enabled</span>
            <input
              type="checkbox"
              checked={orgEnabled}
              onChange={(event) => setOrgEnabled(event.target.checked)}
            />
          </label>
          <label className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
            <span className="block mb-1">
              {selectedProvider === "twilio_voice"
                ? "Twilio org binding number"
                : "Existing provider agent ID (optional)"}
            </span>
            {selectedProvider === "twilio_voice" ? (
              <>
                <input
                  value={fromNumber}
                  onChange={(event) => setFromNumber(event.target.value)}
                  className="w-full border px-2 py-1 text-xs"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                  placeholder="+49..."
                />
                <span className="mt-1 block text-[11px]" style={{ color: "var(--neutral-gray)" }}>
                  Save the Twilio number here, then apply/validate inbound webhooks from the org integrations surface.
                </span>
              </>
            ) : (
              <>
                <input
                  value={remoteAgentId}
                  onChange={(event) => setRemoteAgentId(event.target.value)}
                  className="w-full border px-2 py-1 text-xs"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                  placeholder="agent_..."
                />
                <span className="mt-1 block text-[11px]" style={{ color: "var(--neutral-gray)" }}>
                  Leave blank to let the backend provision a new ElevenLabs agent on first sync.
                </span>
              </>
            )}
          </label>
          {selectedProvider !== "twilio_voice" ? (
            <>
              <label className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
                <span className="block mb-1">Telephony base URL</span>
                <input
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  className="w-full border px-2 py-1 text-xs"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                  placeholder={elevenlabsReadiness?.baseUrl || "https://api.elevenlabs.io/v1"}
                />
              </label>
              <label className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
                <span className="block mb-1">From number</span>
                <input
                  value={fromNumber}
                  onChange={(event) => setFromNumber(event.target.value)}
                  className="w-full border px-2 py-1 text-xs"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                  placeholder="+49..."
                />
              </label>
            </>
          ) : null}
          <label className="text-xs font-medium md:col-span-2" style={{ color: "var(--window-document-text)" }}>
            <span className="block mb-1">Webhook secret</span>
            <input
              value={webhookSecret}
              onChange={(event) => setWebhookSecret(event.target.value)}
              className="w-full border px-2 py-1 text-xs"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
              placeholder={
                panelState.organizationBinding.hasWebhookSecret
                  ? "Saved already. Enter only to rotate."
                  : "Enter telephony webhook secret"
              }
            />
          </label>
        </div>
        <div className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>
          Binding route: {panelState.organizationBinding.routeKey || "Will be generated on save"}
        </div>
        {selectedProvider === "twilio_voice" && (
          <div className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>
            Twilio Voice uses the org binding number plus the app-managed inbound/status webhooks. Apply that bridge from the integrations surface after saving.
          </div>
        )}
      </section>

      <section
        className="border rounded p-3 space-y-3"
        style={{ borderColor: "var(--window-document-border)" }}
      >
        <h3 className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
          Provider Content
        </h3>
        <label className="block text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
          <span className="block mb-1">System prompt</span>
          <textarea
            value={systemPrompt}
            onChange={(event) => setSystemPrompt(event.target.value)}
            rows={16}
            className="w-full border px-2 py-2 text-xs"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg)",
              color: "var(--window-document-text)",
            }}
          />
        </label>
        <label className="block text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
          <span className="block mb-1">First message</span>
          <textarea
            value={firstMessage}
            onChange={(event) => setFirstMessage(event.target.value)}
            rows={3}
            className="w-full border px-2 py-2 text-xs"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg)",
              color: "var(--window-document-text)",
            }}
          />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
            <span className="block mb-1">Knowledge base name</span>
            <input
              value={knowledgeBaseName}
              onChange={(event) => setKnowledgeBaseName(event.target.value)}
              className="w-full border px-2 py-1 text-xs"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
            />
          </label>
          <div className="text-[11px] self-end" style={{ color: "var(--neutral-gray)" }}>
            Current provider option: {selectedProviderOption.label} ({selectedProviderOption.description})
          </div>
        </div>
        <label className="block text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
          <span className="block mb-1">Knowledge base</span>
          <textarea
            value={knowledgeBase}
            onChange={(event) => setKnowledgeBase(event.target.value)}
            rows={14}
            className="w-full border px-2 py-2 text-xs"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg)",
              color: "var(--window-document-text)",
            }}
            />
        </label>
        <div
          className="rounded border p-3 space-y-3"
          style={{ borderColor: "var(--window-document-border)" }}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <div
                className="text-xs font-semibold"
                style={{ color: "var(--window-document-text)" }}
              >
                Live handoff destinations
              </div>
              <div className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>
                Saved here and materialized into ElevenLabs `transfer_to_number` rules on save/sync.
              </div>
            </div>
            <button
              type="button"
              onClick={addTransferDestination}
              className="px-2 py-1 text-[11px] border rounded-sm"
              style={{
                borderColor: "var(--window-document-border)",
                color: "var(--window-document-text)",
              }}
            >
              Add destination
            </button>
          </div>
          {transferDestinations.length === 0 ? (
            <div className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>
              No live handoff destinations configured yet. Anne will stay in callback-capture mode.
            </div>
          ) : (
            <div className="space-y-3">
              {transferDestinations.map((destination, index) => (
                <div
                  key={`${destination.label}-${destination.phoneNumber}-${index}`}
                  className="rounded border p-3 space-y-2"
                  style={{ borderColor: "var(--window-document-border)" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <label
                      className="text-xs font-medium flex items-center gap-2"
                      style={{ color: "var(--window-document-text)" }}
                    >
                      <input
                        type="checkbox"
                        checked={destination.enabled}
                        onChange={(event) =>
                          updateTransferDestination(index, {
                            enabled: event.target.checked,
                          })
                        }
                      />
                      Enabled
                    </label>
                    <button
                      type="button"
                      onClick={() => removeTransferDestination(index)}
                      className="px-2 py-1 text-[11px] border rounded-sm"
                      style={{
                        borderColor: "var(--window-document-border)",
                        color: "var(--window-document-text)",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label
                      className="text-xs font-medium"
                      style={{ color: "var(--window-document-text)" }}
                    >
                      <span className="block mb-1">Label</span>
                      <input
                        value={destination.label}
                        onChange={(event) =>
                          updateTransferDestination(index, {
                            label: event.target.value,
                          })
                        }
                        className="w-full border px-2 py-1 text-xs"
                        style={{
                          borderColor: "var(--window-document-border)",
                          background: "var(--window-document-bg)",
                          color: "var(--window-document-text)",
                        }}
                        placeholder="Marcus direct line"
                      />
                    </label>
                    <label
                      className="text-xs font-medium"
                      style={{ color: "var(--window-document-text)" }}
                    >
                      <span className="block mb-1">Phone number</span>
                      <input
                        value={destination.phoneNumber}
                        onChange={(event) =>
                          updateTransferDestination(index, {
                            phoneNumber: event.target.value,
                          })
                        }
                        className="w-full border px-2 py-1 text-xs"
                        style={{
                          borderColor: "var(--window-document-border)",
                          background: "var(--window-document-bg)",
                          color: "var(--window-document-text)",
                        }}
                        placeholder="+49..."
                      />
                    </label>
                    <label
                      className="text-xs font-medium md:col-span-2"
                      style={{ color: "var(--window-document-text)" }}
                    >
                      <span className="block mb-1">Condition</span>
                      <input
                        value={destination.condition}
                        onChange={(event) =>
                          updateTransferDestination(index, {
                            condition: event.target.value,
                          })
                        }
                        className="w-full border px-2 py-1 text-xs"
                        style={{
                          borderColor: "var(--window-document-border)",
                          background: "var(--window-document-bg)",
                          color: "var(--window-document-text)",
                        }}
                        placeholder="When the caller explicitly asks to speak with Marcus."
                      />
                    </label>
                    <label
                      className="text-xs font-medium"
                      style={{ color: "var(--window-document-text)" }}
                    >
                      <span className="block mb-1">Transfer type</span>
                      <select
                        value={destination.transferType || "conference"}
                        onChange={(event) =>
                          updateTransferDestination(index, {
                            transferType:
                              event.target.value === "blind" ? "blind" : "conference",
                          })
                        }
                        className="w-full border px-2 py-1 text-xs"
                        style={{
                          borderColor: "var(--window-document-border)",
                          background: "var(--window-document-bg)",
                          color: "var(--window-document-text)",
                        }}
                      >
                        <option value="conference">Conference</option>
                        <option value="blind">Blind</option>
                      </select>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <label className="block text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
          <span className="block mb-1">Managed tools / telephony tool config (JSON)</span>
          <textarea
            value={managedToolsJson}
            onChange={(event) => setManagedToolsJson(event.target.value)}
            rows={18}
            className="w-full border px-2 py-2 text-xs font-mono"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg)",
              color: "var(--window-document-text)",
            }}
          />
          <span className="mt-1 block text-[11px]" style={{ color: "var(--neutral-gray)" }}>
            Destination rules above override `transfer_to_number.params.transfers` on save.
          </span>
        </label>
      </section>

      {message && (
        <div
          className="rounded border px-3 py-2 text-xs"
          style={{
            borderColor: message.tone === "success" ? "var(--success)" : "var(--error)",
            color: message.tone === "success" ? "var(--success)" : "var(--error)",
          }}
        >
          {message.text}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isSyncing}
          className="flex items-center gap-1.5 px-3 py-1.5 border text-xs rounded-sm disabled:opacity-60"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--desktop-shell-accent)",
            color: "var(--window-document-text)",
          }}
        >
          {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          Save
        </button>
        <button
          type="button"
          onClick={handleSync}
          disabled={isSaving || isSyncing || Boolean(syncDisabledReason)}
          className="flex items-center gap-1.5 px-3 py-1.5 border text-xs rounded-sm disabled:opacity-60"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--desktop-shell-accent)",
            color: "var(--window-document-text)",
          }}
          title={syncDisabledReason ?? undefined}
        >
          {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {selectedProvider === "twilio_voice" ? "Validate Provider" : "Sync To Provider"}
        </button>
      </div>
    </div>
  );
}
