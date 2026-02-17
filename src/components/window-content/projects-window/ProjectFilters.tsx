"use client";

import { Filter, X } from "lucide-react";
import {
  InteriorButton,
  InteriorSelect,
} from "@/components/window-content/shared/interior-primitives";

interface ProjectFiltersProps {
  filters: {
    subtype?: string;
    status?: string;
    priority?: string;
  };
  onFilterChange: (filters: { subtype?: string; status?: string; priority?: string }) => void;
}

export function ProjectFilters({ filters, onFilterChange }: ProjectFiltersProps) {
  const subtypes = [
    { value: "", label: "All Types" },
    { value: "client_project", label: "Client Project" },
    { value: "internal", label: "Internal" },
    { value: "campaign", label: "Campaign" },
    { value: "product_development", label: "Product Dev" },
    { value: "other", label: "Other" },
  ];

  const statuses = [
    { value: "", label: "All Statuses" },
    { value: "draft", label: "Draft" },
    { value: "planning", label: "Planning" },
    { value: "active", label: "Active" },
    { value: "on_hold", label: "On Hold" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const priorities = [
    { value: "", label: "All Priorities" },
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "critical", label: "Critical" },
  ];

  const hasActiveFilters = filters.subtype || filters.status || filters.priority;

  const clearFilters = () => {
    onFilterChange({
      subtype: undefined,
      status: undefined,
      priority: undefined,
    });
  };

  return (
    <div
      className="flex flex-wrap items-center gap-3 border-b px-4 py-3"
      style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
    >
      <div className="flex items-center gap-2">
        <Filter size={14} style={{ color: "var(--desktop-menu-text-muted)" }} />
        <span className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
          Filters:
        </span>
      </div>

      <InteriorSelect
        value={filters.subtype || ""}
        onChange={(event) =>
          onFilterChange({
            ...filters,
            subtype: event.target.value || undefined,
          })
        }
        className="w-auto min-w-[132px] px-2 py-1 text-xs"
      >
        {subtypes.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </InteriorSelect>

      <InteriorSelect
        value={filters.status || ""}
        onChange={(event) =>
          onFilterChange({
            ...filters,
            status: event.target.value || undefined,
          })
        }
        className="w-auto min-w-[132px] px-2 py-1 text-xs"
      >
        {statuses.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </InteriorSelect>

      <InteriorSelect
        value={filters.priority || ""}
        onChange={(event) =>
          onFilterChange({
            ...filters,
            priority: event.target.value || undefined,
          })
        }
        className="w-auto min-w-[132px] px-2 py-1 text-xs"
      >
        {priorities.map((priority) => (
          <option key={priority.value} value={priority.value}>
            {priority.label}
          </option>
        ))}
      </InteriorSelect>

      {hasActiveFilters && (
        <InteriorButton variant="danger" size="sm" onClick={clearFilters} className="gap-1">
          <X size={12} />
          Clear
        </InteriorButton>
      )}
    </div>
  );
}
