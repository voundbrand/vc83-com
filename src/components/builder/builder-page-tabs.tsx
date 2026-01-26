"use client";

/**
 * BUILDER PAGE TABS
 *
 * Horizontal tab bar showing all pages in the current project.
 * Allows switching between pages, adding new pages, and page management.
 */

import { useState, useRef, useEffect } from "react";
import { useBuilder } from "@/contexts/builder-context";
import {
  Plus,
  X,
  MoreHorizontal,
  Copy,
  Edit2,
  Trash2,
  Home,
  FileText,
} from "lucide-react";

interface PageTabProps {
  pageId: string;
  name: string;
  slug: string;
  isActive: boolean;
  isDefault?: boolean;
  onSelect: () => void;
  onRename: (newName: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

function PageTab({
  pageId,
  name,
  slug,
  isActive,
  isDefault,
  onSelect,
  onRename,
  onDuplicate,
  onDelete,
  canDelete,
}: PageTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenu]);

  const handleSaveRename = () => {
    if (editName.trim() && editName !== name) {
      onRename(editName.trim());
    } else {
      setEditName(name);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveRename();
    } else if (e.key === "Escape") {
      setEditName(name);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg cursor-pointer transition-all ${
        isActive
          ? "bg-zinc-800 text-white border-t border-l border-r border-zinc-600"
          : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
      }`}
      onClick={onSelect}
    >
      {/* Page icon */}
      {isDefault ? (
        <Home className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
      ) : (
        <FileText className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
      )}

      {/* Page name */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleSaveRename}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="bg-zinc-700 text-white text-sm px-1 py-0.5 rounded border border-zinc-500 focus:outline-none focus:border-purple-500 w-24"
        />
      ) : (
        <span
          className="text-sm truncate max-w-[100px]"
          title={`${name} (/${slug})`}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          {name}
        </span>
      )}

      {/* Menu button (visible on hover or when active) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className={`p-0.5 rounded hover:bg-zinc-600 transition-colors ${
          isActive || showMenu ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>

      {/* Dropdown menu */}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute top-full left-0 mt-1 z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[140px]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setIsEditing(true);
              setShowMenu(false);
            }}
            className="w-full px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Rename
          </button>
          <button
            onClick={() => {
              onDuplicate();
              setShowMenu(false);
            }}
            className="w-full px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
          >
            <Copy className="w-3.5 h-3.5" />
            Duplicate
          </button>
          {canDelete && (
            <>
              <div className="my-1 border-t border-zinc-700" />
              <button
                onClick={() => {
                  onDelete();
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-zinc-700 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function BuilderPageTabs() {
  const {
    pages,
    currentPageId,
    setCurrentPage,
    addPage,
    renamePage,
    duplicatePage,
    deletePage,
  } = useBuilder();

  const [showNewPageInput, setShowNewPageInput] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const newPageInputRef = useRef<HTMLInputElement>(null);

  // Focus new page input when shown
  useEffect(() => {
    if (showNewPageInput && newPageInputRef.current) {
      newPageInputRef.current.focus();
    }
  }, [showNewPageInput]);

  const handleAddPage = () => {
    if (newPageName.trim()) {
      const pageId = addPage(newPageName.trim());
      setCurrentPage(pageId);
      setNewPageName("");
      setShowNewPageInput(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddPage();
    } else if (e.key === "Escape") {
      setNewPageName("");
      setShowNewPageInput(false);
    }
  };

  // Don't render if no pages
  if (pages.length === 0) {
    return null;
  }

  return (
    <div className="flex items-end gap-1 px-2 pt-1 bg-zinc-900 border-b border-zinc-700 overflow-x-auto">
      {/* Page tabs */}
      {pages.map((page) => (
        <PageTab
          key={page.id}
          pageId={page.id}
          name={page.name}
          slug={page.slug}
          isActive={page.id === currentPageId}
          isDefault={page.isDefault}
          onSelect={() => setCurrentPage(page.id)}
          onRename={(newName) => renamePage(page.id, newName)}
          onDuplicate={() => duplicatePage(page.id)}
          onDelete={() => deletePage(page.id)}
          canDelete={pages.length > 1}
        />
      ))}

      {/* Add new page button/input */}
      {showNewPageInput ? (
        <div className="flex items-center gap-1 px-2 py-1.5">
          <input
            ref={newPageInputRef}
            type="text"
            value={newPageName}
            onChange={(e) => setNewPageName(e.target.value)}
            onBlur={() => {
              if (!newPageName.trim()) {
                setShowNewPageInput(false);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Page name..."
            className="bg-zinc-700 text-white text-sm px-2 py-1 rounded border border-zinc-500 focus:outline-none focus:border-purple-500 w-28"
          />
          <button
            onClick={handleAddPage}
            disabled={!newPageName.trim()}
            className="p-1 text-green-400 hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setNewPageName("");
              setShowNewPageInput(false);
            }}
            className="p-1 text-zinc-400 hover:text-zinc-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowNewPageInput(true)}
          className="flex items-center gap-1 px-2 py-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Add new page"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">New Page</span>
        </button>
      )}
    </div>
  );
}
