"use client";

/**
 * FINDER CONTEXT MENU - Right-click menus for files and background
 *
 * Two variants:
 * - File context menu (right-click on a file or folder)
 * - Background context menu (right-click on empty space)
 */

import { useEffect, useRef } from "react";
import {
  FolderPlus,
  FileText,
  Pencil,
  Copy,
  Scissors,
  Clipboard,
  Trash2,
  Download,
  Info,
  FolderInput,
  Files,
  ExternalLink,
  Star,
  Upload,
  Code,
  FileType,
} from "lucide-react";
import type { ProjectFile, ContextMenuState, FileClipboard, ViewMode } from "./finder-types";
import type { SortOption } from "./finder-toolbar";

// ============================================================================
// CONTEXT MENU CONTAINER
// ============================================================================

interface FinderContextMenuProps {
  menu: ContextMenuState;
  onClose: () => void;
  // File actions
  selectedFiles: ProjectFile[];
  onOpen: (file: ProjectFile) => void;
  onRename: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCopyPath: () => void;
  onGetInfo: () => void;
  onToggleBookmark?: () => void;
  // Background actions
  onCreateFolder: () => void;
  onCreateNote: () => void;
  onCreatePlainText?: () => void;
  onCreateCodeFile?: () => void;
  onUploadFile?: () => void;
  // State
  clipboard: FileClipboard;
  onOpenInBuilder?: () => void;
  onOpenInLayers?: () => void;
  // View controls
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export function FinderContextMenu({
  menu,
  onClose,
  selectedFiles,
  onOpen,
  onRename,
  onCopy,
  onCut,
  onPaste,
  onDuplicate,
  onDelete,
  onCopyPath,
  onGetInfo,
  onCreateFolder,
  onCreateNote,
  onCreatePlainText,
  onCreateCodeFile,
  onUploadFile,
  clipboard,
  onOpenInBuilder,
  onOpenInLayers,
  onToggleBookmark,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
}: FinderContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Click-away and Escape to dismiss
  useEffect(() => {
    const handleClickAway = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickAway);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickAway);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  if (menu.type === "file" && menu.file) {
    return (
      <MenuContainer ref={menuRef} position={menu.position}>
        <FileContextMenuItems
          file={menu.file}
          selectedCount={selectedFiles.length}
          onOpen={() => { onOpen(menu.file!); onClose(); }}
          onRename={() => { onRename(); onClose(); }}
          onCopy={() => { onCopy(); onClose(); }}
          onCut={() => { onCut(); onClose(); }}
          onPaste={() => { onPaste(); onClose(); }}
          onDuplicate={() => { onDuplicate(); onClose(); }}
          onDelete={() => { onDelete(); onClose(); }}
          onCopyPath={() => { onCopyPath(); onClose(); }}
          onGetInfo={() => { onGetInfo(); onClose(); }}
          onToggleBookmark={onToggleBookmark ? () => { onToggleBookmark(); onClose(); } : undefined}
          clipboard={clipboard}
          onOpenInBuilder={onOpenInBuilder ? () => { onOpenInBuilder(); onClose(); } : undefined}
          onOpenInLayers={onOpenInLayers ? () => { onOpenInLayers(); onClose(); } : undefined}
        />
      </MenuContainer>
    );
  }

  return (
    <MenuContainer ref={menuRef} position={menu.position}>
      <BackgroundContextMenuItems
        onCreateFolder={() => { onCreateFolder(); onClose(); }}
        onCreateNote={() => { onCreateNote(); onClose(); }}
        onCreatePlainText={onCreatePlainText ? () => { onCreatePlainText(); onClose(); } : undefined}
        onCreateCodeFile={onCreateCodeFile ? () => { onCreateCodeFile(); onClose(); } : undefined}
        onUploadFile={onUploadFile ? () => { onUploadFile(); onClose(); } : undefined}
        onPaste={() => { onPaste(); onClose(); }}
        clipboard={clipboard}
        viewMode={viewMode}
        onViewModeChange={(m) => { onViewModeChange(m); onClose(); }}
        sortBy={sortBy}
        onSortChange={(s) => { onSortChange(s); onClose(); }}
      />
    </MenuContainer>
  );
}

// ============================================================================
// MENU CONTAINER
// ============================================================================

import { forwardRef } from "react";

interface MenuContainerProps {
  position: { top: number; left: number };
  children: React.ReactNode;
}

const MenuContainer = forwardRef<HTMLDivElement, MenuContainerProps>(
  function MenuContainer({ position, children }, ref) {
    return (
      <div
        ref={ref}
        className="fixed z-[999] min-w-[200px] py-1 border rounded-xl shadow-lg"
        style={{
          top: position.top,
          left: position.left,
          background: "var(--window-document-bg-elevated)",
          borderColor: "var(--window-document-border)",
        }}
      >
        {children}
      </div>
    );
  }
);

// ============================================================================
// FILE CONTEXT MENU
// ============================================================================

interface FileContextMenuItemsProps {
  file: ProjectFile;
  selectedCount: number;
  onOpen: () => void;
  onRename: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCopyPath: () => void;
  onGetInfo: () => void;
  onToggleBookmark?: () => void;
  clipboard: FileClipboard;
  onOpenInBuilder?: () => void;
  onOpenInLayers?: () => void;
}

function FileContextMenuItems({
  file,
  selectedCount,
  onOpen,
  onRename,
  onCopy,
  onCut,
  onPaste,
  onDuplicate,
  onDelete,
  onCopyPath,
  onGetInfo,
  onToggleBookmark,
  clipboard,
  onOpenInBuilder,
  onOpenInLayers,
}: FileContextMenuItemsProps) {
  const isFolder = file.fileKind === "folder";
  const isBuilder = file.fileKind === "builder_ref";
  const isLayer = file.fileKind === "layer_ref";
  const multiSelected = selectedCount > 1;

  return (
    <>
      <MenuItem icon={<ExternalLink size={14} />} label="Open" onClick={onOpen} />
      {isBuilder && onOpenInBuilder && (
        <MenuItem icon={<ExternalLink size={14} />} label="Open in Builder" onClick={onOpenInBuilder} />
      )}
      {isLayer && onOpenInLayers && (
        <MenuItem icon={<ExternalLink size={14} />} label="Open in Layers" onClick={onOpenInLayers} />
      )}

      <MenuSeparator />

      {!multiSelected && onToggleBookmark && (
        <MenuItem icon={<Star size={14} />} label="Toggle Favorite" onClick={onToggleBookmark} />
      )}
      {!multiSelected && (
        <MenuItem icon={<Pencil size={14} />} label="Rename" onClick={onRename} shortcut="Enter" />
      )}
      <MenuItem icon={<Copy size={14} />} label="Copy" onClick={onCopy} shortcut="Cmd+C" />
      <MenuItem icon={<Scissors size={14} />} label="Cut" onClick={onCut} shortcut="Cmd+X" />
      {!isFolder && (
        <MenuItem icon={<Files size={14} />} label="Duplicate" onClick={onDuplicate} />
      )}
      {isFolder && clipboard && (
        <MenuItem icon={<Clipboard size={14} />} label="Paste Here" onClick={onPaste} shortcut="Cmd+V" />
      )}

      <MenuSeparator />

      <MenuItem
        icon={<Trash2 size={14} />}
        label={multiSelected ? `Move ${selectedCount} items to Trash` : "Move to Trash"}
        onClick={onDelete}
        shortcut="Del"
      />

      <MenuSeparator />

      <MenuItem icon={<Info size={14} />} label="Get Info" onClick={onGetInfo} />
      <MenuItem icon={<FolderInput size={14} />} label="Copy Path" onClick={onCopyPath} />
    </>
  );
}

// ============================================================================
// BACKGROUND CONTEXT MENU
// ============================================================================

interface BackgroundContextMenuItemsProps {
  onCreateFolder: () => void;
  onCreateNote: () => void;
  onCreatePlainText?: () => void;
  onCreateCodeFile?: () => void;
  onUploadFile?: () => void;
  onPaste: () => void;
  clipboard: FileClipboard;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
}

function BackgroundContextMenuItems({
  onCreateFolder,
  onCreateNote,
  onCreatePlainText,
  onCreateCodeFile,
  onUploadFile,
  onPaste,
  clipboard,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
}: BackgroundContextMenuItemsProps) {
  return (
    <>
      <MenuItem icon={<FolderPlus size={14} />} label="New Folder" onClick={onCreateFolder} shortcut="Cmd+Shift+N" />
      <MenuItem icon={<FileText size={14} />} label="New Note" onClick={onCreateNote} />
      {onCreatePlainText && (
        <MenuItem icon={<FileType size={14} />} label="New Plain Text" onClick={onCreatePlainText} />
      )}
      {onCreateCodeFile && (
        <MenuItem icon={<Code size={14} />} label="New Code File" onClick={onCreateCodeFile} />
      )}

      <MenuSeparator />

      {onUploadFile && (
        <MenuItem icon={<Upload size={14} />} label="Upload File(s)" onClick={onUploadFile} />
      )}

      <MenuSeparator />

      <MenuItem
        icon={<Clipboard size={14} />}
        label="Paste"
        onClick={onPaste}
        shortcut="Cmd+V"
        disabled={!clipboard}
      />

      <MenuSeparator />

      {/* Sort submenu items */}
      <MenuHeader label="Sort by" />
      <MenuItem label="Name" onClick={() => onSortChange("name")} active={sortBy === "name"} />
      <MenuItem label="Date" onClick={() => onSortChange("date")} active={sortBy === "date"} />
      <MenuItem label="Kind" onClick={() => onSortChange("kind")} active={sortBy === "kind"} />

      <MenuSeparator />

      {/* View submenu items */}
      <MenuHeader label="View as" />
      <MenuItem label="Grid" onClick={() => onViewModeChange("grid")} active={viewMode === "grid"} />
      <MenuItem label="List" onClick={() => onViewModeChange("list")} active={viewMode === "list"} />
    </>
  );
}

// ============================================================================
// MENU PRIMITIVES
// ============================================================================

function MenuItem({
  icon,
  label,
  onClick,
  shortcut,
  danger,
  disabled,
  active,
}: {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className="w-full flex items-center gap-3 px-3 py-1.5 text-xs text-left rounded-md transition-colors"
      style={{
        color: disabled
          ? "var(--neutral-gray)"
          : danger
            ? "var(--error-red)"
            : "var(--win95-text)",
        background: active ? "var(--finder-selection-bg)" : "transparent",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = "var(--finder-selection-bg)";
          e.currentTarget.style.color = danger ? "var(--error-red)" : "var(--finder-selection-text)";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = active ? "var(--finder-selection-bg)" : "transparent";
          e.currentTarget.style.color = danger ? "var(--error-red)" : "var(--win95-text)";
        }
      }}
    >
      {icon && <span className="w-4 flex-shrink-0">{icon}</span>}
      {!icon && <span className="w-4 flex-shrink-0" />}
      <span className="flex-1">{label}</span>
      {shortcut && (
        <span className="text-[10px] ml-4" style={{ color: "var(--neutral-gray)" }}>
          {shortcut}
        </span>
      )}
    </button>
  );
}

function MenuSeparator() {
  return (
    <div
      className="my-1 mx-2 h-px"
      style={{ background: "var(--window-document-border)" }}
    />
  );
}

function MenuHeader({ label }: { label: string }) {
  return (
    <p
      className="text-[10px] font-bold px-3 py-1"
      style={{ color: "var(--neutral-gray)" }}
    >
      {label.toUpperCase()}
    </p>
  );
}
