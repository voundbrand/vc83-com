"use client";

import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mic,
  PhoneCall,
  RefreshCw,
  Save,
  Shield,
} from "lucide-react";
import { Id } from "../../../../../convex/_generated/dataModel";
import {
  InteriorBadge,
  InteriorButton,
  InteriorCheckbox,
  InteriorHelperText,
  InteriorInput,
  InteriorPanel,
  InteriorSectionHeader,
} from "@/components/window-content/shared/interior-primitives";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../../../convex/_generated/api") as { api: any };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useQueryAny = useQuery as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useMutationAny = useMutation as any;

interface IntegrationCredentialsTabProps {
  organizationId: Id<"organizations">;
  sessionId: string;
}

type ElevenLabsAdminState = {
  enabled: boolean;
  usePlatformCredentials: boolean;
  billingSource: "platform" | "byok" | "private";
  baseUrl: string;
  defaultVoiceId: string | null;
  hasOrgApiKey: boolean;
  hasPlatformApiKey: boolean;
  hasEffectiveApiKey: boolean;
  runtimeSource: "platform" | "org" | null;
  credentialSource?: string | null;
  healthStatus: "healthy" | "degraded" | "offline";
  healthReason?: string | null;
};

type TelephonyAdminState = {
  providerKey: "elevenlabs" | "twilio_voice" | "custom_sip";
  enabled: boolean;
  routeKey: string | null;
  providerConnectionId: string | null;
  providerInstallationId: string | null;
  providerProfileId: string | null;
  baseUrl: string | null;
  fromNumber: string | null;
  hasWebhookSecret: boolean;
  providerIdentity: string | null;
  twilioIncomingNumberSid: string | null;
  twilioWebhookAppliedAt: number | null;
  twilioInboundWebhookUrl: string | null;
  twilioStatusCallbackUrl: string | null;
};

type TwilioAdminState = {
  enabled: boolean;
  usePlatformCredentials: boolean;
  hasOrgCredentials: boolean;
  hasPlatformCredentials: boolean;
  hasEffectiveCredentials: boolean;
  runtimeSource: "platform" | "org" | null;
  accountSidLast4?: string | null;
  verifyServiceSid: string | null;
  smsPhoneNumber: string | null;
};

type TwilioRuntimeProbe = {
  success: boolean;
  source: "platform" | "org" | null;
  accountSidLast4?: string;
  accountName?: string;
  accountStatus?: string;
  reason?: string;
  checkedAt: number;
};

type TwilioInventoryNumber = {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
  voiceEnabled: boolean;
  smsEnabled: boolean;
  mmsEnabled: boolean;
  voiceUrl: string | null;
  smsUrl: string | null;
  statusCallback: string | null;
  trunkSid: string | null;
};

type TwilioVoiceBridgeResult = {
  success: boolean;
  valid?: boolean;
  applied?: boolean;
  source: "platform" | "org" | null;
  reason?: string;
  phoneNumberSid?: string;
  phoneNumber?: string;
  inboundWebhookUrl?: string;
  statusCallbackUrl?: string;
  expected?: {
    inboundWebhookUrl: string;
    statusCallbackUrl: string;
  };
  actual?: {
    voiceUrl: string | null;
    statusCallback: string | null;
  };
  checkedAt: number;
  appliedAt?: number;
};

function resolveHealthTone(
  status: ElevenLabsAdminState["healthStatus"],
): "success" | "warn" | "error" {
  if (status === "healthy") {
    return "success";
  }
  if (status === "offline") {
    return "error";
  }
  return "warn";
}

function resolveHealthLabel(status: ElevenLabsAdminState["healthStatus"]): string {
  if (status === "healthy") {
    return "Healthy";
  }
  if (status === "offline") {
    return "Offline";
  }
  return "Degraded";
}

function resolveRuntimeLabel(runtimeSource: ElevenLabsAdminState["runtimeSource"]): string {
  if (runtimeSource === "platform") {
    return "Platform credentials";
  }
  if (runtimeSource === "org") {
    return "Org credentials";
  }
  return "No active runtime";
}

function resolveTwilioRuntimeLabel(
  runtimeSource: TwilioAdminState["runtimeSource"],
): string {
  if (runtimeSource === "platform") {
    return "Platform credentials";
  }
  if (runtimeSource === "org") {
    return "Org credentials";
  }
  return "No active runtime";
}

