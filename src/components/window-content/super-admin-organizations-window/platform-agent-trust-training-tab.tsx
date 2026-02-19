"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuth } from "@/hooks/use-auth";
import type { Id } from "../../../../convex/_generated/dataModel";
import { InterviewRunner } from "@/components/interview/interview-runner";
import { InterviewResults } from "@/components/interview/interview-results";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  PlayCircle,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../../../../convex/_generated/api");

type TrainingStatusResponse = {
  platformOrgId: Id<"organizations">;
  platformOrgName: string;
  trainingChannel: string;
  parityMode: string;
  trustTrainingTemplateId: Id<"objects"> | null;
  customerBaselineTemplateId: Id<"objects"> | null;
  customerTemplateLink: string;
  startGuardToken: string;
  publishGuardToken: string;
  needsTemplateSeed: boolean;
  canStartTraining: boolean;
  completedToday: boolean;
  publishedToday: boolean;
  activeSession: {
    sessionId: Id<"agentSessions">;
    startedAt: number;
    agentId: Id<"objects">;
  } | null;
  latestCompletedSession: {
    sessionId: Id<"agentSessions">;
    startedAt: number;
    completedAt: number;
    contentDNAId: string | null;
    isPublished: boolean;
  } | null;
  parityChecklist: string[];
  recentSessions: Array<{
    sessionId: Id<"agentSessions">;
    status: string;
    startedAt: number;
    completedAt: number;
    contentDNAId: string | null;
    memoryConsentStatus: string | null;
    isPublished: boolean;
  }>;
};

