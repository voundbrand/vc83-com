"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { Loader2, Coins, AlertCircle, CheckCircle, Info, TrendingUp } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../../../../../../convex/_generated/api");

interface CreditGrantIssuanceProps {
  organizationId: Id<"organizations">;
  sessionId: string;
}

export function CreditGrantIssuance({
  organizationId,
  sessionId,
}: CreditGrantIssuanceProps) {
  const [packSize, setPackSize] = useState<"50" | "200" | "500" | "2000" | "custom">("200");
  const [customAmount, setCustomAmount] = useState<number>(200);
  const [reason, setReason] = useState<string>("");
  const [isGranting, setIsGranting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const currentBalance = useQuery(
    generatedApi.api.credits.index.getCreditBalance,
    { organizationId }
  ) as
    | {
        exists: boolean;
        giftedCredits: number;
        dailyCredits: number;
        monthlyCredits: number;
        monthlyCreditsTotal: number;
        purchasedCredits: number;
        totalCredits: number;
      }
    | undefined;

  const grantCredits = useMutation(
    generatedApi.api.credits.index.superAdminGrantCredits
  );

  const packSizes: Record<string, { amount: number; label: string }> = {
    "50": { amount: 50, label: "50 credits (Starter boost)" },
    "200": { amount: 200, label: "200 credits (Pro monthly)" },
    "500": { amount: 500, label: "500 credits (Professional monthly)" },
    "2000": { amount: 2000, label: "2,000 credits (Agency monthly)" },
  };

  const handlePackChange = (size: typeof packSize) => {
    setPackSize(size);
    if (size !== "custom") {
      setCustomAmount(packSizes[size].amount);
    }
  };

  const effectiveAmount =
    packSize === "custom" ? customAmount : packSizes[packSize].amount;

  const handleGrant = async () => {
    if (!reason.trim()) {
      setStatusMessage({
        type: "error",
        text: "Please provide a reason for granting credits",
      });
      return;
    }

    if (effectiveAmount <= 0) {
      setStatusMessage({
        type: "error",
        text: "Credit amount must be greater than zero",
      });
      return;
    }

    setIsGranting(true);
    setStatusMessage(null);

    try {
      const result = await grantCredits({
        sessionId,
        organizationId,
        amount: effectiveAmount,
        reason,
      });

      setStatusMessage({
        type: "success",
        text: `Granted ${result.grantedAmount} credits! New total: ${result.totalCredits} credits`,
      });
      setReason("");
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: (error as Error).message,
      });
    } finally {
      setIsGranting(false);
    }
  };

  return (
    <div
      className="border-2 p-4"
      style={{
        borderColor: "var(--window-document-border)",
        background: "var(--window-document-bg-elevated)",
      }}
    >
      <h4
        className="text-sm font-bold mb-4 flex items-center gap-2"
        style={{ color: "var(--window-document-text)" }}
      >
        <Coins size={14} />
        Grant Credits Manually
      </h4>

      {/* Current Credit Balance */}
      {currentBalance ? (
        <div
          className="mb-4 p-3 border-2"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg)",
          }}
        >
          <div className="flex items-start gap-2 mb-2">
            <Info
              size={14}
              style={{
                color: "var(--window-document-text)",
                marginTop: "2px",
              }}
            />
            <div className="flex-1">
              <div
                className="text-xs font-bold mb-2"
                style={{ color: "var(--window-document-text)" }}
              >
                Current Credit Balance:
              </div>
              <div className="space-y-1 text-xs">
                <div
                  className="p-2 border"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "rgba(107, 70, 193, 0.05)",
                  }}
                >
                  <div className="grid grid-cols-2 gap-y-1">
                    <span style={{ color: "var(--neutral-gray)" }}>
                      Gifted:
                    </span>
                    <span
                      className="font-mono font-bold text-right"
                      style={{ color: "var(--window-document-text)" }}
                    >
                      {currentBalance.giftedCredits.toLocaleString()}
                    </span>

                    <span style={{ color: "var(--neutral-gray)" }}>
                      Daily:
                    </span>
                    <span
                      className="font-mono font-bold text-right"
                      style={{ color: "var(--window-document-text)" }}
                    >
                      {currentBalance.dailyCredits.toLocaleString()}
                    </span>

                    <span style={{ color: "var(--neutral-gray)" }}>
                      Monthly:
                    </span>
                    <span
                      className="font-mono font-bold text-right"
                      style={{ color: "var(--window-document-text)" }}
                    >
                      {currentBalance.monthlyCredits.toLocaleString()} /{" "}
                      {currentBalance.monthlyCreditsTotal.toLocaleString()}
                    </span>

                    <span style={{ color: "var(--neutral-gray)" }}>
                      Purchased:
                    </span>
                    <span
                      className="font-mono font-bold text-right"
                      style={{ color: "var(--window-document-text)" }}
                    >
                      {currentBalance.purchasedCredits.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div
                  className="p-2 border"
                  style={{
                    borderColor: "var(--success)",
                    background: "rgba(34, 197, 94, 0.05)",
                  }}
                >
                  <div className="flex justify-between">
                    <span
                      className="font-bold"
                      style={{ color: "var(--neutral-gray)" }}
                    >
                      Total available:
                    </span>
                    <span
                      className="font-mono font-bold"
                      style={{ color: "var(--success)" }}
                    >
                      {currentBalance.totalCredits.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div
                  className="flex items-center gap-2 mt-2 pt-2 border-t"
                  style={{ borderColor: "var(--window-document-border)" }}
                >
                  <TrendingUp size={12} style={{ color: "var(--success)" }} />
                  <span
                    style={{ color: "var(--success)", fontSize: "11px" }}
                  >
                    Granting will <strong>add</strong> to gifted credits
                    balance
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
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg)",
          }}
        >
          <Loader2
            size={14}
            className="animate-spin"
            style={{ color: "var(--tone-accent)" }}
          />
          <span
            className="text-xs"
            style={{ color: "var(--neutral-gray)" }}
          >
            Loading current balance...
          </span>
        </div>
      )}

      {statusMessage && (
        <div
          className="mb-4 p-3 text-xs flex items-center gap-2"
          style={{
            background:
              statusMessage.type === "success"
                ? "var(--success)"
                : "var(--error)",
            color: "white",
          }}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle size={14} />
          ) : (
            <AlertCircle size={14} />
          )}
          {statusMessage.text}
        </div>
      )}

      <div className="space-y-4">
        {/* Credit Amount Selection */}
        <div>
          <label
            className="block text-xs font-bold mb-2"
            style={{ color: "var(--window-document-text)" }}
          >
            Credit Amount
          </label>
          <select
            value={packSize}
            onChange={(e) =>
              handlePackChange(
                e.target.value as
                  | "50"
                  | "200"
                  | "500"
                  | "2000"
                  | "custom"
              )
            }
            className="w-full px-3 py-2 text-sm border-2"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg)",
              color: "var(--window-document-text)",
            }}
          >
            <option value="50">50 credits (Starter boost)</option>
            <option value="200">200 credits (Pro monthly equivalent)</option>
            <option value="500">
              500 credits (Professional monthly equivalent)
            </option>
            <option value="2000">
              2,000 credits (Agency monthly equivalent)
            </option>
            <option value="custom">Custom amount</option>
          </select>
        </div>

        {/* Custom Amount */}
        {packSize === "custom" && (
          <div>
            <label
              className="block text-xs font-bold mb-2"
              style={{ color: "var(--window-document-text)" }}
            >
              Custom Credit Amount
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={customAmount}
              onChange={(e) => setCustomAmount(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border-2"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
            />
          </div>
        )}

        {/* Reason */}
        <div>
          <label
            className="block text-xs font-bold mb-2"
            style={{ color: "var(--window-document-text)" }}
          >
            Reason (Required)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 text-sm border-2 h-24 resize-none"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg)",
              color: "var(--window-document-text)",
            }}
            placeholder="Why are we granting credits? (e.g., Onboarding bonus, customer service, beta tester reward)"
          />
        </div>

        {/* Grant Button */}
        <button
          onClick={handleGrant}
          disabled={isGranting || !reason.trim()}
          className="beveled-button w-full px-4 py-2.5 text-sm font-bold flex items-center justify-center gap-2"
          style={{
            background:
              isGranting || !reason.trim()
                ? "var(--window-document-bg-elevated)"
                : "var(--success)",
            color:
              isGranting || !reason.trim()
                ? "var(--neutral-gray)"
                : "white",
            cursor:
              isGranting || !reason.trim() ? "not-allowed" : "pointer",
          }}
        >
          {isGranting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Granting Credits...
            </>
          ) : (
            <>
              <Coins size={14} />
              Grant {effectiveAmount.toLocaleString()} Credits
            </>
          )}
        </button>
      </div>
    </div>
  );
}
