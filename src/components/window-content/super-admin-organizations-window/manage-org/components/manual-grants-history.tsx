"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { Loader2, History, AlertCircle, CheckCircle, FileText } from "lucide-react";

interface ManualGrantsHistoryProps {
  organizationId: Id<"organizations">;
  sessionId: string;
}

export function ManualGrantsHistory({
  organizationId,
  sessionId,
}: ManualGrantsHistoryProps) {
  const grants = useQuery(api.ai.manualGrants.listManualGrants, {
    sessionId,
    organizationId,
  });

  const [selectedGrants, setSelectedGrants] = useState<Set<Id<"objects">>>(new Set());
  const [invoiceId, setInvoiceId] = useState("");
  const [isMarking, setIsMarking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const markAsInvoiced = useMutation(api.ai.manualGrants.markGrantsAsInvoiced);

  const handleMarkInvoiced = async () => {
    if (!invoiceId.trim()) {
      setStatusMessage({ type: "error", text: "Please enter invoice ID" });
      return;
    }

    setIsMarking(true);
    setStatusMessage(null);

    try {
      await markAsInvoiced({
        sessionId,
        grantIds: Array.from(selectedGrants),
        invoiceId,
      });
      setStatusMessage({ type: "success", text: `${selectedGrants.size} grants marked as invoiced!` });
      setSelectedGrants(new Set());
      setInvoiceId("");
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (error) {
      setStatusMessage({ type: "error", text: (error as Error).message });
    } finally {
      setIsMarking(false);
    }
  };

  if (!grants) {
    return (
      <div
        className="border-2 p-4 flex items-center justify-center"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg-light)",
        }}
      >
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
      </div>
    );
  }

  const totalRetailValue = grants.reduce(
    (sum, g) => sum + ((g.customProperties as any)?.retailValueInCents || 0),
    0
  );
  const uninvoicedGrants = grants.filter((g) => !(g.customProperties as any)?.invoiced);

  return (
    <div
      className="border-2 p-4"
      style={{
        borderColor: "var(--win95-border)",
        background: "var(--win95-bg-light)",
      }}
    >
      <h4 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
        <History size={14} />
        Manual Grants History
      </h4>

      {statusMessage && (
        <div
          className="mb-4 p-3 text-xs flex items-center gap-2"
          style={{
            background: statusMessage.type === "success" ? "var(--success)" : "var(--error)",
            color: "white",
          }}
        >
          {statusMessage.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {statusMessage.text}
        </div>
      )}

      {/* Summary */}
      <div
        className="mb-4 p-3 border-2 grid grid-cols-3 gap-4"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg)",
        }}
      >
        <div>
          <div className="text-xs font-bold" style={{ color: "var(--neutral-gray)" }}>Total Grants</div>
          <div className="text-lg font-bold" style={{ color: "var(--win95-text)" }}>{grants.length}</div>
        </div>
        <div>
          <div className="text-xs font-bold" style={{ color: "var(--neutral-gray)" }}>Retail Value</div>
          <div className="text-lg font-bold" style={{ color: "var(--win95-text)" }}>
            €{(totalRetailValue / 100).toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-xs font-bold" style={{ color: "var(--neutral-gray)" }}>Uninvoiced</div>
          <div className="text-lg font-bold" style={{ color: "var(--error)" }}>{uninvoicedGrants.length}</div>
        </div>
      </div>

      {/* Grants Table */}
      <div
        className="max-h-96 overflow-y-auto border-2 mb-4"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg)",
        }}
      >
        {grants.length === 0 ? (
          <div className="p-8 text-center text-xs" style={{ color: "var(--neutral-gray)" }}>
            No manual grants yet. Grant a subscription or issue tokens to see them here.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead
              className="sticky top-0"
              style={{
                background: "var(--win95-bg-light)",
                borderBottom: "2px solid var(--win95-border)",
              }}
            >
              <tr>
                <th className="p-2 text-left font-bold" style={{ color: "var(--win95-text)" }}></th>
                <th className="p-2 text-left font-bold" style={{ color: "var(--win95-text)" }}>Date</th>
                <th className="p-2 text-left font-bold" style={{ color: "var(--win95-text)" }}>Type</th>
                <th className="p-2 text-left font-bold" style={{ color: "var(--win95-text)" }}>Details</th>
                <th className="p-2 text-right font-bold" style={{ color: "var(--win95-text)" }}>Value</th>
                <th className="p-2 text-left font-bold" style={{ color: "var(--win95-text)" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {grants.map((grant) => {
                const props = grant.customProperties as any;
                const isInvoiced = props?.invoiced || false;
                return (
                  <tr
                    key={grant._id}
                    style={{
                      borderTop: "1px solid var(--win95-border)",
                    }}
                  >
                    <td className="p-2">
                      {!isInvoiced && (
                        <input
                          type="checkbox"
                          checked={selectedGrants.has(grant._id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedGrants);
                            if (e.target.checked) {
                              newSet.add(grant._id);
                            } else {
                              newSet.delete(grant._id);
                            }
                            setSelectedGrants(newSet);
                          }}
                          className="cursor-pointer"
                        />
                      )}
                    </td>
                    <td className="p-2" style={{ color: "var(--win95-text)" }}>
                      {new Date(grant.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-2 font-bold" style={{ color: "var(--win95-text)" }}>
                      {props?.grantType === "subscription" ? "Subscription" : "Token Pack"}
                    </td>
                    <td className="p-2" style={{ color: "var(--win95-text)" }}>
                      {props?.tier && `Tier: ${props.tier}`}
                      {props?.tokensAmount && `${(props.tokensAmount / 1_000_000).toFixed(1)}M tokens`}
                    </td>
                    <td className="p-2 text-right font-mono" style={{ color: "var(--win95-text)" }}>
                      €{((props?.retailValueInCents || 0) / 100).toFixed(2)}
                    </td>
                    <td className="p-2">
                      {isInvoiced ? (
                        <span
                          className="inline-flex items-center px-2 py-0.5 text-xs font-bold"
                          style={{
                            background: "var(--success)",
                            color: "white",
                          }}
                        >
                          <CheckCircle size={10} className="mr-1" />
                          {props?.invoiceId}
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center px-2 py-0.5 text-xs font-bold"
                          style={{
                            background: "var(--error)",
                            color: "white",
                          }}
                        >
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Mark as Invoiced */}
      {selectedGrants.size > 0 && (
        <div
          className="p-3 border-2"
          style={{
            borderColor: "var(--warning)",
            background: "rgba(251, 191, 36, 0.1)",
          }}
        >
          <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
            Mark {selectedGrants.size} grant{selectedGrants.size > 1 ? "s" : ""} as invoiced:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              placeholder="Invoice ID (e.g., INV-2025-001)"
              className="flex-1 px-3 py-2 text-sm border-2"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg)",
                color: "var(--win95-text)",
              }}
            />
            <button
              onClick={handleMarkInvoiced}
              disabled={isMarking || !invoiceId.trim()}
              className="px-4 py-2 text-sm font-bold border-2 flex items-center gap-2"
              style={{
                background: isMarking || !invoiceId.trim() ? "var(--win95-bg-light)" : "var(--success)",
                color: isMarking || !invoiceId.trim() ? "var(--neutral-gray)" : "white",
                borderTopColor: "var(--win95-button-light)",
                borderLeftColor: "var(--win95-button-light)",
                borderBottomColor: "var(--win95-button-dark)",
                borderRightColor: "var(--win95-button-dark)",
                cursor: isMarking || !invoiceId.trim() ? "not-allowed" : "pointer",
              }}
            >
              {isMarking ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Marking...
                </>
              ) : (
                <>
                  <FileText size={14} />
                  Mark Invoiced
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
