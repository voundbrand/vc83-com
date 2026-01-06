"use client";

import React, { useState, useMemo } from "react";

// Common Font Awesome icons for integrations
const ICON_CATEGORIES = {
  "Web & Cloud": [
    { class: "fas fa-globe", name: "Globe" },
    { class: "fas fa-cloud", name: "Cloud" },
    { class: "fas fa-server", name: "Server" },
    { class: "fas fa-database", name: "Database" },
    { class: "fas fa-network-wired", name: "Network" },
    { class: "fas fa-sitemap", name: "Sitemap" },
  ],
  "Development": [
    { class: "fas fa-code", name: "Code" },
    { class: "fas fa-terminal", name: "Terminal" },
    { class: "fas fa-plug", name: "Plug" },
    { class: "fas fa-cogs", name: "Cogs" },
    { class: "fas fa-robot", name: "Robot" },
    { class: "fas fa-microchip", name: "Microchip" },
  ],
  "Data & Analytics": [
    { class: "fas fa-chart-line", name: "Chart" },
    { class: "fas fa-chart-bar", name: "Bar Chart" },
    { class: "fas fa-chart-pie", name: "Pie Chart" },
    { class: "fas fa-analytics", name: "Analytics" },
    { class: "fas fa-table", name: "Table" },
    { class: "fas fa-stream", name: "Stream" },
  ],
  "Communication": [
    { class: "fas fa-envelope", name: "Email" },
    { class: "fas fa-comments", name: "Comments" },
    { class: "fas fa-phone", name: "Phone" },
    { class: "fas fa-video", name: "Video" },
    { class: "fas fa-bell", name: "Bell" },
    { class: "fas fa-broadcast-tower", name: "Broadcast" },
  ],
  "Business": [
    { class: "fas fa-building", name: "Building" },
    { class: "fas fa-briefcase", name: "Briefcase" },
    { class: "fas fa-users", name: "Users" },
    { class: "fas fa-handshake", name: "Handshake" },
    { class: "fas fa-dollar-sign", name: "Dollar" },
    { class: "fas fa-receipt", name: "Receipt" },
  ],
  "Symbols": [
    { class: "fas fa-bolt", name: "Bolt" },
    { class: "fas fa-star", name: "Star" },
    { class: "fas fa-heart", name: "Heart" },
    { class: "fas fa-shield-alt", name: "Shield" },
    { class: "fas fa-lock", name: "Lock" },
    { class: "fas fa-key", name: "Key" },
  ],
};

interface FAIconPickerProps {
  selectedIcon: string;
  onSelect: (icon: string) => void;
  disabled?: boolean;
}

export function FAIconPicker({ selectedIcon, onSelect, disabled }: FAIconPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>("Web & Cloud");

  // Filter icons based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return ICON_CATEGORIES;
    }

    const query = searchQuery.toLowerCase();
    const filtered: Partial<typeof ICON_CATEGORIES> = {};

    for (const [category, icons] of Object.entries(ICON_CATEGORIES)) {
      const matchingIcons = icons.filter(
        (icon) =>
          icon.name.toLowerCase().includes(query) ||
          icon.class.toLowerCase().includes(query)
      );
      if (matchingIcons.length > 0) {
        filtered[category as keyof typeof ICON_CATEGORIES] = matchingIcons;
      }
    }

    return filtered;
  }, [searchQuery]);

  const hasResults = Object.keys(filteredCategories).length > 0;

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search icons..."
        disabled={disabled}
        className="w-full px-3 py-2 text-sm border-2 disabled:opacity-50"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-input-bg)',
          color: 'var(--win95-text)',
        }}
      />

      {/* Selected Icon Preview */}
      {selectedIcon && (
        <div
          className="flex items-center gap-3 p-3 border-2 rounded"
          style={{
            borderColor: 'var(--win95-highlight)',
            background: 'var(--win95-bg-light)',
          }}
        >
          <div
            className="text-2xl w-10 h-10 flex items-center justify-center rounded"
            style={{ background: 'var(--win95-bg)', color: 'var(--win95-highlight)' }}
          >
            <i className={selectedIcon} />
          </div>
          <div>
            <div className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>
              Selected Icon
            </div>
            <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
              {selectedIcon}
            </div>
          </div>
        </div>
      )}

      {/* Icon Categories */}
      <div
        className="border-2 rounded max-h-64 overflow-y-auto"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg)',
        }}
      >
        {hasResults ? (
          Object.entries(filteredCategories).map(([category, icons]) => (
            <div key={category}>
              {/* Category Header */}
              <button
                onClick={() => setExpandedCategory(
                  expandedCategory === category ? null : category
                )}
                disabled={disabled}
                className="w-full px-3 py-2 flex items-center justify-between text-xs font-bold border-b disabled:opacity-50"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-bg-light)',
                  color: 'var(--win95-text)',
                }}
              >
                <span>{category}</span>
                <span>{expandedCategory === category ? '▼' : '▶'}</span>
              </button>

              {/* Icons Grid */}
              {(expandedCategory === category || searchQuery) && (
                <div className="p-2 grid grid-cols-6 gap-2">
                  {icons.map((icon) => (
                    <button
                      key={icon.class}
                      onClick={() => onSelect(icon.class)}
                      disabled={disabled}
                      className="p-2 rounded flex flex-col items-center gap-1 transition-colors disabled:opacity-50"
                      style={{
                        background: selectedIcon === icon.class ? 'var(--win95-highlight)' : 'transparent',
                        color: selectedIcon === icon.class ? '#ffffff' : 'var(--win95-text)',
                      }}
                      title={icon.name}
                      onMouseEnter={(e) => {
                        if (selectedIcon !== icon.class && !disabled) {
                          e.currentTarget.style.background = 'var(--win95-bg-light)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedIcon !== icon.class) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <i className={`${icon.class} text-lg`} />
                      <span className="text-[10px] truncate max-w-full">{icon.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="p-4 text-center">
            <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
              No icons found matching "{searchQuery}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
