"use client";

import { Filter, X } from "lucide-react";

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
      className="flex flex-wrap items-center gap-3 px-4 py-3 border-b-2"
      style={{
        borderColor: "var(--win95-border)",
        background: "var(--win95-bg-light)",
      }}
    >
      {/* Filter Icon */}
      <div className="flex items-center gap-2">
        <Filter size={14} style={{ color: "var(--neutral-gray)" }} />
        <span className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
          Filters:
        </span>
      </div>

      {/* Type Filter */}
      <select
        value={filters.subtype || ""}
        onChange={(e) =>
          onFilterChange({
            ...filters,
            subtype: e.target.value || undefined,
          })
        }
        className="px-2 py-1 text-xs border-2 focus:outline-none focus:border-black"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg)",
          color: "var(--win95-text)",
        }}
      >
        {subtypes.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>

      {/* Status Filter */}
      <select
        value={filters.status || ""}
        onChange={(e) =>
          onFilterChange({
            ...filters,
            status: e.target.value || undefined,
          })
        }
        className="px-2 py-1 text-xs border-2 focus:outline-none focus:border-black"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg)",
          color: "var(--win95-text)",
        }}
      >
        {statuses.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>

      {/* Priority Filter */}
      <select
        value={filters.priority || ""}
        onChange={(e) =>
          onFilterChange({
            ...filters,
            priority: e.target.value || undefined,
          })
        }
        className="px-2 py-1 text-xs border-2 focus:outline-none focus:border-black"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg)",
          color: "var(--win95-text)",
        }}
      >
        {priorities.map((priority) => (
          <option key={priority.value} value={priority.value}>
            {priority.label}
          </option>
        ))}
      </select>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="px-2 py-1 text-xs font-bold flex items-center gap-1 border-2 transition-colors hover:opacity-80"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-button-face)",
            color: "var(--error)",
          }}
        >
          <X size={12} />
          Clear
        </button>
      )}
    </div>
  );
}
