"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";
import { useProjectDrawer } from "../ProjectDrawerProvider";

/**
 * Hook to manage meeting comments
 * Provides comments list and mutations for add/delete
 */
export function useMeetingComments(meetingId: Id<"objects">) {
  const { session } = useProjectDrawer();

  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isDeletingComment, setIsDeletingComment] = useState<Id<"objects"> | null>(null);

  // Fetch comments
  const comments = useQuery(
    api.meetingOntology.getMeetingComments,
    session
      ? {
          sessionId: session.sessionId,
          meetingId,
        }
      : "skip"
  );

  // Mutations
  const addCommentMutation = useMutation(api.meetingOntology.addMeetingComment);
  const deleteCommentMutation = useMutation(api.meetingOntology.deleteMeetingComment);

  // Add comment handler
  const addComment = useCallback(
    async (text: string) => {
      if (!session) {
        throw new Error("Not authenticated");
      }

      setIsAddingComment(true);

      try {
        await addCommentMutation({
          sessionId: session.sessionId,
          meetingId,
          text,
        });
      } finally {
        setIsAddingComment(false);
      }
    },
    [session, meetingId, addCommentMutation]
  );

  // Delete comment handler
  const deleteComment = useCallback(
    async (commentId: Id<"objects">) => {
      if (!session) {
        throw new Error("Not authenticated");
      }

      setIsDeletingComment(commentId);

      try {
        await deleteCommentMutation({
          sessionId: session.sessionId,
          commentId,
        });
      } finally {
        setIsDeletingComment(null);
      }
    },
    [session, deleteCommentMutation]
  );

  return {
    comments: comments ?? null,
    isLoading: comments === undefined,
    error: comments instanceof Error ? comments : null,
    addComment,
    deleteComment,
    isAddingComment,
    isDeletingComment,
  };
}
