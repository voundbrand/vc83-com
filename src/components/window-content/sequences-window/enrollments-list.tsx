/**
 * ENROLLMENTS LIST
 *
 * Displays enrollments for sequences with filtering and status management.
 */

"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  Search,
  Filter,
  Users,
  Loader2,
  Play,
  Pause,
  XCircle,
  CheckCircle2,
  Clock,
  Mail,
  ArrowLeft,
  User,
  Calendar,
  MessageSquare,
} from "lucide-react";

interface EnrollmentsListProps {
  organizationId: string;
  sessionId: string;
  sequenceId: string | null;
  onBack: () => void;
}

export function EnrollmentsList({
  organizationId,
  sessionId,
  sequenceId,
  onBack,
}: EnrollmentsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "active" | "paused" | "completed" | "exited" | undefined
  >(undefined);

  const enrollments = useQuery(api.sequences.enrollmentOntology.listEnrollments, {
    sessionId,
    organizationId: organizationId as Id<"organizations">,
    sequenceId: sequenceId ? (sequenceId as Id<"objects">) : undefined,
    status: statusFilter,
    limit: 100,
  });

  const pauseEnrollment = useMutation(api.sequences.enrollmentOntology.pauseEnrollment);
  const resumeEnrollment = useMutation(api.sequences.enrollmentOntology.resumeEnrollment);
  const cancelEnrollment = useMutation(api.sequences.enrollmentOntology.cancelEnrollment);

  const filteredEnrollments =
    enrollments?.filter((e) => e.name.toLowerCase().includes(searchQuery.toLowerCase())) || [];

  const handlePause = async (enrollmentId: string) => {
    try {
      await pauseEnrollment({ sessionId, enrollmentId: enrollmentId as Id<"objects"> });
    } catch (error) {
      console.error("Failed to pause:", error);
    }
  };

  const handleResume = async (enrollmentId: string) => {
    try {
      await resumeEnrollment({ sessionId, enrollmentId: enrollmentId as Id<"objects"> });
    } catch (error) {
      console.error("Failed to resume:", error);
    }
  };

  const handleCancel = async (enrollmentId: string) => {
    if (!confirm("Are you sure you want to cancel this enrollment? Pending messages will be cancelled.")) {
      return;
    }
    try {
      await cancelEnrollment({
        sessionId,
        enrollmentId: enrollmentId as Id<"objects">,
        reason: "manual_removal",
      });
    } catch (error) {
      console.error("Failed to cancel:", error);
    }
  };

  if (enrollments === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--win95-highlight)" }} />
      </div>
    );
  }

  // Stats
  const activeCount = filteredEnrollments.filter((e) => e.status === "active").length;
  const pausedCount = filteredEnrollments.filter((e) => e.status === "paused").length;
  const completedCount = filteredEnrollments.filter((e) => e.status === "completed").length;
  const exitedCount = filteredEnrollments.filter((e) => e.status === "exited").length;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div
        className="border-b-2 p-3"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {sequenceId && (
              <button onClick={onBack} className="retro-button p-1" title="Back">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
              {sequenceId ? "Sequence Enrollments" : "All Enrollments"} ({filteredEnrollments.length})
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2"
              style={{ color: "var(--neutral-gray)" }}
            />
            <input
              type="text"
              placeholder="Search enrollments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="retro-input w-full py-1 pl-7 pr-2 text-xs"
            />
          </div>

          <div className="flex items-center gap-1">
            <Filter className="h-3 w-3" style={{ color: "var(--neutral-gray)" }} />
            <select
              value={statusFilter || "all"}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value === "all"
                    ? undefined
                    : (e.target.value as "active" | "paused" | "completed" | "exited")
                )
              }
              className="retro-input py-1 pl-2 pr-6 text-xs"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="exited">Exited</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: "var(--neutral-gray)" }}>
          <span>
            <strong style={{ color: "var(--success)" }}>{activeCount}</strong> Active
          </span>
          <span>
            <strong style={{ color: "var(--warning)" }}>{pausedCount}</strong> Paused
          </span>
          <span>
            <strong style={{ color: "var(--win95-highlight)" }}>{completedCount}</strong> Completed
          </span>
          <span>
            <strong style={{ color: "var(--neutral-gray)" }}>{exitedCount}</strong> Exited
          </span>
        </div>
      </div>

      {/* Enrollments List */}
      <div className="flex-1 overflow-auto p-4">
        {filteredEnrollments.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Users
                className="mx-auto h-16 w-16 mb-3"
                style={{ color: "var(--neutral-gray)", opacity: 0.3 }}
              />
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {enrollments.length === 0
                  ? "No enrollments yet"
                  : "No enrollments match your filters"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEnrollments.map((enrollment) => (
              <EnrollmentRow
                key={enrollment._id}
                enrollment={enrollment}
                onPause={() => handlePause(enrollment._id)}
                onResume={() => handleResume(enrollment._id)}
                onCancel={() => handleCancel(enrollment._id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface EnrollmentRowProps {
  enrollment: {
    _id: string;
    name: string;
    status: string;
    description?: string;
    createdAt: number;
    customProperties?: {
      sequenceId?: string;
      contactId?: string;
      bookingId?: string;
      enrolledAt?: number;
      enrolledBy?: string;
      currentStepIndex?: number;
      completedSteps?: string[];
      exitReason?: string;
    };
  };
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

function EnrollmentRow({ enrollment, onPause, onResume, onCancel }: EnrollmentRowProps) {
  const props = enrollment.customProperties;
  const completedSteps = props?.completedSteps?.length || 0;
  const currentStep = (props?.currentStepIndex || 0) + 1;

  const getStatusConfig = () => {
    switch (enrollment.status) {
      case "active":
        return {
          icon: <Play className="h-3 w-3" />,
          label: "Active",
          bg: "var(--success)",
          text: "white",
        };
      case "paused":
        return {
          icon: <Pause className="h-3 w-3" />,
          label: "Paused",
          bg: "var(--warning)",
          text: "var(--win95-text)",
        };
      case "completed":
        return {
          icon: <CheckCircle2 className="h-3 w-3" />,
          label: "Completed",
          bg: "var(--win95-highlight)",
          text: "white",
        };
      case "exited":
        return {
          icon: <XCircle className="h-3 w-3" />,
          label: "Exited",
          bg: "var(--neutral-gray)",
          text: "white",
        };
      default:
        return {
          icon: <Clock className="h-3 w-3" />,
          label: enrollment.status,
          bg: "var(--neutral-gray)",
          text: "white",
        };
    }
  };

  const status = getStatusConfig();
  const enrolledDate = props?.enrolledAt
    ? new Date(props.enrolledAt).toLocaleDateString()
    : new Date(enrollment.createdAt).toLocaleDateString();

  return (
    <div
      className="border-2 p-3 flex items-center justify-between"
      style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
    >
      <div className="flex items-center gap-3 flex-1">
        {/* Icon */}
        <div
          className="p-2 border"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
        >
          <User className="h-4 w-4" style={{ color: "var(--win95-highlight)" }} />
        </div>

        {/* Info */}
        <div className="flex-1">
          <h4 className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
            {enrollment.name}
          </h4>
          <div
            className="flex items-center gap-3 mt-1 text-[10px]"
            style={{ color: "var(--neutral-gray)" }}
          >
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {enrolledDate}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Step {currentStep} ({completedSteps} completed)
            </span>
            {props?.enrolledBy && (
              <span>Source: {props.enrolledBy}</span>
            )}
          </div>
          {enrollment.status === "exited" && props?.exitReason && (
            <p className="text-[10px] mt-1" style={{ color: "var(--error)" }}>
              Exit reason: {props.exitReason.replace(/_/g, " ")}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Status Badge */}
        <div
          className="inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] font-bold"
          style={{ borderColor: "var(--win95-border)", background: status.bg, color: status.text }}
        >
          {status.icon}
          {status.label}
        </div>

        {/* Action Buttons */}
        {enrollment.status === "active" && (
          <button
            onClick={onPause}
            className="retro-button p-1"
            title="Pause enrollment"
          >
            <Pause className="h-3 w-3" />
          </button>
        )}
        {enrollment.status === "paused" && (
          <button
            onClick={onResume}
            className="retro-button p-1"
            title="Resume enrollment"
          >
            <Play className="h-3 w-3" />
          </button>
        )}
        {(enrollment.status === "active" || enrollment.status === "paused") && (
          <button
            onClick={onCancel}
            className="retro-button p-1"
            style={{ color: "var(--error)" }}
            title="Cancel enrollment"
          >
            <XCircle className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
