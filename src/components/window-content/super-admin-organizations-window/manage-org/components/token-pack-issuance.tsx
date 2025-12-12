"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { Loader2, Ticket, AlertCircle, CheckCircle, Info, TrendingUp } from "lucide-react";

interface TokenPackIssuanceProps {
  organizationId: Id<"organizations">;
  sessionId: string;
}

export function TokenPackIssuance({
  organizationId,
  sessionId,
}: TokenPackIssuanceProps) {
  const [packSize, setPackSize] = useState<"1M" | "5M" | "10M" | "50M" | "custom">("10M");
  const [customTokens, setCustomTokens] = useState<number>(10_000_000);
  const [value, setValue] = useState<number>(249);
  const [reason, setReason] = useState<string>("");
  const [isIssuing, setIsIssuing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch current token balance
  const currentBalance = useQuery(
    api.ai.billing.getTokenBalance,
    { organizationId }
  );

  // Fetch subscription for included tokens
  const currentSubscription = useQuery(
    api.ai.billing.getSubscriptionStatus,
    { organizationId }
  );

  const issueTokens = useMutation(api.ai.manualGrants.issueManualTokens);

  const packSizes = {
    "1M": { tokens: 1_000_000, value: 29 },
    "5M": { tokens: 5_000_000, value: 139 },
    "10M": { tokens: 10_000_000, value: 249 },
    "50M": { tokens: 50_000_000, value: 1149 },
  };

  const handlePackChange = (size: typeof packSize) => {
    setPackSize(size);
    if (size !== "custom") {
      setCustomTokens(packSizes[size].tokens);
      setValue(packSizes[size].value);
    }
  };

  const handleIssue = async () => {
    if (!reason.trim()) {
      setStatusMessage({ type: "error", text: "Please provide a reason for issuing tokens" });
      return;
    }

    setIsIssuing(true);
    setStatusMessage(null);

    try {
      const result = await issueTokens({
        sessionId,
        organizationId,
        tokensAmount: customTokens,
        valueInCents: value * 100,
        reason,
      });

      setStatusMessage({
        type: "success",
        text: `Tokens issued! New balance: ${result.newBalance.toLocaleString()} tokens`,
      });
      setReason("");
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (error) {
      setStatusMessage({ type: "error", text: (error as Error).message });
    } finally {
      setIsIssuing(false);
    }
  };

  return (
    <div
      className="border-2 p-4"
      style={{
        borderColor: "var(--win95-border)",
        background: "var(--win95-bg-light)",
      }}
    >
      <h4 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
        <Ticket size={14} />
        Issue Token Pack Manually
      </h4>

      {/* Current Token Balance */}
      {currentBalance && currentSubscription ? (
        <div
          className="mb-4 p-3 border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg)",
          }}
        >
          <div className="flex items-start gap-2 mb-2">
            <Info size={14} style={{ color: "var(--win95-text)", marginTop: "2px" }} />
            <div className="flex-1">
              <div className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                Current Token Balance:
              </div>
              <div className="space-y-2 text-xs">
                {/* Included Tokens */}
                {currentSubscription.hasSubscription && (
                  <div className="p-2 border" style={{ borderColor: "var(--win95-border)", background: "rgba(107, 70, 193, 0.05)" }}>
                    <div className="flex justify-between mb-1">
                      <span style={{ color: "var(--neutral-gray)" }}>Included (monthly):</span>
                      <span className="font-mono font-bold" style={{ color: "var(--win95-text)" }}>
                        {currentSubscription.includedTokensRemaining.toLocaleString()} / {currentSubscription.includedTokensTotal.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${((currentSubscription.includedTokensTotal - currentSubscription.includedTokensRemaining) / currentSubscription.includedTokensTotal) * 100}%`,
                          background: "var(--win95-highlight)",
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Purchased Tokens */}
                <div className="p-2 border" style={{ borderColor: "var(--success)", background: "rgba(34, 197, 94, 0.05)" }}>
                  <div className="flex justify-between">
                    <span style={{ color: "var(--neutral-gray)" }}>Purchased tokens:</span>
                    <span className="font-mono font-bold" style={{ color: "var(--success)" }}>
                      {currentBalance.purchasedTokens.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: "var(--neutral-gray)", fontSize: "10px" }}>
                    Never expire while subscription active
                  </div>
                </div>

                {/* What will happen */}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t" style={{ borderColor: "var(--win95-border)" }}>
                  <TrendingUp size={12} style={{ color: "var(--success)" }} />
                  <span style={{ color: "var(--success)", fontSize: "11px" }}>
                    Issuing will <strong>add</strong> to purchased balance
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="mb-4 p-3 border-2 flex items-center justify-center gap-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg)",
          }}
        >
          <Loader2 size={14} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
          <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Loading current balance...
          </span>
        </div>
      )}

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

      <div className="space-y-4">
        {/* Pack Size Selection */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
            Token Pack
          </label>
          <select
            value={packSize}
            onChange={(e) => handlePackChange(e.target.value as any)}
            className="w-full px-3 py-2 text-sm border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg)",
              color: "var(--win95-text)",
            }}
          >
            <option value="1M">1M tokens (€29 value)</option>
            <option value="5M">5M tokens (€139 value)</option>
            <option value="10M">10M tokens (€249 value)</option>
            <option value="50M">50M tokens (€1,149 value)</option>
            <option value="custom">Custom amount</option>
          </select>
        </div>

        {/* Custom Token Amount */}
        {packSize === "custom" && (
          <>
            <div>
              <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                Custom Token Amount
              </label>
              <input
                type="number"
                min="0"
                step="1000000"
                value={customTokens}
                onChange={(e) => setCustomTokens(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border-2"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg)",
                  color: "var(--win95-text)",
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                Retail Value (€)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border-2"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg)",
                  color: "var(--win95-text)",
                }}
                placeholder="For tracking only"
              />
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                Retail value for tracking only. Tokens will be issued for free.
              </p>
            </div>
          </>
        )}

        {/* Reason */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
            Reason (Required)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 text-sm border-2 h-24 resize-none"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg)",
              color: "var(--win95-text)",
            }}
            placeholder="Why are we issuing tokens? (e.g., Customer service compensation, beta tester reward)"
          />
        </div>

        {/* Issue Button */}
        <button
          onClick={handleIssue}
          disabled={isIssuing || !reason.trim()}
          className="beveled-button w-full px-4 py-2.5 text-sm font-bold flex items-center justify-center gap-2"
          style={{
            background: isIssuing || !reason.trim() ? "var(--win95-bg-light)" : "var(--success)",
            color: isIssuing || !reason.trim() ? "var(--neutral-gray)" : "white",
            cursor: isIssuing || !reason.trim() ? "not-allowed" : "pointer",
          }}
        >
          {isIssuing ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Issuing Tokens...
            </>
          ) : (
            <>
              <Ticket size={14} />
              Issue Tokens (Free)
            </>
          )}
        </button>
      </div>
    </div>
  );
}
