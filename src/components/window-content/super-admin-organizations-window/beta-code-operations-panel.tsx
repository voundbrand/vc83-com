"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Ban, Download, Loader2, Pencil, Save, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// Dynamic require avoids deep type expansion on Convex generated API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };

type BetaCodeStatus = "active" | "redeemed" | "expired" | "deactivated";

type BetaCodeRecord = {
  _id: string;
  code: string;
  status: BetaCodeStatus;
  channelTag: string | null;
  sourceDetail: string | null;
  notes: string | null;
  maxUses: number;
  currentUses: number;
  remainingUses: number;
  expiresAt: number | null;
  deactivatedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

type BatchCreateResult = {
  success: boolean;
  requested: number;
  createdCount: number;
  skippedCount: number;
  created: Array<{ _id: string; code: string }>;
  skippedExisting: string[];
};

type CsvExportPayload = {
  filename: string;
  csv: string;
  rowCount: number;
};

type TranslateWithFallback = (
  key: string,
  fallback: string,
  params?: Record<string, string | number>
) => string;

function formatDateTime(value: number | null): string {
  if (!value) {
    return "n/a";
  }
  return new Date(value).toLocaleString();
}

function toLocalDateTimeInput(value: number | null): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(value - offsetMs).toISOString().slice(0, 16);
}

function parseLocalDateTimeInput(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = new Date(trimmed).getTime();
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return parsed;
}

function parsePositiveInt(value: string): number | undefined {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return undefined;
  }
  return parsed;
}

function getStatusBadgeStyles(status: BetaCodeStatus): { backgroundColor: string; color: string } {
  if (status === "active") {
    return { backgroundColor: "rgba(16, 185, 129, 0.2)", color: "var(--success)" };
  }
  if (status === "redeemed") {
    return { backgroundColor: "rgba(59, 130, 246, 0.2)", color: "#3b82f6" };
  }
  if (status === "expired") {
    return { backgroundColor: "rgba(245, 158, 11, 0.2)", color: "var(--warning)" };
  }
  return { backgroundColor: "rgba(239, 68, 68, 0.2)", color: "var(--error)" };
}

interface BetaCodeOperationsPanelProps {
  tx: TranslateWithFallback;
}

