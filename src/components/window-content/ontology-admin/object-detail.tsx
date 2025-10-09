"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Edit, Trash2, ExternalLink, Copy, Download, Link } from "lucide-react";
import { RetroButton } from "@/components/retro-button";
import { Id } from "../../../../convex/_generated/dataModel";

interface ObjectDetailProps {
  objectId: string | null;
}

export function ObjectDetail({ objectId }: ObjectDetailProps) {
  const { sessionId } = useAuth();

  const object = useQuery(
    api.ontologyAdmin.getObjectById,
    sessionId && objectId ? { sessionId, objectId: objectId as Id<"objects"> } : "skip"
  );

  if (!objectId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center" style={{ color: 'var(--neutral-gray)' }}>
          <p className="text-sm">Select an object to view details</p>
        </div>
      </div>
    );
  }

  if (!object) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center" style={{ color: 'var(--neutral-gray)' }}>
          <p className="text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--win95-bg)' }}>
      {/* Header */}
      <div className="p-4 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-bold" style={{ color: 'var(--win95-text)' }}>
              {object.name}
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              {object.type}
              {object.subtype && ` • ${object.subtype}`}
            </p>
          </div>
          <div className="flex gap-2">
            <RetroButton variant="secondary" className="text-xs">
              <Edit size={12} className="inline mr-1" />
              Edit
            </RetroButton>
            <RetroButton variant="secondary" className="text-xs">
              <Trash2 size={12} className="inline mr-1" />
              Delete
            </RetroButton>
          </div>
        </div>
      </div>

      {/* Core Properties */}
      <div className="p-4 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
          📋 Core Properties
        </h3>
        <div className="space-y-2 text-xs">
          <PropertyRow label="ID" value={object._id}>
            <button
              onClick={() => copyToClipboard(object._id)}
              className="ml-2 p-1 hover:opacity-70"
              title="Copy to clipboard"
            >
              <Copy size={12} style={{ color: 'var(--neutral-gray)' }} />
            </button>
          </PropertyRow>
          <PropertyRow label="Type" value={object.type} />
          {object.subtype && <PropertyRow label="Subtype" value={object.subtype} />}
          <PropertyRow label="Name" value={object.name} />
          {object.description && <PropertyRow label="Description" value={object.description} />}
          <PropertyRow label="Status" value={object.status}>
            <span
              className="ml-2 px-2 py-0.5 rounded text-xs"
              style={{
                background: object.status === "active" ? 'var(--success)' : 'var(--neutral-gray)',
                color: '#ffffff',
              }}
            >
              {object.status}
            </span>
          </PropertyRow>
          {object.organization && (
            <PropertyRow label="Organization" value={`${object.organization.name} (${object.organization.slug})`} />
          )}
          {object.creator && (
            <PropertyRow
              label="Created By"
              value={`${object.creator.firstName || ""} ${object.creator.lastName || ""} (${object.creator.email})`.trim()}
            />
          )}
          <PropertyRow label="Created At" value={formatDate(object.createdAt)} />
          <PropertyRow label="Updated At" value={formatDate(object.updatedAt)} />
          {object.locale && <PropertyRow label="Locale" value={object.locale} />}
          {object.value && <PropertyRow label="Value" value={object.value} />}
        </div>
      </div>

      {/* Custom Properties */}
      {object.customProperties && Object.keys(object.customProperties).length > 0 && (
        <div className="p-4 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
              🔧 Custom Properties
            </h3>
            <RetroButton variant="secondary" className="text-xs">
              <Edit size={12} className="inline mr-1" />
              Edit JSON
            </RetroButton>
          </div>
          <pre
            className="text-xs p-3 rounded border-2 overflow-x-auto"
            style={{
              background: 'var(--win95-bg-light)',
              borderColor: 'var(--win95-border)',
              color: 'var(--win95-text)',
            }}
          >
            {JSON.stringify(object.customProperties, null, 2)}
          </pre>
        </div>
      )}

      {/* Object Links */}
      <div className="p-4 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
            🔗 Object Links ({(object.outgoingLinks?.length || 0) + (object.incomingLinks?.length || 0)})
          </h3>
          <RetroButton variant="secondary" className="text-xs">
            <Link size={12} className="inline mr-1" />
            Add Link
          </RetroButton>
        </div>

        {/* Outgoing Links */}
        {object.outgoingLinks && object.outgoingLinks.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
              Outgoing Links
            </p>
            <div className="space-y-2">
              {object.outgoingLinks.map((link) => (
                <div
                  key={link._id}
                  className="p-2 border-2 rounded flex items-center justify-between"
                  style={{
                    background: 'var(--win95-bg-light)',
                    borderColor: 'var(--win95-border)',
                  }}
                >
                  <div className="flex-1">
                    <div className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>
                      → {link.targetObject?.name || "Unknown"}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--neutral-gray)' }}>
                      Link Type: {link.linkType}
                      {link.targetObject && ` • Type: ${link.targetObject.type}`}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                      Created: {formatDate(link.createdAt)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="p-1 hover:opacity-70" title="View">
                      <ExternalLink size={12} style={{ color: 'var(--neutral-gray)' }} />
                    </button>
                    <button className="p-1 hover:opacity-70" title="Delete">
                      <Trash2 size={12} style={{ color: 'var(--error)' }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Incoming Links */}
        {object.incomingLinks && object.incomingLinks.length > 0 && (
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
              Incoming Links
            </p>
            <div className="space-y-2">
              {object.incomingLinks.map((link) => (
                <div
                  key={link._id}
                  className="p-2 border-2 rounded flex items-center justify-between"
                  style={{
                    background: 'var(--win95-bg-light)',
                    borderColor: 'var(--win95-border)',
                  }}
                >
                  <div className="flex-1">
                    <div className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>
                      ← {link.sourceObject?.name || "Unknown"}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--neutral-gray)' }}>
                      Link Type: {link.linkType}
                      {link.sourceObject && ` • Type: ${link.sourceObject.type}`}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                      Created: {formatDate(link.createdAt)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="p-1 hover:opacity-70" title="View">
                      <ExternalLink size={12} style={{ color: 'var(--neutral-gray)' }} />
                    </button>
                    <button className="p-1 hover:opacity-70" title="Delete">
                      <Trash2 size={12} style={{ color: 'var(--error)' }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!object.outgoingLinks || object.outgoingLinks.length === 0) &&
          (!object.incomingLinks || object.incomingLinks.length === 0) && (
            <p className="text-xs text-center py-4" style={{ color: 'var(--neutral-gray)' }}>
              No links found
            </p>
          )}
      </div>

      {/* Audit Trail */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
            📜 Audit Trail ({object.recentActions?.length || 0} recent actions)
          </h3>
        </div>

        {object.recentActions && object.recentActions.length > 0 ? (
          <div className="space-y-2">
            {object.recentActions.map((action) => (
              <div
                key={action._id}
                className="p-2 border-l-4 text-xs"
                style={{
                  borderColor: 'var(--win95-highlight)',
                  background: 'var(--win95-bg-light)',
                }}
              >
                <div className="font-bold" style={{ color: 'var(--win95-text)' }}>
                  {action.actionType}
                </div>
                <div style={{ color: 'var(--neutral-gray)' }}>
                  {formatDate(action.performedAt)} •{" "}
                  {action.performer
                    ? `${action.performer.firstName || ""} ${action.performer.lastName || ""} (${action.performer.email})`.trim()
                    : "Unknown User"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-center py-4" style={{ color: 'var(--neutral-gray)' }}>
            No actions recorded
          </p>
        )}
      </div>

      {/* Actions Footer */}
      <div className="p-4 border-t-2 flex gap-2 justify-end" style={{ borderColor: 'var(--win95-border)' }}>
        <RetroButton variant="secondary" className="text-xs">
          <Download size={12} className="inline mr-1" />
          Export JSON
        </RetroButton>
      </div>
    </div>
  );
}

// Helper component for property rows
function PropertyRow({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start">
      <span className="font-bold min-w-32" style={{ color: 'var(--win95-text)' }}>
        {label}:
      </span>
      <span className="flex-1" style={{ color: 'var(--neutral-gray)' }}>
        {value}
      </span>
      {children}
    </div>
  );
}