export function PlatformAgentTrustTrainingTab() {
  const { sessionId } = useAuth();
  const trustTrainingApi = generatedApi.api.onboarding.seedPlatformAgents;

  const status = useQuery(
    trustTrainingApi.getTrustTrainingLoopStatus,
    sessionId ? { sessionId } : "skip",
  ) as TrainingStatusResponse | undefined;

  const startTrainingSession = useMutation(trustTrainingApi.startTrustTrainingSession);
  const publishTrainingSession = useMutation(trustTrainingApi.publishTrustTrainingSession);

  const [localActiveSessionId, setLocalActiveSessionId] = useState<Id<"agentSessions"> | null>(null);
  const [selectedContentDNAId, setSelectedContentDNAId] = useState<Id<"objects"> | null>(null);

  const [startTokenInput, setStartTokenInput] = useState("");
  const [startOperatorNote, setStartOperatorNote] = useState("");
  const [startParityAccepted, setStartParityAccepted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const [publishTokenInput, setPublishTokenInput] = useState("");
  const [publishOperatorNote, setPublishOperatorNote] = useState("");
  const [publishParityAccepted, setPublishParityAccepted] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const [statusMessage, setStatusMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const showMessage = (message: string, type: "success" | "error") => {
    setStatusMessage(message);
    setMessageType(type);
    setTimeout(() => {
      setStatusMessage("");
      setMessageType("");
    }, 5000);
  };

  const activeSessionId = useMemo(() => {
    return (localActiveSessionId || status?.activeSession?.sessionId || null) as Id<"agentSessions"> | null;
  }, [localActiveSessionId, status?.activeSession?.sessionId]);

  const latestCompletedSessionId = status?.latestCompletedSession?.sessionId || null;
  const latestContentDNAId =
    (status?.latestCompletedSession?.contentDNAId as Id<"objects"> | null) || null;
  const contentDNAIdToShow = selectedContentDNAId || latestContentDNAId;

  useEffect(() => {
    if (!status?.activeSession && localActiveSessionId) {
      setLocalActiveSessionId(null);
    }
  }, [status?.activeSession, localActiveSessionId]);

  if (!sessionId) {
    return (
      <div className="p-6">
        <div className="border-2 p-4 rounded" style={{ borderColor: "#dc2626", background: "#fef2f2" }}>
          <div className="flex items-start gap-2">
            <AlertCircle size={18} style={{ color: "#dc2626" }} />
            <div>
              <p className="font-bold text-sm" style={{ color: "#991b1b" }}>Authentication Required</p>
              <p className="text-xs mt-1" style={{ color: "#b91c1c" }}>
                Sign in as super admin to run platform trust training.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={28} className="animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  const startReady =
    status.canStartTraining &&
    startTokenInput === status.startGuardToken &&
    startParityAccepted &&
    startOperatorNote.trim().length >= 20;
  const publishReady =
    Boolean(latestCompletedSessionId) &&
    !status.latestCompletedSession?.isPublished &&
    publishTokenInput === status.publishGuardToken &&
    publishParityAccepted &&
    publishOperatorNote.trim().length >= 20;

  const handleStartTraining = async () => {
    if (!sessionId || !startReady) return;
    setIsStarting(true);
    try {
      const result = await startTrainingSession({
        sessionId,
        confirmationToken: startTokenInput,
        parityChecklistAccepted: startParityAccepted,
        operatorNote: startOperatorNote.trim(),
      });
      if (result?.sessionId) {
        setLocalActiveSessionId(result.sessionId as Id<"agentSessions">);
      }
      setStartTokenInput("");
      setStartOperatorNote("");
      setStartParityAccepted(false);
      showMessage(result?.alreadyActive ? "Training session already active. Resuming it now." : "Daily trust-training session started.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start trust-training session.";
      showMessage(message, "error");
    } finally {
      setIsStarting(false);
    }
  };

  const handlePublishTraining = async () => {
    if (!sessionId || !latestCompletedSessionId || !publishReady) return;
    setIsPublishing(true);
    try {
      const result = await publishTrainingSession({
        sessionId,
        trainingSessionId: latestCompletedSessionId,
        confirmationToken: publishTokenInput,
        parityChecklistAccepted: publishParityAccepted,
        operatorNote: publishOperatorNote.trim(),
      });
      if (result?.contentDNAId) {
        setSelectedContentDNAId(result.contentDNAId as Id<"objects">);
      }
      setPublishTokenInput("");
      setPublishOperatorNote("");
      setPublishParityAccepted(false);
      showMessage(result?.alreadyPublished ? "Training session already published." : "Trust artifacts published platform-wide.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to publish trust-training session.";
      showMessage(message, "error");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
          <ShieldCheck size={24} style={{ color: "var(--primary)" }} />
          Platform Agent Trust Training
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--window-document-text-muted)" }}>
          Run the daily super-admin trust-training loop with customer-workflow parity.
        </p>
      </div>

      {statusMessage && (
        <div
          className="border-2 rounded p-3 flex items-start gap-2"
          style={{
            borderColor: messageType === "success" ? "#16a34a" : "#dc2626",
            background: messageType === "success" ? "#f0fdf4" : "#fef2f2",
          }}
        >
          {messageType === "success" ? (
            <CheckCircle2 size={16} style={{ color: "#15803d" }} />
          ) : (
            <AlertCircle size={16} style={{ color: "#dc2626" }} />
          )}
          <p className="text-xs" style={{ color: messageType === "success" ? "#166534" : "#991b1b" }}>
            {statusMessage}
          </p>
        </div>
      )}

      <div className="border-2 rounded p-4 space-y-4" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="border rounded p-3" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}>
            <p style={{ color: "var(--window-document-text-muted)" }}>Platform Org</p>
            <p className="font-semibold mt-1" style={{ color: "var(--window-document-text)" }}>{status.platformOrgName}</p>
          </div>
          <div className="border rounded p-3" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}>
            <p style={{ color: "var(--window-document-text-muted)" }}>Training Status</p>
            <p className="font-semibold mt-1" style={{ color: "var(--window-document-text)" }}>
              {status.activeSession ? "In Progress" : status.publishedToday ? "Published Today" : "Pending Daily Run"}
            </p>
          </div>
          <div className="border rounded p-3" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}>
            <p style={{ color: "var(--window-document-text-muted)" }}>Parity Mode</p>
            <p className="font-semibold mt-1" style={{ color: "var(--window-document-text)" }}>{status.parityMode}</p>
          </div>
        </div>

        <div className="text-xs">
          <p className="font-semibold mb-2" style={{ color: "var(--window-document-text)" }}>Parity Checklist</p>
          <div className="space-y-1" style={{ color: "var(--window-document-text-muted)" }}>
            {status.parityChecklist.map((item, index) => (
              <p key={item}>
                {index + 1}. {item}
              </p>
            ))}
          </div>
        </div>
      </div>

      {!activeSessionId && (
        <div className="border-2 rounded p-4 space-y-3" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}>
          <div className="flex items-center gap-2">
            <PlayCircle size={16} style={{ color: "var(--primary)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>Start Daily Training Session</p>
          </div>
          <p className="text-xs" style={{ color: "var(--window-document-text-muted)" }}>
            Safeguard token: <span className="font-semibold">{status.startGuardToken}</span>
          </p>
          <input
            type="text"
            value={startTokenInput}
            onChange={(event) => setStartTokenInput(event.target.value)}
            placeholder="Type safeguard token exactly"
            className="w-full px-3 py-2 text-xs"
            style={{
              backgroundColor: "var(--window-document-bg)",
              color: "var(--window-document-text)",
              border: "2px inset",
              borderColor: "var(--window-document-border)",
            }}
          />
          <textarea
            value={startOperatorNote}
            onChange={(event) => setStartOperatorNote(event.target.value)}
            placeholder="Operator note (minimum 20 characters)"
            rows={3}
            className="w-full px-3 py-2 text-xs"
            style={{
              backgroundColor: "var(--window-document-bg)",
              color: "var(--window-document-text)",
              border: "2px inset",
              borderColor: "var(--window-document-border)",
            }}
          />
          <label className="flex items-center gap-2 text-xs" style={{ color: "var(--window-document-text)" }}>
            <input
              type="checkbox"
              checked={startParityAccepted}
              onChange={(event) => setStartParityAccepted(event.target.checked)}
            />
            I confirm customer-facing and platform-agent workflows must stay in parity.
          </label>
          <button
            type="button"
            onClick={handleStartTraining}
            disabled={!startReady || isStarting}
            className="px-4 py-2 text-xs font-semibold border-2 disabled:opacity-50"
            style={{
              borderColor: "var(--window-document-border)",
              backgroundColor: "var(--primary)",
              color: "white",
            }}
          >
            {isStarting ? "Starting..." : "Start Daily Trust Training"}
          </button>
        </div>
      )}

      {activeSessionId && (
        <div className="border-2 rounded overflow-hidden" style={{ borderColor: "var(--window-document-border)" }}>
          <div className="px-4 py-2 border-b-2 flex items-center gap-2" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}>
            <Loader2 size={14} className="animate-spin" style={{ color: "var(--primary)" }} />
            <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
              Guided trust training is active ({activeSessionId})
            </p>
          </div>
          <div className="h-[720px]" style={{ background: "#111827" }}>
            <InterviewRunner
              authSessionId={sessionId}
              sessionId={activeSessionId}
              onComplete={(contentDNAId) => {
                setSelectedContentDNAId(contentDNAId as Id<"objects">);
                showMessage("Interview complete. Publish trust artifacts to finish the daily loop.", "success");
              }}
              showProgress
              className="h-full"
            />
          </div>
        </div>
      )}

      {latestCompletedSessionId && !status.latestCompletedSession?.isPublished && (
        <div className="border-2 rounded p-4 space-y-3" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}>
          <div className="flex items-center gap-2">
            <UploadCloud size={16} style={{ color: "var(--primary)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>Publish Training Artifacts</p>
          </div>
          <p className="text-xs" style={{ color: "var(--window-document-text-muted)" }}>
            Publish safeguard token: <span className="font-semibold">{status.publishGuardToken}</span>
          </p>
          <input
            type="text"
            value={publishTokenInput}
            onChange={(event) => setPublishTokenInput(event.target.value)}
            placeholder="Type publish safeguard token exactly"
            className="w-full px-3 py-2 text-xs"
            style={{
              backgroundColor: "var(--window-document-bg)",
              color: "var(--window-document-text)",
              border: "2px inset",
              borderColor: "var(--window-document-border)",
            }}
          />
          <textarea
            value={publishOperatorNote}
            onChange={(event) => setPublishOperatorNote(event.target.value)}
            placeholder="Publish note (minimum 20 characters)"
            rows={3}
            className="w-full px-3 py-2 text-xs"
            style={{
              backgroundColor: "var(--window-document-bg)",
              color: "var(--window-document-text)",
              border: "2px inset",
              borderColor: "var(--window-document-border)",
            }}
          />
          <label className="flex items-center gap-2 text-xs" style={{ color: "var(--window-document-text)" }}>
            <input
              type="checkbox"
              checked={publishParityAccepted}
              onChange={(event) => setPublishParityAccepted(event.target.checked)}
            />
            I confirm this publish action applies platform-wide and was parity-reviewed.
          </label>
          <button
            type="button"
            onClick={handlePublishTraining}
            disabled={!publishReady || isPublishing}
            className="px-4 py-2 text-xs font-semibold border-2 disabled:opacity-50"
            style={{
              borderColor: "var(--window-document-border)",
              backgroundColor: "var(--primary)",
              color: "white",
            }}
          >
            {isPublishing ? "Publishing..." : "Publish Trust Artifacts"}
          </button>
        </div>
      )}

      {contentDNAIdToShow && (
        <div className="border-2 rounded overflow-hidden" style={{ borderColor: "var(--window-document-border)" }}>
          <div className="px-4 py-2 border-b-2" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}>
            <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
              Latest Published Trust Artifacts
            </p>
          </div>
          <div className="h-[720px]" style={{ background: "#111827" }}>
            <InterviewResults contentDNAId={contentDNAIdToShow} className="h-full" />
          </div>
        </div>
      )}
    </div>
  );
}
