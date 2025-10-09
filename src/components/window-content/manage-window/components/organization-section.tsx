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
    <div
      className="border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] mb-4"
      style={{
        borderColor: 'var(--win95-border)',
        background: 'var(--win95-bg-light)'
      }}
    >
      {/* Header */}
      <div
        className={`px-4 py-3 border-b-2 flex items-center justify-between ${
          collapsible ? "cursor-pointer" : ""
        }`}
        style={{
          background: 'var(--win95-bg)',
          borderColor: 'var(--win95-border)'
        }}
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2">
          {collapsible && (
            <button
              className="p-0.5 transition-colors"
              style={{
                color: 'var(--win95-text)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--win95-bg-light)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
          {icon && <span style={{ color: 'var(--neutral-gray)' }}>{icon}</span>}
          <h3 className="font-bold text-base" style={{ color: 'var(--win95-text)' }}>{title}</h3>
        </div>

        <div className="flex items-center gap-2">
          {actions}
          {canEdit && onEdit && !isCollapsed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="px-3 py-1.5 text-white text-xs font-bold border-2 flex items-center gap-1 transition-colors"
              style={{
                backgroundColor: 'var(--win95-highlight)',
                borderColor: 'var(--win95-border-dark)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
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
