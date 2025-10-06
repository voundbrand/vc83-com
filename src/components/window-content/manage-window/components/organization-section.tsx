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
    <div className="border-2 border-gray-300 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] mb-4">
      {/* Header */}
      <div
        className={`bg-gray-100 px-4 py-3 border-b-2 border-gray-300 flex items-center justify-between ${
          collapsible ? "cursor-pointer" : ""
        }`}
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2">
          {collapsible && (
            <button className="hover:bg-gray-200 p-0.5">
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
          {icon && <span className="text-gray-600">{icon}</span>}
          <h3 className="font-bold text-base">{title}</h3>
        </div>

        <div className="flex items-center gap-2">
          {actions}
          {canEdit && onEdit && !isCollapsed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold border-2 border-black hover:bg-purple-700 flex items-center gap-1"
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
