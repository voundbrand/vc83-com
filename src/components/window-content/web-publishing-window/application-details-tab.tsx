"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Activity,
  FileCode,
  Settings,
  Bug,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
} from "lucide-react";
import { InteriorButton } from "@/components/ui/interior-button";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { ActivityTimeline } from "./activity-timeline";
import { PageMappingTab } from "./page-mapping-tab";
import type { Id } from "../../../../convex/_generated/dataModel";

interface ApplicationDetailsTabProps {
  applicationId: Id<"objects">;
  applicationName: string;
  onBack: () => void;
}

type SubTab = "activity" | "pages" | "settings";

/**
 * Application Details Tab
 *
 * Provides detailed visibility into a connected application:
 * - Activity Protocol: Real-time data flow tracing
 * - Pages: Detected pages and object bindings
 * - Settings: Sync and logging configuration
 *
 * Features two view modes:
 * - Simple Mode: Human-readable summaries for normal users
 * - Debug Mode: Technical details for advanced debugging
 */
export function ApplicationDetailsTab({
  applicationId,
  applicationName,
  onBack,
}: ApplicationDetailsTabProps) {
  const { sessionId } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("activity");
  const [debugMode, setDebugMode] = useState(false);

  // Get activity stats for the header
  const stats = useQuery(
    api.activityProtocol.getActivityStats,
    sessionId
      ? { sessionId, applicationId, hours: 24 }
      : "skip"
  );

  // Get the application details
  const application = useQuery(
    api.applicationOntology.getApplication,
    sessionId
      ? { sessionId, applicationId }
      : "skip"
  );

  if (!sessionId) {
    return (
      <div className="p-4 text-xs" style={{ color: "var(--neutral-gray)" }}>
        Please log in to view application details.
      </div>
    );
  }

  const getHealthStatus = () => {
    if (!stats) return { status: "unknown", color: "var(--neutral-gray)" };

    if (stats.errorsLast1h > 5) {
      return { status: "critical", color: "var(--error)" };
    }
    if (stats.errorsLast1h > 0 || stats.bySeverity.warning > 10) {
      return { status: "warning", color: "var(--warning)" };
    }
    return { status: "healthy", color: "var(--success)" };
  };

  const health = getHealthStatus();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: "var(--window-document-border)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <InteriorButton
              onClick={onBack}
              variant="secondary"
              size="sm"
              className="flex items-center gap-1 shrink-0"
            >
              <ArrowLeft size={14} />
              Back to list
            </InteriorButton>
            <h3
              className="text-sm font-bold truncate"
              style={{ color: "var(--window-document-text)" }}
            >
              {applicationName}
            </h3>
            <span
              className="flex items-center gap-1 text-xs shrink-0"
              style={{ color: health.color }}
            >
              {health.status === "healthy" && <CheckCircle size={12} />}
              {health.status === "warning" && <AlertTriangle size={12} />}
              {health.status === "critical" && <XCircle size={12} />}
              {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
            </span>
            {stats && (
              <>
                <span
                  className="text-xs shrink-0"
                  style={{ color: "var(--neutral-gray)" }}
                >
                  {stats.total} events (24h)
                </span>
                {stats.errorsLast1h > 0 && (
                  <span
                    className="text-xs px-1.5 py-0.5 shrink-0"
                    style={{
                      background: "var(--error)",
                      color: "white",
                    }}
                  >
                    {stats.errorsLast1h} errors (1h)
                  </span>
                )}
              </>
            )}
          </div>

          {/* Debug Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDebugMode(!debugMode)}
              className="flex items-center gap-2 px-3 py-1.5 border transition-colors"
              style={{
                borderColor: debugMode
                  ? "var(--tone-accent-strong)"
                  : "var(--window-document-border)",
                background: debugMode
                  ? "var(--tone-accent-strong)"
                  : "var(--desktop-shell-accent)",
                color: debugMode ? "white" : "var(--window-document-text)",
              }}
            >
              {debugMode ? <Bug size={14} /> : <Eye size={14} />}
              <span className="text-xs font-bold">
                {debugMode ? "Debug Mode" : "Simple Mode"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div
        className="flex border-b"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--desktop-shell-accent)",
        }}
      >
        <button
          className="px-4 py-2 text-xs font-bold border-r transition-colors flex items-center gap-2"
          style={{
            borderColor: "var(--window-document-border)",
            background:
              activeSubTab === "activity"
                ? "var(--desktop-shell-accent)"
                : "var(--window-document-bg)",
            color:
              activeSubTab === "activity"
                ? "var(--window-document-text)"
                : "var(--neutral-gray)",
          }}
          onClick={() => setActiveSubTab("activity")}
        >
          <Activity size={14} />
          Activity Protocol
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r transition-colors flex items-center gap-2"
          style={{
            borderColor: "var(--window-document-border)",
            background:
              activeSubTab === "pages"
                ? "var(--desktop-shell-accent)"
                : "var(--window-document-bg)",
            color:
              activeSubTab === "pages"
                ? "var(--window-document-text)"
                : "var(--neutral-gray)",
          }}
          onClick={() => setActiveSubTab("pages")}
        >
          <FileCode size={14} />
          Pages & Bindings
        </button>
        <button
          className="px-4 py-2 text-xs font-bold transition-colors flex items-center gap-2"
          style={{
            borderColor: "var(--window-document-border)",
            background:
              activeSubTab === "settings"
                ? "var(--desktop-shell-accent)"
                : "var(--window-document-bg)",
            color:
              activeSubTab === "settings"
                ? "var(--window-document-text)"
                : "var(--neutral-gray)",
          }}
          onClick={() => setActiveSubTab("settings")}
        >
          <Settings size={14} />
          Settings
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeSubTab === "activity" && (
          <ActivityTimeline
            applicationId={applicationId}
            debugMode={debugMode}
          />
        )}

        {activeSubTab === "pages" && (
          <PageMappingTab
            applicationId={applicationId}
            debugMode={debugMode}
          />
        )}

        {activeSubTab === "settings" && (
          <ActivitySettingsPanel
            organizationId={application?.organizationId}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Activity Settings Panel
 */
function ActivitySettingsPanel({
  organizationId,
}: {
  organizationId?: Id<"organizations">;
}) {
  const { sessionId } = useAuth();

  const settings = useQuery(
    api.activityProtocol.getSettings,
    sessionId && organizationId
      ? { sessionId, organizationId }
      : "skip"
  );

  if (!settings) {
    return (
      <div className="p-4 text-xs" style={{ color: "var(--neutral-gray)" }}>
        Loading settings...
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Retention Settings */}
      <div
        className="border p-4"
        style={{
          borderColor: "var(--window-document-border)",
          background: "white",
        }}
      >
        <h4
          className="text-sm font-bold mb-3 flex items-center gap-2"
          style={{ color: "var(--window-document-text)" }}
        >
          <Clock size={14} />
          Data Retention
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              Retention Period
            </span>
            <span
              className="text-xs font-bold"
              style={{ color: "var(--window-document-text)" }}
            >
              {settings.retentionDays} days
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Activity events older than {settings.retentionDays} days are
            automatically deleted.
          </p>
        </div>
      </div>

      {/* Logging Settings */}
      <div
        className="border p-4"
        style={{
          borderColor: "var(--window-document-border)",
          background: "white",
        }}
      >
        <h4
          className="text-sm font-bold mb-3 flex items-center gap-2"
          style={{ color: "var(--window-document-text)" }}
        >
          <Zap size={14} />
          Event Logging
        </h4>
        <div className="space-y-2">
          <LoggingToggle
            label="API Requests"
            description="Log all incoming API calls"
            enabled={settings.logApiRequests}
          />
          <LoggingToggle
            label="Sync Events"
            description="Log data synchronization operations"
            enabled={settings.logSyncEvents}
          />
          <LoggingToggle
            label="Object Changes"
            description="Log object create/update/delete"
            enabled={settings.logObjectChanges}
          />
          <LoggingToggle
            label="Webhooks"
            description="Log webhook send/receive"
            enabled={settings.logWebhooks}
          />
          <LoggingToggle
            label="Debug Events"
            description="Include verbose debug-level events"
            enabled={settings.logDebugEvents}
          />
        </div>
      </div>

      {/* Privacy Settings */}
      <div
        className="border p-4"
        style={{
          borderColor: "var(--window-document-border)",
          background: "white",
        }}
      >
        <h4
          className="text-sm font-bold mb-3 flex items-center gap-2"
          style={{ color: "var(--window-document-text)" }}
        >
          <Eye size={14} />
          Privacy
        </h4>
        <LoggingToggle
          label="Redact PII"
          description="Remove personal information from logs"
          enabled={settings.redactPII}
        />
      </div>
    </div>
  );
}

/**
 * Logging Toggle Component
 */
function LoggingToggle({
  label,
  description,
  enabled,
}: {
  label: string;
  description: string;
  enabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
          {label}
        </span>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          {description}
        </p>
      </div>
      <span
        className="px-2 py-0.5 text-xs font-bold"
        style={{
          background: enabled ? "var(--success)" : "var(--neutral-gray)",
          color: "white",
        }}
      >
        {enabled ? "ON" : "OFF"}
      </span>
    </div>
  );
}
