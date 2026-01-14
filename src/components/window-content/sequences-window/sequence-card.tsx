/**
 * SEQUENCE CARD
 *
 * Displays a single sequence in card format with status, steps, and stats.
 */

"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  Mail,
  MoreVertical,
  Edit2,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  ArchiveX,
  Users,
  MessageSquare,
  Smartphone,
} from "lucide-react";

interface SequenceStep {
  id: string;
  channel: string;
  enabled: boolean;
}

interface SequenceObject {
  _id: string;
  type: string;
  name: string;
  status: string;
  subtype?: string;
  description?: string;
  customProperties?: {
    triggerEvent?: string;
    steps?: SequenceStep[];
    totalEnrollments?: number;
    activeEnrollments?: number;
    completedEnrollments?: number;
    messagesSent?: number;
    channels?: string[];
  };
}

interface SequenceCardProps {
  sequence: SequenceObject;
  sessionId: string;
  onEdit: () => void;
  onViewEnrollments: () => void;
}

export function SequenceCard({ sequence, sessionId, onEdit, onViewEnrollments }: SequenceCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const activateSequence = useMutation(api.sequences.sequenceOntology.activateSequence);
  const pauseSequence = useMutation(api.sequences.sequenceOntology.pauseSequence);
  const resumeSequence = useMutation(api.sequences.sequenceOntology.resumeSequence);
  const archiveSequence = useMutation(api.sequences.sequenceOntology.archiveSequence);

  const customProps = sequence.customProperties;
  const stepCount = customProps?.steps?.length || 0;
  const enabledSteps = customProps?.steps?.filter((s) => s.enabled).length || 0;
  const triggerEvent = customProps?.triggerEvent || "manual_enrollment";
  const channels = customProps?.channels || ["email"];
  const activeEnrollments = customProps?.activeEnrollments || 0;
  const messagesSent = customProps?.messagesSent || 0;

  const handleActivate = async () => {
    try {
      await activateSequence({ sessionId, sequenceId: sequence._id as Id<"objects"> });
    } catch (error) {
      console.error("Failed to activate sequence:", error);
    }
    setMenuOpen(false);
  };

  const handlePause = async () => {
    try {
      await pauseSequence({ sessionId, sequenceId: sequence._id as Id<"objects"> });
    } catch (error) {
      console.error("Failed to pause sequence:", error);
    }
    setMenuOpen(false);
  };

  const handleResume = async () => {
    try {
      await resumeSequence({ sessionId, sequenceId: sequence._id as Id<"objects"> });
    } catch (error) {
      console.error("Failed to resume sequence:", error);
    }
    setMenuOpen(false);
  };

  const handleArchive = async () => {
    if (!confirm("Are you sure you want to archive this sequence?")) return;
    try {
      await archiveSequence({ sessionId, sequenceId: sequence._id as Id<"objects"> });
    } catch (error) {
      console.error("Failed to archive sequence:", error);
    }
    setMenuOpen(false);
  };

  const formatTrigger = (trigger: string) => {
    return trigger.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email":
        return <Mail className="h-3 w-3" />;
      case "sms":
        return <MessageSquare className="h-3 w-3" />;
      case "whatsapp":
        return <Smartphone className="h-3 w-3" />;
      default:
        return <Mail className="h-3 w-3" />;
    }
  };

  const statusConfig = {
    active: {
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: "Active",
      bg: "var(--success)",
      text: "var(--win95-bg-light)",
    },
    draft: {
      icon: <Clock className="h-3 w-3" />,
      label: "Draft",
      bg: "var(--warning)",
      text: "var(--win95-text)",
    },
    paused: {
      icon: <Pause className="h-3 w-3" />,
      label: "Paused",
      bg: "var(--neutral-gray)",
      text: "var(--win95-bg-light)",
    },
    archived: {
      icon: <ArchiveX className="h-3 w-3" />,
      label: "Archived",
      bg: "var(--neutral-gray)",
      text: "var(--win95-bg-light)",
    },
  };

  const status = statusConfig[sequence.status as keyof typeof statusConfig] || statusConfig.draft;

  return (
    <div
      className="group relative border-2 p-3 transition-shadow"
      style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-start gap-2">
          <div
            className="border-2 p-1"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
          >
            <Mail className="h-4 w-4" style={{ color: "var(--win95-highlight)" }} />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
              {sequence.name}
            </h4>
            <p className="mt-0.5 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
              {sequence.subtype}
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="retro-button p-1 opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="h-3 w-3" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div
                className="absolute right-0 top-8 z-20 w-40 border-2 py-1 shadow-lg"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
              >
                <button
                  onClick={onEdit}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-opacity-50 transition-colors"
                  style={{ color: "var(--win95-text)" }}
                >
                  <Edit2 className="h-3 w-3" />
                  Edit
                </button>
                {sequence.status === "draft" && (
                  <button
                    onClick={handleActivate}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-opacity-50 transition-colors"
                    style={{ color: "var(--success)" }}
                  >
                    <Play className="h-3 w-3" />
                    Activate
                  </button>
                )}
                {sequence.status === "active" && (
                  <button
                    onClick={handlePause}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-opacity-50 transition-colors"
                    style={{ color: "var(--warning)" }}
                  >
                    <Pause className="h-3 w-3" />
                    Pause
                  </button>
                )}
                {sequence.status === "paused" && (
                  <button
                    onClick={handleResume}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-opacity-50 transition-colors"
                    style={{ color: "var(--success)" }}
                  >
                    <Play className="h-3 w-3" />
                    Resume
                  </button>
                )}
                <button
                  onClick={onViewEnrollments}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-opacity-50 transition-colors"
                  style={{ color: "var(--win95-text)" }}
                >
                  <Users className="h-3 w-3" />
                  View Enrollments
                </button>
                <div className="my-1 border-t" style={{ borderColor: "var(--win95-border)" }} />
                {sequence.status !== "archived" && (
                  <button
                    onClick={handleArchive}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-opacity-50 transition-colors"
                    style={{ color: "var(--error)" }}
                  >
                    <ArchiveX className="h-3 w-3" />
                    Archive
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {sequence.description && (
        <p className="mb-3 text-xs line-clamp-2" style={{ color: "var(--neutral-gray)" }}>
          {sequence.description}
        </p>
      )}

      <div className="mb-3 flex items-center gap-3 text-xs" style={{ color: "var(--neutral-gray)" }}>
        <div className="flex items-center gap-1">
          <Mail className="h-3 w-3" />
          <span>
            {enabledSteps}/{stepCount} steps
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          <span>{activeEnrollments} active</span>
        </div>
        <div className="flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          <span>{messagesSent} sent</span>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        {channels.map((channel, index) => (
          <div
            key={index}
            className="inline-flex items-center gap-1 border px-2 py-0.5 text-[10px]"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
            title={channel}
          >
            {getChannelIcon(channel)}
          </div>
        ))}
      </div>

      <div className="mb-3">
        <div
          className="inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] font-bold"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg)",
            color: "var(--win95-text)",
          }}
        >
          Trigger: {formatTrigger(triggerEvent)}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div
          className="inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] font-bold"
          style={{ borderColor: "var(--win95-border)", background: status.bg, color: status.text }}
        >
          {status.icon}
          {status.label}
        </div>

        <button
          onClick={onEdit}
          className="text-xs font-bold hover:underline"
          style={{ color: "var(--win95-highlight)" }}
        >
          Edit →
        </button>
      </div>
    </div>
  );
}
