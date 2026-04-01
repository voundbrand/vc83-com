/** Provider knowledge record loaded from YAML */
export interface ProviderKnowledge {
  id: string;
  name: string;
  provider_type: string;
  data_location: string;
  jurisdiction: string;
  dpa_available: boolean;
  dpa_self_service?: boolean;
  dpa_url?: string;
  transfer_mechanism: string;
  known_certifications: string[];
  tom_available?: boolean;
  tom_url?: string;
  subprocessor_list_url?: string | null;
  subprocessor_notification?: boolean;
  eu_routing_available?: boolean;
  eu_data_residency_available?: boolean;
  zero_data_retention_available?: boolean;
  training_opt_out_available?: boolean;
  notes?: string;
}

/** Deployment requirement status */
export type RequirementLevel = "required" | "recommended" | "conditional";

/** Parsed deployment requirements from framework meta.yaml */
export interface DeploymentRequirements {
  [category: string]: {
    [requirement: string]: RequirementLevel | string[];
  };
}

/** Evidence gap for a single provider */
export interface ProviderEvidenceGap {
  provider_id: string;
  provider_name: string;
  provider_type: string;
  data_location: string;
  gaps: EvidenceGapItem[];
  status: "complete" | "partial" | "missing";
}

export interface EvidenceGapItem {
  evidence_type: string;
  description: string;
  status: "present" | "missing" | "expired";
  action_required: string;
  reference?: string;
}

/** Readiness report */
export interface ReadinessReport {
  decision: "GO" | "NO_GO";
  posture_score: number;
  frameworks: Array<{ id: string; name: string }>;
  blockers: ReadinessBlocker[];
  warnings: string[];
  provider_status: ProviderEvidenceGap[];
  evidence_count: number;
  generated_at: string;
  timestamp: string;
}

export interface ReadinessBlocker {
  category: string;
  description: string;
  provider_id?: string;
  action_required: string;
  owner: string;
}
