# Service Connections: Resend & Infobip as Platform Integrations

This document describes how to add **Resend** and **Infobip** as proper platform integrations in the Integrations window, appearing alongside GitHub, Microsoft, Vercel, etc. with their logos and full connection flows.

---

## Overview

We want Resend and Infobip to appear as first-class integration cards:

```
┌─────────────────────────────────────────────────────────────────┐
│  Platform Integrations                                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │ GitHub  │  │ Vercel  │  │Microsoft│  │ Google  │            │
│  │   ✓     │  │   ✓     │  │   ✓     │  │ soon    │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
│                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │ Resend  │  │ Infobip │  │  Slack  │  │ Zapier  │            │
│  │  NEW    │  │  NEW    │  │ soon    │  │ soon    │  <-- NEW   │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Pattern

Following the existing pattern used for GitHub, Vercel, and Microsoft integrations:

### 1. Add to `BUILT_IN_INTEGRATIONS` array

### 2. Create `*-settings.tsx` component for each

### 3. Wire up in the main switch statement

### 4. Store credentials using existing OAuth encryption

---

## Step 1: Add Integration Cards

File: `src/components/window-content/integrations-window/index.tsx`

Add to `BUILT_IN_INTEGRATIONS` array (around line 31):

```typescript
const BUILT_IN_INTEGRATIONS = [
  // ... existing integrations (github, vercel, microsoft, google, slack)

  // NEW: Communication Integrations
  {
    id: "resend",
    name: "Resend",
    description: "Transactional email delivery",
    icon: "fas fa-envelope",  // or custom SVG
    iconColor: "#000000",     // Resend brand color
    status: "available" as const,
    type: "builtin" as const,
    // Available on Starter+ (same as other platform integrations)
    accessCheck: { type: "limit" as const, key: "maxThirdPartyIntegrations" },
  },
  {
    id: "infobip",
    name: "Infobip",
    description: "SMS & WhatsApp messaging",
    icon: "fas fa-comment-sms",  // or custom SVG
    iconColor: "#FF6B00",        // Infobip brand orange
    status: "available" as const,
    type: "builtin" as const,
    // Available on Starter+ (same as other platform integrations)
    accessCheck: { type: "limit" as const, key: "maxThirdPartyIntegrations" },
  },

  // ... rest of existing integrations (zapier, make, n8n, api-keys)
];
```

---

## Step 2: Create Settings Components

### Resend Settings Component

File: `src/components/window-content/integrations-window/resend-settings.tsx`

```tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useCurrentOrganization } from "@/hooks/use-auth";
import { useNotification } from "@/hooks/use-notification";
import { useRetroConfirm } from "@/components/retro-confirm-dialog";
import {
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Eye,
  EyeOff,
  Mail,
  TestTube,
  Trash2,
} from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";

interface ResendSettingsProps {
  onBack: () => void;
}

