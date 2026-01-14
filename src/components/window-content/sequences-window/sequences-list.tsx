/**
 * SEQUENCES LIST
 *
 * Displays all sequences in a filterable, sortable list.
 * Shows sequence cards with status, step count, and enrollment stats.
 */

"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { SequenceCard } from "./sequence-card";
import { Search, Filter, Mail, Loader2 } from "lucide-react";

interface SequencesListProps {
  organizationId: string;
  sessionId: string;
  onEditSequence: (sequenceId: string) => void;
  onViewEnrollments: (sequenceId: string) => void;
  onCreateNew: () => void;
}

export function SequencesList({
  organizationId,
  sessionId,
  onEditSequence,
  onViewEnrollments,
  onCreateNew,
}: SequencesListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [triggerFilter, setTriggerFilter] = useState<string | undefined>(undefined);

  const sequences = useQuery(api.sequences.sequenceOntology.listSequences, {
    sessionId,
    organizationId: organizationId as Id<"organizations">,
    status: statusFilter,
    triggerEvent: triggerFilter,
  });

  const filteredSequences =
    sequences?.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase())) || [];

  const activeSequences = filteredSequences.filter((s) => s.status === "active");
  const draftSequences = filteredSequences.filter((s) => s.status === "draft");
  const pausedSequences = filteredSequences.filter((s) => s.status === "paused");
  const archivedSequences = filteredSequences.filter((s) => s.status === "archived");

  if (sequences === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--win95-highlight)" }} />
      </div>
    );
  }

  if (sequences.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md text-center">
          <Mail className="mx-auto h-16 w-16" style={{ color: "var(--neutral-gray)", opacity: 0.3 }} />
          <h3 className="mt-4 text-sm font-bold" style={{ color: "var(--win95-text)" }}>
            No Sequences Yet
          </h3>
          <p className="mt-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
            Create your first automation sequence to send timed messages via email, SMS, or WhatsApp.
          </p>
          <button
            onClick={onCreateNew}
            className="retro-button mt-6 inline-flex items-center gap-2 px-3 py-2 text-xs font-bold"
          >
            <Mail className="h-3 w-3" />
            Create First Sequence
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div
        className="border-b-2 p-3"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2"
              style={{ color: "var(--neutral-gray)" }}
            />
            <input
              type="text"
              placeholder="Search sequences..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="retro-input w-full py-1 pl-7 pr-2 text-xs"
            />
          </div>

          <div className="flex items-center gap-1">
            <Filter className="h-3 w-3" style={{ color: "var(--neutral-gray)" }} />
            <select
              value={statusFilter || "all"}
              onChange={(e) => setStatusFilter(e.target.value === "all" ? undefined : e.target.value)}
              className="retro-input py-1 pl-2 pr-6 text-xs"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <select
            value={triggerFilter || "all"}
            onChange={(e) => setTriggerFilter(e.target.value === "all" ? undefined : e.target.value)}
            className="retro-input py-1 pl-2 pr-6 text-xs"
          >
            <option value="all">All Triggers</option>
            <option value="booking_confirmed">Booking Confirmed</option>
            <option value="booking_checked_in">Booking Check-In</option>
            <option value="booking_completed">Booking Completed</option>
            <option value="booking_cancelled">Booking Cancelled</option>
            <option value="pipeline_stage_changed">Pipeline Changed</option>
            <option value="contact_tagged">Contact Tagged</option>
            <option value="form_submitted">Form Submitted</option>
            <option value="manual_enrollment">Manual</option>
          </select>
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: "var(--neutral-gray)" }}>
          <span>
            <strong style={{ color: "var(--win95-text)" }}>{activeSequences.length}</strong> Active
          </span>
          <span>
            <strong style={{ color: "var(--win95-text)" }}>{draftSequences.length}</strong> Draft
          </span>
          <span>
            <strong style={{ color: "var(--win95-text)" }}>{pausedSequences.length}</strong> Paused
          </span>
          <span>
            <strong style={{ color: "var(--win95-text)" }}>{archivedSequences.length}</strong> Archived
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {activeSequences.length > 0 && (
          <div className="mb-6">
            <h3
              className="mb-3 text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--neutral-gray)" }}
            >
              Active Sequences
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeSequences.map((sequence) => (
                <SequenceCard
                  key={sequence._id}
                  sequence={sequence}
                  sessionId={sessionId}
                  onEdit={() => onEditSequence(sequence._id)}
                  onViewEnrollments={() => onViewEnrollments(sequence._id)}
                />
              ))}
            </div>
          </div>
        )}

        {draftSequences.length > 0 && (
          <div className="mb-6">
            <h3
              className="mb-3 text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--neutral-gray)" }}
            >
              Draft Sequences
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {draftSequences.map((sequence) => (
                <SequenceCard
                  key={sequence._id}
                  sequence={sequence}
                  sessionId={sessionId}
                  onEdit={() => onEditSequence(sequence._id)}
                  onViewEnrollments={() => onViewEnrollments(sequence._id)}
                />
              ))}
            </div>
          </div>
        )}

        {pausedSequences.length > 0 && (
          <div className="mb-6">
            <h3
              className="mb-3 text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--neutral-gray)" }}
            >
              Paused Sequences
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pausedSequences.map((sequence) => (
                <SequenceCard
                  key={sequence._id}
                  sequence={sequence}
                  sessionId={sessionId}
                  onEdit={() => onEditSequence(sequence._id)}
                  onViewEnrollments={() => onViewEnrollments(sequence._id)}
                />
              ))}
            </div>
          </div>
        )}

        {archivedSequences.length > 0 && (
          <div>
            <h3
              className="mb-3 text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--neutral-gray)" }}
            >
              Archived Sequences
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {archivedSequences.map((sequence) => (
                <SequenceCard
                  key={sequence._id}
                  sequence={sequence}
                  sessionId={sessionId}
                  onEdit={() => onEditSequence(sequence._id)}
                  onViewEnrollments={() => onViewEnrollments(sequence._id)}
                />
              ))}
            </div>
          </div>
        )}

        {filteredSequences.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              No sequences match your filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
