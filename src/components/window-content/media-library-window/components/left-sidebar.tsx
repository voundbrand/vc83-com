"use client";

/**
 * LEFT SIDEBAR - Navigation and folder tree
 */

import { useState } from "react";
import { useQuery } from "convex/react";
import type { FunctionReference } from "convex/server";
import { Home, Folder, Star, ChevronRight, ChevronDown } from "lucide-react";

const generatedApi = require("../../../../../convex/_generated/api") as {
  api: {
    mediaFolderOntology: {
      getFolderTree: unknown;
    };
  };
};

interface LeftSidebarProps {
  activeSection: "home" | "folders" | "starred";
  onSectionChange: (section: "home" | "folders" | "starred") => void;
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  organizationId: string;
}

export function LeftSidebar({
  activeSection,
  onSectionChange,
  selectedFolderId,
  onFolderSelect,
  organizationId,
}: LeftSidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Get folder tree
  const folderTree = useQuery(
    generatedApi.api.mediaFolderOntology.getFolderTree as FunctionReference<"query">,
    { organizationId },
  ) as FolderNode[] | undefined;

  const toggleFolder = (folderId: string) => {
    const newSet = new Set(expandedFolders);
    if (newSet.has(folderId)) {
      newSet.delete(folderId);
    } else {
      newSet.add(folderId);
    }
    setExpandedFolders(newSet);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Navigation Sections */}
      <div className="p-2 space-y-1">
        <NavItem
          icon={<Home size={16} />}
          label="Home"
          active={activeSection === "home"}
          onClick={() => {
            onSectionChange("home");
            onFolderSelect(null);
          }}
        />
        <NavItem
          icon={<Folder size={16} />}
          label="Folders"
          active={activeSection === "folders"}
          onClick={() => onSectionChange("folders")}
        />
        <NavItem
          icon={<Star size={16} />}
          label="Starred"
          active={activeSection === "starred"}
          onClick={() => {
            onSectionChange("starred");
            onFolderSelect(null);
          }}
        />
      </div>

      {/* Folder Tree (when in Folders section) */}
      {activeSection === "folders" && (
        <div className="flex-1 overflow-y-auto p-2 border-t-2" style={{ borderColor: "var(--shell-border)" }}>
          {folderTree && folderTree.length > 0 ? (
            <FolderTreeView
              folders={folderTree}
              selectedFolderId={selectedFolderId}
              expandedFolders={expandedFolders}
              onFolderSelect={onFolderSelect}
              onToggleFolder={toggleFolder}
              level={0}
            />
          ) : (
            <p className="text-xs p-2" style={{ color: "var(--neutral-gray)" }}>
              No folders yet
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold rounded transition-colors"
      style={{
        background: active ? "var(--shell-accent-soft)" : "transparent",
        color: active ? "var(--shell-accent)" : "var(--shell-text)",
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

interface FolderNode {
  _id: string;
  name: string;
  customProperties?: { color?: string };
  children?: FolderNode[];
}

interface FolderTreeViewProps {
  folders: FolderNode[];
  selectedFolderId: string | null;
  expandedFolders: Set<string>;
  onFolderSelect: (folderId: string) => void;
  onToggleFolder: (folderId: string) => void;
  level: number;
}

function FolderTreeView({
  folders,
  selectedFolderId,
  expandedFolders,
  onFolderSelect,
  onToggleFolder,
  level,
}: FolderTreeViewProps) {
  return (
    <div className="space-y-1">
      {folders.map((folder) => {
        const hasChildren = folder.children && folder.children.length > 0;
        const isExpanded = expandedFolders.has(folder._id);
        const isSelected = selectedFolderId === folder._id;

        return (
          <div key={folder._id}>
            <button
              onClick={() => onFolderSelect(folder._id)}
              className="w-full flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors"
              style={{
                paddingLeft: `${level * 12 + 8}px`,
                background: isSelected ? "var(--shell-accent-soft)" : "transparent",
                color: isSelected ? "var(--shell-accent)" : "var(--shell-text)",
              }}
            >
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFolder(folder._id);
                  }}
                  className="p-0"
                >
                  {isExpanded ? (
                    <ChevronDown size={12} />
                  ) : (
                    <ChevronRight size={12} />
                  )}
                </button>
              )}
              {!hasChildren && <div className="w-3" />}
              <Folder size={14} style={{ color: folder.customProperties?.color || "var(--primary)" }} />
              <span className="truncate">{folder.name}</span>
            </button>

            {hasChildren && isExpanded && (
              <FolderTreeView
                folders={folder.children || []}
                selectedFolderId={selectedFolderId}
                expandedFolders={expandedFolders}
                onFolderSelect={onFolderSelect}
                onToggleFolder={onToggleFolder}
                level={level + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