export function ResendSettings({ onBack }: ResendSettingsProps) {
  const currentOrg = useCurrentOrganization();
  const notification = useNotification();
  const confirmDialog = useRetroConfirm();

  // Form state
  const [apiKey, setApiKey] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderName, setSenderName] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Query existing connection
  const connection = useQuery(
    api.connections.serviceConnections.getServiceConnection,
    currentOrg?.id
      ? { organizationId: currentOrg.id as Id<"organizations">, provider: "resend" }
      : "skip"
  );

  // Mutations
  const configureConnection = useMutation(
    api.connections.serviceConnections.configureServiceConnection
  );
  const deleteConnection = useMutation(
    api.connections.serviceConnections.deleteServiceConnection
  );
  const testConnection = useAction(
    api.connections.serviceConnections.testServiceConnection
  );

  const handleSave = async () => {
    if (!currentOrg?.id) return;
    if (!apiKey && !connection) {
      notification.error("API Key Required", "Please enter your Resend API key");
      return;
    }

    setIsSubmitting(true);
    try {
      await configureConnection({
        organizationId: currentOrg.id as Id<"organizations">,
        provider: "resend",
        apiKey: apiKey || undefined, // Only send if changed
        customProperties: {
          senderEmail: senderEmail || undefined,
          senderName: senderName || undefined,
        },
      });

      notification.success("Saved", "Resend connection configured successfully");
      setApiKey(""); // Clear sensitive field
    } catch (error) {
      notification.error(
        "Save Failed",
        error instanceof Error ? error.message : "Failed to save configuration"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTest = async () => {
    if (!currentOrg?.id || !connection) return;

    setIsTesting(true);
    try {
      const result = await testConnection({
        organizationId: currentOrg.id as Id<"organizations">,
        provider: "resend",
      });

      if (result.success) {
        notification.success("Connection Valid", "Successfully connected to Resend API");
      } else {
        notification.error("Connection Failed", result.error || "Could not connect to Resend");
      }
    } catch (error) {
      notification.error(
        "Test Failed",
        error instanceof Error ? error.message : "Failed to test connection"
      );
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection?._id) return;

    const confirmed = await confirmDialog.confirm({
      title: "Disconnect Resend",
      message:
        "Are you sure you want to disconnect Resend? Email automation will fall back to system defaults.",
      confirmText: "Disconnect",
      cancelText: "Cancel",
      confirmVariant: "primary",
    });

    if (!confirmed) return;

    try {
      await deleteConnection({ connectionId: connection._id });
      notification.success("Disconnected", "Resend connection removed");
    } catch (error) {
      notification.error(
        "Disconnect Failed",
        error instanceof Error ? error.message : "Failed to disconnect"
      );
    }
  };

  const isConnected = connection?.status === "active";

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
      {/* Header */}
      <div
        className="px-4 py-3 border-b-2 flex items-center gap-3"
        style={{ borderColor: "var(--win95-border)" }}
      >
        <button
          onClick={onBack}
          className="p-1 rounded hover:bg-black/10 transition-colors"
        >
          <ArrowLeft size={20} style={{ color: "var(--win95-text)" }} />
        </button>
        <div className="flex items-center gap-3">
          {/* Resend Logo */}
          <div
            className="w-10 h-10 rounded flex items-center justify-center"
            style={{ background: "#000000" }}
          >
            <Mail size={24} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold" style={{ color: "var(--win95-text)" }}>
              Resend
            </h2>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              Transactional email delivery
            </p>
          </div>
        </div>
        {/* Status badge */}
        {isConnected && (
          <div className="ml-auto flex items-center gap-1 px-2 py-1 rounded bg-green-100">
            <CheckCircle2 size={14} className="text-green-600" />
            <span className="text-xs font-medium text-green-700">Connected</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* API Key Section */}
        <div
          className="p-4 border-2 rounded"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg-light)",
          }}
        >
          <h3
            className="font-bold text-sm mb-3"
            style={{ color: "var(--win95-text)" }}
          >
            API Configuration
          </h3>

          <div className="space-y-4">
            {/* API Key */}
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--win95-text)" }}
              >
                API Key {!connection && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={connection ? "••••••••••••••••" : "re_..."}
                  className="w-full px-3 py-2 border-2 rounded text-sm font-mono"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-bg)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: "var(--neutral-gray)" }}
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                Get your API key from{" "}
                <a
                  href="https://resend.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: "var(--win95-highlight)" }}
                >
                  resend.com/api-keys
                </a>
              </p>
            </div>

            {/* Sender Email */}
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--win95-text)" }}
              >
                Default Sender Email
              </label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="noreply@yourdomain.com"
                className="w-full px-3 py-2 border-2 rounded text-sm"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg)",
                }}
              />
            </div>

            {/* Sender Name */}
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--win95-text)" }}
              >
                Default Sender Name
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Your Company Name"
                className="w-full px-3 py-2 border-2 rounded text-sm"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Connection Status */}
        {connection && (
          <div
            className="p-4 border-2 rounded"
            style={{
              borderColor:
                connection.status === "active"
                  ? "var(--success)"
                  : "var(--warning)",
              background:
                connection.status === "active"
                  ? "rgba(34, 197, 94, 0.05)"
                  : "rgba(245, 158, 11, 0.05)",
            }}
          >
            <h3
              className="font-bold text-sm mb-2"
              style={{ color: "var(--win95-text)" }}
            >
              Connection Status
            </h3>
            <div className="flex items-center gap-2">
              {connection.status === "active" ? (
                <>
                  <CheckCircle2 size={16} className="text-green-600" />
                  <span className="text-sm text-green-700">
                    Connected and ready to send emails
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm text-amber-700">
                    {connection.lastError || "Connection needs attention"}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Help Section */}
        <div
          className="p-4 border-2 rounded"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg-light)",
          }}
        >
          <h3
            className="font-bold text-sm mb-2"
            style={{ color: "var(--win95-text)" }}
          >
            About Resend Integration
          </h3>
          <p className="text-xs mb-3" style={{ color: "var(--neutral-gray)" }}>
            Resend is used for sending transactional emails in automation sequences.
            When connected, your organization will use its own Resend account instead
            of system defaults.
          </p>
          <ul
            className="text-xs space-y-1 list-disc list-inside"
            style={{ color: "var(--neutral-gray)" }}
          >
            <li>Automation sequence emails (Vorher, Während, Nachher)</li>
            <li>Booking confirmations and reminders</li>
            <li>Review requests and follow-ups</li>
          </ul>
        </div>
      </div>

      {/* Footer Actions */}
      <div
        className="px-4 py-3 border-t-2 flex items-center justify-between"
        style={{ borderColor: "var(--win95-border)" }}
      >
        <div>
          {connection && (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded transition-colors"
              style={{ color: "var(--error)" }}
            >
              <Trash2 size={14} />
              Disconnect
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {connection && (
            <button
              onClick={handleTest}
              disabled={isTesting}
              className="beveled-button px-4 py-2 text-xs font-bold flex items-center gap-2"
              style={{
                backgroundColor: "var(--win95-button-face)",
                color: "var(--win95-text)",
              }}
            >
              {isTesting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <TestTube size={14} />
              )}
              Test Connection
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="beveled-button px-4 py-2 text-xs font-bold text-white flex items-center gap-2"
            style={{ background: "var(--win95-highlight)" }}
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {connection ? "Update" : "Connect"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Infobip Settings Component

File: `src/components/window-content/integrations-window/infobip-settings.tsx`

```tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useCurrentOrganization } from "@/hooks/use-auth";
import { useNotification } from "@/hooks/use-notification";
import { useRetroConfirm } from "@/components/retro-confirm-dialog";
import {
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Eye,
  EyeOff,
  MessageSquare,
  TestTube,
  Trash2,
  Phone,
} from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";

interface InfobipSettingsProps {
  onBack: () => void;
}

export function InfobipSettings({ onBack }: InfobipSettingsProps) {
  const currentOrg = useCurrentOrganization();
  const notification = useNotification();
  const confirmDialog = useRetroConfirm();

  // Form state
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [smsSenderId, setSmsSenderId] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Query existing connection
  const connection = useQuery(
    api.connections.serviceConnections.getServiceConnection,
    currentOrg?.id
      ? { organizationId: currentOrg.id as Id<"organizations">, provider: "infobip" }
      : "skip"
  );

  // Mutations
  const configureConnection = useMutation(
    api.connections.serviceConnections.configureServiceConnection
  );
  const deleteConnection = useMutation(
    api.connections.serviceConnections.deleteServiceConnection
  );
  const testConnection = useAction(
    api.connections.serviceConnections.testServiceConnection
  );

  // Pre-fill form with existing config
  const existingConfig = connection?.customProperties as {
    baseUrl?: string;
    smsSenderId?: string;
    whatsappNumber?: string;
  } | null;

  const handleSave = async () => {
    if (!currentOrg?.id) return;
    if (!apiKey && !connection) {
      notification.error("API Key Required", "Please enter your Infobip API key");
      return;
    }
    if (!baseUrl && !existingConfig?.baseUrl) {
      notification.error("Base URL Required", "Please enter your Infobip Base URL");
      return;
    }

    setIsSubmitting(true);
    try {
      await configureConnection({
        organizationId: currentOrg.id as Id<"organizations">,
        provider: "infobip",
        apiKey: apiKey || undefined,
        customProperties: {
          baseUrl: baseUrl || existingConfig?.baseUrl,
          smsSenderId: smsSenderId || existingConfig?.smsSenderId || undefined,
          whatsappNumber: whatsappNumber || existingConfig?.whatsappNumber || undefined,
        },
      });

      notification.success("Saved", "Infobip connection configured successfully");
      setApiKey(""); // Clear sensitive field
    } catch (error) {
      notification.error(
        "Save Failed",
        error instanceof Error ? error.message : "Failed to save configuration"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTest = async () => {
    if (!currentOrg?.id || !connection) return;

    setIsTesting(true);
    try {
      const result = await testConnection({
        organizationId: currentOrg.id as Id<"organizations">,
        provider: "infobip",
      });

      if (result.success) {
        notification.success("Connection Valid", "Successfully connected to Infobip API");
      } else {
        notification.error("Connection Failed", result.error || "Could not connect to Infobip");
      }
    } catch (error) {
      notification.error(
        "Test Failed",
        error instanceof Error ? error.message : "Failed to test connection"
      );
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection?._id) return;

    const confirmed = await confirmDialog.confirm({
      title: "Disconnect Infobip",
      message:
        "Are you sure you want to disconnect Infobip? SMS and WhatsApp automation will fall back to system defaults.",
      confirmText: "Disconnect",
      cancelText: "Cancel",
      confirmVariant: "primary",
    });

    if (!confirmed) return;

    try {
      await deleteConnection({ connectionId: connection._id });
      notification.success("Disconnected", "Infobip connection removed");
    } catch (error) {
      notification.error(
        "Disconnect Failed",
        error instanceof Error ? error.message : "Failed to disconnect"
      );
    }
  };

  const isConnected = connection?.status === "active";

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
      {/* Header */}
      <div
        className="px-4 py-3 border-b-2 flex items-center gap-3"
        style={{ borderColor: "var(--win95-border)" }}
      >
        <button
          onClick={onBack}
          className="p-1 rounded hover:bg-black/10 transition-colors"
        >
          <ArrowLeft size={20} style={{ color: "var(--win95-text)" }} />
        </button>
        <div className="flex items-center gap-3">
          {/* Infobip Logo */}
          <div
            className="w-10 h-10 rounded flex items-center justify-center"
            style={{ background: "#FF6B00" }}
          >
            <MessageSquare size={24} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold" style={{ color: "var(--win95-text)" }}>
              Infobip
            </h2>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              SMS & WhatsApp messaging
            </p>
          </div>
        </div>
        {isConnected && (
          <div className="ml-auto flex items-center gap-1 px-2 py-1 rounded bg-green-100">
            <CheckCircle2 size={14} className="text-green-600" />
            <span className="text-xs font-medium text-green-700">Connected</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* API Configuration */}
        <div
          className="p-4 border-2 rounded"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg-light)",
          }}
        >
          <h3
            className="font-bold text-sm mb-3"
            style={{ color: "var(--win95-text)" }}
          >
            API Configuration
          </h3>

          <div className="space-y-4">
            {/* API Key */}
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--win95-text)" }}
              >
                API Key {!connection && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={connection ? "••••••••••••••••" : "Your API key"}
                  className="w-full px-3 py-2 border-2 rounded text-sm font-mono"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-bg)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: "var(--neutral-gray)" }}
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Base URL */}
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--win95-text)" }}
              >
                Base URL {!connection && <span className="text-red-500">*</span>}
              </label>
              <input
                type="url"
                value={baseUrl || existingConfig?.baseUrl || ""}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://xxxxx.api.infobip.com"
                className="w-full px-3 py-2 border-2 rounded text-sm font-mono"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg)",
                }}
              />
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                Find your Base URL in{" "}
                <a
                  href="https://portal.infobip.com/settings/accounts/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: "var(--win95-highlight)" }}
                >
                  Infobip Portal → API Keys
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* SMS Configuration */}
        <div
          className="p-4 border-2 rounded"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg-light)",
          }}
        >
          <h3
            className="font-bold text-sm mb-3 flex items-center gap-2"
            style={{ color: "var(--win95-text)" }}
          >
            <Phone size={16} />
            SMS Settings
          </h3>

          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "var(--win95-text)" }}
            >
              Sender ID
            </label>
            <input
              type="text"
              value={smsSenderId || existingConfig?.smsSenderId || ""}
              onChange={(e) => setSmsSenderId(e.target.value)}
              placeholder="YourBrand"
              maxLength={11}
              className="w-full px-3 py-2 border-2 rounded text-sm"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg)",
              }}
            />
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              Max 11 alphanumeric characters (e.g., "HaffSegeln")
            </p>
          </div>
        </div>

        {/* WhatsApp Configuration */}
        <div
          className="p-4 border-2 rounded"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg-light)",
          }}
        >
          <h3
            className="font-bold text-sm mb-3 flex items-center gap-2"
            style={{ color: "var(--win95-text)" }}
          >
            <MessageSquare size={16} />
            WhatsApp Settings
          </h3>

          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "var(--win95-text)" }}
            >
              WhatsApp Business Number
            </label>
            <input
              type="tel"
              value={whatsappNumber || existingConfig?.whatsappNumber || ""}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="+49..."
              className="w-full px-3 py-2 border-2 rounded text-sm font-mono"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg)",
              }}
            />
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              Connect your WhatsApp Business Account in Infobip Portal first
            </p>
          </div>
        </div>

        {/* Connection Status */}
        {connection && (
          <div
            className="p-4 border-2 rounded"
            style={{
              borderColor:
                connection.status === "active" ? "var(--success)" : "var(--warning)",
              background:
                connection.status === "active"
                  ? "rgba(34, 197, 94, 0.05)"
                  : "rgba(245, 158, 11, 0.05)",
            }}
          >
            <h3
              className="font-bold text-sm mb-2"
              style={{ color: "var(--win95-text)" }}
            >
              Connection Status
            </h3>
            <div className="flex items-center gap-2">
              {connection.status === "active" ? (
                <>
                  <CheckCircle2 size={16} className="text-green-600" />
                  <span className="text-sm text-green-700">
                    Connected and ready to send messages
                  </span>
                </>
              ) : (
                <span className="text-sm text-amber-700">
                  {connection.lastError || "Connection needs attention"}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Help Section */}
        <div
          className="p-4 border-2 rounded"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg-light)",
          }}
        >
          <h3
            className="font-bold text-sm mb-2"
            style={{ color: "var(--win95-text)" }}
          >
            About Infobip Integration
          </h3>
          <p className="text-xs mb-3" style={{ color: "var(--neutral-gray)" }}>
            Infobip powers SMS and WhatsApp messaging in automation sequences.
            Ideal for the DACH region with reliable delivery rates.
          </p>
          <ul
            className="text-xs space-y-1 list-disc list-inside"
            style={{ color: "var(--neutral-gray)" }}
          >
            <li>Day-before reminders via SMS</li>
            <li>WhatsApp appointment confirmations</li>
            <li>Multi-channel delivery with fallback</li>
          </ul>
        </div>
      </div>

      {/* Footer Actions */}
      <div
        className="px-4 py-3 border-t-2 flex items-center justify-between"
        style={{ borderColor: "var(--win95-border)" }}
      >
        <div>
          {connection && (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded transition-colors"
              style={{ color: "var(--error)" }}
            >
              <Trash2 size={14} />
              Disconnect
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {connection && (
            <button
              onClick={handleTest}
              disabled={isTesting}
              className="beveled-button px-4 py-2 text-xs font-bold flex items-center gap-2"
              style={{
                backgroundColor: "var(--win95-button-face)",
                color: "var(--win95-text)",
              }}
            >
              {isTesting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <TestTube size={14} />
              )}
              Test Connection
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="beveled-button px-4 py-2 text-xs font-bold text-white flex items-center gap-2"
            style={{ background: "var(--win95-highlight)" }}
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {connection ? "Update" : "Connect"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Step 3: Wire Up in Main Component

Update `src/components/window-content/integrations-window/index.tsx`:

### Add imports (around line 9):

```typescript
import { ResendSettings } from "./resend-settings";
import { InfobipSettings } from "./infobip-settings";
```

### Add routing in the switch statement (around line 857):

```typescript
// Show selected integration settings
if (selectedIntegration) {
  if (selectedIntegration.type === "builtin" && selectedIntegration.id === "github") {
    return <GitHubSettings onBack={handleBack} />;
  }
  if (selectedIntegration.type === "builtin" && selectedIntegration.id === "vercel") {
    return <VercelSettings onBack={handleBack} />;
  }
  if (selectedIntegration.type === "builtin" && selectedIntegration.id === "microsoft") {
    return <MicrosoftSettings onBack={handleBack} />;
  }
  // NEW: Resend and Infobip
  if (selectedIntegration.type === "builtin" && selectedIntegration.id === "resend") {
    return <ResendSettings onBack={handleBack} />;
  }
  if (selectedIntegration.type === "builtin" && selectedIntegration.id === "infobip") {
    return <InfobipSettings onBack={handleBack} />;
  }
  // ... rest of existing code
}
```

---

## Step 4: Backend - Service Connections

File: `convex/connections/serviceConnections.ts`

```typescript
import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  internalAction,
  mutation,
  query,
} from "../_generated/server";
import { internal } from "../_generated/api";

// ==================== QUERIES ====================

export const getServiceConnection = query({
  args: {
    organizationId: v.id("organizations"),
    provider: v.union(v.literal("resend"), v.literal("infobip")),
  },
  handler: async (ctx, args) => {
    // Query oauthConnections for service-type connections
    const connection = await ctx.db
      .query("oauthConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("provider"), args.provider),
          q.eq(q.field("connectionType"), "api_key")
        )
      )
      .first();

    if (!connection) return null;

    // Return without the actual token (security)
    return {
      _id: connection._id,
      provider: connection.provider,
      status: connection.status,
      lastError: connection.lastError,
      customProperties: connection.customProperties,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  },
});

// ==================== MUTATIONS ====================

export const configureServiceConnection = mutation({
  args: {
    organizationId: v.id("organizations"),
    provider: v.union(v.literal("resend"), v.literal("infobip")),
    apiKey: v.optional(v.string()),
    customProperties: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check if connection already exists
    const existing = await ctx.db
      .query("oauthConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("provider"), args.provider),
          q.eq(q.field("connectionType"), "api_key")
        )
      )
      .first();

    const now = Date.now();

    // Encrypt API key if provided
    let encryptedApiKey = existing?.accessToken;
    if (args.apiKey) {
      encryptedApiKey = await ctx.runAction(
        internal.oauth.encryption.encryptToken,
        { token: args.apiKey }
      );
    }

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        accessToken: encryptedApiKey,
        customProperties: args.customProperties ?? existing.customProperties,
        status: "active",
        lastError: undefined,
        updatedAt: now,
      });
      return { connectionId: existing._id, action: "updated" };
    } else {
      // Create new
      if (!encryptedApiKey) {
        throw new Error("API key is required for new connections");
      }

      const connectionId = await ctx.db.insert("oauthConnections", {
        organizationId: args.organizationId,
        provider: args.provider,
        connectionType: "api_key",
        connectionScope: "organizational",
        accessToken: encryptedApiKey,
        refreshToken: "",
        tokenExpiresAt: Date.now() + 100 * 365 * 24 * 60 * 60 * 1000, // 100 years
        scopes: [],
        status: "active",
        customProperties: args.customProperties,
        createdAt: now,
        updatedAt: now,
      });
      return { connectionId, action: "created" };
    }
  },
});

