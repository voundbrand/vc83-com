"use client";

/**
 * PREVIEW PAGE ROUTE
 *
 * Renders an AI-generated page in full-screen preview mode.
 * Used for sharing designs and reviewing output quality.
 *
 * URL: /preview/[conversationId]
 * Can use either conversation ID or slug
 */

import { use, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { PageRenderer } from "@/components/builder/page-renderer";
import { parseAndValidateAIResponse } from "@/lib/page-builder/validators";
import type { AIGeneratedPageSchema } from "@/lib/page-builder/page-schema";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

/**
 * Check if a string looks like a Convex ID
 */
function isConvexId(str: string): boolean {
  const hyphenIndex = str.indexOf("-");
  return hyphenIndex === -1 || hyphenIndex < 5;
}

export default function PreviewPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);

  // Determine if it's a slug or ID
  const isSlug = !isConvexId(conversationId);

  // Query by ID or slug
  const conversationById = useQuery(
    api.ai.conversations.getConversation,
    !isSlug ? { conversationId: conversationId as Id<"aiConversations"> } : "skip"
  );

  const conversationBySlug = useQuery(
    api.ai.conversations.getConversationBySlug,
    isSlug ? { slug: conversationId } : "skip"
  );

  const conversation = isSlug ? conversationBySlug : conversationById;

  // Extract page schema from the last assistant message
  const [pageSchema, setPageSchema] = useState<AIGeneratedPageSchema | null>(null);

  useEffect(() => {
    if (!conversation?.messages) return;

    // Find the last assistant message with a valid page schema
    const assistantMessages = conversation.messages
      .filter((m: { role: string }) => m.role === "assistant")
      .reverse();

    for (const msg of assistantMessages) {
      const validation = parseAndValidateAIResponse(msg.content);
      if (validation.valid && validation.data) {
        setPageSchema(validation.data);
        break;
      }
    }
  }, [conversation]);

  // Loading state
  if (conversation === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading preview...</p>
        </div>
      </div>
    );
  }

  // Not found
  if (conversation === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Preview not found</h1>
          <p className="text-zinc-400 mb-4">This conversation may have been deleted or the link is invalid.</p>
          <Link
            href="/builder/new"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Start New Design
          </Link>
        </div>
      </div>
    );
  }

  // No page schema found
  if (!pageSchema) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">No design found</h1>
          <p className="text-zinc-400 mb-4">This conversation doesn&apos;t have a generated page yet.</p>
          <Link
            href={`/builder/${conversationId}`}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Builder
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Floating toolbar */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <Link
          href={`/builder/${conversationId}`}
          className="px-3 py-2 bg-zinc-900/90 backdrop-blur-sm text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors text-sm flex items-center gap-2 border border-zinc-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Edit in Builder
        </Link>
        <button
          onClick={() => {
            const url = window.location.href;
            navigator.clipboard.writeText(url);
            alert("Preview URL copied to clipboard!");
          }}
          className="px-3 py-2 bg-zinc-900/90 backdrop-blur-sm text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors text-sm flex items-center gap-2 border border-zinc-700"
        >
          <ExternalLink className="w-4 h-4" />
          Copy Link
        </button>
      </div>

      {/* Page content */}
      <PageRenderer schema={pageSchema} />
    </div>
  );
}
