"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import type { Id } from "../../../../convex/_generated/dataModel";
// Dynamic require to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };
import { InteriorButton } from "@/components/ui/interior-button";
import { useAuth } from "@/hooks/use-auth";
import { useNotification } from "@/hooks/use-notification";
import { useRetroConfirm } from "@/components/retro-confirm-dialog";
import { Loader2, CheckCircle2, ArrowLeft, Phone, RefreshCw } from "lucide-react";

interface TwilioSettingsProps {
  onBack: () => void;
}

type TwilioSettingsSnapshot = {
  configured: boolean;
  enabled: boolean;
  accountSidLast4?: string;
  verifyServiceSid?: string;
  smsPhoneNumber?: string;
  runtimeSource?: "platform" | "org" | null;
  platformAccessGranted?: boolean;
  hasOrgCredentials?: boolean;
  hasPlatformCredentials?: boolean;
  hasEffectiveCredentials?: boolean;
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
};

export function TwilioSettings({ onBack }: TwilioSettingsProps) {
  const { sessionId, user } = useAuth();
  const organizationId = user?.currentOrganization?.id as Id<"organizations"> | undefined;
  const notification = useNotification();
  const confirmDialog = useRetroConfirm();

  // Form state
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [verifyServiceSid, setVerifyServiceSid] = useState("");
  const [smsPhoneNumber, setSmsPhoneNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    accountName?: string;
    accountStatus?: string;
  } | null>(null);
  const [runtimeProbe, setRuntimeProbe] = useState<TwilioRuntimeProbe | null>(null);
  const [isProbingRuntime, setIsProbingRuntime] = useState(false);
  const [inventory, setInventory] = useState<TwilioInventoryNumber[]>([]);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);

  // Queries & mutations
  const twilioSettings = useQuery(
    api.integrations.twilio.getTwilioSettings,
    sessionId ? { sessionId } : "skip"
  ) as TwilioSettingsSnapshot | undefined;
  const saveSettings = useMutation(api.integrations.twilio.saveTwilioSettings);
  const disconnect = useMutation(api.integrations.twilio.disconnectTwilio);
  const testConnection = useAction(api.integrations.twilio.testTwilioConnection);
  const probeRuntime = useAction(
    api.integrations.twilio.probeOrganizationTwilioRuntime,
  ) as any;
  const listInventory = useAction(
    api.integrations.twilio.listOrganizationTwilioIncomingPhoneNumbers,
  ) as any;

  const isLoading = twilioSettings === undefined;
  const isConnected = twilioSettings?.configured && twilioSettings?.enabled;

  const handleTestConnection = async () => {
    if (!accountSid.trim() || !authToken.trim()) {
      notification.error("Missing Fields", "Account SID and Auth Token are required to test");
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection({
        accountSid: accountSid.trim(),
        authToken: authToken.trim(),
      });
      if (result.success) {
        setTestResult({
          accountName: result.accountName,
          accountStatus: result.accountStatus,
        });
        notification.success("Connection OK", `Account: ${result.accountName}`);
      } else {
        notification.error("Test Failed", result.error ?? "Could not connect to Twilio");
      }
    } catch (error) {
      notification.error(
        "Test Failed",
        error instanceof Error ? error.message : "Could not connect to Twilio"
      );
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!sessionId) return;
    if (!accountSid.trim() || !authToken.trim()) {
      notification.error("Missing Fields", "Account SID and Auth Token are required");
      return;
    }
    setIsSaving(true);
    try {
      // Test first
      const result = await testConnection({
        accountSid: accountSid.trim(),
        authToken: authToken.trim(),
      });
      if (!result.success) {
        notification.error("Invalid Credentials", result.error ?? "Could not verify credentials");
        setIsSaving(false);
        return;
      }
      // Save
      await saveSettings({
        sessionId,
        accountSid: accountSid.trim(),
        authToken: authToken.trim(),
        verifyServiceSid: verifyServiceSid.trim() || undefined,
        smsPhoneNumber: smsPhoneNumber.trim() || undefined,
        enabled: true,
      });
      notification.success("Saved", "Twilio settings saved successfully");
      setAccountSid("");
      setAuthToken("");
      setVerifyServiceSid("");
      setSmsPhoneNumber("");
      setTestResult(null);
    } catch (error) {
      notification.error(
        "Save Failed",
        error instanceof Error ? error.message : "Could not save settings"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!sessionId) return;
    const confirmed = await confirmDialog.confirm({
      title: "Disconnect Twilio",
      message:
        "This will remove your Twilio credentials and stop all SMS sending for your organization. Continue?",
      confirmText: "Disconnect",
      cancelText: "Cancel",
      confirmVariant: "primary",
    });
    if (!confirmed) return;
    try {
      await disconnect({ sessionId });
      setTestResult(null);
      setRuntimeProbe(null);
      setInventory([]);
      notification.success("Disconnected", "Twilio has been disconnected");
    } catch (error) {
      notification.error(
        "Error",
        error instanceof Error ? error.message : "Disconnect failed"
      );
    }
  };

  const handleProbeRuntime = async () => {
    if (!sessionId || !organizationId) return;
    setIsProbingRuntime(true);
    try {
      const result = (await probeRuntime({
        sessionId,
        organizationId,
      })) as TwilioRuntimeProbe;
      setRuntimeProbe(result);
      if (!result.success) {
        notification.error("Runtime Probe Failed", result.reason ?? "Twilio runtime probe failed");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Twilio runtime probe failed";
      setRuntimeProbe({
        success: false,
        source: null,
        reason: message,
        checkedAt: Date.now(),
      });
      notification.error("Runtime Probe Failed", message);
    } finally {
      setIsProbingRuntime(false);
    }
  };

  const handleLoadInventory = async () => {
    if (!sessionId || !organizationId) return;
    setIsLoadingInventory(true);
    setInventoryError(null);
    try {
      const result = (await listInventory({
        sessionId,
        organizationId,
        pageSize: 20,
      })) as {
        success: boolean;
        reason?: string;
        phoneNumbers?: TwilioInventoryNumber[];
      };
      if (!result.success) {
        setInventory([]);
        setInventoryError(result.reason ?? "Could not load Twilio numbers");
        notification.error("Inventory Load Failed", result.reason ?? "Could not load Twilio numbers");
        return;
      }
      setInventory(Array.isArray(result.phoneNumbers) ? result.phoneNumbers : []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not load Twilio numbers";
      setInventory([]);
      setInventoryError(message);
      notification.error("Inventory Load Failed", message);
    } finally {
      setIsLoadingInventory(false);
    }
  };

  return (
    <>
      <confirmDialog.Dialog />
      <div className="flex flex-col h-full" style={{ background: "var(--window-document-bg)" }}>
        {/* Header */}
        <div
          className="px-4 py-3 border-b-2 flex items-center gap-3"
          style={{ borderColor: "var(--window-document-border)" }}
        >
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm hover:underline"
            style={{ color: "var(--tone-accent)" }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="flex items-center gap-2">
            <Phone size={24} style={{ color: "#F22F46" }} />
            <div>
              <h2 className="font-bold text-sm" style={{ color: "var(--window-document-text)" }}>
                Twilio
              </h2>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                SMS verification &amp; messaging
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
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg-elevated)",
              }}
            >
              <Loader2 size={24} className="animate-spin" style={{ color: "var(--window-document-text)" }} />
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>Loading...</p>
            </div>
          ) : isConnected ? (
            /* ======== CONNECTED STATE ======== */
            <div className="space-y-4">
              <div
                className="p-4 border-2 rounded"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                  <span className="text-xs font-bold" style={{ color: "#10b981" }}>Connected</span>
                </div>
                <div className="space-y-2">
                  {twilioSettings?.runtimeSource && (
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                        Runtime Source
                      </p>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {twilioSettings.runtimeSource === "platform"
                          ? "Platform credentials"
                          : "Org credentials"}
                      </p>
                    </div>
                  )}
                  {twilioSettings?.accountSidLast4 && (
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                        Account SID
                      </p>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {twilioSettings.accountSidLast4}
                      </p>
                    </div>
                  )}
                  {twilioSettings?.verifyServiceSid && (
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                        Verify Service
                      </p>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {twilioSettings.verifyServiceSid}
                      </p>
                    </div>
                  )}
                  {twilioSettings?.smsPhoneNumber && (
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                        SMS Phone Number
                      </p>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {twilioSettings.smsPhoneNumber}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {twilioSettings?.platformAccessGranted ? (
                <div
                  className="p-3 border-2 rounded text-xs"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg-elevated)",
                    color: "var(--window-document-text)",
                  }}
                >
                  Platform-managed Twilio access is controlled from the super-admin
                  org Integrations tab. This screen is read-only for the effective
                  runtime while the platform grant is active.
                </div>
              ) : null}

              {runtimeProbe ? (
                <div
                  className="p-3 border-2 rounded text-xs"
                  style={{
                    borderColor: runtimeProbe.success ? "#10b981" : "var(--warning)",
                    background: "var(--window-document-bg-elevated)",
                    color: "var(--window-document-text)",
                  }}
                >
                  {runtimeProbe.success
                    ? `Runtime probe succeeded via ${runtimeProbe.source || "unknown"} credentials (${runtimeProbe.accountName || "Twilio account"} / ${runtimeProbe.accountStatus || "unknown"}).`
                    : runtimeProbe.reason || "Twilio runtime probe failed."}
                </div>
              ) : null}

              <div
                className="p-4 border-2 rounded space-y-3"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                <div className="flex flex-wrap gap-2">
                  <InteriorButton
                    variant="secondary"
                    onClick={handleProbeRuntime}
                    disabled={isProbingRuntime}
                    className="flex items-center gap-2"
                  >
                    {isProbingRuntime ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <RefreshCw size={12} />
                    )}
                    {isProbingRuntime ? "Testing..." : "Test Runtime"}
                  </InteriorButton>
                  <InteriorButton
                    variant="secondary"
                    onClick={handleLoadInventory}
                    disabled={isLoadingInventory}
                    className="flex items-center gap-2"
                  >
                    {isLoadingInventory ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <RefreshCw size={12} />
                    )}
                    {isLoadingInventory ? "Loading..." : "Load Phone Inventory"}
                  </InteriorButton>
                </div>

                {inventoryError ? (
                  <p className="text-xs" style={{ color: "var(--error)" }}>
                    {inventoryError}
                  </p>
                ) : inventory.length === 0 ? (
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    No Twilio numbers loaded yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {inventory.map((phoneNumber) => (
                      <div
                        key={phoneNumber.sid}
                        className="p-2 border rounded"
                        style={{
                          borderColor: "var(--window-document-border)",
                          color: "var(--window-document-text)",
                        }}
                      >
                        <p className="text-xs font-bold">{phoneNumber.phoneNumber}</p>
                        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                          {phoneNumber.friendlyName}
                        </p>
                        <p className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>
                          {phoneNumber.voiceEnabled ? "Voice" : "No voice"} /{" "}
                          {phoneNumber.smsEnabled ? "SMS" : "No SMS"} /{" "}
                          {phoneNumber.mmsEnabled ? "MMS" : "No MMS"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {!twilioSettings?.platformAccessGranted ? (
                <InteriorButton variant="secondary" onClick={handleDisconnect} className="w-full">
                  Disconnect
                </InteriorButton>
              ) : null}
            </div>
          ) : (
            /* ======== NOT CONNECTED STATE ======== */
            <div className="space-y-4">
              {/* Hero */}
              <div
                className="p-6 border-2 rounded text-center"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
              >
                <Phone size={48} className="mb-4 block mx-auto" style={{ color: "#F22F46" }} />
                <p className="text-sm font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
                  Connect Twilio
                </p>
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  Send SMS verification codes and messages using your own Twilio account.
                </p>
              </div>

              {/* Features */}
              <div
                className="p-4 border-2 rounded"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
              >
                <p className="text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
                  What you get
                </p>
                <div className="space-y-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                  <div className="flex items-start gap-2">
                    <span>&#10003;</span>
                    <span>SMS OTP verification</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#10003;</span>
                    <span>Twilio Verify service</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#10003;</span>
                    <span>Outbound SMS messaging</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#10003;</span>
                    <span>Per-org API credentials</span>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div
                className="p-4 border-2 rounded space-y-3"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
              >
                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: "var(--window-document-text)" }}>
                    Account SID
                  </label>
                  <input
                    type="text"
                    value={accountSid}
                    onChange={(e) => setAccountSid(e.target.value)}
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full p-2 border-2 rounded text-xs"
                    style={{
                      borderColor: "var(--window-document-border)",
                      background: "var(--window-document-bg)",
                      color: "var(--window-document-text)",
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: "var(--window-document-text)" }}>
                    Auth Token
                  </label>
                  <input
                    type="password"
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    placeholder="Your Twilio auth token"
                    className="w-full p-2 border-2 rounded text-xs"
                    style={{
                      borderColor: "var(--window-document-border)",
                      background: "var(--window-document-bg)",
                      color: "var(--window-document-text)",
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: "var(--window-document-text)" }}>
                    Verify Service SID{" "}
                    <span className="font-normal" style={{ color: "var(--neutral-gray)" }}>
                      (optional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={verifyServiceSid}
                    onChange={(e) => setVerifyServiceSid(e.target.value)}
                    placeholder="VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full p-2 border-2 rounded text-xs"
                    style={{
                      borderColor: "var(--window-document-border)",
                      background: "var(--window-document-bg)",
                      color: "var(--window-document-text)",
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: "var(--window-document-text)" }}>
                    SMS Phone Number{" "}
                    <span className="font-normal" style={{ color: "var(--neutral-gray)" }}>
                      (optional)
                    </span>
                  </label>
                  <input
                    type="tel"
                    value={smsPhoneNumber}
                    onChange={(e) => setSmsPhoneNumber(e.target.value)}
                    placeholder="+1234567890"
                    className="w-full p-2 border-2 rounded text-xs"
                    style={{
                      borderColor: "var(--window-document-border)",
                      background: "var(--window-document-bg)",
                      color: "var(--window-document-text)",
                    }}
                  />
                </div>
              </div>

              {/* Test result */}
              {testResult && (
                <div
                  className="p-4 border-2 rounded"
                  style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={14} style={{ color: "#10b981" }} />
                    <span className="text-xs font-bold" style={{ color: "#10b981" }}>
                      Credentials verified
                    </span>
                  </div>
                  {testResult.accountName && (
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      Account: {testResult.accountName}
                    </p>
                  )}
                  {testResult.accountStatus && (
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      Status: {testResult.accountStatus}
                    </p>
                  )}
                </div>
              )}

              {/* Test Button */}
              <InteriorButton
                variant="secondary"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="w-full"
              >
                {isTesting ? (
                  <>
                    <Loader2 size={14} className="mr-1 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Connection"
                )}
              </InteriorButton>

              {/* Save Button */}
              <InteriorButton onClick={handleSave} disabled={isSaving} className="w-full">
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="mr-1 animate-spin" />
                    Testing & Saving...
                  </>
                ) : (
                  "Test & Save"
                )}
              </InteriorButton>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
