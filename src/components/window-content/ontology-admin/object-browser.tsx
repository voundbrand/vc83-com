"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Search, Plus, Filter, ChevronDown, ChevronRight } from "lucide-react";
import { RetroButton } from "@/components/retro-button";

interface ObjectBrowserProps {
  selectedObjectId: string | null;
  onSelectObject: (objectId: string | null) => void;
}

// Object type emoji mapping
const TYPE_EMOJIS: Record<string, string> = {
  translation: "🌐",
  organization_profile: "🏢",
  organization_contact: "📧",
  organization_social: "📱",
  organization_legal: "⚖️",
  organization_settings: "⚙️",
  address: "🏠",
  event: "📅",
  invoice: "💰",
  contact: "👤",
  custom: "📦",
};

export function ObjectBrowser({ selectedObjectId, onSelectObject }: ObjectBrowserProps) {
  const { sessionId } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedStatus, setSelectedStatus] = useState<string>(""); // Empty = show all statuses
  const [showFilters, setShowFilters] = useState(true);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set()); // Track expanded accordion sections

  // Fetch objects
  // NOTE: When an org is selected, we still fetch ALL objects but filter client-side
  // This ensures global objects (translations, etc.) are always visible
  const objectsData = useQuery(
    api.ontologyAdmin.getAllObjects,
    sessionId
      ? {
          sessionId,
          // Don't filter by org on backend - we'll filter client-side to show global objects too
          search: search || undefined,
          status: selectedStatus || undefined, // Empty string means show all
          limit: 500, // Increased to show all objects
        }
      : "skip"
  );

  // Fetch stats (always get global stats, not filtered by org)
  const stats = useQuery(
    api.ontologyAdmin.getObjectStats,
    sessionId
      ? {
          sessionId,
          // Don't filter by org - show global statistics
        }
      : "skip"
  );

  // Fetch organizations for filter
  const organizations = useQuery(
    api.ontologyAdmin.getAllOrganizations,
    sessionId ? { sessionId } : "skip"
  );

  // Filter objects by selected types AND organization
  const filteredObjects = useMemo(() => {
    if (!objectsData?.objects) return [];
    let filtered = objectsData.objects;

    // Filter by organization (include objects with no org if "All Organizations" selected)
    if (selectedOrg) {
      filtered = filtered.filter((obj) => obj.organization?.id === selectedOrg);
    }

    // Filter by selected types
    if (selectedTypes.size > 0) {
      filtered = filtered.filter((obj) => selectedTypes.has(obj.type));
    }

    return filtered;
  }, [objectsData?.objects, selectedTypes, selectedOrg]);

  // Get unique types from currently org-filtered objects (before type filter is applied)
  const availableTypes = useMemo(() => {
    if (!objectsData?.objects) return [];

    // Start with all objects
    let objectsToCount = objectsData.objects;

    // Apply ONLY organization filter (not type filter)
    if (selectedOrg) {
      objectsToCount = objectsToCount.filter((obj) => obj.organization?.id === selectedOrg);
    }

    // Count types from org-filtered objects
    const typeCounts: Record<string, number> = {};
    objectsToCount.forEach((obj) => {
      typeCounts[obj.type] = (typeCounts[obj.type] || 0) + 1;
    });

    return Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => a.type.localeCompare(b.type));
  }, [objectsData?.objects, selectedOrg]);

  // Get organization counts
  const orgCounts = useMemo(() => {
    if (!objectsData?.objects) return {};
    const counts: Record<string, number> = {};

    objectsData.objects.forEach((obj) => {
      if (obj.organization) {
        counts[obj.organization.id] = (counts[obj.organization.id] || 0) + 1;
      }
    });

    return counts;
  }, [objectsData?.objects]);

  const toggleType = (type: string) => {
    const newTypes = new Set(selectedTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    setSelectedTypes(newTypes);
  };

  const toggleTypeExpansion = (type: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedTypes(newExpanded);
  };

  // Group objects by type
  const groupedObjects = useMemo(() => {
    const groups: Record<string, typeof filteredObjects> = {};

    filteredObjects.forEach((obj) => {
      if (!groups[obj.type]) {
        groups[obj.type] = [];
      }
      groups[obj.type].push(obj);
    });

    return groups;
  }, [filteredObjects]);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--win95-bg)' }}>
      {/* Search - Fixed at top */}
      <div className="p-3 border-b-2 shrink-0" style={{ borderColor: 'var(--win95-border)' }}>
        <div className="relative">
          <Search size={14} className="absolute left-2 top-2" style={{ color: 'var(--neutral-gray)' }} />
          <input
            type="text"
            placeholder="Search objects..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border-2 rounded"
            style={{
              background: 'var(--win95-bg-light)',
              borderColor: 'var(--win95-border)',
              color: 'var(--win95-text)',
            }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Statistics - One-liner */}
      {stats && (
        <div className="px-3 py-2 border-b-2 shrink-0 flex items-center justify-between text-xs" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)', color: 'var(--win95-text)' }}>
          <span>📊 <strong>{stats.total}</strong> objects</span>
          <span><strong>{stats.totalTypes}</strong> types</span>
          <span><strong>{stats.byStatus.active || 0}</strong> active</span>
        </div>
      )}

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        {/* Filters Accordion */}
        <div>
          <button
            className="w-full px-3 py-2 border-b-2 flex items-center justify-between hover:bg-opacity-70 transition-colors"
            style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}
            onClick={() => setShowFilters(!showFilters)}
          >
            <div className="flex items-center gap-2">
              {showFilters ? (
                <ChevronDown size={12} style={{ color: 'var(--win95-text)' }} />
              ) : (
                <ChevronRight size={12} style={{ color: 'var(--win95-text)' }} />
              )}
              <Filter size={12} style={{ color: 'var(--win95-text)' }} />
              <span className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>
                Filters
              </span>
            </div>
            {filteredObjects.length > 0 && (
              <span className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                {filteredObjects.length} shown
              </span>
            )}
          </button>

          {/* Filters Panel */}
          {showFilters && (
            <div className="p-3 border-b-2 space-y-3" style={{ borderColor: 'var(--win95-border)' }}>
          {/* Organization Filter */}
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: 'var(--win95-text)' }}>
              Organization
            </label>
            <select
              className="w-full px-2 py-1 text-xs border-2 rounded"
              style={{
                background: 'var(--win95-bg-light)',
                borderColor: 'var(--win95-border)',
                color: 'var(--win95-text)',
              }}
              value={selectedOrg || ""}
              onChange={(e) => setSelectedOrg(e.target.value || null)}
            >
              <option value="">All Organizations</option>
              {organizations?.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({orgCounts[org.id] || 0} objects)
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: 'var(--win95-text)' }}>
              Object Type
            </label>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {availableTypes.map((typeData) => (
                <label key={typeData.type} className="flex items-center gap-2 cursor-pointer justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedTypes.has(typeData.type)}
                      onChange={() => toggleType(typeData.type)}
                      className="w-3 h-3"
                    />
                    <span className="text-xs" style={{ color: 'var(--win95-text)' }}>
                      {TYPE_EMOJIS[typeData.type] || "📦"} {typeData.type}
                    </span>
                  </div>
                  <span className="text-xs font-bold" style={{ color: 'var(--neutral-gray)' }}>
                    ({typeData.count})
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: 'var(--win95-text)' }}>
              Status
            </label>
            <div className="flex gap-2 flex-wrap">
              <button
                className="px-2 py-1 text-xs rounded border-2"
                style={{
                  background: selectedStatus === "" ? 'var(--win95-highlight)' : 'var(--win95-bg-light)',
                  borderColor: selectedStatus === "" ? 'var(--win95-highlight)' : 'var(--win95-border)',
                  color: selectedStatus === "" ? '#ffffff' : 'var(--win95-text)',
                }}
                onClick={() => setSelectedStatus("")}
              >
                All
              </button>
              {["active", "pending", "approved", "deleted"].map((status) => (
                <button
                  key={status}
                  className="px-2 py-1 text-xs rounded border-2"
                  style={{
                    background: selectedStatus === status ? 'var(--win95-highlight)' : 'var(--win95-bg-light)',
                    borderColor: selectedStatus === status ? 'var(--win95-highlight)' : 'var(--win95-border)',
                    color: selectedStatus === status ? '#ffffff' : 'var(--win95-text)',
                  }}
                  onClick={() => setSelectedStatus(status)}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
          )}
        </div>

        {/* Object List - Grouped by Type */}
      <div>
        {Object.keys(groupedObjects).length === 0 && (
          <div className="p-8 text-center">
            <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
              No objects found
            </p>
          </div>
        )}

        {Object.entries(groupedObjects)
          .sort(([typeA], [typeB]) => typeA.localeCompare(typeB))
          .map(([type, objects]) => (
            <div key={type}>
              {/* Accordion Header */}
              <button
                className="w-full p-3 border-b-2 flex items-center justify-between hover:bg-opacity-50 transition-colors"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-bg-light)',
                }}
                onClick={() => toggleTypeExpansion(type)}
              >
                <div className="flex items-center gap-2">
                  {expandedTypes.has(type) ? (
                    <ChevronDown size={14} style={{ color: 'var(--win95-text)' }} />
                  ) : (
                    <ChevronRight size={14} style={{ color: 'var(--win95-text)' }} />
                  )}
                  <span className="text-lg">{TYPE_EMOJIS[type] || "📦"}</span>
                  <span className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>
                    {type}
                  </span>
                </div>
                <span className="text-xs font-bold" style={{ color: 'var(--neutral-gray)' }}>
                  {objects.length}
                </span>
              </button>

              {/* Accordion Content */}
              {expandedTypes.has(type) && (
                <div>
                  {objects.map((obj) => (
                    <div
                      key={obj._id}
                      className="p-3 border-b-2 cursor-pointer transition-colors pl-10"
                      style={{
                        borderColor: 'var(--win95-border)',
                        background: selectedObjectId === obj._id ? 'var(--win95-highlight)' : 'transparent',
                        color: selectedObjectId === obj._id ? '#ffffff' : 'var(--win95-text)',
                      }}
                      onClick={() => onSelectObject(obj._id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate">
                          {obj.name}
                        </div>
                        <div
                          className="text-xs mt-0.5"
                          style={{
                            color: selectedObjectId === obj._id ? 'rgba(255,255,255,0.8)' : 'var(--neutral-gray)',
                          }}
                        >
                          {obj.subtype && `${obj.subtype} • `}
                          {obj.locale && `${obj.locale}`}
                        </div>
                        {obj.organization && (
                          <div
                            className="text-xs mt-0.5"
                            style={{
                              color: selectedObjectId === obj._id ? 'rgba(255,255,255,0.8)' : 'var(--neutral-gray)',
                            }}
                          >
                            🏢 {obj.organization.name}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Create Button - Fixed at bottom */}
      <div className="p-3 border-t-2 shrink-0" style={{ borderColor: 'var(--win95-border)' }}>
        <RetroButton className="w-full" variant="primary">
          <Plus size={14} className="inline mr-1" />
          Create New Object
        </RetroButton>
      </div>
    </div>
  );
}
