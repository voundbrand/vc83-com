"use client";

import { type KeyboardEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

// Dynamic require avoids TS2589 deep instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api: apiAny } = require("../../../convex/_generated/api") as { api: any };

export type ComplianceInboxWizardAction = {
  actionId: string;
  riskId: string | null;
  title: string;
  reason: string;
  requiredArtifactLabel?: string;
};

interface ComplianceInboxWizardProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  canEdit: boolean;
  action: ComplianceInboxWizardAction | null;
  onComplete?: (payload: {
    actionId: string;
    workflow: "avv" | "transfer" | "security";
    checklistSummary: Record<string, string>;
  }) => void;
}

type WorkflowKind = "avv" | "transfer" | "security" | null;

type TransferWorkflowDraft = {
  workflowObjectId: string;
  exporterRegion: string | null;
  importerRegion: string | null;
  transferMapRef: string | null;
  sccReference: string | null;
  tiaReference: string | null;
  supplementaryControls: string | null;
  notes: string | null;
  state: "draft" | "ready_for_review" | "blocked";
  completeness: {
    completenessScore: number;
    isComplete: boolean;
    missingArtifactIds: string[];
    blockers: string[];
  };
};

type SecurityWorkflowDraft = {
  workflowObjectId: string;
  rbacEvidenceRef: string | null;
  mfaEvidenceRef: string | null;
  encryptionEvidenceRef: string | null;
  tenantIsolationEvidenceRef: string | null;
  keyRotationEvidenceRef: string | null;
  notes: string | null;
  state: "draft" | "ready_for_review" | "blocked";
  completeness: {
    completenessScore: number;
    isComplete: boolean;
    missingArtifactIds: string[];
    blockers: string[];
  };
};

type AvvOutreachState =
  | "draft"
  | "pending_confirmation"
  | "queued"
  | "sent"
  | "awaiting_response"
  | "response_received"
  | "approved"
  | "rejected"
  | "escalated"
  | "closed_blocked";

type AvvOutreachSnapshot = {
  rows: Array<{
    dossierObjectId: string;
    providerName: string | null;
    providerEmail: string | null;
    state: AvvOutreachState;
  }>;
};

function resolveWorkflow(action: ComplianceInboxWizardAction | null): WorkflowKind {
  if (!action?.riskId) {
    return null;
  }
  if (action.riskId === "R-002") {
    return "avv";
  }
  if (action.riskId === "R-003") {
    return "transfer";
  }
  if (action.riskId === "R-004") {
    return "security";
  }
  return null;
}

function parseDateInputToTimestamp(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const timestamp = new Date(normalized).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase();
}

function resolveAvvOutreachStateFromWizard(value: string): AvvOutreachState {
  if (value === "signed") {
    return "approved";
  }
  if (value === "received") {
    return "response_received";
  }
  return "pending_confirmation";
}

const WORKFLOW_STEPS: Record<Exclude<WorkflowKind, null>, string[]> = {
  avv: ["Provider dossier", "AVV evidence", "Review + confirm"],
  transfer: ["Transfer map", "SCC/TIA package", "Supplementary controls", "Review + confirm"],
  security: ["Identity controls", "Isolation + keys", "Review + confirm"],
};

const AVV_FORM_DEFAULT = {
  providerName: "",
  providerEmail: "",
  outreachState: "requested",
  avvEvidenceRef: "",
  nextReviewAt: "",
  notes: "",
};

const TRANSFER_FORM_DEFAULT = {
  exporterRegion: "",
  importerRegion: "",
  transferMapRef: "",
  sccReference: "",
  tiaReference: "",
  supplementaryControls: "",
  notes: "",
};

const SECURITY_FORM_DEFAULT = {
  rbacEvidenceRef: "",
  mfaEvidenceRef: "",
  encryptionEvidenceRef: "",
  tenantIsolationEvidenceRef: "",
  keyRotationEvidenceRef: "",
  notes: "",
};

type ComplianceInboxWizardDraftSnapshot = {
  draftObjectId: string;
  actionId: string | null;
  riskId: string | null;
  workflow: Exclude<WorkflowKind, null> | null;
  stepIndex: number;
  stepLabel: string | null;
  checkpointUpdatedAt: number;
  avvDraft: {
    providerName: string | null;
    providerEmail: string | null;
    outreachState: string | null;
    avvEvidenceRef: string | null;
    nextReviewAt: string | null;
    notes: string | null;
  };
  transferDraft: {
    exporterRegion: string | null;
    importerRegion: string | null;
    transferMapRef: string | null;
    sccReference: string | null;
    tiaReference: string | null;
    supplementaryControls: string | null;
    notes: string | null;
  };
  securityDraft: {
    rbacEvidenceRef: string | null;
    mfaEvidenceRef: string | null;
    encryptionEvidenceRef: string | null;
    tenantIsolationEvidenceRef: string | null;
    keyRotationEvidenceRef: string | null;
    notes: string | null;
  };
};

