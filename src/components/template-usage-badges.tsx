/**
 * TEMPLATE USAGE BADGES COMPONENT
 *
 * Displays usage information for templates:
 * - Number of template sets the template is included in
 * - Last usage timestamp
 * - Warning for orphaned templates (not used anywhere)
 *
 * Design: Win95 theme with color-mixed backgrounds
 */

"use client";

import { formatDistanceToNow } from "date-fns";
import { FileText, Package, Ticket, TriangleAlert } from "lucide-react";

export interface TemplateUsageData {
  inSetCount: number;
  lastUsed?: number; // timestamp
  usedForTickets?: boolean;
  usedForInvoices?: boolean;
}

interface TemplateUsageBadgesProps {
  templateId: string;
  usageData: TemplateUsageData;
}

export function TemplateUsageBadges({ usageData }: TemplateUsageBadgesProps) {
  const { inSetCount, lastUsed, usedForTickets, usedForInvoices } = usageData;

  // Determine if template is orphaned (not used anywhere)
  const isOrphaned = inSetCount === 0 && !usedForTickets && !usedForInvoices && !lastUsed;

  return (
    <div className="flex items-center gap-2 text-xs">
      {/* Template sets badge */}
      {inSetCount > 0 && (
        <span
          className="px-2 py-0.5 font-bold"
          style={{
            background: "color-mix(in srgb, var(--info) 10%, var(--shell-surface))",
            color: "var(--info)",
          }}
          title={`Included in ${inSetCount} template ${inSetCount === 1 ? "set" : "sets"}`}
        >
          <span className="inline-flex items-center gap-1">
            <Package size={11} />
            In {inSetCount} {inSetCount === 1 ? "set" : "sets"}
          </span>
        </span>
      )}

      {/* Usage indicators */}
      {usedForTickets && (
        <span
          className="px-2 py-0.5 font-bold"
          style={{
            background: "color-mix(in srgb, var(--success) 10%, var(--shell-surface))",
            color: "var(--success)",
          }}
          title="Used for ticket generation"
        >
          <span className="inline-flex items-center gap-1">
            <Ticket size={11} />
            Tickets
          </span>
        </span>
      )}

      {usedForInvoices && (
        <span
          className="px-2 py-0.5 font-bold"
          style={{
            background: "color-mix(in srgb, var(--success) 10%, var(--shell-surface))",
            color: "var(--success)",
          }}
          title="Used for invoice generation"
        >
          <span className="inline-flex items-center gap-1">
            <FileText size={11} />
            Invoices
          </span>
        </span>
      )}

      {/* Last used timestamp */}
      {lastUsed && (
        <span
          style={{ color: "var(--neutral-gray)" }}
          title={`Last used: ${new Date(lastUsed).toLocaleString()}`}
        >
          Last: {formatDistanceToNow(new Date(lastUsed))} ago
        </span>
      )}

      {/* Orphaned warning */}
      {isOrphaned && (
        <span
          className="px-2 py-0.5 font-bold"
          style={{
            background: "color-mix(in srgb, var(--warning) 10%, var(--shell-surface))",
            color: "var(--warning)",
          }}
          title="This template is not used in any template sets and has no usage history"
        >
          <span className="inline-flex items-center gap-1">
            <TriangleAlert size={11} />
            Not used
          </span>
        </span>
      )}
    </div>
  );
}
