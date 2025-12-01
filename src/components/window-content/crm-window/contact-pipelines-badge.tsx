"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import type { Id } from "../../../../convex/_generated/dataModel";

/**
 * Contact Pipelines Badge
 *
 * Shows small badges for each pipeline a contact is in
 */

interface ContactPipelinesBadgeProps {
  contactId: Id<"objects">;
}

export function ContactPipelinesBadge({ contactId }: ContactPipelinesBadgeProps) {
  const { sessionId } = useAuth();

  const contactPipelines = useQuery(
    api.crmPipeline.getContactPipelines,
    sessionId && contactId
      ? { sessionId, contactId }
      : "skip"
  );

  if (!contactPipelines || contactPipelines.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-1 flex-wrap mt-1">
      {contactPipelines.map((item: any) => {
        const pipelineColor = (item.pipeline?.customProperties as { color?: string })?.color || "#6B46C1";
        const stageName = item.stage?.name || "Unknown";
        const pipelineName = item.pipeline?.name || "Unknown";

        return (
          <span
            key={item.pipeline?._id}
            className="px-1.5 py-0.5 text-[10px] border"
            style={{
              background: `${pipelineColor}15`,
              borderColor: pipelineColor,
              color: pipelineColor,
            }}
            title={`${pipelineName}: ${stageName}`}
          >
            {pipelineName.substring(0, 15)}{pipelineName.length > 15 ? '...' : ''} • {stageName}
          </span>
        );
      })}
    </div>
  );
}