export function IntegrationCredentialsTab({
  organizationId,
  sessionId,
}: IntegrationCredentialsTabProps) {
  const elevenlabsState = useQueryAny(
    api.integrations.elevenlabs.getOrganizationElevenLabsAdminState,
    organizationId && sessionId ? { sessionId, organizationId } : "skip",
  ) as ElevenLabsAdminState | undefined;
  const telephonyState = useQueryAny(
    api.integrations.telephony.getOrganizationTelephonyAdminState,
    organizationId && sessionId ? { sessionId, organizationId } : "skip",
  ) as TelephonyAdminState | undefined;
  const twilioState = useQueryAny(
    api.integrations.twilio.getOrganizationTwilioAdminState,
    organizationId && sessionId ? { sessionId, organizationId } : "skip",
  ) as TwilioAdminState | undefined;

  const saveElevenLabsState = useMutationAny(
    api.integrations.elevenlabs.saveOrganizationElevenLabsAdminState,
  );
  const saveTelephonyState = useMutationAny(
    api.integrations.telephony.saveOrganizationTelephonySettingsAdmin,
  );
  const saveTwilioState = useMutationAny(
    api.integrations.twilio.saveOrganizationTwilioAdminState,
  );
  const probeTwilioRuntime = useAction(
    api.integrations.twilio.probeOrganizationTwilioRuntime,
  ) as any;
  const listTwilioInventory = useAction(
    api.integrations.twilio.listOrganizationTwilioIncomingPhoneNumbers,
  ) as any;
  const validateTwilioPhoneNumber = useAction(
    api.integrations.twilio.validateOrganizationTwilioPhoneNumber,
  ) as any;
  const applyTwilioVoiceNumberBinding = useAction(
    api.integrations.twilio.applyOrganizationTwilioVoiceNumberBinding,
  ) as any;
  const validateTwilioVoiceNumberBinding = useAction(
    api.integrations.twilio.validateOrganizationTwilioVoiceNumberBinding,
  ) as any;

  const [elevenlabsEnabled, setElevenlabsEnabled] = useState(false);
  const [usePlatformCredentials, setUsePlatformCredentials] = useState(false);
  const [elevenlabsBaseUrl, setElevenlabsBaseUrl] = useState(
    "https://api.elevenlabs.io/v1",
  );
  const [defaultVoiceId, setDefaultVoiceId] = useState("");
  const [twilioEnabled, setTwilioEnabled] = useState(false);
  const [usePlatformTwilioCredentials, setUsePlatformTwilioCredentials] = useState(false);
  const [twilioVerifyServiceSid, setTwilioVerifyServiceSid] = useState("");
  const [twilioSmsPhoneNumber, setTwilioSmsPhoneNumber] = useState("");
  const [telephonyEnabled, setTelephonyEnabled] = useState(false);
  const [telephonyProviderKey, setTelephonyProviderKey] = useState<
    "elevenlabs" | "twilio_voice" | "custom_sip"
  >("elevenlabs");
  const [telephonyBaseUrl, setTelephonyBaseUrl] = useState("");
  const [telephonyFromNumber, setTelephonyFromNumber] = useState("");
  const [telephonyWebhookSecret, setTelephonyWebhookSecret] = useState("");
  const [isSavingElevenLabs, setIsSavingElevenLabs] = useState(false);
  const [isSavingTwilio, setIsSavingTwilio] = useState(false);
  const [isSavingTelephony, setIsSavingTelephony] = useState(false);
  const [elevenlabsMessage, setElevenlabsMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [twilioMessage, setTwilioMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [telephonyMessage, setTelephonyMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [twilioProbe, setTwilioProbe] = useState<TwilioRuntimeProbe | null>(null);
  const [isProbingTwilio, setIsProbingTwilio] = useState(false);
  const [twilioInventory, setTwilioInventory] = useState<TwilioInventoryNumber[]>([]);
  const [twilioInventoryError, setTwilioInventoryError] = useState<string | null>(null);
  const [isLoadingTwilioInventory, setIsLoadingTwilioInventory] = useState(false);
  const [twilioPhoneValidation, setTwilioPhoneValidation] = useState<{
    success: boolean;
    valid: boolean;
    reason?: string;
    checkedAt: number;
  } | null>(null);
  const [isValidatingPhoneBinding, setIsValidatingPhoneBinding] = useState(false);
  const [twilioVoiceBridgeResult, setTwilioVoiceBridgeResult] =
    useState<TwilioVoiceBridgeResult | null>(null);
  const [isApplyingTwilioVoiceBinding, setIsApplyingTwilioVoiceBinding] = useState(false);
  const [isValidatingTwilioVoiceBinding, setIsValidatingTwilioVoiceBinding] = useState(false);

  useEffect(() => {
    if (!elevenlabsState) {
      return;
    }
    setElevenlabsEnabled(Boolean(elevenlabsState.enabled));
    setUsePlatformCredentials(elevenlabsState.usePlatformCredentials === true);
    setElevenlabsBaseUrl(
      elevenlabsState.baseUrl || "https://api.elevenlabs.io/v1",
    );
    setDefaultVoiceId(elevenlabsState.defaultVoiceId || "");
  }, [elevenlabsState]);

  useEffect(() => {
    if (!telephonyState) {
      return;
    }
    setTelephonyProviderKey(telephonyState.providerKey);
    setTelephonyEnabled(Boolean(telephonyState.enabled));
    setTelephonyBaseUrl(telephonyState.baseUrl || "");
    setTelephonyFromNumber(telephonyState.fromNumber || "");
    setTelephonyWebhookSecret("");
  }, [telephonyState]);

  useEffect(() => {
    if (!twilioState) {
      return;
    }
    setTwilioEnabled(Boolean(twilioState.enabled));
    setUsePlatformTwilioCredentials(
      twilioState.usePlatformCredentials === true,
    );
    setTwilioVerifyServiceSid(twilioState.verifyServiceSid || "");
    setTwilioSmsPhoneNumber(twilioState.smsPhoneNumber || "");
  }, [twilioState]);

  const handleSaveElevenLabs = async () => {
    setElevenlabsMessage(null);
    setIsSavingElevenLabs(true);
    try {
      await saveElevenLabsState({
        sessionId,
        organizationId,
        enabled: elevenlabsEnabled,
        usePlatformCredentials,
        baseUrl: elevenlabsBaseUrl.trim() || undefined,
        defaultVoiceId: defaultVoiceId.trim() || undefined,
      });
      setElevenlabsMessage({
        tone: "success",
        text: "ElevenLabs org access updated.",
      });
    } catch (error) {
      setElevenlabsMessage({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to save ElevenLabs org access.",
      });
    } finally {
      setIsSavingElevenLabs(false);
    }
  };

  const handleSaveTelephony = async () => {
    setTelephonyMessage(null);
    setIsSavingTelephony(true);
    try {
      await saveTelephonyState({
        sessionId,
        organizationId,
        providerKey: telephonyProviderKey,
        enabled: telephonyEnabled,
        baseUrl:
          telephonyProviderKey === "twilio_voice"
            ? undefined
            : telephonyBaseUrl.trim() || undefined,
        fromNumber: telephonyFromNumber.trim() || undefined,
        webhookSecret: telephonyWebhookSecret.trim() || undefined,
      });
      setTelephonyWebhookSecret("");
      setTelephonyMessage({
        tone: "success",
        text: "Phone-call binding updated.",
      });
    } catch (error) {
      setTelephonyMessage({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to save phone-call binding.",
      });
    } finally {
      setIsSavingTelephony(false);
    }
  };

  const handleApplyTwilioVoiceBinding = async () => {
    setTelephonyMessage(null);
    setIsApplyingTwilioVoiceBinding(true);
    try {
      const inventoryMatch = twilioInventory.find(
        (phoneNumber) => phoneNumber.phoneNumber === telephonyFromNumber.trim(),
      );
      const result = (await applyTwilioVoiceNumberBinding({
        sessionId,
        organizationId,
        phoneNumberSid: inventoryMatch?.sid,
        phoneNumber: telephonyFromNumber.trim() || undefined,
      })) as TwilioVoiceBridgeResult;
      setTwilioVoiceBridgeResult(result);
      if (!result.success) {
        setTelephonyMessage({
          tone: "error",
          text: result.reason || "Unable to apply Twilio Voice webhook bridge.",
        });
        return;
      }
      setTelephonyMessage({
        tone: "success",
        text: "Twilio Voice webhook bridge applied.",
      });
    } catch (error) {
      setTelephonyMessage({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to apply Twilio Voice webhook bridge.",
      });
    } finally {
      setIsApplyingTwilioVoiceBinding(false);
    }
  };

  const handleValidateTwilioVoiceBinding = async () => {
    setTelephonyMessage(null);
    setIsValidatingTwilioVoiceBinding(true);
    try {
      const inventoryMatch = twilioInventory.find(
        (phoneNumber) => phoneNumber.phoneNumber === telephonyFromNumber.trim(),
      );
      const result = (await validateTwilioVoiceNumberBinding({
        sessionId,
        organizationId,
        phoneNumberSid: inventoryMatch?.sid,
        phoneNumber: telephonyFromNumber.trim() || undefined,
      })) as TwilioVoiceBridgeResult;
      setTwilioVoiceBridgeResult(result);
      if (!result.success || result.valid !== true) {
        setTelephonyMessage({
          tone: "error",
          text: result.reason || "Twilio Voice webhook bridge validation failed.",
        });
        return;
      }
      setTelephonyMessage({
        tone: "success",
        text: "Twilio Voice webhook bridge validated.",
      });
    } catch (error) {
      setTelephonyMessage({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Twilio Voice webhook bridge validation failed.",
      });
    } finally {
      setIsValidatingTwilioVoiceBinding(false);
    }
  };

  const handleSaveTwilio = async () => {
    setTwilioMessage(null);
    setIsSavingTwilio(true);
    try {
      await saveTwilioState({
        sessionId,
        organizationId,
        enabled: twilioEnabled,
        usePlatformCredentials: usePlatformTwilioCredentials,
        verifyServiceSid: twilioVerifyServiceSid.trim() || undefined,
        smsPhoneNumber: twilioSmsPhoneNumber.trim() || undefined,
      });
      setTwilioMessage({
        tone: "success",
        text: "Twilio org access updated.",
      });
    } catch (error) {
      setTwilioMessage({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to save Twilio org access.",
      });
    } finally {
      setIsSavingTwilio(false);
    }
  };

  const handleProbeTwilio = async () => {
    setTwilioMessage(null);
    setIsProbingTwilio(true);
    try {
      const result = (await probeTwilioRuntime({
        sessionId,
        organizationId,
      })) as TwilioRuntimeProbe;
      setTwilioProbe(result);
      if (!result.success) {
        setTwilioMessage({
          tone: "error",
          text: result.reason || "Twilio runtime probe failed.",
        });
      }
    } catch (error) {
      setTwilioProbe({
        success: false,
        source: null,
        reason: error instanceof Error ? error.message : "Twilio runtime probe failed.",
        checkedAt: Date.now(),
      });
    } finally {
      setIsProbingTwilio(false);
    }
  };

  const handleLoadTwilioInventory = async () => {
    setTwilioInventoryError(null);
    setIsLoadingTwilioInventory(true);
    try {
      const result = (await listTwilioInventory({
        sessionId,
        organizationId,
        pageSize: 20,
      })) as {
        success: boolean;
        reason?: string;
        phoneNumbers?: TwilioInventoryNumber[];
      };
      if (!result.success) {
        setTwilioInventory([]);
        setTwilioInventoryError(
          result.reason || "Unable to load Twilio phone numbers.",
        );
        return;
      }
      setTwilioInventory(
        Array.isArray(result.phoneNumbers) ? result.phoneNumbers : [],
      );
    } catch (error) {
      setTwilioInventory([]);
      setTwilioInventoryError(
        error instanceof Error ? error.message : "Unable to load Twilio phone numbers.",
      );
    } finally {
      setIsLoadingTwilioInventory(false);
    }
  };

  const handleValidatePhoneBinding = async () => {
    const phoneNumber = telephonyFromNumber.trim();
    if (!phoneNumber) {
      setTwilioPhoneValidation({
        success: false,
        valid: false,
        reason: "Enter a phone-call binding number before validating it.",
        checkedAt: Date.now(),
      });
      return;
    }
    setIsValidatingPhoneBinding(true);
    try {
      const result = (await validateTwilioPhoneNumber({
        sessionId,
        organizationId,
        phoneNumber,
      })) as {
        success: boolean;
        valid: boolean;
        reason?: string;
        checkedAt: number;
      };
      setTwilioPhoneValidation(result);
    } catch (error) {
      setTwilioPhoneValidation({
        success: false,
        valid: false,
        reason:
          error instanceof Error
            ? error.message
            : "Unable to validate the phone-call binding number.",
        checkedAt: Date.now(),
      });
    } finally {
      setIsValidatingPhoneBinding(false);
    }
  };

  if (!elevenlabsState || !telephonyState || !twilioState) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2
            size={28}
            className="animate-spin mx-auto mb-3"
            style={{ color: "var(--tone-accent)" }}
          />
          <p className="text-sm" style={{ color: "var(--window-document-text)" }}>
            Loading integration access...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <InteriorPanel className="p-4 space-y-2">
        <div className="flex items-start gap-3">
          <Shield size={18} style={{ color: "var(--tone-accent)" }} />
          <div>
            <InteriorSectionHeader className="text-sm">
              Super-Admin Integration Access
            </InteriorSectionHeader>
            <InteriorHelperText className="mt-1">
              Grant platform-managed runtime access for a target org and wire the
              phone-call channel binding without switching your active org.
            </InteriorHelperText>
          </div>
        </div>
      </InteriorPanel>

      <InteriorPanel className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PhoneCall size={16} style={{ color: "var(--tone-accent)" }} />
            <InteriorSectionHeader className="text-sm">
              Twilio Runtime Access
            </InteriorSectionHeader>
          </div>
          <div className="flex items-center gap-2">
            <InteriorBadge
              tone={twilioState.hasEffectiveCredentials ? "success" : twilioState.enabled ? "warn" : "default"}
            >
              {twilioState.hasEffectiveCredentials
                ? "Ready"
                : twilioState.enabled
                  ? "Blocked"
                  : "Disabled"}
            </InteriorBadge>
            <InteriorBadge
              tone={twilioState.runtimeSource ? "success" : "warn"}
            >
              {resolveTwilioRuntimeLabel(twilioState.runtimeSource)}
            </InteriorBadge>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <InteriorCheckbox
              checked={twilioEnabled}
              onChange={(event) =>
                setTwilioEnabled(event.target.checked)
              }
            />
            Enable Twilio runtime for this org
          </label>
          <label className="flex items-center gap-2 text-sm">
            <InteriorCheckbox
              checked={usePlatformTwilioCredentials}
              onChange={(event) =>
                setUsePlatformTwilioCredentials(event.target.checked)
              }
            />
            Use platform Twilio credentials
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span>Verify service SID</span>
            <InteriorInput
              value={twilioVerifyServiceSid}
              onChange={(event) =>
                setTwilioVerifyServiceSid(event.target.value)
              }
              placeholder="VA..."
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Default SMS number</span>
            <InteriorInput
              value={twilioSmsPhoneNumber}
              onChange={(event) =>
                setTwilioSmsPhoneNumber(event.target.value)
              }
              placeholder="+49..."
            />
          </label>
        </div>

        <div className="grid gap-2 md:grid-cols-4 text-xs">
          <div>
            <div style={{ color: "var(--neutral-gray)" }}>Platform key</div>
            <div style={{ color: "var(--window-document-text)" }}>
              {twilioState.hasPlatformCredentials ? "available" : "missing"}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--neutral-gray)" }}>Org BYOK</div>
            <div style={{ color: "var(--window-document-text)" }}>
              {twilioState.hasOrgCredentials ? "saved" : "not saved"}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--neutral-gray)" }}>Effective runtime</div>
            <div style={{ color: "var(--window-document-text)" }}>
              {twilioState.hasEffectiveCredentials ? "ready" : "not ready"}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--neutral-gray)" }}>Account SID</div>
            <div style={{ color: "var(--window-document-text)" }}>
              {twilioState.accountSidLast4 || "Unknown"}
            </div>
          </div>
        </div>

        <div
          className="border rounded p-3 text-xs flex items-start gap-2"
          style={{
            borderColor:
              twilioState.hasEffectiveCredentials
                ? "var(--success)"
                : "var(--warning)",
            background: "var(--window-document-bg)",
          }}
        >
          {twilioState.hasEffectiveCredentials ? (
            <CheckCircle2 size={14} style={{ color: "var(--success)" }} />
          ) : (
            <AlertTriangle size={14} style={{ color: "var(--warning)" }} />
          )}
          <span style={{ color: "var(--window-document-text)" }}>
            Platform Twilio access overlays org BYOK credentials without deleting
            them. Disable the grant to fall back to org-managed Twilio
            credentials.
          </span>
        </div>

        {twilioProbe ? (
          <div
            className="text-xs rounded p-2"
            style={{
              background: twilioProbe.success ? "var(--success)" : "var(--warning)",
              color: "white",
            }}
          >
            {twilioProbe.success
              ? `Runtime probe succeeded via ${twilioProbe.source || "unknown"} credentials (${twilioProbe.accountName || "Twilio account"} / ${twilioProbe.accountStatus || "unknown"}).`
              : twilioProbe.reason || "Twilio runtime probe failed."}
          </div>
        ) : null}

        {twilioMessage ? (
          <div
            className="text-xs rounded p-2"
            style={{
              background:
                twilioMessage.tone === "success"
                  ? "var(--success)"
                  : "var(--error)",
              color: "white",
            }}
          >
            {twilioMessage.text}
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <InteriorButton
            variant="neutral"
            size="sm"
            onClick={handleProbeTwilio}
            disabled={isProbingTwilio}
            className="flex items-center gap-2"
          >
            {isProbingTwilio ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            {isProbingTwilio ? "Testing..." : "Test Twilio Runtime"}
          </InteriorButton>
          <InteriorButton
            variant="primary"
            size="sm"
            onClick={handleSaveTwilio}
            disabled={isSavingTwilio}
            className="flex items-center gap-2"
          >
            {isSavingTwilio ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Save size={12} />
            )}
            {isSavingTwilio ? "Saving..." : "Save Twilio Access"}
          </InteriorButton>
        </div>
      </InteriorPanel>

      <InteriorPanel className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Mic size={16} style={{ color: "var(--tone-accent)" }} />
            <InteriorSectionHeader className="text-sm">
              ElevenLabs Runtime Access
            </InteriorSectionHeader>
          </div>
          <div className="flex items-center gap-2">
            <InteriorBadge tone={resolveHealthTone(elevenlabsState.healthStatus)}>
              {resolveHealthLabel(elevenlabsState.healthStatus)}
            </InteriorBadge>
            <InteriorBadge
              tone={elevenlabsState.hasEffectiveApiKey ? "success" : "warn"}
            >
              {resolveRuntimeLabel(elevenlabsState.runtimeSource)}
            </InteriorBadge>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <InteriorCheckbox
              checked={elevenlabsEnabled}
              onChange={(event) =>
                setElevenlabsEnabled(event.target.checked)
              }
            />
            Enable ElevenLabs runtime for this org
          </label>
          <label className="flex items-center gap-2 text-sm">
            <InteriorCheckbox
              checked={usePlatformCredentials}
              onChange={(event) =>
                setUsePlatformCredentials(event.target.checked)
              }
            />
            Use platform ElevenLabs credentials
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span>Base URL</span>
            <InteriorInput
              value={elevenlabsBaseUrl}
              onChange={(event) => setElevenlabsBaseUrl(event.target.value)}
              placeholder="https://api.elevenlabs.io/v1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Default voice ID</span>
            <InteriorInput
              value={defaultVoiceId}
              onChange={(event) => setDefaultVoiceId(event.target.value)}
              placeholder="voice_..."
            />
          </label>
        </div>

        <div className="grid gap-2 md:grid-cols-3 text-xs">
          <div>
            <div style={{ color: "var(--neutral-gray)" }}>Platform key</div>
            <div style={{ color: "var(--window-document-text)" }}>
              {elevenlabsState.hasPlatformApiKey ? "available" : "missing"}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--neutral-gray)" }}>Org BYOK key</div>
            <div style={{ color: "var(--window-document-text)" }}>
              {elevenlabsState.hasOrgApiKey ? "saved" : "not saved"}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--neutral-gray)" }}>Effective credential</div>
            <div style={{ color: "var(--window-document-text)" }}>
              {elevenlabsState.hasEffectiveApiKey ? "ready" : "not ready"}
            </div>
          </div>
        </div>

        <div
          className="border rounded p-3 text-xs flex items-start gap-2"
          style={{
            borderColor:
              elevenlabsState.healthStatus === "healthy"
                ? "var(--success)"
                : "var(--warning)",
            background: "var(--window-document-bg)",
          }}
        >
          {elevenlabsState.healthStatus === "healthy" ? (
            <CheckCircle2 size={14} style={{ color: "var(--success)" }} />
          ) : (
            <AlertTriangle size={14} style={{ color: "var(--warning)" }} />
          )}
          <span style={{ color: "var(--window-document-text)" }}>
            Platform grants overlay org config without deleting a saved BYOK key.
            Disable the grant to fall back to org-managed ElevenLabs credentials.
            {elevenlabsState.healthReason
              ? ` Current health reason: ${elevenlabsState.healthReason}.`
              : ""}
          </span>
        </div>

        {elevenlabsMessage ? (
          <div
            className="text-xs rounded p-2"
            style={{
              background:
                elevenlabsMessage.tone === "success"
                  ? "var(--success)"
                  : "var(--error)",
              color: "white",
            }}
          >
            {elevenlabsMessage.text}
          </div>
        ) : null}

        <div className="flex justify-end">
          <InteriorButton
            variant="primary"
            size="sm"
            onClick={handleSaveElevenLabs}
            disabled={isSavingElevenLabs}
            className="flex items-center gap-2"
          >
            {isSavingElevenLabs ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Save size={12} />
            )}
            {isSavingElevenLabs ? "Saving..." : "Save ElevenLabs Access"}
          </InteriorButton>
        </div>
      </InteriorPanel>

      <InteriorPanel className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PhoneCall size={16} style={{ color: "var(--tone-accent)" }} />
            <InteriorSectionHeader className="text-sm">
              Phone-Call Binding
            </InteriorSectionHeader>
          </div>
          <div className="flex items-center gap-2">
            <InteriorBadge tone={telephonyState.enabled ? "success" : "default"}>
              {telephonyState.enabled ? "Enabled" : "Disabled"}
            </InteriorBadge>
            <InteriorBadge
              tone={telephonyProviderKey === "twilio_voice" ? "success" : "default"}
            >
              {telephonyProviderKey === "twilio_voice" ? "Twilio Voice" : "ElevenLabs"}
            </InteriorBadge>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <InteriorCheckbox
              checked={telephonyEnabled}
              onChange={(event) => setTelephonyEnabled(event.target.checked)}
            />
            Enable `phone_call` binding
          </label>
          <div className="text-xs self-center" style={{ color: "var(--neutral-gray)" }}>
            Provider identity: {telephonyState.providerIdentity || "eleven_telephony"}
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setTelephonyProviderKey("elevenlabs")}
            className="rounded border px-3 py-2 text-left text-sm"
            style={{
              borderColor:
                telephonyProviderKey === "elevenlabs"
                  ? "var(--tone-accent)"
                  : "var(--window-document-border)",
              background:
                telephonyProviderKey === "elevenlabs"
                  ? "var(--desktop-shell-accent)"
                  : "var(--window-document-bg)",
              color: "var(--window-document-text)",
            }}
          >
            ElevenLabs managed telephony bridge
          </button>
          <button
            type="button"
            onClick={() => setTelephonyProviderKey("twilio_voice")}
            className="rounded border px-3 py-2 text-left text-sm"
            style={{
              borderColor:
                telephonyProviderKey === "twilio_voice"
                  ? "var(--tone-accent)"
                  : "var(--window-document-border)",
              background:
                telephonyProviderKey === "twilio_voice"
                  ? "var(--desktop-shell-accent)"
                  : "var(--window-document-bg)",
              color: "var(--window-document-text)",
            }}
          >
            Twilio Voice beta
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {telephonyProviderKey === "elevenlabs" ? (
            <label className="flex flex-col gap-1 text-sm">
              <span>Telephony base URL</span>
              <InteriorInput
                value={telephonyBaseUrl}
                onChange={(event) => setTelephonyBaseUrl(event.target.value)}
                placeholder="https://..."
              />
            </label>
          ) : (
            <div
              className="rounded border p-3 text-xs"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
            >
              Twilio Voice uses the saved org binding number plus app-managed inbound
              and status webhook URLs. Number purchase is still manual; assignment
              and validation are handled here.
            </div>
          )}
          <label className="flex flex-col gap-1 text-sm">
            <span>From number</span>
            <InteriorInput
              value={telephonyFromNumber}
              onChange={(event) => setTelephonyFromNumber(event.target.value)}
              placeholder="+49..."
            />
          </label>
        </div>

        <div
          className="border rounded p-3 space-y-3"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg)",
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div
                className="text-sm font-medium"
                style={{ color: "var(--window-document-text)" }}
              >
                Twilio Number Inventory
              </div>
              <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Load real Twilio incoming numbers from the effective runtime and
                use one for the phone-call binding.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <InteriorButton
                variant="neutral"
                size="sm"
                onClick={handleLoadTwilioInventory}
                disabled={isLoadingTwilioInventory}
                className="flex items-center gap-2"
              >
                {isLoadingTwilioInventory ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}
                {isLoadingTwilioInventory ? "Loading..." : "Load Twilio Numbers"}
              </InteriorButton>
              <InteriorButton
                variant="neutral"
                size="sm"
                onClick={handleValidatePhoneBinding}
                disabled={isValidatingPhoneBinding}
                className="flex items-center gap-2"
              >
                {isValidatingPhoneBinding ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={12} />
                )}
                {isValidatingPhoneBinding
                  ? "Validating..."
                  : "Validate Current Binding Number"}
              </InteriorButton>
              {telephonyProviderKey === "twilio_voice" ? (
                <>
                  <InteriorButton
                    variant="neutral"
                    size="sm"
                    onClick={handleApplyTwilioVoiceBinding}
                    disabled={isApplyingTwilioVoiceBinding}
                    className="flex items-center gap-2"
                  >
                    {isApplyingTwilioVoiceBinding ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Save size={12} />
                    )}
                    {isApplyingTwilioVoiceBinding
                      ? "Applying..."
                      : "Apply Twilio Webhooks"}
                  </InteriorButton>
                  <InteriorButton
                    variant="neutral"
                    size="sm"
                    onClick={handleValidateTwilioVoiceBinding}
                    disabled={isValidatingTwilioVoiceBinding}
                    className="flex items-center gap-2"
                  >
                    {isValidatingTwilioVoiceBinding ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={12} />
                    )}
                    {isValidatingTwilioVoiceBinding
                      ? "Checking..."
                      : "Validate Twilio Webhooks"}
                  </InteriorButton>
                </>
              ) : null}
            </div>
          </div>

          {twilioPhoneValidation ? (
            <div
              className="text-xs rounded p-2"
              style={{
                background: twilioPhoneValidation.valid
                  ? "var(--success)"
                  : "var(--warning)",
                color: "white",
              }}
            >
              {twilioPhoneValidation.valid
                ? "Current phone-call binding number is present in Twilio inventory."
                : twilioPhoneValidation.reason || "Current phone-call binding number could not be validated."}
            </div>
          ) : null}

          {twilioVoiceBridgeResult ? (
            <div
              className="text-xs rounded p-2 space-y-1"
              style={{
                background:
                  twilioVoiceBridgeResult.success &&
                  (twilioVoiceBridgeResult.valid !== false)
                    ? "var(--success)"
                    : "var(--warning)",
                color: "white",
              }}
            >
              <div>
                {twilioVoiceBridgeResult.success
                  ? twilioVoiceBridgeResult.valid === false
                    ? twilioVoiceBridgeResult.reason ||
                      "Twilio Voice webhook bridge does not match the expected configuration."
                    : twilioVoiceBridgeResult.applied
                      ? "Twilio Voice webhook bridge applied."
                      : "Twilio Voice webhook bridge is valid."
                  : twilioVoiceBridgeResult.reason ||
                    "Twilio Voice webhook bridge action failed."}
              </div>
              {twilioVoiceBridgeResult.inboundWebhookUrl ? (
                <div>Inbound: {twilioVoiceBridgeResult.inboundWebhookUrl}</div>
              ) : null}
              {twilioVoiceBridgeResult.statusCallbackUrl ? (
                <div>Status: {twilioVoiceBridgeResult.statusCallbackUrl}</div>
              ) : null}
              {twilioVoiceBridgeResult.expected ? (
                <>
                  <div>Expected inbound: {twilioVoiceBridgeResult.expected.inboundWebhookUrl}</div>
                  <div>Expected status: {twilioVoiceBridgeResult.expected.statusCallbackUrl}</div>
                </>
              ) : null}
              {twilioVoiceBridgeResult.actual ? (
                <>
                  <div>Actual voice URL: {twilioVoiceBridgeResult.actual.voiceUrl || "missing"}</div>
                  <div>Actual status callback: {twilioVoiceBridgeResult.actual.statusCallback || "missing"}</div>
                </>
              ) : null}
            </div>
          ) : null}

          {twilioInventoryError ? (
            <div
              className="text-xs rounded p-2"
              style={{ background: "var(--warning)", color: "white" }}
            >
              {twilioInventoryError}
            </div>
          ) : null}

          {twilioInventory.length === 0 ? (
            <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              No Twilio numbers loaded yet.
            </div>
          ) : (
            <div className="space-y-2">
              {twilioInventory.map((phoneNumber) => {
                const selectedForBinding =
                  phoneNumber.phoneNumber === telephonyFromNumber.trim();
                return (
                  <div
                    key={phoneNumber.sid}
                    className="rounded border p-3 flex flex-wrap items-center justify-between gap-3"
                    style={{ borderColor: "var(--window-document-border)" }}
                  >
                    <div className="space-y-1">
                      <div
                        className="text-sm font-medium"
                        style={{ color: "var(--window-document-text)" }}
                      >
                        {phoneNumber.phoneNumber}
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "var(--neutral-gray)" }}
                      >
                        {phoneNumber.friendlyName}
                      </div>
                      <div
                        className="text-[11px]"
                        style={{ color: "var(--neutral-gray)" }}
                      >
                        {phoneNumber.voiceEnabled ? "Voice" : "No voice"} /{" "}
                        {phoneNumber.smsEnabled ? "SMS" : "No SMS"} /{" "}
                        {phoneNumber.mmsEnabled ? "MMS" : "No MMS"}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedForBinding ? (
                        <InteriorBadge tone="success">Binding number</InteriorBadge>
                      ) : null}
                      <InteriorButton
                        variant="neutral"
                        size="sm"
                        onClick={() => {
                          setTelephonyFromNumber(phoneNumber.phoneNumber);
                          if (!twilioSmsPhoneNumber.trim()) {
                            setTwilioSmsPhoneNumber(phoneNumber.phoneNumber);
                          }
                        }}
                      >
                        Use for Phone Binding
                      </InteriorButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span>Webhook secret</span>
          <InteriorInput
            type="password"
            value={telephonyWebhookSecret}
            onChange={(event) => setTelephonyWebhookSecret(event.target.value)}
            placeholder={
              telephonyState.hasWebhookSecret
                ? "Stored already. Enter only to rotate."
                : "Enter webhook secret"
            }
          />
        </label>

        <div className="grid gap-2 md:grid-cols-3 text-xs">
          <div>
            <div style={{ color: "var(--neutral-gray)" }}>Route key</div>
            <div style={{ color: "var(--window-document-text)" }}>
              {telephonyState.routeKey || "Will be generated on save"}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--neutral-gray)" }}>
              Provider connection
            </div>
            <div style={{ color: "var(--window-document-text)" }}>
              {telephonyState.providerConnectionId || "Pending"}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--neutral-gray)" }}>Webhook secret</div>
            <div style={{ color: "var(--window-document-text)" }}>
              {telephonyState.hasWebhookSecret ? "stored" : "missing"}
            </div>
          </div>
        </div>

        {telephonyProviderKey === "twilio_voice" ? (
          <div className="grid gap-2 text-xs">
            <div>
              <div style={{ color: "var(--neutral-gray)" }}>Incoming number SID</div>
              <div style={{ color: "var(--window-document-text)" }}>
                {telephonyState.twilioIncomingNumberSid || "Not applied"}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--neutral-gray)" }}>Inbound voice webhook</div>
              <div style={{ color: "var(--window-document-text)" }}>
                {telephonyState.twilioInboundWebhookUrl || "Not applied"}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--neutral-gray)" }}>Status callback webhook</div>
              <div style={{ color: "var(--window-document-text)" }}>
                {telephonyState.twilioStatusCallbackUrl || "Not applied"}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--neutral-gray)" }}>Last webhook apply</div>
              <div style={{ color: "var(--window-document-text)" }}>
                {telephonyState.twilioWebhookAppliedAt
                  ? new Date(telephonyState.twilioWebhookAppliedAt).toLocaleString()
                  : "Not applied"}
              </div>
            </div>
          </div>
        ) : null}

        <InteriorHelperText>
          Leaving the webhook secret blank preserves the currently stored secret.
          This tab configures the org binding only; agent-level telephony config
          and live transfer destinations still live on the agent.
        </InteriorHelperText>

        {telephonyMessage ? (
          <div
            className="text-xs rounded p-2"
            style={{
              background:
                telephonyMessage.tone === "success"
                  ? "var(--success)"
                  : "var(--error)",
              color: "white",
            }}
          >
            {telephonyMessage.text}
          </div>
        ) : null}

        <div className="flex justify-end">
          <InteriorButton
            variant="primary"
            size="sm"
            onClick={handleSaveTelephony}
            disabled={isSavingTelephony}
            className="flex items-center gap-2"
          >
            {isSavingTelephony ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Save size={12} />
            )}
            {isSavingTelephony ? "Saving..." : "Save Phone Binding"}
          </InteriorButton>
        </div>
      </InteriorPanel>
    </div>
  );
}
