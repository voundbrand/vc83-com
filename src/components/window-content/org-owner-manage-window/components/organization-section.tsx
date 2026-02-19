"use client";

import { ReactNode } from "react";
import { ChevronDown, ChevronRight, Edit2 } from "lucide-react";
import { useState } from "react";

interface OrganizationSectionProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  onEdit?: () => void;
  canEdit?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  actions?: ReactNode;
}

export function OrganizationSection({
  title,
  icon,
  children,
  onEdit,
  canEdit = false,
  collapsible = false,
  defaultCollapsed = false,
  actions,
}: OrganizationSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const handleToggle = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <div className="desktop-interior-panel mb-4 overflow-hidden p-0">
      {/* Header */}
      <div
        className={`flex items-center justify-between border-b px-4 py-3 ${
          collapsible ? "cursor-pointer" : ""
        }`}
        style={{
          background: "var(--desktop-shell-accent)",
          borderColor: "var(--window-document-border)",
        }}
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2">
          {collapsible && (
            <button
              type="button"
              className="inline-flex h-6 w-6 items-center justify-center rounded border"
              style={{
                borderColor: "var(--window-document-border)",
                color: "var(--window-document-text)",
              }}
              onClick={(event) => {
                event.stopPropagation();
                handleToggle();
              }}
              aria-label={isCollapsed ? "Expand section" : "Collapse section"}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
          {icon && <span style={{ color: "var(--desktop-menu-text-muted)" }}>{icon}</span>}
          <h3 className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {actions}
          {canEdit && onEdit && !isCollapsed && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="desktop-interior-button desktop-interior-button-primary h-8 px-2.5 text-[11px] font-semibold"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && <div className="p-4">{children}</div>}
    </div>
  );
}