type WizardDraftSaveResult = {
  checkpointUpdatedAt: number;
};

function isWizardDraftSaveDeniedError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.includes("save compliance inbox wizard drafts");
}

export function ComplianceInboxWizard({
  sessionId,
  organizationId,
  canEdit,
  action,
  onComplete,
}: ComplianceInboxWizardProps) {
  const workflow = resolveWorkflow(action);
  const [stepIndex, setStepIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  const [validationHints, setValidationHints] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftStatusMessage, setDraftStatusMessage] = useState<string | null>(null);

  const [avvForm, setAvvForm] = useState(AVV_FORM_DEFAULT);
  const [transferForm, setTransferForm] = useState(TRANSFER_FORM_DEFAULT);
  const [securityForm, setSecurityForm] = useState(SECURITY_FORM_DEFAULT);
  const [transferWorkflowObjectId, setTransferWorkflowObjectId] = useState<string | null>(null);
  const [securityWorkflowObjectId, setSecurityWorkflowObjectId] = useState<string | null>(null);
  const [hydratedTransferDraftActionId, setHydratedTransferDraftActionId] = useState<string | null>(null);
  const [hydratedSecurityDraftActionId, setHydratedSecurityDraftActionId] = useState<string | null>(null);
  const [hydratedWizardDraftActionId, setHydratedWizardDraftActionId] = useState<string | null>(null);

  const transferWorkflowDraft = useQuery(
    apiAny.complianceTransferWorkflow.getTransferImpactWorkflowDraft,
    workflow === "transfer" && action
      ? { sessionId, organizationId, actionId: action.actionId }
      : "skip",
  ) as TransferWorkflowDraft | null | undefined;
  const securityWorkflowDraft = useQuery(
    apiAny.complianceSecurityWorkflow.getSecurityWorkflowDraft,
    workflow === "security" && action
      ? { sessionId, organizationId, actionId: action.actionId }
      : "skip",
  ) as SecurityWorkflowDraft | null | undefined;
  const avvOutreachSnapshot = useQuery(
    apiAny.complianceOutreachAgent.listAvvOutreachProviderDossiers,
    workflow === "avv" && action
      ? { sessionId, organizationId }
      : "skip",
  ) as AvvOutreachSnapshot | undefined;
  const wizardDraftSnapshot = useQuery(
    apiAny.complianceControlPlane.getComplianceInboxWizardDraft,
    canEdit && action ? { sessionId, organizationId } : "skip",
  ) as ComplianceInboxWizardDraftSnapshot | null | undefined;
  const saveWizardDraft = useMutation(
    apiAny.complianceControlPlane.saveComplianceInboxWizardDraft,
  ) as (args: {
    sessionId: string;
    organizationId: Id<"organizations">;
    actionId?: string;
    riskId?: "R-002" | "R-003" | "R-004" | "R-005";
    workflow?: "avv" | "transfer" | "security";
    stepIndex?: number;
    stepLabel?: string;
    avvDraft?: {
      providerName?: string;
      providerEmail?: string;
      outreachState?: string;
      avvEvidenceRef?: string;
      nextReviewAt?: string;
      notes?: string;
    };
    transferDraft?: {
      exporterRegion?: string;
      importerRegion?: string;
      transferMapRef?: string;
      sccReference?: string;
      tiaReference?: string;
      supplementaryControls?: string;
      notes?: string;
    };
    securityDraft?: {
      rbacEvidenceRef?: string;
      mfaEvidenceRef?: string;
      encryptionEvidenceRef?: string;
      tenantIsolationEvidenceRef?: string;
      keyRotationEvidenceRef?: string;
      notes?: string;
    };
  }) => Promise<WizardDraftSaveResult>;
  const wizardDraftReady = wizardDraftSnapshot !== undefined;
  const completeTransferWorkflow = useMutation(
    apiAny.complianceTransferWorkflow.completeTransferImpactWorkflowChecklist,
  ) as (args: {
    sessionId: string;
    organizationId: Id<"organizations">;
    workflowObjectId?: Id<"objects">;
    actionId?: string;
    exporterRegion: string;
    importerRegion: string;
    transferMapRef: string;
    sccReference: string;
    tiaReference: string;
    supplementaryControls: string;
    notes?: string;
  }) => Promise<{
    completeness: {
      completenessScore: number;
      isComplete: boolean;
      missingArtifactIds: string[];
      blockers: string[];
    };
    failClosed: boolean;
  }>;
  const completeSecurityWorkflow = useMutation(
    apiAny.complianceSecurityWorkflow.completeSecurityWorkflowChecklist,
  ) as (args: {
    sessionId: string;
    organizationId: Id<"organizations">;
    workflowObjectId?: Id<"objects">;
    actionId?: string;
    rbacEvidenceRef: string;
    mfaEvidenceRef: string;
    encryptionEvidenceRef: string;
    tenantIsolationEvidenceRef: string;
    keyRotationEvidenceRef: string;
    notes?: string;
  }) => Promise<{
    completeness: {
      completenessScore: number;
      isComplete: boolean;
      missingArtifactIds: string[];
      blockers: string[];
    };
    failClosed: boolean;
  }>;
  const saveAvvOutreachProviderDossier = useMutation(
    apiAny.complianceOutreachAgent.saveAvvOutreachProviderDossier,
  ) as (args: {
    sessionId: string;
    organizationId: Id<"organizations">;
    dossierObjectId?: Id<"objects">;
    providerName: string;
    providerEmail: string;
    slaFirstDueAt: number;
    slaReminderAt?: number;
    slaEscalationAt?: number;
    state?: AvvOutreachState;
    stateReason?: string;
    notes?: string;
    wizardActionId?: string;
    wizardWorkflowState?: string;
  }) => Promise<{
    success: boolean;
    dossierObjectId: string;
    state: AvvOutreachState;
    updatedAt: number;
  }>;

  useEffect(() => {
    setStepIndex(0);
    setErrorMessage(null);
    setCompletionMessage(null);
    setValidationHints([]);
    setIsSubmitting(false);
    setDraftStatusMessage(null);
    setAvvForm(AVV_FORM_DEFAULT);
    setTransferForm(TRANSFER_FORM_DEFAULT);
    setSecurityForm(SECURITY_FORM_DEFAULT);
    setHydratedWizardDraftActionId(null);
  }, [action?.actionId, workflow]);

  useEffect(() => {
    if (workflow !== "transfer" || !action) {
      setTransferWorkflowObjectId(null);
      setHydratedTransferDraftActionId(null);
      return;
    }
    if (transferWorkflowDraft === undefined) {
      return;
    }
    if (hydratedTransferDraftActionId === action.actionId) {
      return;
    }

    if (transferWorkflowDraft) {
      setTransferWorkflowObjectId(transferWorkflowDraft.workflowObjectId);
      setTransferForm((current) => ({
        ...current,
        exporterRegion: transferWorkflowDraft.exporterRegion ?? "",
        importerRegion: transferWorkflowDraft.importerRegion ?? "",
        transferMapRef: transferWorkflowDraft.transferMapRef ?? "",
        sccReference: transferWorkflowDraft.sccReference ?? "",
        tiaReference: transferWorkflowDraft.tiaReference ?? "",
        supplementaryControls: transferWorkflowDraft.supplementaryControls ?? "",
        notes: transferWorkflowDraft.notes ?? "",
      }));
    } else {
      setTransferWorkflowObjectId(null);
    }
    setHydratedTransferDraftActionId(action.actionId);
  }, [action, hydratedTransferDraftActionId, transferWorkflowDraft, workflow]);

  useEffect(() => {
    if (workflow !== "security" || !action) {
      setSecurityWorkflowObjectId(null);
      setHydratedSecurityDraftActionId(null);
      return;
    }
    if (securityWorkflowDraft === undefined) {
      return;
    }
    if (hydratedSecurityDraftActionId === action.actionId) {
      return;
    }

    if (securityWorkflowDraft) {
      setSecurityWorkflowObjectId(securityWorkflowDraft.workflowObjectId);
      setSecurityForm((current) => ({
        ...current,
        rbacEvidenceRef: securityWorkflowDraft.rbacEvidenceRef ?? "",
        mfaEvidenceRef: securityWorkflowDraft.mfaEvidenceRef ?? "",
        encryptionEvidenceRef: securityWorkflowDraft.encryptionEvidenceRef ?? "",
        tenantIsolationEvidenceRef: securityWorkflowDraft.tenantIsolationEvidenceRef ?? "",
        keyRotationEvidenceRef: securityWorkflowDraft.keyRotationEvidenceRef ?? "",
        notes: securityWorkflowDraft.notes ?? "",
      }));
    } else {
      setSecurityWorkflowObjectId(null);
    }
    setHydratedSecurityDraftActionId(action.actionId);
  }, [action, hydratedSecurityDraftActionId, securityWorkflowDraft, workflow]);

  const steps = workflow ? WORKFLOW_STEPS[workflow] : [];
  const isLastStep = steps.length > 0 && stepIndex === steps.length - 1;

  useEffect(() => {
    if (!canEdit || !action || !workflow) {
      setHydratedWizardDraftActionId(null);
      return;
    }
    if (!wizardDraftReady) {
      return;
    }
    if (hydratedWizardDraftActionId === action.actionId) {
      return;
    }

    if (
      wizardDraftSnapshot
      && wizardDraftSnapshot.actionId === action.actionId
      && wizardDraftSnapshot.workflow === workflow
    ) {
      const maxStepIndex = Math.max(steps.length - 1, 0);
      const nextStepIndex = Math.min(Math.max(wizardDraftSnapshot.stepIndex, 0), maxStepIndex);
      setStepIndex(nextStepIndex);
      setAvvForm((current) => ({
        ...current,
        providerName: wizardDraftSnapshot.avvDraft.providerName ?? "",
        providerEmail: wizardDraftSnapshot.avvDraft.providerEmail ?? "",
        outreachState: wizardDraftSnapshot.avvDraft.outreachState ?? "requested",
        avvEvidenceRef: wizardDraftSnapshot.avvDraft.avvEvidenceRef ?? "",
        nextReviewAt: wizardDraftSnapshot.avvDraft.nextReviewAt ?? "",
        notes: wizardDraftSnapshot.avvDraft.notes ?? "",
      }));
      setTransferForm((current) => ({
        ...current,
        exporterRegion: wizardDraftSnapshot.transferDraft.exporterRegion ?? "",
        importerRegion: wizardDraftSnapshot.transferDraft.importerRegion ?? "",
        transferMapRef: wizardDraftSnapshot.transferDraft.transferMapRef ?? "",
        sccReference: wizardDraftSnapshot.transferDraft.sccReference ?? "",
        tiaReference: wizardDraftSnapshot.transferDraft.tiaReference ?? "",
        supplementaryControls: wizardDraftSnapshot.transferDraft.supplementaryControls ?? "",
        notes: wizardDraftSnapshot.transferDraft.notes ?? "",
      }));
      setSecurityForm((current) => ({
        ...current,
        rbacEvidenceRef: wizardDraftSnapshot.securityDraft.rbacEvidenceRef ?? "",
        mfaEvidenceRef: wizardDraftSnapshot.securityDraft.mfaEvidenceRef ?? "",
        encryptionEvidenceRef: wizardDraftSnapshot.securityDraft.encryptionEvidenceRef ?? "",
        tenantIsolationEvidenceRef:
          wizardDraftSnapshot.securityDraft.tenantIsolationEvidenceRef ?? "",
        keyRotationEvidenceRef: wizardDraftSnapshot.securityDraft.keyRotationEvidenceRef ?? "",
        notes: wizardDraftSnapshot.securityDraft.notes ?? "",
      }));
      setDraftStatusMessage(
        `Resumed checkpoint from ${new Date(wizardDraftSnapshot.checkpointUpdatedAt).toLocaleString()}.`,
      );
    }

    setHydratedWizardDraftActionId(action.actionId);
  }, [
    action,
    hydratedWizardDraftActionId,
    canEdit,
    steps.length,
    wizardDraftSnapshot,
    workflow,
  ]);

  useEffect(() => {
    if (!canEdit || !action || !workflow) {
      return;
    }
    if (!wizardDraftReady) {
      return;
    }
    if (hydratedWizardDraftActionId !== action.actionId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const normalizedRiskId =
        action.riskId === "R-002"
        || action.riskId === "R-003"
        || action.riskId === "R-004"
        || action.riskId === "R-005"
          ? action.riskId
          : undefined;
      void saveWizardDraft({
        sessionId,
        organizationId,
        actionId: action.actionId,
        riskId: normalizedRiskId,
        workflow,
        stepIndex,
        stepLabel: steps[stepIndex] ?? undefined,
        avvDraft: {
          ...avvForm,
        },
        transferDraft: {
          ...transferForm,
        },
        securityDraft: {
          ...securityForm,
        },
      })
        .then((result) => {
          setDraftStatusMessage(
            `Checkpoint saved at ${new Date(result.checkpointUpdatedAt).toLocaleTimeString()}.`,
          );
        })
        .catch((error) => {
          if (isWizardDraftSaveDeniedError(error)) {
            setDraftStatusMessage("Checkpoint autosave disabled for current role.");
            return;
          }
          setDraftStatusMessage(error instanceof Error ? `Checkpoint save failed: ${error.message}` : "Checkpoint save failed.");
        });
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [
    action,
    avvForm,
    hydratedWizardDraftActionId,
    canEdit,
    organizationId,
    saveWizardDraft,
    securityForm,
    sessionId,
    stepIndex,
    steps,
    transferForm,
    wizardDraftReady,
    workflow,
  ]);

  const validationIssues = useMemo(() => {
    if (!workflow) {
      return ["Wizard is available for AVV, transfer, and security workflows only."];
    }

    if (workflow === "avv") {
      if (stepIndex === 0) {
        const issues: string[] = [];
        if (!avvForm.providerName.trim()) {
          issues.push("Provider name is required.");
        }
        if (!avvForm.providerEmail.includes("@")) {
          issues.push("Provider contact email is required.");
        }
        return issues;
      }
      if (stepIndex === 1) {
        const issues: string[] = [];
        if (!avvForm.avvEvidenceRef.trim()) {
          issues.push("AVV evidence reference is required.");
        }
        if (!avvForm.nextReviewAt.trim()) {
          issues.push("Next AVV review date is required.");
        }
        return issues;
      }
      return [];
    }

    if (workflow === "transfer") {
      if (stepIndex === 0) {
        const issues: string[] = [];
        if (!transferForm.exporterRegion.trim() || !transferForm.importerRegion.trim()) {
          issues.push("Exporter and importer regions are required.");
        }
        if (!transferForm.transferMapRef.trim()) {
          issues.push("Transfer map evidence reference is required.");
        }
        return issues;
      }
      if (stepIndex === 1) {
        const issues: string[] = [];
        if (!transferForm.sccReference.trim() || !transferForm.tiaReference.trim()) {
          issues.push("SCC and TIA references are required.");
        }
        return issues;
      }
      if (stepIndex === 2) {
        return !transferForm.supplementaryControls.trim()
          ? ["Supplementary controls summary is required."]
          : [];
      }
      return [];
    }

    const issues: string[] = [];
    if (stepIndex === 0) {
      if (!securityForm.rbacEvidenceRef.trim() || !securityForm.mfaEvidenceRef.trim()) {
        issues.push("RBAC and MFA evidence references are required.");
      }
      if (!securityForm.encryptionEvidenceRef.trim()) {
        issues.push("Encryption evidence reference is required.");
      }
      return issues;
    }
    if (stepIndex === 1) {
      if (!securityForm.tenantIsolationEvidenceRef.trim()) {
        issues.push("Tenant isolation evidence reference is required.");
      }
      if (!securityForm.keyRotationEvidenceRef.trim()) {
        issues.push("Key rotation evidence reference is required.");
      }
      return issues;
    }
    return issues;
  }, [workflow, stepIndex, avvForm, transferForm, securityForm]);
  const validationError = validationIssues[0] ?? null;

  const handleNext = () => {
    if (validationIssues.length > 0) {
      setErrorMessage("Cannot continue until required fields are completed.");
      setValidationHints(validationIssues);
      return;
    }
    setErrorMessage(null);
    setValidationHints([]);
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  const handlePrevious = () => {
    if (isSubmitting) {
      return;
    }
    setErrorMessage(null);
    setValidationHints([]);
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const handleKeyboardStepNavigation = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
      return;
    }
    if (event.key === "ArrowRight" && !isLastStep) {
      event.preventDefault();
      handleNext();
      return;
    }
    if (event.key === "ArrowLeft" && stepIndex > 0) {
      event.preventDefault();
      handlePrevious();
    }
  };

  const handleComplete = async () => {
    if (!workflow || !action) {
      return;
    }
    if (validationIssues.length > 0) {
      setErrorMessage("Cannot complete checklist while required fields are missing.");
      setValidationHints(validationIssues);
      return;
    }
    setIsSubmitting(true);

    try {
      let checklistSummary: Record<string, string>;
      let transferCompletion:
        | {
            completeness: {
              completenessScore: number;
              isComplete: boolean;
              missingArtifactIds: string[];
              blockers: string[];
            };
            failClosed: boolean;
          }
        | null = null;
      let securityCompletion:
        | {
            completeness: {
              completenessScore: number;
              isComplete: boolean;
              missingArtifactIds: string[];
              blockers: string[];
            };
            failClosed: boolean;
          }
        | null = null;

      if (workflow === "avv") {
        if (!canEdit) {
          throw new Error(
            "Only organization owners, or super-admin in platform mode, can complete AVV workflows.",
          );
        }
        const nextReviewAtTs = parseDateInputToTimestamp(avvForm.nextReviewAt);
        const slaFirstDueAt = nextReviewAtTs ?? Date.now() + 24 * 60 * 60 * 1000;
        const slaReminderAt = slaFirstDueAt + 48 * 60 * 60 * 1000;
        const slaEscalationAt = slaFirstDueAt + 96 * 60 * 60 * 1000;
        const normalizedEmail = normalizeLookupKey(avvForm.providerEmail);
        const normalizedName = normalizeLookupKey(avvForm.providerName);
        const existingDossier = (avvOutreachSnapshot?.rows ?? []).find((row) => {
          const providerEmail = row.providerEmail ? normalizeLookupKey(row.providerEmail) : "";
          const providerName = row.providerName ? normalizeLookupKey(row.providerName) : "";
          return (
            (normalizedEmail.length > 0 && providerEmail === normalizedEmail)
            || (normalizedName.length > 0 && providerName === normalizedName)
          );
        });
        const mappedState = resolveAvvOutreachStateFromWizard(avvForm.outreachState);
        const saveResult = await saveAvvOutreachProviderDossier({
          sessionId,
          organizationId,
          dossierObjectId: existingDossier?.dossierObjectId
            ? (existingDossier.dossierObjectId as Id<"objects">)
            : undefined,
          providerName: avvForm.providerName,
          providerEmail: avvForm.providerEmail,
          slaFirstDueAt,
          slaReminderAt,
          slaEscalationAt,
          state: mappedState,
          stateReason: `Updated from compliance inbox wizard action ${action.actionId}.`,
          wizardActionId: action.actionId,
          wizardWorkflowState: avvForm.outreachState,
          notes: [avvForm.notes, `evidence_ref:${avvForm.avvEvidenceRef}`]
            .filter((entry) => entry.trim().length > 0)
            .join(" | "),
        });
        checklistSummary = {
          providerName: avvForm.providerName,
          providerEmail: avvForm.providerEmail,
          outreachState: avvForm.outreachState,
          avvEvidenceRef: avvForm.avvEvidenceRef,
          nextReviewAt: avvForm.nextReviewAt,
          dossierObjectId: saveResult.dossierObjectId,
          persistedOutreachState: saveResult.state,
        };
      } else if (workflow === "transfer") {
        if (!canEdit) {
          throw new Error(
            "Only organization owners, or super-admin in platform mode, can complete transfer workflows.",
          );
        }
        transferCompletion = await completeTransferWorkflow({
          sessionId,
          organizationId,
          workflowObjectId: transferWorkflowObjectId
            ? (transferWorkflowObjectId as Id<"objects">)
            : undefined,
          actionId: action.actionId,
          exporterRegion: transferForm.exporterRegion,
          importerRegion: transferForm.importerRegion,
          transferMapRef: transferForm.transferMapRef,
          sccReference: transferForm.sccReference,
          tiaReference: transferForm.tiaReference,
          supplementaryControls: transferForm.supplementaryControls,
          notes: transferForm.notes,
        });
        checklistSummary = {
          exporterRegion: transferForm.exporterRegion,
          importerRegion: transferForm.importerRegion,
          transferMapRef: transferForm.transferMapRef,
          sccReference: transferForm.sccReference,
          tiaReference: transferForm.tiaReference,
          supplementaryControls: transferForm.supplementaryControls,
          completenessScore: String(transferCompletion.completeness.completenessScore),
          failClosed: transferCompletion.failClosed ? "true" : "false",
        };
      } else {
        if (!canEdit) {
          throw new Error(
            "Only organization owners, or super-admin in platform mode, can complete security workflows.",
          );
        }
        securityCompletion = await completeSecurityWorkflow({
          sessionId,
          organizationId,
          workflowObjectId: securityWorkflowObjectId
            ? (securityWorkflowObjectId as Id<"objects">)
            : undefined,
          actionId: action.actionId,
          rbacEvidenceRef: securityForm.rbacEvidenceRef,
          mfaEvidenceRef: securityForm.mfaEvidenceRef,
          encryptionEvidenceRef: securityForm.encryptionEvidenceRef,
          tenantIsolationEvidenceRef: securityForm.tenantIsolationEvidenceRef,
          keyRotationEvidenceRef: securityForm.keyRotationEvidenceRef,
          notes: securityForm.notes,
        });
        checklistSummary = {
          rbacEvidenceRef: securityForm.rbacEvidenceRef,
          mfaEvidenceRef: securityForm.mfaEvidenceRef,
          encryptionEvidenceRef: securityForm.encryptionEvidenceRef,
          tenantIsolationEvidenceRef: securityForm.tenantIsolationEvidenceRef,
          keyRotationEvidenceRef: securityForm.keyRotationEvidenceRef,
          completenessScore: String(securityCompletion.completeness.completenessScore),
          failClosed: securityCompletion.failClosed ? "true" : "false",
        };
      }

      onComplete?.({
        actionId: action.actionId,
        workflow,
        checklistSummary,
      });
      if (workflow === "transfer" && transferCompletion) {
        setCompletionMessage(
          transferCompletion.failClosed
            ? "Transfer workflow captured but remains fail-closed until all required artifacts are complete."
            : "Transfer workflow persisted with required artifact matrix and ready-for-review state.",
        );
      } else if (workflow === "security" && securityCompletion) {
        setCompletionMessage(
          securityCompletion.failClosed
            ? "Security workflow captured but remains fail-closed until all required controls are complete."
            : "Security workflow persisted with required control matrix and ready-for-review state.",
        );
      } else {
        setCompletionMessage(
          "AVV workflow persisted to outreach dossier state. Inbox counters and outreach queue metrics are now synchronized.",
        );
      }
      setErrorMessage(null);
      setValidationHints([]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to complete checklist.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!action) {
    return (
      <div className="rounded border p-4" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
          Select an inbox action to start the guided workflow.
        </p>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="rounded border p-4" style={{ borderColor: "var(--warning)", background: "var(--warning-bg)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
          No guided wizard is defined for risk {action.riskId ?? "unknown"} yet.
        </p>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="rounded border p-4 space-y-2" style={{ borderColor: "var(--warning)", background: "var(--warning-bg)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
          Read-only workflow view
        </p>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          Only organization owners, or super-admin in platform mode, can save wizard checkpoints and complete checklist mutations.
        </p>
      </div>
    );
  }

  if (workflow === "avv" && avvOutreachSnapshot === undefined) {
    return (
      <div className="rounded border p-4" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
        <p className="text-xs inline-flex items-center gap-2" style={{ color: "var(--neutral-gray)" }}>
          <Loader2 size={14} className="animate-spin" />
          Loading AVV outreach dossiers...
        </p>
      </div>
    );
  }

  if (workflow === "transfer" && transferWorkflowDraft === undefined) {
    return (
      <div className="rounded border p-4" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
        <p className="text-xs inline-flex items-center gap-2" style={{ color: "var(--neutral-gray)" }}>
          <Loader2 size={14} className="animate-spin" />
          Loading transfer workflow draft...
        </p>
      </div>
    );
  }

  if (workflow === "security" && securityWorkflowDraft === undefined) {
    return (
      <div className="rounded border p-4" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
        <p className="text-xs inline-flex items-center gap-2" style={{ color: "var(--neutral-gray)" }}>
          <Loader2 size={14} className="animate-spin" />
          Loading security workflow draft...
        </p>
      </div>
    );
  }

  if (canEdit && wizardDraftSnapshot === undefined) {
    return (
      <div className="rounded border p-4" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
        <p className="text-xs inline-flex items-center gap-2" style={{ color: "var(--neutral-gray)" }}>
          <Loader2 size={14} className="animate-spin" />
          Loading wizard checkpoint...
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded border p-4 space-y-4"
      style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}
      role="region"
      aria-label="Compliance inbox guided workflow"
      tabIndex={0}
      onKeyDown={handleKeyboardStepNavigation}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Guided workflow
          </p>
          <h4 className="text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
            {action.title}
          </h4>
          {canEdit && draftStatusMessage ? (
            <p className="text-[11px] mt-1" style={{ color: "var(--neutral-gray)" }}>
              {draftStatusMessage}
            </p>
          ) : null}
        </div>
        <span
          className="rounded border px-2 py-1 text-xs font-semibold"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--desktop-shell-accent)",
            color: "var(--desktop-menu-text-muted)",
          }}
        >
          Step {stepIndex + 1} / {steps.length}
        </span>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        {steps.map((step, index) => {
          const state = index === stepIndex ? "current" : index < stepIndex ? "done" : "todo";
          return (
            <div
              key={step}
              className="rounded border p-2 text-xs"
              aria-current={state === "current" ? "step" : undefined}
              style={{
                borderColor: "var(--win95-border)",
                background:
                  state === "current"
                    ? "var(--win95-bg-light)"
                    : state === "done"
                      ? "var(--success-bg)"
                      : "var(--desktop-shell-accent)",
                color:
                  state === "done"
                    ? "var(--success)"
                    : state === "current"
                      ? "var(--win95-text)"
                      : "var(--desktop-menu-text-muted)",
              }}
            >
              {step}
            </div>
          );
        })}
      </div>

      {workflow === "avv" && stepIndex === 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Provider name
            <input
              value={avvForm.providerName}
              onChange={(event) => setAvvForm((current) => ({ ...current, providerName: event.target.value }))}
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}
            />
          </label>
          <label className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Provider email
            <input
              value={avvForm.providerEmail}
              onChange={(event) => setAvvForm((current) => ({ ...current, providerEmail: event.target.value }))}
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}
            />
          </label>
          <label className="text-xs md:col-span-2" style={{ color: "var(--neutral-gray)" }}>
            Outreach status
            <select
              value={avvForm.outreachState}
              onChange={(event) => setAvvForm((current) => ({ ...current, outreachState: event.target.value }))}
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}
            >
              <option value="requested">Requested</option>
              <option value="received">Received</option>
              <option value="signed">Signed</option>
            </select>
          </label>
        </div>
      ) : null}

      {workflow === "avv" && stepIndex === 1 ? (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            AVV evidence reference
            <input
              value={avvForm.avvEvidenceRef}
              onChange={(event) => setAvvForm((current) => ({ ...current, avvEvidenceRef: event.target.value }))}
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}
            />
          </label>
          <label className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Next review date
            <input
              type="date"
              value={avvForm.nextReviewAt}
              onChange={(event) => setAvvForm((current) => ({ ...current, nextReviewAt: event.target.value }))}
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}
            />
          </label>
        </div>
      ) : null}

      {workflow === "transfer" && stepIndex === 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Exporter region
            <input
              value={transferForm.exporterRegion}
              onChange={(event) => setTransferForm((current) => ({ ...current, exporterRegion: event.target.value }))}
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}
            />
          </label>
          <label className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Importer region
            <input
              value={transferForm.importerRegion}
              onChange={(event) => setTransferForm((current) => ({ ...current, importerRegion: event.target.value }))}
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}
            />
          </label>
          <label className="text-xs md:col-span-2" style={{ color: "var(--neutral-gray)" }}>
            Transfer map reference
            <input
              value={transferForm.transferMapRef}
              onChange={(event) => setTransferForm((current) => ({ ...current, transferMapRef: event.target.value }))}
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}
            />
          </label>
        </div>
      ) : null}

      {workflow === "transfer" && stepIndex === 1 ? (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            SCC reference
            <input
              value={transferForm.sccReference}
              onChange={(event) => setTransferForm((current) => ({ ...current, sccReference: event.target.value }))}
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}
            />
          </label>
          <label className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            TIA reference
            <input
              value={transferForm.tiaReference}
              onChange={(event) => setTransferForm((current) => ({ ...current, tiaReference: event.target.value }))}
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}
            />
          </label>
        </div>
      ) : null}

      {workflow === "transfer" && stepIndex === 2 ? (
        <label className="text-xs block" style={{ color: "var(--neutral-gray)" }}>
          Supplementary controls summary
          <textarea
            value={transferForm.supplementaryControls}
            onChange={(event) =>
              setTransferForm((current) => ({
                ...current,
                supplementaryControls: event.target.value,
              }))
            }
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)", minHeight: 90 }}
          />
        </label>
      ) : null}

      {workflow === "security" && stepIndex === 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            RBAC evidence reference
            <input
              value={securityForm.rbacEvidenceRef}
              onChange={(event) => setSecurityForm((current) => ({ ...current, rbacEvidenceRef: event.target.value }))}
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}
            />
          </label>
          <label className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            MFA evidence reference
            <input
              value={securityForm.mfaEvidenceRef}
              onChange={(event) => setSecurityForm((current) => ({ ...current, mfaEvidenceRef: event.target.value }))}
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}
            />
          </label>
          <label className="text-xs md:col-span-2" style={{ color: "var(--neutral-gray)" }}>
            Encryption evidence reference
            <input
              value={securityForm.encryptionEvidenceRef}
              onChange={(event) =>
                setSecurityForm((current) => ({ ...current, encryptionEvidenceRef: event.target.value }))
              }
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}
            />
          </label>
        </div>
      ) : null}

      {workflow === "security" && stepIndex === 1 ? (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Tenant isolation evidence reference
            <input
              value={securityForm.tenantIsolationEvidenceRef}
              onChange={(event) =>
                setSecurityForm((current) => ({
                  ...current,
                  tenantIsolationEvidenceRef: event.target.value,
                }))
              }
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}
            />
          </label>
          <label className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Key rotation evidence reference
            <input
              value={securityForm.keyRotationEvidenceRef}
              onChange={(event) =>
                setSecurityForm((current) => ({
                  ...current,
                  keyRotationEvidenceRef: event.target.value,
                }))
              }
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}
            />
          </label>
        </div>
      ) : null}

      {isLastStep ? (
        <div className="rounded border p-3" style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}>
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Review summary
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--win95-text)" }}>
            {action.reason}
          </p>
          {action.requiredArtifactLabel ? (
            <p className="text-xs mt-2" style={{ color: "var(--neutral-gray)" }}>
              Required artifact: {action.requiredArtifactLabel}
            </p>
          ) : null}
        </div>
      ) : null}

      {errorMessage ? (
        <p role="alert" className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--error)" }}>
          <AlertCircle size={14} />
          {errorMessage}
        </p>
      ) : null}
      {validationHints.length > 0 ? (
        <ul className="text-xs space-y-1" style={{ color: "var(--error)" }}>
          {validationHints.map((hint) => (
            <li key={hint}>• {hint}</li>
          ))}
        </ul>
      ) : null}
      {completionMessage ? (
        <p role="status" className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--success)" }}>
          <CheckCircle2 size={14} />
          {completionMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={handlePrevious}
          disabled={stepIndex === 0 || isSubmitting}
          className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          style={{ borderColor: "var(--win95-border)", color: "var(--win95-text)" }}
        >
          <ChevronLeft size={14} />
          Back
        </button>

        {isLastStep ? (
          <button
            onClick={handleComplete}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
            style={{ background: "var(--win95-highlight)", color: "white" }}
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <ClipboardCheck size={14} />}
            {isSubmitting ? "Completing..." : "Complete Checklist"}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
            style={{ background: "var(--win95-highlight)", color: "white" }}
          >
            Next
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
