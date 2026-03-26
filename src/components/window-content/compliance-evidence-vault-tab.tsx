"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { AlertCircle, CheckCircle2, Clock3, Loader2, ShieldAlert } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api: apiAny } = require("../../../convex/_generated/api") as { api: any };

type RiskId = "R-002" | "R-003" | "R-004" | "R-005";
type EvidenceSubtype =
  | "avv_provider"
  | "transfer_impact"
  | "security_control"
  | "incident_response"
  | "governance_record";
type EvidenceSourceType =
  | "org_uploaded"
  | "platform_inherited"
  | "provider_response"
  | "system_generated";
type UploadSourceType = Exclude<EvidenceSourceType, "platform_inherited">;
type EvidenceLifecycleStatus = "draft" | "active" | "superseded" | "deprecated" | "revoked";
type UploadLifecycleStatus = "draft" | "active";
type EvidenceInheritanceScope = "none" | "platform_shared" | "org_inherited";
type EvidenceSensitivity = "public" | "internal" | "confidential" | "strictly_confidential";
type EvidenceReviewCadence = "monthly" | "quarterly" | "semi_annual" | "annual";
type EvidenceRetentionClass = "90_days" | "1_year" | "3_years" | "7_years";

type EvidenceRow = {
  evidenceObjectId: string;
  title: string;
  subtype: EvidenceSubtype | null;
  sourceType: EvidenceSourceType | null;
  lifecycleStatus: EvidenceLifecycleStatus | null;
  inheritanceScope: EvidenceInheritanceScope | null;
  providerName?: string;
  riskReferences: Array<{ riskId: RiskId; controlId?: string }>;
  nextReviewAt: number | null;
  retentionDeleteAt: number | null;
  contractValid: boolean;
  validationErrors: string[];
  updatedAt: number;
};

type EvidenceListSnapshot = {
  organizationId: string;
  rows: EvidenceRow[];
  invalidCount: number;
};

type PlatformSharedEvidenceSnapshot = {
  organizationId: string;
  rows: Array<
    EvidenceRow & {
      sourceOrganizationId: string;
    }
  >;
  total: number;
};

type EvidenceRiskTimelineSnapshot = {
  organizationId: string;
  entries: Array<{
    evidenceObjectId: string;
    title: string;
    riskReferences: Array<{ riskId: RiskId; controlId?: string }>;
    provenance: {
      sourceType: EvidenceSourceType | null;
      sourceMarker: "org_local" | "org_inherited";
      inheritanceScope: EvidenceInheritanceScope | null;
      inheritedFromOrganizationId: string | null;
      inheritedFromEvidenceObjectId: string | null;
      platformShareScope: string | null;
    };
    timeline: Array<{
      actionId: string;
      actionType: string;
      eventType: string | null;
      performedAt: number;
      performedById: string | null;
      auditRef: string;
      riskIds: RiskId[];
      controlId: string | null;
    }>;
    latestEventAt: number;
  }>;
};

type ExpiryStatus = "expired" | "review_due" | "healthy" | "metadata_incomplete";
type ExpiryFilter = "all" | ExpiryStatus;
type RiskFilter = "all" | RiskId;
type TypeFilter = "all" | EvidenceSubtype;
type SourceFilter = "all" | EvidenceSourceType;

type UploadFormState = {
  title: string;
  description: string;
  subtype: EvidenceSubtype;
  sourceType: UploadSourceType;
  sensitivity: EvidenceSensitivity;
  lifecycleStatus: UploadLifecycleStatus;
  reviewCadence: EvidenceReviewCadence;
  retentionClass: EvidenceRetentionClass;
  nextReviewDate: string;
  retentionDeleteDate: string;
  providerName: string;
  controlId: string;
  notes: string;
  selectedRiskIds: RiskId[];
};

type RedactionPreviewEntry = {
  field: string;
  originalValue: string;
  redactedValue: string;
  findingCount: number;
};

interface ComplianceEvidenceVaultTabProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  isOrgOwner: boolean;
  isSuperAdmin: boolean;
}

const RISK_OPTIONS: RiskId[] = ["R-002", "R-003", "R-004", "R-005"];

function formatDate(timestamp: number | null | undefined): string {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
    return "n/a";
  }
  return new Date(timestamp).toLocaleString();
}

function normalizeLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function computeExpiryStatus(row: EvidenceRow, now: number): ExpiryStatus {
  if (typeof row.retentionDeleteAt === "number" && row.retentionDeleteAt <= now) {
    return "expired";
  }
  if (typeof row.nextReviewAt === "number" && row.nextReviewAt <= now) {
    return "review_due";
  }
  if (typeof row.nextReviewAt !== "number" || typeof row.retentionDeleteAt !== "number") {
    return "metadata_incomplete";
  }
  return "healthy";
}

function expiryStyles(status: ExpiryStatus): { background: string; color: string } {
  if (status === "expired") {
    return { background: "var(--color-error-subtle)", color: "var(--error)" };
  }
  if (status === "review_due") {
    return { background: "var(--warning-bg)", color: "var(--warning)" };
  }
  if (status === "metadata_incomplete") {
    return { background: "var(--desktop-shell-accent)", color: "var(--desktop-menu-text-muted)" };
  }
  return { background: "var(--success-bg)", color: "var(--success)" };
}

function sourceStyles(sourceType: EvidenceSourceType | null): { background: string; color: string } {
  if (sourceType === "platform_inherited") {
    return { background: "var(--warning-bg)", color: "var(--warning)" };
  }
  if (sourceType === "org_uploaded") {
    return { background: "var(--success-bg)", color: "var(--success)" };
  }
  return { background: "var(--desktop-shell-accent)", color: "var(--desktop-menu-text-muted)" };
}

