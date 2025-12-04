/**
 * COMMENT CARD
 * Display comment with threading support
 */

"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { Edit, Trash2, MessageCircle, User } from "lucide-react";

interface Comment {
  _id: string;
  description?: string;
  createdAt: number;
  authorName: string;
  replies?: Comment[];
}

interface CommentCardProps {
  comment: Comment;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onReply: (parentId: string) => void;
  currentUserId?: string;
  depth?: number;
}

export default function CommentCard({
  comment,
  onEdit,
  onDelete,
  onReply,
  depth = 0,
}: CommentCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.description || "");

  const handleSaveEdit = () => {
    onEdit(comment._id, editContent);
    setIsEditing(false);
  };

  return (
    <div className={depth > 0 ? "ml-8 mt-2" : ""}>
      <div
        className="p-3 border-2 rounded bg-white"
        style={{
          border: "var(--win95-border)",
          backgroundColor: "var(--win95-bg-light)",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <User size={14} className="text-purple-600" />
            </div>
            <div>
              <p className="font-bold text-xs text-gray-900">
                {comment.authorName}
              </p>
              <p className="text-xs text-gray-500">
                {format(new Date(comment.createdAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>

          <div className="flex gap-1">
            <button
              onClick={() => onReply(comment._id)}
              className="p-1 hover:bg-gray-100 rounded"
              title="Reply"
            >
              <MessageCircle size={14} className="text-gray-600" />
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 hover:bg-gray-100 rounded"
              title="Edit"
            >
              <Edit size={14} className="text-gray-600" />
            </button>
            <button
              onClick={() => onDelete(comment._id)}
              className="p-1 hover:bg-red-100 rounded"
              title="Delete"
            >
              <Trash2 size={14} className="text-red-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              className="w-full px-2 py-1 text-sm border-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{ border: "var(--win95-border)" }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1 text-xs border-2 rounded bg-purple-600 text-white hover:bg-purple-700"
                style={{ border: "var(--win95-border)" }}
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(comment.description || "");
                }}
                className="px-3 py-1 text-xs border-2 rounded hover:bg-gray-100"
                style={{ border: "var(--win95-border)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {comment.description}
          </p>
        )}
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map((reply) => (
            <CommentCard
              key={reply._id}
              comment={reply}
              onEdit={onEdit}
              onDelete={onDelete}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