export function BetaCodeOperationsPanel({ tx }: BetaCodeOperationsPanelProps) {
  const { sessionId } = useAuth();

  const [statusFilter, setStatusFilter] = useState<"all" | BetaCodeStatus>("all");
  const [channelFilter, setChannelFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [codeSearchFilter, setCodeSearchFilter] = useState("");
  const [limitInput, setLimitInput] = useState("200");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const [editingCodeId, setEditingCodeId] = useState<string | null>(null);
  const [editMaxUses, setEditMaxUses] = useState("");
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [editChannelTag, setEditChannelTag] = useState("");
  const [editSourceDetail, setEditSourceDetail] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingCodeId, setSavingCodeId] = useState<string | null>(null);

  const [deactivationDraft, setDeactivationDraft] = useState<{
    codeId: string;
    reason: string;
  } | null>(null);
  const [deactivatingCodeId, setDeactivatingCodeId] = useState<string | null>(null);

  const [batchPrefix, setBatchPrefix] = useState("BETA");
  const [batchCountInput, setBatchCountInput] = useState("10");
  const [batchStartNumberInput, setBatchStartNumberInput] = useState("1");
  const [batchPaddingInput, setBatchPaddingInput] = useState("3");
  const [batchMaxUsesInput, setBatchMaxUsesInput] = useState("1");
  const [batchExpiresAt, setBatchExpiresAt] = useState("");
  const [batchChannelTag, setBatchChannelTag] = useState("");
  const [batchSourceDetail, setBatchSourceDetail] = useState("");
  const [batchNotes, setBatchNotes] = useState("");
  const [isBatchCreating, setIsBatchCreating] = useState(false);
  const [lastBatchResult, setLastBatchResult] = useState<BatchCreateResult | null>(null);

  const [isExporting, setIsExporting] = useState(false);

  const updateBetaCode = useMutation(api.betaCodes.updateBetaCode);
  const deactivateBetaCode = useMutation(api.betaCodes.deactivateBetaCode);
  const batchCreateBetaCodes = useMutation(api.betaCodes.batchCreateBetaCodes);

  const queryLimit = useMemo(() => {
    const parsed = Number.parseInt(limitInput, 10);
    if (!Number.isFinite(parsed)) {
      return 200;
    }
    return Math.max(10, Math.min(300, parsed));
  }, [limitInput]);

  const normalizedChannelFilter = channelFilter.trim();
  const normalizedSourceFilter = sourceFilter.trim();
  const normalizedCodeSearch = codeSearchFilter.trim().toUpperCase();

  const listArgs = sessionId
    ? {
        sessionId,
        status: statusFilter === "all" ? undefined : statusFilter,
        channelTag: normalizedChannelFilter || undefined,
        sourceDetail: normalizedSourceFilter || undefined,
        codeSearch: normalizedCodeSearch || undefined,
        limit: queryLimit,
      }
    : "skip";

  const betaCodes = useQuery(api.betaCodes.listBetaCodes, listArgs) as BetaCodeRecord[] | undefined;
  const csvExport = useQuery(api.betaCodes.exportBetaCodesCsv, listArgs) as CsvExportPayload | undefined;

  const sortedCodes = useMemo(() => {
    if (!betaCodes) {
      return [];
    }
    return [...betaCodes].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [betaCodes]);

  const activeCount = useMemo(
    () => sortedCodes.filter((row) => row.status === "active").length,
    [sortedCodes]
  );

  function resetEditState() {
    setEditingCodeId(null);
    setEditMaxUses("");
    setEditExpiresAt("");
    setEditChannelTag("");
    setEditSourceDetail("");
    setEditNotes("");
    setSavingCodeId(null);
  }

  function beginEdit(row: BetaCodeRecord) {
    setEditingCodeId(row._id);
    setEditMaxUses(String(row.maxUses));
    setEditExpiresAt(toLocalDateTimeInput(row.expiresAt));
    setEditChannelTag(row.channelTag ?? "");
    setEditSourceDetail(row.sourceDetail ?? "");
    setEditNotes(row.notes ?? "");
    setErrorMessage(null);
    setNoticeMessage(null);
  }

  async function handleSaveEdit() {
    if (!sessionId || !editingCodeId) {
      return;
    }

    const maxUses = parsePositiveInt(editMaxUses);
    if (!maxUses) {
      setErrorMessage(tx("beta_codes.errors.invalid_max_uses", "Max uses must be 1 or greater."));
      return;
    }

    const parsedExpiresAt = parseLocalDateTimeInput(editExpiresAt);
    if (parsedExpiresAt === undefined) {
      setErrorMessage(
        tx(
          "beta_codes.errors.invalid_expires_at",
          "Expiration date/time is invalid. Use a valid local date and time."
        )
      );
      return;
    }

    setSavingCodeId(editingCodeId);
    setErrorMessage(null);
    setNoticeMessage(null);
    try {
      await updateBetaCode({
        sessionId,
        codeId: editingCodeId,
        maxUses,
        expiresAt: parsedExpiresAt,
        channelTag: editChannelTag.trim() || null,
        sourceDetail: editSourceDetail.trim() || null,
        notes: editNotes.trim() || null,
      });
      setNoticeMessage(tx("beta_codes.notices.edit_saved", "Beta code updated."));
      resetEditState();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : tx("beta_codes.errors.update_failed", "Failed to update beta code.");
      setErrorMessage(message);
      setSavingCodeId(null);
    }
  }

  async function handleDeactivate(codeId: string, reason: string) {
    if (!sessionId) {
      return;
    }

    setDeactivatingCodeId(codeId);
    setErrorMessage(null);
    setNoticeMessage(null);
    try {
      await deactivateBetaCode({
        sessionId,
        codeId,
        reason: reason.trim() || undefined,
      });
      setNoticeMessage(tx("beta_codes.notices.deactivated", "Beta code deactivated."));
      setDeactivationDraft(null);
      if (editingCodeId === codeId) {
        resetEditState();
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : tx("beta_codes.errors.deactivate_failed", "Failed to deactivate beta code.");
      setErrorMessage(message);
    } finally {
      setDeactivatingCodeId(null);
    }
  }

  async function handleBatchCreate() {
    if (!sessionId) {
      return;
    }

    const count = parsePositiveInt(batchCountInput);
    const startNumber = Number.parseInt(batchStartNumberInput, 10);
    const padding = parsePositiveInt(batchPaddingInput);
    const maxUses = parsePositiveInt(batchMaxUsesInput);
    const parsedExpiresAt = parseLocalDateTimeInput(batchExpiresAt);

    if (!count || count > 500) {
      setErrorMessage(tx("beta_codes.errors.invalid_batch_count", "Batch count must be between 1 and 500."));
      return;
    }
    if (!Number.isFinite(startNumber) || startNumber < 0) {
      setErrorMessage(tx("beta_codes.errors.invalid_start_number", "Start number must be 0 or greater."));
      return;
    }
    if (!padding || padding > 8) {
      setErrorMessage(tx("beta_codes.errors.invalid_padding", "Padding must be between 1 and 8."));
      return;
    }
    if (!maxUses) {
      setErrorMessage(tx("beta_codes.errors.invalid_max_uses", "Max uses must be 1 or greater."));
      return;
    }
    if (parsedExpiresAt === undefined) {
      setErrorMessage(
        tx(
          "beta_codes.errors.invalid_expires_at",
          "Expiration date/time is invalid. Use a valid local date and time."
        )
      );
      return;
    }

    setIsBatchCreating(true);
    setErrorMessage(null);
    setNoticeMessage(null);
    setLastBatchResult(null);
    try {
      const result = (await batchCreateBetaCodes({
        sessionId,
        prefix: batchPrefix.trim() || "BETA",
        count,
        startNumber,
        padding,
        maxUses,
        expiresAt: parsedExpiresAt === null ? undefined : parsedExpiresAt,
        channelTag: batchChannelTag.trim() || undefined,
        sourceDetail: batchSourceDetail.trim() || undefined,
        notes: batchNotes.trim() || undefined,
      })) as BatchCreateResult;

      setLastBatchResult(result);
      setNoticeMessage(
        tx(
          "beta_codes.notices.batch_created",
          "Batch completed: {created} created, {skipped} skipped.",
          { created: result.createdCount, skipped: result.skippedCount }
        )
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : tx("beta_codes.errors.batch_failed", "Failed to create beta code batch.");
      setErrorMessage(message);
    } finally {
      setIsBatchCreating(false);
    }
  }

  async function handleExportCsv() {
    if (!csvExport) {
      setErrorMessage(tx("beta_codes.errors.export_unavailable", "CSV export is not ready yet."));
      return;
    }

    setIsExporting(true);
    setErrorMessage(null);
    setNoticeMessage(null);
    try {
      const blob = new Blob([csvExport.csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = csvExport.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setNoticeMessage(
        tx("beta_codes.notices.exported", "Downloaded {count} rows.", {
          count: csvExport.rowCount,
        })
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div
      className="mt-8 p-4 rounded space-y-4"
      style={{
        backgroundColor: "var(--window-document-bg)",
        border: "2px solid var(--window-document-border)",
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-lg" style={{ color: "var(--window-document-text)" }}>
            {tx("beta_codes.header.title", "Beta Code Operations")}
          </h3>
          <p className="text-sm" style={{ color: "var(--window-document-text-muted)" }}>
            {tx(
              "beta_codes.header.subtitle",
              "Filter, edit, deactivate, batch-create, and export beta activation codes."
            )}
          </p>
        </div>
        <div className="text-xs font-semibold" style={{ color: "var(--window-document-text-muted)" }}>
          {tx("beta_codes.summary.total", "Total: {count}", { count: sortedCodes.length })} |{" "}
          {tx("beta_codes.summary.active", "Active: {count}", { count: activeCount })}
        </div>
      </div>

      {errorMessage && (
        <div
          className="p-2 rounded text-sm"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            border: "1px solid var(--error)",
            color: "var(--window-document-text)",
          }}
        >
          {errorMessage}
        </div>
      )}

      {noticeMessage && (
        <div
          className="p-2 rounded text-sm"
          style={{
            backgroundColor: "rgba(16, 185, 129, 0.15)",
            border: "1px solid var(--success)",
            color: "var(--window-document-text)",
          }}
        >
          {noticeMessage}
        </div>
      )}

      <div
        className="p-3 rounded space-y-3"
        style={{
          backgroundColor: "var(--window-document-bg-elevated)",
          border: "1px solid var(--window-document-border)",
        }}
      >
        <div className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
          {tx("beta_codes.filters.title", "Filters")}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="text-xs font-semibold" style={{ color: "var(--window-document-text-muted)" }}>
            {tx("beta_codes.filters.status", "Status")}
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | BetaCodeStatus)
              }
              className="mt-1 w-full px-2 py-1 text-sm"
              style={{
                backgroundColor: "var(--window-document-bg)",
                color: "var(--window-document-text)",
                border: "2px inset",
                borderColor: "var(--window-document-border)",
              }}
            >
              <option value="all">{tx("beta_codes.filters.status_all", "All statuses")}</option>
              <option value="active">{tx("beta_codes.filters.status_active", "Active")}</option>
              <option value="redeemed">{tx("beta_codes.filters.status_redeemed", "Redeemed")}</option>
              <option value="expired">{tx("beta_codes.filters.status_expired", "Expired")}</option>
              <option value="deactivated">
                {tx("beta_codes.filters.status_deactivated", "Deactivated")}
              </option>
            </select>
          </label>

          <label className="text-xs font-semibold" style={{ color: "var(--window-document-text-muted)" }}>
            {tx("beta_codes.filters.channel", "Channel tag")}
            <input
              value={channelFilter}
              onChange={(event) => setChannelFilter(event.target.value)}
              className="mt-1 w-full px-2 py-1 text-sm"
              placeholder={tx("beta_codes.filters.channel_placeholder", "Any channel")}
              style={{
                backgroundColor: "var(--window-document-bg)",
                color: "var(--window-document-text)",
                border: "2px inset",
                borderColor: "var(--window-document-border)",
              }}
            />
          </label>

          <label className="text-xs font-semibold" style={{ color: "var(--window-document-text-muted)" }}>
            {tx("beta_codes.filters.source", "Source detail contains")}
            <input
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
              className="mt-1 w-full px-2 py-1 text-sm"
              placeholder={tx("beta_codes.filters.source_placeholder", "Any source")}
              style={{
                backgroundColor: "var(--window-document-bg)",
                color: "var(--window-document-text)",
                border: "2px inset",
                borderColor: "var(--window-document-border)",
              }}
            />
          </label>

          <label className="text-xs font-semibold" style={{ color: "var(--window-document-text-muted)" }}>
            {tx("beta_codes.filters.code", "Code search")}
            <input
              value={codeSearchFilter}
              onChange={(event) => setCodeSearchFilter(event.target.value)}
              className="mt-1 w-full px-2 py-1 text-sm"
              placeholder={tx("beta_codes.filters.code_placeholder", "BETA-")}
              style={{
                backgroundColor: "var(--window-document-bg)",
                color: "var(--window-document-text)",
                border: "2px inset",
                borderColor: "var(--window-document-border)",
              }}
            />
          </label>

          <label className="text-xs font-semibold" style={{ color: "var(--window-document-text-muted)" }}>
            {tx("beta_codes.filters.limit", "Result limit")}
            <input
              value={limitInput}
              onChange={(event) => setLimitInput(event.target.value)}
              className="mt-1 w-full px-2 py-1 text-sm"
              placeholder="200"
              style={{
                backgroundColor: "var(--window-document-bg)",
                color: "var(--window-document-text)",
                border: "2px inset",
                borderColor: "var(--window-document-border)",
              }}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportCsv}
            disabled={isExporting || !csvExport}
            className="beveled-button px-4 py-1 text-sm font-bold flex items-center gap-2"
            style={{
              opacity: isExporting || !csvExport ? 0.6 : 1,
              backgroundColor: "var(--window-document-bg)",
              color: "var(--window-document-text)",
            }}
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {tx("beta_codes.actions.export_csv", "Export CSV")}
            {csvExport ? ` (${csvExport.rowCount})` : ""}
          </button>
        </div>
      </div>

      <div
        className="p-3 rounded space-y-3"
        style={{
          backgroundColor: "var(--window-document-bg-elevated)",
          border: "1px solid var(--window-document-border)",
        }}
      >
        <div className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
          {tx("beta_codes.batch.title", "Batch Create")}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="text-xs font-semibold" style={{ color: "var(--window-document-text-muted)" }}>
            {tx("beta_codes.batch.prefix", "Prefix")}
            <input
              value={batchPrefix}
              onChange={(event) => setBatchPrefix(event.target.value)}
              className="mt-1 w-full px-2 py-1 text-sm"
              placeholder="BETA"
              style={{
                backgroundColor: "var(--window-document-bg)",
                color: "var(--window-document-text)",
                border: "2px inset",
                borderColor: "var(--window-document-border)",
              }}
            />
          </label>
          <label className="text-xs font-semibold" style={{ color: "var(--window-document-text-muted)" }}>
            {tx("beta_codes.batch.count", "Count")}
            <input
              value={batchCountInput}
              onChange={(event) => setBatchCountInput(event.target.value)}
              className="mt-1 w-full px-2 py-1 text-sm"
              placeholder="10"
              style={{
                backgroundColor: "var(--window-document-bg)",
                color: "var(--window-document-text)",
                border: "2px inset",
                borderColor: "var(--window-document-border)",
              }}
            />
          </label>
          <label className="text-xs font-semibold" style={{ color: "var(--window-document-text-muted)" }}>
            {tx("beta_codes.batch.start_number", "Start number")}
            <input
              value={batchStartNumberInput}
              onChange={(event) => setBatchStartNumberInput(event.target.value)}
              className="mt-1 w-full px-2 py-1 text-sm"
              placeholder="1"
              style={{
                backgroundColor: "var(--window-document-bg)",
                color: "var(--window-document-text)",
                border: "2px inset",
                borderColor: "var(--window-document-border)",
              }}
            />
          </label>
          <label className="text-xs font-semibold" style={{ color: "var(--window-document-text-muted)" }}>
            {tx("beta_codes.batch.padding", "Padding")}
            <input
              value={batchPaddingInput}
              onChange={(event) => setBatchPaddingInput(event.target.value)}
              className="mt-1 w-full px-2 py-1 text-sm"
              placeholder="3"
              style={{
                backgroundColor: "var(--window-document-bg)",
                color: "var(--window-document-text)",
                border: "2px inset",
                borderColor: "var(--window-document-border)",
              }}
            />
          </label>
          <label className="text-xs font-semibold" style={{ color: "var(--window-document-text-muted)" }}>
            {tx("beta_codes.batch.max_uses", "Max uses")}
            <input
              value={batchMaxUsesInput}
              onChange={(event) => setBatchMaxUsesInput(event.target.value)}
              className="mt-1 w-full px-2 py-1 text-sm"
              placeholder="1"
              style={{
                backgroundColor: "var(--window-document-bg)",
                color: "var(--window-document-text)",
                border: "2px inset",
                borderColor: "var(--window-document-border)",
              }}
            />
          </label>
          <label className="text-xs font-semibold" style={{ color: "var(--window-document-text-muted)" }}>
            {tx("beta_codes.batch.expires_at", "Expires at")}
            <input
              type="datetime-local"
              value={batchExpiresAt}
              onChange={(event) => setBatchExpiresAt(event.target.value)}
              className="mt-1 w-full px-2 py-1 text-sm"
              style={{
                backgroundColor: "var(--window-document-bg)",
                color: "var(--window-document-text)",
                border: "2px inset",
                borderColor: "var(--window-document-border)",
              }}
            />
          </label>
          <label className="text-xs font-semibold" style={{ color: "var(--window-document-text-muted)" }}>
            {tx("beta_codes.batch.channel_tag", "Channel tag")}
            <input
              value={batchChannelTag}
              onChange={(event) => setBatchChannelTag(event.target.value)}
              className="mt-1 w-full px-2 py-1 text-sm"
              style={{
                backgroundColor: "var(--window-document-bg)",
                color: "var(--window-document-text)",
                border: "2px inset",
                borderColor: "var(--window-document-border)",
              }}
            />
          </label>
          <label className="text-xs font-semibold" style={{ color: "var(--window-document-text-muted)" }}>
            {tx("beta_codes.batch.source_detail", "Source detail")}
            <input
              value={batchSourceDetail}
              onChange={(event) => setBatchSourceDetail(event.target.value)}
              className="mt-1 w-full px-2 py-1 text-sm"
              style={{
                backgroundColor: "var(--window-document-bg)",
                color: "var(--window-document-text)",
                border: "2px inset",
                borderColor: "var(--window-document-border)",
              }}
            />
          </label>
          <label
            className="text-xs font-semibold md:col-span-2 xl:col-span-2"
            style={{ color: "var(--window-document-text-muted)" }}
          >
            {tx("beta_codes.batch.notes", "Notes")}
            <input
              value={batchNotes}
              onChange={(event) => setBatchNotes(event.target.value)}
              className="mt-1 w-full px-2 py-1 text-sm"
              style={{
                backgroundColor: "var(--window-document-bg)",
                color: "var(--window-document-text)",
                border: "2px inset",
                borderColor: "var(--window-document-border)",
              }}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleBatchCreate}
            disabled={isBatchCreating}
            className="beveled-button px-4 py-1 text-sm font-bold"
            style={{
              opacity: isBatchCreating ? 0.6 : 1,
              backgroundColor: "var(--primary)",
              color: "white",
            }}
          >
            {isBatchCreating
              ? tx("beta_codes.batch.creating", "Creating...")
              : tx("beta_codes.batch.create_button", "Create Batch")}
          </button>
          {lastBatchResult && (
            <span className="text-xs" style={{ color: "var(--window-document-text-muted)" }}>
              {tx("beta_codes.batch.last_result", "Last batch: {created} created, {skipped} skipped.", {
                created: lastBatchResult.createdCount,
                skipped: lastBatchResult.skippedCount,
              })}
            </span>
          )}
        </div>
      </div>

      <div
        className="p-3 rounded"
        style={{
          backgroundColor: "var(--window-document-bg-elevated)",
          border: "1px solid var(--window-document-border)",
        }}
      >
        <div className="mb-3 text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
          {tx("beta_codes.list.title", "Codes")}
        </div>

        {!betaCodes ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--neutral-gray)" }} />
          </div>
        ) : sortedCodes.length === 0 ? (
          <div className="text-sm py-6 text-center" style={{ color: "var(--window-document-text-muted)" }}>
            {tx("beta_codes.list.empty", "No beta codes matched your filters.")}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedCodes.map((row) => (
              <div
                key={row._id}
                className="p-3 rounded space-y-3"
                style={{
                  backgroundColor: "var(--window-document-bg)",
                  border: "1px solid var(--window-document-border)",
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-mono text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
                    {row.code}
                  </div>
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide"
                    style={getStatusBadgeStyles(row.status)}
                  >
                    {row.status}
                  </span>
                </div>

                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4 text-xs">
                  <div style={{ color: "var(--window-document-text-muted)" }}>
                    {tx("beta_codes.list.uses", "Uses:")}{" "}
                    <strong style={{ color: "var(--window-document-text)" }}>
                      {row.currentUses}/{row.maxUses} ({row.remainingUses} left)
                    </strong>
                  </div>
                  <div style={{ color: "var(--window-document-text-muted)" }}>
                    {tx("beta_codes.list.channel", "Channel:")}{" "}
                    <strong style={{ color: "var(--window-document-text)" }}>{row.channelTag || "n/a"}</strong>
                  </div>
                  <div style={{ color: "var(--window-document-text-muted)" }}>
                    {tx("beta_codes.list.source", "Source:")}{" "}
                    <strong style={{ color: "var(--window-document-text)" }}>
                      {row.sourceDetail || "n/a"}
                    </strong>
                  </div>
                  <div style={{ color: "var(--window-document-text-muted)" }}>
                    {tx("beta_codes.list.expires", "Expires:")}{" "}
                    <strong style={{ color: "var(--window-document-text)" }}>
                      {formatDateTime(row.expiresAt)}
                    </strong>
                  </div>
                  <div style={{ color: "var(--window-document-text-muted)" }}>
                    {tx("beta_codes.list.updated", "Updated:")}{" "}
                    <strong style={{ color: "var(--window-document-text)" }}>
                      {formatDateTime(row.updatedAt)}
                    </strong>
                  </div>
                  <div className="md:col-span-2 xl:col-span-3" style={{ color: "var(--window-document-text-muted)" }}>
                    {tx("beta_codes.list.notes", "Notes:")}{" "}
                    <strong style={{ color: "var(--window-document-text)" }}>{row.notes || "n/a"}</strong>
                  </div>
                </div>

                {editingCodeId === row._id ? (
                  <div
                    className="p-3 rounded space-y-3"
                    style={{
                      backgroundColor: "var(--window-document-bg-elevated)",
                      border: "1px dashed var(--window-document-border)",
                    }}
                  >
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                      <label className="text-xs font-semibold" style={{ color: "var(--window-document-text-muted)" }}>
                        {tx("beta_codes.edit.max_uses", "Max uses")}
                        <input
                          value={editMaxUses}
                          onChange={(event) => setEditMaxUses(event.target.value)}
                          className="mt-1 w-full px-2 py-1 text-sm"
                          style={{
                            backgroundColor: "var(--window-document-bg)",
                            color: "var(--window-document-text)",
                            border: "2px inset",
                            borderColor: "var(--window-document-border)",
                          }}
                        />
                      </label>
                      <label className="text-xs font-semibold" style={{ color: "var(--window-document-text-muted)" }}>
                        {tx("beta_codes.edit.expires_at", "Expires at")}
                        <input
                          type="datetime-local"
                          value={editExpiresAt}
                          onChange={(event) => setEditExpiresAt(event.target.value)}
                          className="mt-1 w-full px-2 py-1 text-sm"
                          style={{
                            backgroundColor: "var(--window-document-bg)",
                            color: "var(--window-document-text)",
                            border: "2px inset",
                            borderColor: "var(--window-document-border)",
                          }}
                        />
                      </label>
                      <label className="text-xs font-semibold" style={{ color: "var(--window-document-text-muted)" }}>
                        {tx("beta_codes.edit.channel_tag", "Channel tag")}
                        <input
                          value={editChannelTag}
                          onChange={(event) => setEditChannelTag(event.target.value)}
                          className="mt-1 w-full px-2 py-1 text-sm"
                          style={{
                            backgroundColor: "var(--window-document-bg)",
                            color: "var(--window-document-text)",
                            border: "2px inset",
                            borderColor: "var(--window-document-border)",
                          }}
                        />
                      </label>
                      <label className="text-xs font-semibold" style={{ color: "var(--window-document-text-muted)" }}>
                        {tx("beta_codes.edit.source_detail", "Source detail")}
                        <input
                          value={editSourceDetail}
                          onChange={(event) => setEditSourceDetail(event.target.value)}
                          className="mt-1 w-full px-2 py-1 text-sm"
                          style={{
                            backgroundColor: "var(--window-document-bg)",
                            color: "var(--window-document-text)",
                            border: "2px inset",
                            borderColor: "var(--window-document-border)",
                          }}
                        />
                      </label>
                      <label className="text-xs font-semibold" style={{ color: "var(--window-document-text-muted)" }}>
                        {tx("beta_codes.edit.notes", "Notes")}
                        <input
                          value={editNotes}
                          onChange={(event) => setEditNotes(event.target.value)}
                          className="mt-1 w-full px-2 py-1 text-sm"
                          style={{
                            backgroundColor: "var(--window-document-bg)",
                            color: "var(--window-document-text)",
                            border: "2px inset",
                            borderColor: "var(--window-document-border)",
                          }}
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleSaveEdit}
                        disabled={savingCodeId === row._id}
                        className="beveled-button px-4 py-1 text-sm font-bold flex items-center gap-2"
                        style={{
                          opacity: savingCodeId === row._id ? 0.6 : 1,
                          backgroundColor: "var(--primary)",
                          color: "white",
                        }}
                      >
                        {savingCodeId === row._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        {tx("beta_codes.actions.save", "Save")}
                      </button>
                      <button
                        onClick={resetEditState}
                        className="beveled-button px-4 py-1 text-sm font-bold flex items-center gap-2"
                        style={{
                          backgroundColor: "var(--window-document-bg)",
                          color: "var(--window-document-text)",
                        }}
                      >
                        <X className="w-4 h-4" />
                        {tx("beta_codes.actions.cancel", "Cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => beginEdit(row)}
                      className="beveled-button px-3 py-1 text-sm font-bold flex items-center gap-2"
                      style={{
                        backgroundColor: "var(--window-document-bg)",
                        color: "var(--window-document-text)",
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                      {tx("beta_codes.actions.edit", "Edit")}
                    </button>
                    {row.status !== "deactivated" && (
                      <button
                        onClick={() => setDeactivationDraft({ codeId: row._id, reason: "" })}
                        className="beveled-button px-3 py-1 text-sm font-bold flex items-center gap-2"
                        style={{
                          backgroundColor: "var(--error)",
                          color: "white",
                        }}
                      >
                        <Ban className="w-4 h-4" />
                        {tx("beta_codes.actions.deactivate", "Deactivate")}
                      </button>
                    )}
                  </div>
                )}

                {deactivationDraft?.codeId === row._id && (
                  <div
                    className="p-3 rounded space-y-2"
                    style={{
                      backgroundColor: "rgba(239, 68, 68, 0.08)",
                      border: "1px solid var(--error)",
                    }}
                  >
                    <label className="block text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
                      {tx("beta_codes.deactivate.reason_label", "Reason (optional)")}
                    </label>
                    <input
                      value={deactivationDraft.reason}
                      onChange={(event) =>
                        setDeactivationDraft({
                          codeId: row._id,
                          reason: event.target.value,
                        })
                      }
                      className="w-full px-2 py-1 text-sm"
                      style={{
                        backgroundColor: "var(--window-document-bg)",
                        color: "var(--window-document-text)",
                        border: "2px inset",
                        borderColor: "var(--window-document-border)",
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleDeactivate(row._id, deactivationDraft.reason)}
                        disabled={deactivatingCodeId === row._id}
                        className="beveled-button px-4 py-1 text-sm font-bold"
                        style={{
                          opacity: deactivatingCodeId === row._id ? 0.6 : 1,
                          backgroundColor: "var(--error)",
                          color: "white",
                        }}
                      >
                        {deactivatingCodeId === row._id
                          ? tx("beta_codes.deactivate.deactivating", "Deactivating...")
                          : tx("beta_codes.deactivate.confirm", "Confirm Deactivate")}
                      </button>
                      <button
                        onClick={() => setDeactivationDraft(null)}
                        className="beveled-button px-4 py-1 text-sm font-bold"
                        style={{
                          backgroundColor: "var(--window-document-bg)",
                          color: "var(--window-document-text)",
                        }}
                      >
                        {tx("beta_codes.actions.cancel", "Cancel")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
