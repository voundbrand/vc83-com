/**
 * WORKFLOW LIST
 *
 * Displays all workflows in a filterable, sortable list.
 * Shows workflow cards with status, object count, and behavior count.
 */

"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { WorkflowCard } from "./workflow-card";
import { Search, Filter, Zap, Loader2 } from "lucide-react";

interface WorkflowListProps {
  organizationId: string;
  sessionId: string;
  onEditWorkflow: (workflowId: string) => void;
  onCreateNew: () => void;
}

export function WorkflowList({
  organizationId,
  sessionId,
  onEditWorkflow,
  onCreateNew,
}: WorkflowListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [subtypeFilter, setSubtypeFilter] = useState<string | undefined>(undefined);

  // Query workflows
  const workflows = useQuery(
    api.workflows.workflowOntology.listWorkflows,
    {
      sessionId,
      organizationId: organizationId as any,
      status: statusFilter,
      subtype: subtypeFilter,
    }
  );

  // Filter by search query
  const filteredWorkflows = workflows?.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Group by status
  const activeWorkflows = filteredWorkflows.filter((w) => w.status === "active");
  const draftWorkflows = filteredWorkflows.filter((w) => w.status === "draft");
  const archivedWorkflows = filteredWorkflows.filter((w) => w.status === "archived");

  if (workflows === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--win95-highlight)' }} />
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md text-center">
          <Zap className="mx-auto h-16 w-16" style={{ color: 'var(--neutral-gray)', opacity: 0.3 }} />
          <h3 className="mt-4 text-sm font-bold" style={{ color: 'var(--win95-text)' }}>No workflows yet</h3>
          <p className="mt-2 text-xs" style={{ color: 'var(--neutral-gray)' }}>
            Create your first workflow to orchestrate multi-object behaviors and automation.
          </p>
          <button
            onClick={onCreateNew}
            className="retro-button mt-6 inline-flex items-center gap-2 px-3 py-2 text-xs font-bold"
          >
            <Zap className="h-3 w-3" />
            Create Your First Workflow
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Search and Filters */}
      <div className="border-b-2 p-3" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2" style={{ color: 'var(--neutral-gray)' }} />
            <input
              type="text"
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="retro-input w-full py-1 pl-7 pr-2 text-xs"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            <Filter className="h-3 w-3" style={{ color: 'var(--neutral-gray)' }} />
            <select
              value={statusFilter || "all"}
              onChange={(e) => setStatusFilter(e.target.value === "all" ? undefined : e.target.value)}
              className="retro-input py-1 pl-2 pr-6 text-xs"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Subtype Filter */}
          <select
            value={subtypeFilter || "all"}
            onChange={(e) => setSubtypeFilter(e.target.value === "all" ? undefined : e.target.value)}
            className="retro-input py-1 pl-2 pr-6 text-xs"
          >
            <option value="all">All Types</option>
            <option value="checkout-flow">Checkout Flow</option>
            <option value="form-processing">Form Processing</option>
            <option value="event-registration">Event Registration</option>
          </select>
        </div>

        {/* Stats */}
        <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: 'var(--neutral-gray)' }}>
          <span>
            <strong style={{ color: 'var(--win95-text)' }}>{activeWorkflows.length}</strong> Active
          </span>
          <span>
            <strong style={{ color: 'var(--win95-text)' }}>{draftWorkflows.length}</strong> Draft
          </span>
          <span>
            <strong style={{ color: 'var(--win95-text)' }}>{archivedWorkflows.length}</strong> Archived
          </span>
        </div>
      </div>

      {/* Workflow List */}
      <div className="flex-1 overflow-auto p-4">
        {/* Active Workflows */}
        {activeWorkflows.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--neutral-gray)' }}>
              Active Workflows
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeWorkflows.map((workflow) => (
                <WorkflowCard
                  key={workflow._id}
                  workflow={workflow}
                  sessionId={sessionId}
                  onEdit={() => onEditWorkflow(workflow._id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Draft Workflows */}
        {draftWorkflows.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--neutral-gray)' }}>
              Draft Workflows
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {draftWorkflows.map((workflow) => (
                <WorkflowCard
                  key={workflow._id}
                  workflow={workflow}
                  sessionId={sessionId}
                  onEdit={() => onEditWorkflow(workflow._id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Archived Workflows */}
        {archivedWorkflows.length > 0 && (
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--neutral-gray)' }}>
              Archived Workflows
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {archivedWorkflows.map((workflow) => (
                <WorkflowCard
                  key={workflow._id}
                  workflow={workflow}
                  sessionId={sessionId}
                  onEdit={() => onEditWorkflow(workflow._id)}
                />
              ))}
            </div>
          </div>
        )}

        {filteredWorkflows.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>No workflows match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
