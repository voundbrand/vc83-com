/**
 * Orchestration Core Contract
 *
 * Canonical contract vocabulary for one-conversation orchestration.
 * OCO-002 locks shared terms for:
 * - experience contract
 * - artifact graph
 * - playbook interface
 * - primary status model (draft/published)
 */

export const ORCHESTRATION_CONTRACT_VERSION = "1.0.0" as const;

/**
 * Primary lifecycle model used by orchestration entry points.
 * Domain models can add extra states, but must retain these.
 */
export const ORCHESTRATION_PRIMARY_STATUS_VALUES = [
  "draft",
  "published",
] as const;
export type OrchestrationPrimaryStatus =
  (typeof ORCHESTRATION_PRIMARY_STATUS_VALUES)[number];

/**
 * Canonical lifecycle sets for current OCO-002 scope objects.
 */
export const EVENT_LIFECYCLE_STATUS_VALUES = [
  ...ORCHESTRATION_PRIMARY_STATUS_VALUES,
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type EventLifecycleStatus = (typeof EVENT_LIFECYCLE_STATUS_VALUES)[number];

export const CHECKOUT_LIFECYCLE_STATUS_VALUES = [
  ...ORCHESTRATION_PRIMARY_STATUS_VALUES,
  "archived",
  "deleted",
] as const;
export type CheckoutLifecycleStatus =
  (typeof CHECKOUT_LIFECYCLE_STATUS_VALUES)[number];

export const PUBLISHED_PAGE_LIFECYCLE_STATUS_VALUES = [
  "draft",
  "review",
  "published",
  "unpublished",
  "archived",
] as const;
export type PublishedPageLifecycleStatus =
  (typeof PUBLISHED_PAGE_LIFECYCLE_STATUS_VALUES)[number];

/**
 * Legacy aliases accepted during migration.
 * Keeping this centralized avoids per-module drift.
 */
export const ORCHESTRATION_STATUS_ALIASES: Readonly<
  Record<string, OrchestrationPrimaryStatus>
> = {
  active: "published",
};

function normalizeStatusInput(status: string | null | undefined): string | undefined {
  if (!status) return undefined;
  const normalized = status.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeOrchestrationStatus(
  status: string | null | undefined
): string | undefined {
  const normalized = normalizeStatusInput(status);
  if (!normalized) return undefined;
  return ORCHESTRATION_STATUS_ALIASES[normalized] ?? normalized;
}

function buildStatusSet(values: readonly string[]): ReadonlySet<string> {
  return new Set(values);
}

const EVENT_STATUS_SET = buildStatusSet(EVENT_LIFECYCLE_STATUS_VALUES);
const CHECKOUT_STATUS_SET = buildStatusSet(CHECKOUT_LIFECYCLE_STATUS_VALUES);
const PUBLISHED_PAGE_STATUS_SET = buildStatusSet(
  PUBLISHED_PAGE_LIFECYCLE_STATUS_VALUES
);

export function normalizeEventLifecycleStatus(
  status: string | null | undefined
): EventLifecycleStatus | undefined {
  const normalized = normalizeOrchestrationStatus(status);
  if (!normalized || !EVENT_STATUS_SET.has(normalized)) return undefined;
  return normalized as EventLifecycleStatus;
}

export function normalizeCheckoutLifecycleStatus(
  status: string | null | undefined
): CheckoutLifecycleStatus | undefined {
  const normalized = normalizeOrchestrationStatus(status);
  if (!normalized || !CHECKOUT_STATUS_SET.has(normalized)) return undefined;
  return normalized as CheckoutLifecycleStatus;
}

export function normalizePublishedPageLifecycleStatus(
  status: string | null | undefined
): PublishedPageLifecycleStatus | undefined {
  const normalized = normalizeOrchestrationStatus(status);
  if (!normalized || !PUBLISHED_PAGE_STATUS_SET.has(normalized)) return undefined;
  return normalized as PublishedPageLifecycleStatus;
}

export function matchesNormalizedStatus(
  candidateStatus: string | null | undefined,
  requestedStatus: string | null | undefined
): boolean {
  const normalizedRequested = normalizeOrchestrationStatus(requestedStatus);
  if (!normalizedRequested) return true;
  const normalizedCandidate = normalizeOrchestrationStatus(candidateStatus);
  return normalizedCandidate === normalizedRequested;
}

export const ORCHESTRATION_ARTIFACT_TYPES = [
  "event",
  "product",
  "ticket",
  "form",
  "checkout_instance",
  "published_page",
  "builder_app",
] as const;
export type OrchestrationArtifactType =
  (typeof ORCHESTRATION_ARTIFACT_TYPES)[number];

export interface OrchestrationArtifactNode {
  key: string;
  type: OrchestrationArtifactType;
  required: boolean;
  primaryStatus?: OrchestrationPrimaryStatus;
  notes?: string;
}

export interface OrchestrationArtifactEdge {
  from: string;
  to: string;
  linkType: string;
  required: boolean;
}

export interface OrchestrationArtifactGraph {
  nodes: readonly OrchestrationArtifactNode[];
  edges: readonly OrchestrationArtifactEdge[];
}

export interface OrchestrationPlaybookContract {
  id: string;
  label: string;
  primaryStatusModel: readonly OrchestrationPrimaryStatus[];
  artifactGraph: OrchestrationArtifactGraph;
}

export interface OrchestrationExperienceContract {
  version: typeof ORCHESTRATION_CONTRACT_VERSION;
  primaryStatusModel: readonly OrchestrationPrimaryStatus[];
  playbooks: readonly OrchestrationPlaybookContract[];
}

export const EVENT_PLAYBOOK_CONTRACT: OrchestrationPlaybookContract = {
  id: "event",
  label: "Event Experience",
  primaryStatusModel: ORCHESTRATION_PRIMARY_STATUS_VALUES,
  artifactGraph: {
    nodes: [
      {
        key: "event",
        type: "event",
        required: true,
        primaryStatus: "draft",
      },
      {
        key: "product",
        type: "product",
        required: true,
        primaryStatus: "draft",
      },
      {
        key: "form",
        type: "form",
        required: false,
        primaryStatus: "draft",
      },
      {
        key: "checkout",
        type: "checkout_instance",
        required: true,
        primaryStatus: "draft",
      },
      {
        key: "page",
        type: "published_page",
        required: false,
        primaryStatus: "draft",
      },
      {
        key: "builder",
        type: "builder_app",
        required: false,
        primaryStatus: "draft",
      },
    ],
    edges: [
      {
        from: "checkout",
        to: "product",
        linkType: "checkout_product",
        required: true,
      },
      {
        from: "checkout",
        to: "event",
        linkType: "checkout_event",
        required: true,
      },
      {
        from: "checkout",
        to: "form",
        linkType: "checkout_form",
        required: false,
      },
      {
        from: "page",
        to: "checkout",
        linkType: "publishes",
        required: false,
      },
    ],
  },
};

export const ORCHESTRATION_EXPERIENCE_CONTRACT: OrchestrationExperienceContract =
  {
    version: ORCHESTRATION_CONTRACT_VERSION,
    primaryStatusModel: ORCHESTRATION_PRIMARY_STATUS_VALUES,
    playbooks: [EVENT_PLAYBOOK_CONTRACT],
  };