export const deleteServiceConnection = mutation({
  args: {
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const connection = await ctx.db.get(args.connectionId);
    if (!connection) throw new Error("Connection not found");
    if (connection.connectionType !== "api_key") {
      throw new Error("Cannot delete OAuth connection via this method");
    }

    await ctx.db.delete(args.connectionId);
    return { success: true };
  },
});

// ==================== ACTIONS ====================

export const testServiceConnection = internalAction({
  args: {
    organizationId: v.id("organizations"),
    provider: v.union(v.literal("resend"), v.literal("infobip")),
  },
  handler: async (ctx, args) => {
    // Get connection
    const connection = await ctx.runQuery(
      internal.connections.serviceConnections.getServiceConnectionInternal,
      { organizationId: args.organizationId, provider: args.provider }
    );

    if (!connection) {
      return { success: false, error: "Connection not found" };
    }

    // Decrypt API key
    const apiKey = await ctx.runAction(internal.oauth.encryption.decryptToken, {
      encryptedToken: connection.accessToken,
    });

    // Test based on provider
    try {
      if (args.provider === "resend") {
        const response = await fetch("https://api.resend.com/api-keys", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!response.ok) {
          const error = await response.text();
          return { success: false, error: `Resend API error: ${error}` };
        }
        return { success: true };
      }

      if (args.provider === "infobip") {
        const baseUrl = (connection.customProperties as { baseUrl?: string })?.baseUrl;
        if (!baseUrl) {
          return { success: false, error: "Base URL not configured" };
        }
        const response = await fetch(`${baseUrl}/account/1/balance`, {
          headers: { Authorization: `App ${apiKey}` },
        });
        if (!response.ok) {
          const error = await response.text();
          return { success: false, error: `Infobip API error: ${error}` };
        }
        return { success: true };
      }

      return { success: false, error: "Unknown provider" };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
});

// Internal query that returns the full connection (including encrypted token)
export const getServiceConnectionInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    provider: v.union(v.literal("resend"), v.literal("infobip")),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("oauthConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("provider"), args.provider),
          q.eq(q.field("connectionType"), "api_key")
        )
      )
      .first();
  },
});
```

---

## Step 5: Schema Updates

File: `convex/schemas/coreSchemas.ts`

Add to the `oauthConnections` provider union:

```typescript
provider: v.union(
  // OAuth providers
  v.literal("microsoft"),
  v.literal("google"),
  v.literal("slack"),
  v.literal("salesforce"),
  v.literal("dropbox"),
  v.literal("github"),
  v.literal("vercel"),
  v.literal("okta"),
  // Service providers (API key-based) - NEW
  v.literal("resend"),
  v.literal("infobip"),
),