function evidenceTypeOptions(): Array<{ value: TypeFilter; label: string }> {
  return [
    { value: "all", label: "All types" },
    { value: "avv_provider", label: "AVV provider" },
    { value: "transfer_impact", label: "Transfer impact" },
    { value: "security_control", label: "Security control" },
    { value: "incident_response", label: "Incident response" },
    { value: "governance_record", label: "Governance record" },
  ];
}

function uploadEvidenceTypeOptions(): Array<{ value: EvidenceSubtype; label: string }> {
  return evidenceTypeOptions().filter((option) => option.value !== "all") as Array<{
    value: EvidenceSubtype;
    label: string;
  }>;
}

function dateInputValueFromNow(daysAhead: number): string {
  const now = new Date();
  now.setDate(now.getDate() + daysAhead);
  return now.toISOString().slice(0, 10);
}

function parseDateInputToTimestamp(value: string): number | null {
  if (!value.trim()) {
    return null;
  }
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

async function computeFileSha256(file: File): Promise<string> {
  const data = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((entry) => entry.toString(16).padStart(2, "0"))
    .join("");
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "n/a";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const REDACTION_PATTERNS: Array<{
  regex: RegExp;
  replacement: string;
}> = [
  {
    // API-style token redaction
    regex: /\b(?:sk|pk)_[A-Za-z0-9_]{12,}\b/g,
    replacement: "[REDACTED_TOKEN]",
  },
  {
    // IBAN-like pattern redaction
    regex: /\b[A-Z]{2}[0-9A-Z]{13,30}\b/g,
    replacement: "[REDACTED_IBAN]",
  },
  {
    // Basic email redaction
    regex: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    replacement: "[REDACTED_EMAIL]",
  },
  {
    // Basic phone redaction
    regex: /\+?\d[\d\s().-]{6,}\d/g,
    replacement: "[REDACTED_PHONE]",
  },
];

export function redactSensitiveUploadText(value: string): {
  redactedValue: string;
  findingCount: number;
} {
  let redactedValue = value;
  let findingCount = 0;
  for (const pattern of REDACTION_PATTERNS) {
    // Clone regex to avoid shared lastIndex state across repeated calls.
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    const matches = redactedValue.match(regex);
    if (!matches || matches.length === 0) {
      continue;
    }
    findingCount += matches.length;
    redactedValue = redactedValue.replace(regex, pattern.replacement);
  }
  return {
    redactedValue,
    findingCount,
  };
}

export function buildEvidenceUploadRedactionPreview(args: {
  selectedFile: File | null;
  uploadForm: UploadFormState;
}): {
  entries: RedactionPreviewEntry[];
  totalFindings: number;
} {
  const candidates: Array<{ field: string; value: string }> = [
    { field: "Filename", value: args.selectedFile?.name ?? "" },
    { field: "Title", value: args.uploadForm.title },
    { field: "Description", value: args.uploadForm.description },
    { field: "Provider name", value: args.uploadForm.providerName },
    { field: "Control ID", value: args.uploadForm.controlId },
    { field: "Notes", value: args.uploadForm.notes },
  ];

  const entries: RedactionPreviewEntry[] = [];
  let totalFindings = 0;
  for (const candidate of candidates) {
    const originalValue = candidate.value.trim();
    if (!originalValue) {
      continue;
    }
    const redaction = redactSensitiveUploadText(originalValue);
    if (redaction.findingCount <= 0) {
      continue;
    }
    totalFindings += redaction.findingCount;
    entries.push({
      field: candidate.field,
      originalValue,
      redactedValue: redaction.redactedValue,
      findingCount: redaction.findingCount,
    });
  }

  return {
    entries,
    totalFindings,
  };
}

function buildDefaultUploadForm(): UploadFormState {
  return {
    title: "",
    description: "",
    subtype: "avv_provider",
    sourceType: "org_uploaded",
    sensitivity: "confidential",
    lifecycleStatus: "active",
    reviewCadence: "annual",
    retentionClass: "3_years",
    nextReviewDate: dateInputValueFromNow(30),
    retentionDeleteDate: dateInputValueFromNow(365),
    providerName: "",
    controlId: "",
    notes: "",
    selectedRiskIds: [],
  };
}

export function ComplianceEvidenceVaultTab({
  sessionId,
  organizationId,
  isOrgOwner,
  isSuperAdmin,
}: ComplianceEvidenceVaultTabProps) {
  const hasAccess = isOrgOwner || isSuperAdmin;
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>("all");
  const [providerFilter, setProviderFilter] = useState("");

  const [uploadForm, setUploadForm] = useState<UploadFormState>(() => buildDefaultUploadForm());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileChecksum, setSelectedFileChecksum] = useState<string | null>(null);
  const [isChecksumComputing, setIsChecksumComputing] = useState(false);
  const [checksumError, setChecksumError] = useState<string | null>(null);
  const [redactionReviewConfirmed, setRedactionReviewConfirmed] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [copiedAuditRef, setCopiedAuditRef] = useState<string | null>(null);
  const [supportingError, setSupportingError] = useState<string | null>(null);
  const [supportingSuccess, setSupportingSuccess] = useState<string | null>(null);
  const [supportingBusyEvidenceId, setSupportingBusyEvidenceId] = useState<string | null>(null);
  const [supportingRiskTargets, setSupportingRiskTargets] = useState<Record<string, RiskId>>({});

  const generateEvidenceUploadUrl = useMutation(apiAny.complianceEvidenceVault.generateEvidenceUploadUrl);
  const completeEvidenceUpload = useMutation(apiAny.complianceEvidenceVault.completeEvidenceUpload);
  const addRiskEvidence = useMutation(apiAny.complianceControlPlane.addRiskEvidence);

  const snapshot = useQuery(
    apiAny.complianceEvidenceVault.listEvidenceMetadata,
    hasAccess
      ? {
          sessionId,
          organizationId,
          includeInherited: true,
          ...(riskFilter !== "all" ? { riskId: riskFilter } : {}),
          ...(typeFilter !== "all" ? { subtype: typeFilter } : {}),
          ...(sourceFilter !== "all" ? { sourceType: sourceFilter } : {}),
        }
      : "skip",
  ) as EvidenceListSnapshot | undefined;
  const timelineSnapshot = useQuery(
    apiAny.complianceControlPlane.getComplianceEvidenceRiskTimeline,
    hasAccess && selectedEvidenceId
      ? {
          sessionId,
          organizationId,
          evidenceObjectId: selectedEvidenceId as Id<"objects">,
          limit: 25,
        }
      : "skip",
  ) as EvidenceRiskTimelineSnapshot | undefined;
  const platformSharedSnapshot = useQuery(
    apiAny.complianceEvidenceVault.listPlatformSharedEvidence,
    hasAccess
      ? {
          sessionId,
          organizationId,
        }
      : "skip",
  ) as PlatformSharedEvidenceSnapshot | undefined;

  const providerQuery = providerFilter.trim().toLowerCase();
  const filteredRows = useMemo(() => {
    const rows = snapshot?.rows ?? [];
    const now = Date.now();
    const nextRows = rows.filter((row) => {
      if (providerQuery.length > 0) {
        const providerName = row.providerName?.toLowerCase() ?? "";
        if (!providerName.includes(providerQuery)) {
          return false;
        }
      }
      if (expiryFilter !== "all" && computeExpiryStatus(row, now) !== expiryFilter) {
        return false;
      }
      return true;
    });
    return nextRows.sort((left, right) => {
      const rank = (status: ExpiryStatus) =>
        status === "expired" ? 0 : status === "review_due" ? 1 : status === "metadata_incomplete" ? 2 : 3;
      const leftRank = rank(computeExpiryStatus(left, now));
      const rightRank = rank(computeExpiryStatus(right, now));
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }
      const leftDueAt = left.nextReviewAt ?? Number.MAX_SAFE_INTEGER;
      const rightDueAt = right.nextReviewAt ?? Number.MAX_SAFE_INTEGER;
      if (leftDueAt !== rightDueAt) {
        return leftDueAt - rightDueAt;
      }
      return right.updatedAt - left.updatedAt;
    });
  }, [expiryFilter, providerQuery, snapshot]);

  const summary = useMemo(() => {
    const now = Date.now();
    const counts = {
      total: filteredRows.length,
      expired: 0,
      reviewDue: 0,
      metadataIncomplete: 0,
      healthy: 0,
    };
    for (const row of filteredRows) {
      const status = computeExpiryStatus(row, now);
      if (status === "expired") {
        counts.expired += 1;
      } else if (status === "review_due") {
        counts.reviewDue += 1;
      } else if (status === "metadata_incomplete") {
        counts.metadataIncomplete += 1;
      } else {
        counts.healthy += 1;
      }
    }
    return counts;
  }, [filteredRows]);

  useEffect(() => {
    if (filteredRows.length === 0) {
      setSelectedEvidenceId(null);
      return;
    }
    if (!selectedEvidenceId || !filteredRows.some((row) => String(row.evidenceObjectId) === selectedEvidenceId)) {
      setSelectedEvidenceId(String(filteredRows[0].evidenceObjectId));
    }
  }, [filteredRows, selectedEvidenceId]);

  useEffect(() => {
    if (!platformSharedSnapshot?.rows) {
      return;
    }
    setSupportingRiskTargets((current) => {
      const next = { ...current };
      for (const row of platformSharedSnapshot.rows) {
        const evidenceObjectId = String(row.evidenceObjectId);
        if (!next[evidenceObjectId]) {
          next[evidenceObjectId] = row.riskReferences[0]?.riskId ?? "R-002";
        }
      }
      return next;
    });
  }, [platformSharedSnapshot]);

  const redactionPreview = useMemo(
    () =>
      buildEvidenceUploadRedactionPreview({
        selectedFile,
        uploadForm,
      }),
    [selectedFile, uploadForm],
  );
  const hasRedactionFindings = redactionPreview.totalFindings > 0;

  useEffect(() => {
    if (!selectedFile) {
      setSelectedFileChecksum(null);
      setChecksumError(null);
      setIsChecksumComputing(false);
      return;
    }
    let cancelled = false;
    setIsChecksumComputing(true);
    setChecksumError(null);
    void computeFileSha256(selectedFile)
      .then((checksum) => {
        if (cancelled) {
          return;
        }
        setSelectedFileChecksum(checksum);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : "Checksum generation failed.";
        setChecksumError(message);
        setSelectedFileChecksum(null);
      })
      .finally(() => {
        if (!cancelled) {
          setIsChecksumComputing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedFile]);

  useEffect(() => {
    setRedactionReviewConfirmed(false);
  }, [
    selectedFile?.name,
    uploadForm.title,
    uploadForm.description,
    uploadForm.providerName,
    uploadForm.controlId,
    uploadForm.notes,
  ]);

  const updateUploadForm = (updates: Partial<UploadFormState>) => {
    setUploadForm((current) => ({ ...current, ...updates }));
  };

  const toggleRiskSelection = (riskId: RiskId) => {
    setUploadForm((current) => {
      const selected = current.selectedRiskIds.includes(riskId);
      if (selected) {
        return {
          ...current,
          selectedRiskIds: current.selectedRiskIds.filter((entry) => entry !== riskId),
        };
      }
      return {
        ...current,
        selectedRiskIds: [...current.selectedRiskIds, riskId].sort((left, right) => left.localeCompare(right)) as RiskId[],
      };
    });
  };

  const resetUploadForm = () => {
    setUploadForm(buildDefaultUploadForm());
    setSelectedFile(null);
    setSelectedFileChecksum(null);
    setChecksumError(null);
    setRedactionReviewConfirmed(false);
  };

  const validateUploadInputs = (): string[] => {
    const errors: string[] = [];
    const title = uploadForm.title.trim();
    const nextReviewAt = parseDateInputToTimestamp(uploadForm.nextReviewDate);
    const retentionDeleteAt = parseDateInputToTimestamp(uploadForm.retentionDeleteDate);

    if (!selectedFile) {
      errors.push("Evidence file is required.");
    } else if (selectedFile.size <= 0) {
      errors.push("Evidence file must not be empty.");
    }
    if (!title) {
      errors.push("Evidence title is required.");
    }
    if (uploadForm.selectedRiskIds.length === 0) {
      errors.push("Select at least one risk link (R-002..R-005).");
    }
    if (nextReviewAt === null) {
      errors.push("Next review date is required.");
    }
    if (retentionDeleteAt === null) {
      errors.push("Retention delete date is required.");
    }
    if (
      nextReviewAt !== null
      && retentionDeleteAt !== null
      && retentionDeleteAt <= nextReviewAt
    ) {
      errors.push("Retention delete date must be after next review date.");
    }
    if (
      (uploadForm.subtype === "avv_provider" || uploadForm.sourceType === "provider_response")
      && !uploadForm.providerName.trim()
    ) {
      errors.push("Provider name is required for AVV/provider-response evidence.");
    }

    return errors;
  };

  const handleUploadSubmit = async () => {
    setUploadError(null);
    setUploadSuccess(null);

    const validationErrors = validateUploadInputs();
    if (validationErrors.length > 0) {
      setUploadError(validationErrors[0]);
      return;
    }
    if (!selectedFile) {
      setUploadError("Evidence file is required.");
      return;
    }
    if (isChecksumComputing) {
      setUploadError("Checksum is still computing. Wait before uploading.");
      return;
    }
    if (checksumError) {
      setUploadError(`Checksum preview failed: ${checksumError}`);
      return;
    }
    if (!selectedFileChecksum) {
      setUploadError("Checksum preview is required before upload.");
      return;
    }
    if (hasRedactionFindings && !redactionReviewConfirmed) {
      setUploadError("Confirm redaction preview findings before upload.");
      return;
    }

    const nextReviewAt = parseDateInputToTimestamp(uploadForm.nextReviewDate);
    const retentionDeleteAt = parseDateInputToTimestamp(uploadForm.retentionDeleteDate);
    if (nextReviewAt === null || retentionDeleteAt === null) {
      setUploadError("Review and retention dates are required.");
      return;
    }

    setIsUploading(true);
    try {
      const uploadTicket = await generateEvidenceUploadUrl({
        sessionId,
        organizationId,
        estimatedSizeBytes: selectedFile.size,
      });

      const uploadResponse = await fetch(uploadTicket.uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": selectedFile.type || "application/octet-stream",
        },
        body: selectedFile,
      });
      if (!uploadResponse.ok) {
        throw new Error("Storage upload failed before metadata registration.");
      }
      const payload = (await uploadResponse.json()) as { storageId?: string };
      if (!payload.storageId) {
        throw new Error("Storage upload response is missing storageId.");
      }

      await completeEvidenceUpload({
        sessionId,
        organizationId,
        storageId: payload.storageId as Id<"_storage">,
        filename: selectedFile.name,
        mimeType: selectedFile.type || "application/octet-stream",
        sizeBytes: selectedFile.size,
        checksumSha256: selectedFileChecksum,
        title: uploadForm.title.trim(),
        description: uploadForm.description.trim() || undefined,
        subtype: uploadForm.subtype,
        sourceType: uploadForm.sourceType,
        sensitivity: uploadForm.sensitivity,
        lifecycleStatus: uploadForm.lifecycleStatus,
        inheritanceScope: "none",
        inheritanceEligible: false,
        riskReferences: uploadForm.selectedRiskIds.map((riskId) => ({
          riskId,
          controlId: uploadForm.controlId.trim() || undefined,
        })),
        retentionClass: uploadForm.retentionClass,
        retentionDeleteAt,
        reviewCadence: uploadForm.reviewCadence,
        nextReviewAt,
        providerName: uploadForm.providerName.trim() || undefined,
        notes: uploadForm.notes.trim() || undefined,
        tags: ["dsgvo", "evidence_vault"],
      });

      setUploadSuccess("Evidence uploaded and metadata registered.");
      resetUploadForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload evidence.";
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUseSupportingEvidence = async (
    row: PlatformSharedEvidenceSnapshot["rows"][number],
  ) => {
    setSupportingError(null);
    setSupportingSuccess(null);

    if (!isOrgOwner) {
      setSupportingError("Only organization owners can attach supporting evidence to risk workflows.");
      return;
    }

    const evidenceObjectId = String(row.evidenceObjectId);
    const targetRiskId =
      supportingRiskTargets[evidenceObjectId]
      ?? row.riskReferences[0]?.riskId
      ?? null;
    if (!targetRiskId) {
      setSupportingError("No risk target is available for the selected inherited evidence.");
      return;
    }

    setSupportingBusyEvidenceId(evidenceObjectId);
    try {
      await addRiskEvidence({
        sessionId,
        organizationId,
        riskId: targetRiskId,
        label: `${row.title} (platform shared support)`,
        notes: `Inherited platform evidence reference ${evidenceObjectId} from org ${row.sourceOrganizationId}.`,
      });
      setSupportingSuccess(`Attached platform evidence to ${targetRiskId} as supporting context.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to attach supporting evidence.";
      setSupportingError(message);
    } finally {
      setSupportingBusyEvidenceId(null);
    }
  };

  const selectedTimelineEntry = timelineSnapshot?.entries?.[0] ?? null;

  const handleCopyAuditRef = async (auditRef: string) => {
    try {
      await navigator.clipboard.writeText(auditRef);
      setCopiedAuditRef(auditRef);
    } catch {
      setUploadError("Unable to copy audit reference to clipboard.");
    }
  };

  if (!hasAccess) {
    return (
      <div
        className="p-4 rounded border"
        style={{ borderColor: "var(--warning)", background: "var(--warning-bg)" }}
      >
        <div className="flex items-start gap-2">
          <ShieldAlert size={18} style={{ color: "var(--warning)" }} className="mt-0.5" />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
              Owner or super-admin access required
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              Evidence Vault is available for organization owners and super admins only.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (snapshot === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
            Evidence Vault
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            Deterministic listing with fail-closed filters for risk, provider, evidence type, source, and expiry.
          </p>
        </div>
      </div>

      <div className="rounded border p-3 space-y-3" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
            Inherited platform evidence (read-only)
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            These records are advisory platform evidence. They do not auto-clear blockers or auto-set GO.
          </p>
        </div>

        {supportingSuccess ? (
          <div className="rounded border p-2" style={{ borderColor: "var(--success)", background: "var(--success-bg)" }}>
            <p className="flex items-center gap-2 text-xs" style={{ color: "var(--success)" }}>
              <CheckCircle2 size={14} />
              {supportingSuccess}
            </p>
          </div>
        ) : null}

        {supportingError ? (
          <div className="rounded border p-2" style={{ borderColor: "var(--error)", background: "var(--color-error-subtle)" }}>
            <p className="flex items-center gap-2 text-xs" style={{ color: "var(--error)" }}>
              <AlertCircle size={14} />
              {supportingError}
            </p>
          </div>
        ) : null}

        {platformSharedSnapshot === undefined ? (
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
            <Loader2 size={14} className="animate-spin" />
            Loading inherited platform evidence...
          </div>
        ) : platformSharedSnapshot.total === 0 ? (
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            No platform-shared evidence is currently visible for this organization.
          </p>
        ) : (
          <div className="rounded border overflow-hidden" style={{ borderColor: "var(--win95-border)" }}>
            <table className="w-full text-left text-xs">
              <thead style={{ background: "var(--desktop-shell-accent)" }}>
                <tr>
                  <th className="px-3 py-2 font-semibold">Evidence</th>
                  <th className="px-3 py-2 font-semibold">Risk links</th>
                  <th className="px-3 py-2 font-semibold">Source org</th>
                  <th className="px-3 py-2 font-semibold">Updated</th>
                  <th className="px-3 py-2 font-semibold">Support action</th>
                </tr>
              </thead>
              <tbody>
                {platformSharedSnapshot.rows.map((row) => {
                  const evidenceObjectId = String(row.evidenceObjectId);
                  const riskLinkIds = Array.from(new Set(row.riskReferences.map((reference) => reference.riskId)));
                  const targetRiskOptions = riskLinkIds.length > 0 ? riskLinkIds : RISK_OPTIONS;
                  return (
                    <tr key={evidenceObjectId} className="border-t" style={{ borderColor: "var(--win95-border)" }}>
                      <td className="px-3 py-2">
                        <p className="font-semibold" style={{ color: "var(--win95-text)" }}>
                          {row.title}
                        </p>
                        <p style={{ color: "var(--neutral-gray)" }}>
                          {row.subtype ? normalizeLabel(row.subtype) : "unknown"} | {row.sourceType ? normalizeLabel(row.sourceType) : "unknown"}
                        </p>
                      </td>
                      <td className="px-3 py-2" style={{ color: "var(--neutral-gray)" }}>
                        {riskLinkIds.length > 0 ? riskLinkIds.join(", ") : "none"}
                      </td>
                      <td className="px-3 py-2" style={{ color: "var(--neutral-gray)" }}>
                        {row.sourceOrganizationId}
                      </td>
                      <td className="px-3 py-2" style={{ color: "var(--neutral-gray)" }}>
                        {formatDate(row.updatedAt)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <select
                            value={supportingRiskTargets[evidenceObjectId] ?? targetRiskOptions[0]}
                            onChange={(event) =>
                              setSupportingRiskTargets((current) => ({
                                ...current,
                                [evidenceObjectId]: event.target.value as RiskId,
                              }))
                            }
                            className="border rounded px-2 py-1 text-[11px]"
                            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
                            disabled={supportingBusyEvidenceId !== null || !isOrgOwner}
                          >
                            {targetRiskOptions.map((riskId) => (
                              <option key={riskId} value={riskId}>
                                {riskId}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleUseSupportingEvidence(row)}
                            disabled={!isOrgOwner || supportingBusyEvidenceId !== null}
                            className="rounded border px-2 py-1 text-[11px] font-semibold disabled:opacity-50"
                            style={{
                              borderColor: "var(--win95-border)",
                              background: "var(--win95-highlight)",
                              color: "white",
                            }}
                          >
                            {supportingBusyEvidenceId === evidenceObjectId ? "Attaching..." : "Use as supporting evidence"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded border p-3 space-y-3" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
            Upload evidence + capture metadata
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            Fail-closed path: missing mandatory metadata prevents upload completion and keeps gate blockers unresolved.
          </p>
        </div>

        {uploadSuccess ? (
          <div className="rounded border p-2" style={{ borderColor: "var(--success)", background: "var(--success-bg)" }}>
            <p className="flex items-center gap-2 text-xs" style={{ color: "var(--success)" }}>
              <CheckCircle2 size={14} />
              {uploadSuccess}
            </p>
          </div>
        ) : null}

        {uploadError ? (
          <div className="rounded border p-2" style={{ borderColor: "var(--error)", background: "var(--color-error-subtle)" }}>
            <p className="flex items-center gap-2 text-xs" style={{ color: "var(--error)" }}>
              <AlertCircle size={14} />
              {uploadError}
            </p>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs" style={{ color: "var(--win95-text)" }}>
            Evidence file
            <input
              type="file"
              className="mt-1 w-full border rounded px-2 py-1 text-xs"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] ?? null);
                setUploadError(null);
                setUploadSuccess(null);
              }}
              disabled={isUploading}
            />
          </label>

          <label className="text-xs" style={{ color: "var(--win95-text)" }}>
            Evidence title
            <input
              type="text"
              value={uploadForm.title}
              onChange={(event) => updateUploadForm({ title: event.target.value })}
              className="mt-1 w-full border rounded px-2 py-1 text-xs"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
              disabled={isUploading}
            />
          </label>
        </div>

        {selectedFile ? (
          <div className="rounded border p-2 space-y-2" style={{ borderColor: "var(--win95-border)", background: "var(--desktop-shell-accent)" }}>
            <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
              Pre-upload checksum + redaction preview
            </p>
            <div className="grid gap-2 md:grid-cols-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
              <p>
                File: <span style={{ color: "var(--win95-text)" }}>{selectedFile.name}</span> ({formatFileSize(selectedFile.size)})
              </p>
              <p>
                SHA-256:{" "}
                {isChecksumComputing ? (
                  <span>Computing...</span>
                ) : selectedFileChecksum ? (
                  <code style={{ color: "var(--win95-text)" }}>{selectedFileChecksum}</code>
                ) : (
                  <span>Unavailable</span>
                )}
              </p>
            </div>
            {checksumError ? (
              <p className="text-xs" style={{ color: "var(--error)" }}>
                Checksum preview error: {checksumError}
              </p>
            ) : null}

            {hasRedactionFindings ? (
              <div className="space-y-2">
                <p className="text-xs" style={{ color: "var(--warning)" }}>
                  Sensitive-pattern matches detected. Review redacted preview before upload.
                </p>
                <div className="space-y-1">
                  {redactionPreview.entries.map((entry) => (
                    <div
                      key={`${entry.field}:${entry.redactedValue}`}
                      className="rounded border p-2 text-xs"
                      style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}
                    >
                      <p className="font-semibold" style={{ color: "var(--win95-text)" }}>
                        {entry.field} ({entry.findingCount} match{entry.findingCount > 1 ? "es" : ""})
                      </p>
                      <p style={{ color: "var(--neutral-gray)" }}>
                        Original: {entry.originalValue}
                      </p>
                      <p style={{ color: "var(--win95-text)" }}>
                        Redacted preview: {entry.redactedValue}
                      </p>
                    </div>
                  ))}
                </div>
                <label className="inline-flex items-center gap-2 text-xs" style={{ color: "var(--win95-text)" }}>
                  <input
                    type="checkbox"
                    checked={redactionReviewConfirmed}
                    onChange={(event) => setRedactionReviewConfirmed(event.target.checked)}
                    disabled={isUploading}
                  />
                  I reviewed redaction findings and confirm this upload.
                </label>
              </div>
            ) : (
              <p className="text-xs" style={{ color: "var(--success)" }}>
                No sensitive-pattern matches detected in filename or metadata fields.
              </p>
            )}
          </div>
        ) : null}

        <label className="block text-xs" style={{ color: "var(--win95-text)" }}>
          Description
          <textarea
            value={uploadForm.description}
            onChange={(event) => updateUploadForm({ description: event.target.value })}
            className="mt-1 w-full h-14 border rounded px-2 py-1 text-xs"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", resize: "vertical" }}
            disabled={isUploading}
          />
        </label>

        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-xs" style={{ color: "var(--win95-text)" }}>
            Type
            <select
              value={uploadForm.subtype}
              onChange={(event) => updateUploadForm({ subtype: event.target.value as EvidenceSubtype })}
              className="mt-1 w-full border rounded px-2 py-1 text-xs"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
              disabled={isUploading}
            >
              {uploadEvidenceTypeOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs" style={{ color: "var(--win95-text)" }}>
            Source
            <select
              value={uploadForm.sourceType}
              onChange={(event) => updateUploadForm({ sourceType: event.target.value as UploadSourceType })}
              className="mt-1 w-full border rounded px-2 py-1 text-xs"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
              disabled={isUploading}
            >
              <option value="org_uploaded">Org uploaded</option>
              <option value="provider_response">Provider response</option>
              <option value="system_generated">System generated</option>
            </select>
          </label>

          <label className="text-xs" style={{ color: "var(--win95-text)" }}>
            Sensitivity
            <select
              value={uploadForm.sensitivity}
              onChange={(event) => updateUploadForm({ sensitivity: event.target.value as EvidenceSensitivity })}
              className="mt-1 w-full border rounded px-2 py-1 text-xs"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
              disabled={isUploading}
            >
              <option value="public">Public</option>
              <option value="internal">Internal</option>
              <option value="confidential">Confidential</option>
              <option value="strictly_confidential">Strictly confidential</option>
            </select>
          </label>

          <label className="text-xs" style={{ color: "var(--win95-text)" }}>
            Lifecycle
            <select
              value={uploadForm.lifecycleStatus}
              onChange={(event) => updateUploadForm({ lifecycleStatus: event.target.value as UploadLifecycleStatus })}
              className="mt-1 w-full border rounded px-2 py-1 text-xs"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
              disabled={isUploading}
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-xs" style={{ color: "var(--win95-text)" }}>
            Review cadence
            <select
              value={uploadForm.reviewCadence}
              onChange={(event) => updateUploadForm({ reviewCadence: event.target.value as EvidenceReviewCadence })}
              className="mt-1 w-full border rounded px-2 py-1 text-xs"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
              disabled={isUploading}
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="semi_annual">Semi annual</option>
              <option value="annual">Annual</option>
            </select>
          </label>

          <label className="text-xs" style={{ color: "var(--win95-text)" }}>
            Next review date
            <input
              type="date"
              value={uploadForm.nextReviewDate}
              onChange={(event) => updateUploadForm({ nextReviewDate: event.target.value })}
              className="mt-1 w-full border rounded px-2 py-1 text-xs"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
              disabled={isUploading}
            />
          </label>

          <label className="text-xs" style={{ color: "var(--win95-text)" }}>
            Retention class
            <select
              value={uploadForm.retentionClass}
              onChange={(event) => updateUploadForm({ retentionClass: event.target.value as EvidenceRetentionClass })}
              className="mt-1 w-full border rounded px-2 py-1 text-xs"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
              disabled={isUploading}
            >
              <option value="90_days">90 days</option>
              <option value="1_year">1 year</option>
              <option value="3_years">3 years</option>
              <option value="7_years">7 years</option>
            </select>
          </label>

          <label className="text-xs" style={{ color: "var(--win95-text)" }}>
            Retention delete date
            <input
              type="date"
              value={uploadForm.retentionDeleteDate}
              onChange={(event) => updateUploadForm({ retentionDeleteDate: event.target.value })}
              className="mt-1 w-full border rounded px-2 py-1 text-xs"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
              disabled={isUploading}
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs" style={{ color: "var(--win95-text)" }}>
            Provider name
            <input
              type="text"
              value={uploadForm.providerName}
              onChange={(event) => updateUploadForm({ providerName: event.target.value })}
              className="mt-1 w-full border rounded px-2 py-1 text-xs"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
              disabled={isUploading}
            />
          </label>

          <label className="text-xs" style={{ color: "var(--win95-text)" }}>
            Control ID (optional)
            <input
              type="text"
              value={uploadForm.controlId}
              onChange={(event) => updateUploadForm({ controlId: event.target.value })}
              className="mt-1 w-full border rounded px-2 py-1 text-xs"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
              disabled={isUploading}
            />
          </label>

          <label className="text-xs" style={{ color: "var(--win95-text)" }}>
            Notes
            <input
              type="text"
              value={uploadForm.notes}
              onChange={(event) => updateUploadForm({ notes: event.target.value })}
              className="mt-1 w-full border rounded px-2 py-1 text-xs"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
              disabled={isUploading}
            />
          </label>
        </div>

        <div>
          <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
            Risk links (required)
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            {RISK_OPTIONS.map((riskId) => (
              <label key={riskId} className="inline-flex items-center gap-1 text-xs" style={{ color: "var(--win95-text)" }}>
                <input
                  type="checkbox"
                  checked={uploadForm.selectedRiskIds.includes(riskId)}
                  onChange={() => toggleRiskSelection(riskId)}
                  disabled={isUploading}
                />
                {riskId}
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Secure file payload lives in encrypted storage; git holds metadata/audit references only.
          </p>
          <button
            onClick={handleUploadSubmit}
            disabled={
              isUploading
              || isChecksumComputing
              || Boolean(checksumError)
              || !selectedFile
              || !selectedFileChecksum
              || (hasRedactionFindings && !redactionReviewConfirmed)
            }
            className="px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-50"
            style={{ background: "var(--win95-highlight)", color: "white" }}
          >
            {isUploading ? "Uploading..." : "Upload evidence"}
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <label className="text-xs" style={{ color: "var(--win95-text)" }}>
          Risk
          <select
            className="mt-1 w-full border rounded px-2 py-1 text-xs"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
            value={riskFilter}
            onChange={(event) => setRiskFilter(event.target.value as RiskFilter)}
          >
            <option value="all">All risks</option>
            <option value="R-002">R-002</option>
            <option value="R-003">R-003</option>
            <option value="R-004">R-004</option>
            <option value="R-005">R-005</option>
          </select>
        </label>

        <label className="text-xs" style={{ color: "var(--win95-text)" }}>
          Evidence type
          <select
            className="mt-1 w-full border rounded px-2 py-1 text-xs"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
          >
            {evidenceTypeOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs" style={{ color: "var(--win95-text)" }}>
          Source
          <select
            className="mt-1 w-full border rounded px-2 py-1 text-xs"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}
          >
            <option value="all">All sources</option>
            <option value="org_uploaded">Org uploaded</option>
            <option value="platform_inherited">Platform inherited</option>
            <option value="provider_response">Provider response</option>
            <option value="system_generated">System generated</option>
          </select>
        </label>

        <label className="text-xs" style={{ color: "var(--win95-text)" }}>
          Expiry status
          <select
            className="mt-1 w-full border rounded px-2 py-1 text-xs"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
            value={expiryFilter}
            onChange={(event) => setExpiryFilter(event.target.value as ExpiryFilter)}
          >
            <option value="all">All statuses</option>
            <option value="expired">Expired</option>
            <option value="review_due">Review due</option>
            <option value="metadata_incomplete">Metadata incomplete</option>
            <option value="healthy">Healthy</option>
          </select>
        </label>

        <label className="text-xs" style={{ color: "var(--win95-text)" }}>
          Provider
          <input
            type="text"
            value={providerFilter}
            onChange={(event) => setProviderFilter(event.target.value)}
            placeholder="Filter by provider"
            className="mt-1 w-full border rounded px-2 py-1 text-xs"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <div className="rounded border p-3" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>Visible rows</p>
          <p className="text-sm font-semibold mt-1" style={{ color: "var(--win95-text)" }}>
            {summary.total}
          </p>
        </div>
        <div className="rounded border p-3" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>Expired</p>
          <p className="text-sm font-semibold mt-1" style={{ color: "var(--error)" }}>
            {summary.expired}
          </p>
        </div>
        <div className="rounded border p-3" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>Review due</p>
          <p className="text-sm font-semibold mt-1" style={{ color: "var(--warning)" }}>
            {summary.reviewDue}
          </p>
        </div>
        <div className="rounded border p-3" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>Metadata incomplete</p>
          <p className="text-sm font-semibold mt-1" style={{ color: "var(--desktop-menu-text-muted)" }}>
            {summary.metadataIncomplete}
          </p>
        </div>
        <div className="rounded border p-3" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>Invalid contracts</p>
          <p className="text-sm font-semibold mt-1" style={{ color: "var(--error)" }}>
            {snapshot.invalidCount}
          </p>
        </div>
      </div>

      {(summary.expired > 0 || summary.reviewDue > 0 || snapshot.invalidCount > 0) ? (
        <div
          className="rounded border p-3"
          style={{ borderColor: "var(--error)", background: "var(--color-error-subtle)" }}
        >
          <p className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--error)" }}>
            <AlertCircle size={14} />
            Fail-closed guardrail active: expired, overdue, or invalid evidence keeps related workflows blocked.
          </p>
        </div>
      ) : null}

      {filteredRows.length === 0 ? (
        <div className="rounded border p-4" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
            No evidence rows match the current filters.
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            Relax one or more filters to restore visibility.
          </p>
        </div>
      ) : (
        <div className="rounded border overflow-hidden" style={{ borderColor: "var(--win95-border)" }}>
          <table className="w-full text-left text-xs">
            <thead style={{ background: "var(--desktop-shell-accent)" }}>
              <tr>
                <th className="px-3 py-2 font-semibold">Evidence</th>
                <th className="px-3 py-2 font-semibold">Risk links</th>
                <th className="px-3 py-2 font-semibold">Provider</th>
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 font-semibold">Source</th>
                <th className="px-3 py-2 font-semibold">Expiry</th>
                <th className="px-3 py-2 font-semibold">Review due</th>
                <th className="px-3 py-2 font-semibold">Retention</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const expiryStatus = computeExpiryStatus(row, Date.now());
                const riskLinks = Array.from(
                  new Set(row.riskReferences.map((reference) => reference.riskId)),
                );
                return (
                  <tr
                    key={row.evidenceObjectId}
                    onClick={() => setSelectedEvidenceId(String(row.evidenceObjectId))}
                    className="border-t"
                    style={{
                      borderColor: "var(--win95-border)",
                      background:
                        selectedEvidenceId === String(row.evidenceObjectId)
                          ? "var(--win95-bg-light)"
                          : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <td className="px-3 py-2">
                      <p className="font-semibold" style={{ color: "var(--win95-text)" }}>
                        {row.title}
                      </p>
                      <p style={{ color: "var(--neutral-gray)" }}>
                        Updated {formatDate(row.updatedAt)}
                      </p>
                      {!row.contractValid ? (
                        <p className="mt-1" style={{ color: "var(--error)" }}>
                          Invalid metadata: {row.validationErrors.join(", ")}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2" style={{ color: "var(--neutral-gray)" }}>
                      {riskLinks.length > 0 ? riskLinks.join(", ") : "none"}
                    </td>
                    <td className="px-3 py-2" style={{ color: "var(--neutral-gray)" }}>
                      {row.providerName ?? "n/a"}
                    </td>
                    <td className="px-3 py-2" style={{ color: "var(--neutral-gray)" }}>
                      {row.subtype ? normalizeLabel(row.subtype) : "unknown"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="inline-flex rounded px-1.5 py-0.5 font-semibold"
                        style={sourceStyles(row.sourceType)}
                      >
                        {row.sourceType ? normalizeLabel(row.sourceType) : "unknown"}
                      </span>
                      {row.sourceType === "platform_inherited" || row.inheritanceScope === "org_inherited" ? (
                        <p className="mt-1" style={{ color: "var(--neutral-gray)" }}>
                          advisory inherited
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="inline-flex rounded px-1.5 py-0.5 font-semibold"
                        style={expiryStyles(expiryStatus)}
                      >
                        {normalizeLabel(expiryStatus)}
                      </span>
                    </td>
                    <td className="px-3 py-2" style={{ color: "var(--neutral-gray)" }}>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 size={11} />
                        {formatDate(row.nextReviewAt)}
                      </span>
                    </td>
                    <td className="px-3 py-2" style={{ color: "var(--neutral-gray)" }}>
                      {formatDate(row.retentionDeleteAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded border p-3 space-y-3" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
            Evidence-to-risk timeline
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            Click an evidence row to inspect linkage events, provenance details, and audit references.
          </p>
        </div>

        {!selectedEvidenceId ? (
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Select an evidence row to load timeline details.
          </p>
        ) : timelineSnapshot === undefined ? (
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
            <Loader2 size={14} className="animate-spin" />
            Loading timeline...
          </div>
        ) : !selectedTimelineEntry ? (
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            No timeline entry was returned for the selected evidence.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="rounded border p-2" style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}>
              <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
                {selectedTimelineEntry.title}
              </p>
              <p className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>
                Provenance: {selectedTimelineEntry.provenance.sourceMarker} | Source type: {selectedTimelineEntry.provenance.sourceType ?? "unknown"}
              </p>
              <p className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>
                Inheritance scope: {selectedTimelineEntry.provenance.inheritanceScope ?? "none"} | Linked risks: {selectedTimelineEntry.riskReferences.map((risk) => risk.riskId).join(", ") || "none"}
              </p>
              {selectedTimelineEntry.provenance.inheritedFromEvidenceObjectId ? (
                <p className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>
                  Inherited from evidence: {selectedTimelineEntry.provenance.inheritedFromEvidenceObjectId}
                </p>
              ) : null}
            </div>

            {selectedTimelineEntry.timeline.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                No compliance evidence actions are recorded yet for this evidence object.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedTimelineEntry.timeline.map((event) => (
                  <div
                    key={event.actionId}
                    className="rounded border p-2"
                    style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
                          {event.eventType ?? event.actionType}
                        </p>
                        <p className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>
                          {formatDate(event.performedAt)} | {event.actionType}
                        </p>
                        <p className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>
                          Risks: {event.riskIds.length > 0 ? event.riskIds.join(", ") : "n/a"}
                          {event.controlId ? ` | Control: ${event.controlId}` : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCopyAuditRef(event.auditRef)}
                        className="rounded border px-2 py-1 text-[11px] font-semibold"
                        style={{
                          borderColor: "var(--win95-border)",
                          background: "var(--desktop-shell-accent)",
                          color: "var(--desktop-menu-text-muted)",
                        }}
                      >
                        {copiedAuditRef === event.auditRef ? "Copied" : event.auditRef}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
