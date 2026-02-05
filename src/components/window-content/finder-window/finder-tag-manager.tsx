"use client";

/**
 * FINDER TAG MANAGER - Create, edit, delete org-wide tags
 */

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Tag, Plus, Pencil, Trash2, X, Check } from "lucide-react";

const TAG_COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#EAB308",
  "#84CC16", "#22C55E", "#14B8A6", "#06B6D4",
  "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899",
];

interface FinderTagManagerProps {
  sessionId: string;
  organizationId: string;
  onClose: () => void;
}

export function FinderTagManager({ sessionId, organizationId, onClose }: FinderTagManagerProps) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLORS[8]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [error, setError] = useState<string | null>(null);

  const tags = useQuery(api.projectFileSystem.listTags, {
    sessionId,
    organizationId: organizationId as Id<"organizations">,
  });

  const createTag = useMutation(api.projectFileSystem.createTag);
  const updateTag = useMutation(api.projectFileSystem.updateTag);
  const deleteTag = useMutation(api.projectFileSystem.deleteTag);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setError(null);
    try {
      await createTag({
        sessionId,
        organizationId: organizationId as Id<"organizations">,
        name: newName.trim(),
        color: newColor,
      });
      setNewName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tag");
    }
  };

  const handleUpdate = async (tagId: string) => {
    setError(null);
    try {
      await updateTag({
        sessionId,
        tagId: tagId as Id<"organizationTags">,
        name: editName.trim() || undefined,
        color: editColor || undefined,
      });
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update tag");
    }
  };

  const handleDelete = async (tagId: string) => {
    try {
      await deleteTag({ sessionId, tagId: tagId as Id<"organizationTags"> });
    } catch (err) {
      console.error("Delete tag failed:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-full max-w-md p-6 border-2 shadow-lg max-h-[80vh] flex flex-col"
        style={{
          background: "var(--win95-bg)",
          borderColor: "var(--win95-border)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1"
          style={{ color: "var(--neutral-gray)" }}
        >
          <X size={14} />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Tag size={18} style={{ color: "var(--primary)" }} />
          <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
            Manage Tags
          </h3>
        </div>

        {/* Create new tag */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex gap-1">
            {TAG_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setNewColor(color)}
                className="w-5 h-5 rounded-full border-2 transition-transform"
                style={{
                  background: color,
                  borderColor: newColor === color ? "var(--win95-text)" : "transparent",
                  transform: newColor === color ? "scale(1.2)" : "scale(1)",
                }}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="New tag name..."
            className="flex-1 px-3 py-2 text-xs border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg)",
              color: "var(--win95-text)",
            }}
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="flex items-center gap-1 px-3 py-2 text-xs font-bold border-2 rounded"
            style={{
              background: "var(--primary)",
              borderColor: "var(--win95-border)",
              color: "#fff",
              opacity: !newName.trim() ? 0.5 : 1,
            }}
          >
            <Plus size={12} />
            Add
          </button>
        </div>

        {error && (
          <p className="text-xs mb-3" style={{ color: "var(--error-red)" }}>{error}</p>
        )}

        {/* Tag list */}
        <div className="flex-1 overflow-y-auto space-y-1">
          {tags?.map((tag: any) => (
            <div
              key={tag._id}
              className="flex items-center gap-2 px-3 py-2 rounded border"
              style={{ borderColor: "var(--win95-border)" }}
            >
              {editingId === tag._id ? (
                <>
                  <div className="flex gap-1 flex-shrink-0">
                    {TAG_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setEditColor(color)}
                        className="w-4 h-4 rounded-full border"
                        style={{
                          background: color,
                          borderColor: editColor === color ? "var(--win95-text)" : "transparent",
                        }}
                      />
                    ))}
                  </div>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUpdate(tag._id)}
                    className="flex-1 px-2 py-1 text-xs border"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-bg)",
                      color: "var(--win95-text)",
                    }}
                    autoFocus
                  />
                  <button onClick={() => handleUpdate(tag._id)} style={{ color: "var(--success-green)" }}>
                    <Check size={14} />
                  </button>
                  <button onClick={() => setEditingId(null)} style={{ color: "var(--neutral-gray)" }}>
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ background: tag.color }}
                  />
                  <span className="flex-1 text-xs" style={{ color: "var(--win95-text)" }}>
                    {tag.name}
                  </span>
                  <button
                    onClick={() => {
                      setEditingId(tag._id);
                      setEditName(tag.name);
                      setEditColor(tag.color);
                    }}
                    className="p-1"
                    style={{ color: "var(--neutral-gray)" }}
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(tag._id)}
                    className="p-1"
                    style={{ color: "var(--error-red)" }}
                  >
                    <Trash2 size={12} />
                  </button>
                </>
              )}
            </div>
          ))}

          {(!tags || tags.length === 0) && (
            <p className="text-xs text-center py-4" style={{ color: "var(--neutral-gray)" }}>
              No tags yet. Create one above.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
