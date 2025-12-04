/**
 * COMMENTS TAB
 * Threaded comments for project discussions
 */

"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { MessageSquare } from "lucide-react";
import CommentCard from "./CommentCard";
import type { Id } from "../../../../convex/_generated/dataModel";

interface CommentsTabProps {
  projectId: Id<"objects">;
  sessionId: string;
}

export default function CommentsTab({ projectId, sessionId }: CommentsTabProps) {
  const [newComment, setNewComment] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const comments = useQuery(api.projectOntology.getComments, {
    sessionId,
    projectId,
  });

  const createComment = useMutation(api.projectOntology.createComment);
  const updateComment = useMutation(api.projectOntology.updateComment);
  const deleteComment = useMutation(api.projectOntology.deleteComment);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      await createComment({
        sessionId,
        projectId,
        content: newComment.trim(),
        parentCommentId: replyToId ? (replyToId as Id<"objects">) : undefined,
      });
      setNewComment("");
      setReplyToId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (commentId: string, content: string) => {
    try {
      await updateComment({
        sessionId,
        commentId: commentId as Id<"objects">,
        content,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update comment");
    }
  };

  const handleDelete = async (commentId: string) => {
    if (confirm("Delete this comment and all replies?")) {
      try {
        await deleteComment({
          sessionId,
          commentId: commentId as Id<"objects">,
        });
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to delete comment");
      }
    }
  };

  const handleReply = (parentId: string) => {
    setReplyToId(parentId);
    // Focus on textarea
    document.querySelector<HTMLTextAreaElement>("#comment-textarea")?.focus();
  };

  if (comments === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-gray-500">Loading comments...</div>
      </div>
    );
  }

  // Filter to only show top-level comments (replies are nested in comment objects)
  const topLevelComments = comments.filter(
    (c) => !c.customProperties?.parentCommentId
  );

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare size={18} className="text-gray-600" />
        <h3 className="font-bold text-sm text-gray-900">
          Comments ({comments.length})
        </h3>
      </div>

      {/* New Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        {replyToId && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>Replying to comment</span>
            <button
              type="button"
              onClick={() => setReplyToId(null)}
              className="text-purple-600 hover:underline"
            >
              Cancel
            </button>
          </div>
        )}
        <textarea
          id="comment-textarea"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          rows={3}
          className="w-full px-3 py-2 text-sm border-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          style={{ border: "var(--win95-border)" }}
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!newComment.trim() || loading}
            className="px-4 py-1.5 text-sm border-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
            style={{ border: "var(--win95-border)" }}
          >
            {loading ? "Posting..." : replyToId ? "Reply" : "Comment"}
          </button>
        </div>
      </form>

      {/* Comments List */}
      {topLevelComments.length === 0 ? (
        <div
          className="p-8 text-center border-2 rounded"
          style={{
            border: "var(--win95-border)",
            backgroundColor: "var(--win95-bg-light)",
          }}
        >
          <p className="text-sm text-gray-600 mb-2">No comments yet</p>
          <p className="text-xs text-gray-500">
            Be the first to start a discussion!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {topLevelComments.map((comment) => (
            <CommentCard
              key={comment._id}
              comment={comment}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReply={handleReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}
