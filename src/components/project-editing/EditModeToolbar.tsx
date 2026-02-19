"use client";

import { useState } from "react";
import { useEditMode } from "./EditModeContext";
import {
  Edit2,
  Eye,
  Globe,
  Users,
  Loader2,
  ChevronDown,
  X,
  History,
} from "lucide-react";

interface EditModeToolbarProps {
  className?: string;
  position?: "top-right" | "bottom-right" | "top-left" | "bottom-left";
}

export function EditModeToolbar({
  className = "",
  position = "bottom-right",
}: EditModeToolbarProps) {
  const editMode = useEditMode();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!editMode || !editMode.sessionId) {
    return null;
  }

  const {
    isEditMode,
    setEditMode,
    currentLanguage,
    setLanguage,
    isSaving,
    pendingChanges,
    activeEditors,
    userName,
  } = editMode;

  // Position classes
  const positionClasses = {
    "top-right": "top-4 right-4",
    "bottom-right": "bottom-4 right-4",
    "top-left": "top-4 left-4",
    "bottom-left": "bottom-4 left-4",
  };

  // Count active editors (excluding self)
  const otherEditorCount = Object.values(activeEditors).flat().length;

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 ${className}`}
    >
      {/* Collapsed state - just a floating button */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all ${
            isEditMode
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
          }`}
        >
          {isEditMode ? (
            <>
              <Edit2 size={16} />
              <span className="text-sm font-medium">Editing</span>
              {isSaving && <Loader2 size={14} className="animate-spin" />}
            </>
          ) : (
            <>
              <Eye size={16} />
              <span className="text-sm font-medium">View Mode</span>
            </>
          )}
          <ChevronDown size={14} />
        </button>
      )}

      {/* Expanded toolbar */}
      {isExpanded && (
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden min-w-[280px]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <Edit2 size={16} className="text-violet-600" />
              <span className="font-semibold text-gray-900">Content Editor</span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              <X size={16} className="text-gray-500" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4">
            {/* User info */}
            {userName && (
              <div className="text-sm text-gray-600">
                Logged in as <span className="font-medium">{userName}</span>
              </div>
            )}

            {/* Edit mode toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Edit Mode
              </span>
              <button
                onClick={() => setEditMode(!isEditMode)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  isEditMode ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    isEditMode ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Language selector */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Globe size={14} />
                Language
              </span>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setLanguage("de")}
                  className={`px-3 py-1 text-sm font-medium transition-colors ${
                    currentLanguage === "de"
                      ? "bg-violet-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  DE
                </button>
                <button
                  onClick={() => setLanguage("en")}
                  className={`px-3 py-1 text-sm font-medium transition-colors ${
                    currentLanguage === "en"
                      ? "bg-violet-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  EN
                </button>
              </div>
            </div>

            {/* Status indicators */}
            {isEditMode && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                {/* Saving indicator */}
                {isSaving && (
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving changes...</span>
                  </div>
                )}

                {/* Pending changes */}
                {pendingChanges.size > 0 && !isSaving && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <History size={14} />
                    <span>{pendingChanges.size} unsaved changes</span>
                  </div>
                )}

                {/* Other editors */}
                {otherEditorCount > 0 && (
                  <div className="flex items-center gap-2 text-sm text-violet-600">
                    <Users size={14} />
                    <span>
                      {otherEditorCount} other{" "}
                      {otherEditorCount === 1 ? "person" : "people"} editing
                    </span>
                  </div>
                )}

                {/* All saved */}
                {pendingChanges.size === 0 && !isSaving && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>All changes saved</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Instructions */}
          {isEditMode && (
            <div className="px-4 py-3 bg-blue-50 border-t border-blue-100">
              <p className="text-xs text-blue-700">
                <strong>Tip:</strong> Click any highlighted text to edit.
                Press <kbd className="px-1 bg-blue-100 rounded">Esc</kbd> to
                cancel, <kbd className="px-1 bg-blue-100 rounded">Enter</kbd> to
                save.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
