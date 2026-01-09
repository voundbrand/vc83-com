"use client";

import React, { useState } from "react";
import { Send, Trash2, Loader2, MessageSquare } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { useProjectDrawer } from "./ProjectDrawerProvider";
import { useMeetingComments } from "./hooks/useMeetingComments";

interface MeetingCommentsProps {
  meetingId: Id<"objects">;
}

/**
 * Comments section with list and add form
 * Allows clients to view, add, and delete their own comments
 */
export function MeetingComments({ meetingId }: MeetingCommentsProps) {
  const { themeColors, session } = useProjectDrawer();
  const {
    comments,
    isLoading,
    error,
    addComment,
    deleteComment,
    isAddingComment,
    isDeletingComment,
  } = useMeetingComments(meetingId);

  const [newComment, setNewComment] = useState("");

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim()) return;

    try {
      await addComment(newComment.trim());
      setNewComment("");
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  // Check if user owns a comment (compare createdBy with session's contact ID)
  const isOwnComment = (commentCreatedBy: string | undefined) => {
    if (!commentCreatedBy || !session?.sessionId) return false;
    // The comment's createdBy stores the frontend user ID
    return commentCreatedBy === session.sessionId;
  };

  return (
    <div>
      <h3 className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
        <MessageSquare className="w-4 h-4" />
        Kommentare {comments && comments.length > 0 && `(${comments.length})`}
      </h3>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2
            className="w-6 h-6 animate-spin"
            style={{ color: themeColors.primary }}
          />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="py-4 text-sm text-center text-red-600">
          Fehler beim Laden der Kommentare
        </div>
      )}

      {/* Comments list */}
      {!isLoading && !error && (
        <div className="space-y-3 mb-4">
          {comments && comments.length > 0 ? (
            comments.map((comment) => (
              <CommentItem
                key={comment._id}
                comment={{
                  _id: comment._id,
                  text: comment.text || "",
                  authorName: comment.authorName || "Anonym",
                  authorType: comment.authorType || "client",
                  createdAt: comment.createdAt,
                  createdBy: comment.createdBy as string | undefined,
                }}
                isOwn={isOwnComment(comment.createdBy as string | undefined)}
                onDelete={() => deleteComment(comment._id)}
                isDeleting={isDeletingComment === comment._id}
                themeColors={themeColors}
              />
            ))
          ) : (
            <p className="py-4 text-sm text-center text-gray-500">
              Noch keine Kommentare. Schreiben Sie den ersten!
            </p>
          )}
        </div>
      )}

      {/* Add comment form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Kommentar schreiben..."
          className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
          style={{
            borderColor: themeColors.border,
            // @ts-expect-error CSS variable
            "--tw-ring-color": themeColors.primary,
          }}
          disabled={isAddingComment}
        />
        <button
          type="submit"
          disabled={!newComment.trim() || isAddingComment}
          className="flex items-center justify-center w-10 h-10 text-white transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: themeColors.primary }}
        >
          {isAddingComment ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  );
}

interface CommentItemProps {
  comment: {
    _id: Id<"objects">;
    text: string;
    authorName: string;
    authorType: "admin" | "client";
    createdAt: number;
    createdBy: string | undefined;
  };
  isOwn: boolean;
  onDelete: () => void;
  isDeleting: boolean;
  themeColors: {
    primary: string;
    background: string;
    border: string;
    accent: string;
  };
}

function CommentItem({ comment, isOwn, onDelete, isDeleting, themeColors }: CommentItemProps) {
  const formattedDate = formatCommentDate(comment.createdAt);

  return (
    <div
      className="p-3 border rounded-lg"
      style={{ borderColor: themeColors.border }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">
            {comment.authorName}
          </span>
          {comment.authorType === "admin" && (
            <span
              className="px-1.5 py-0.5 text-xs font-medium rounded"
              style={{
                backgroundColor: themeColors.background,
                color: themeColors.accent,
              }}
            >
              Team
            </span>
          )}
          <span className="text-xs text-gray-500">
            · {formattedDate}
          </span>
        </div>

        {/* Delete button (own comments only) */}
        {isOwn && (
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-1 text-gray-400 transition-colors rounded hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
            title="Kommentar löschen"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Comment text */}
      <p className="text-sm text-gray-700">{comment.text}</p>
    </div>
  );
}

/**
 * Format comment timestamp to relative or absolute date
 */
function formatCommentDate(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  // Less than 1 minute
  if (diff < 60 * 1000) {
    return "Gerade eben";
  }

  // Less than 1 hour
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `Vor ${minutes} Min.`;
  }

  // Less than 24 hours
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `Vor ${hours} Std.`;
  }

  // Less than 7 days
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `Vor ${days} Tag${days > 1 ? "en" : ""}`;
  }

  // Older - show date
  const date = new Date(timestamp);
  const day = date.getDate();
  const monthNames = [
    "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
    "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  return `${day}. ${month} ${year}`;
}