// Add connection type field
connectionType: v.optional(v.union(
  v.literal("oauth"),
  v.literal("api_key"),
)),
```

---

## Implementation Checklist

### Phase 0: Connections Infrastructure

**Schema:**
- [ ] Add `"resend"` and `"infobip"` to provider union in `coreSchemas.ts`
- [ ] Add `connectionType` field to `oauthConnections`
- [ ] Run `npx convex dev`

**Backend:**
- [ ] Create `convex/connections/serviceConnections.ts`
- [ ] Export from `convex/_generated/api` if needed

**UI - Integration Cards:**
- [ ] Add Resend to `BUILT_IN_INTEGRATIONS`
- [ ] Add Infobip to `BUILT_IN_INTEGRATIONS`

**UI - Settings Components:**
- [ ] Create `resend-settings.tsx`
- [ ] Create `infobip-settings.tsx`
- [ ] Add imports to `index.tsx`
- [ ] Add routing in switch statement

**Testing:**
- [ ] Click Resend card → settings page opens
- [ ] Enter API key → encrypts and saves
- [ ] Test connection → validates with API
- [ ] Click Infobip card → settings page opens
- [ ] Configure SMS sender ID
- [ ] Configure WhatsApp number
- [ ] Run `npm run typecheck && npm run lint`

---

## Brand Assets

### Resend
- **Primary Color**: `#000000` (black)
- **Logo**: Available at resend.com/brand
- **Icon**: `fas fa-envelope` (or custom SVG)

### Infobip
- **Primary Color**: `#FF6B00` (orange)
- **Logo**: Available at infobip.com/brand
- **Icon**: `fas fa-comment-sms` (or custom SVG)

---

## Summary

This document describes adding Resend and Infobip as proper platform integrations:

1. **Add to `BUILT_IN_INTEGRATIONS`** - appear in the grid with other integrations
2. **Create `*-settings.tsx`** - full settings panel like Microsoft/GitHub
3. **Store credentials** - encrypted using existing OAuth infrastructure
4. **Test connection** - verify API key works before saving
5. **Use in automation** - retrieve credentials when sending messages
