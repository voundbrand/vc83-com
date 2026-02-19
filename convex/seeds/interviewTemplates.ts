/**
 * INTERVIEW TEMPLATE SEEDS
 *
 * Default trust-first interview templates seeded for new organizations.
 *
 * Templates:
 * - Customer Agent Identity Blueprint (quick)
 * - Agent Team Shape Charter (standard)
 * - Platform Agent Trust Training (deep discovery)
 *
 * Each template explicitly captures identity anchors, guardrails,
 * handoff boundaries, and drift cues so downstream Brain/Setup/Agents/Admin
 * surfaces can consume a shared trust artifact model.
 */

import type { InterviewTemplate } from "../schemas/interviewSchemas";

// ============================================================================
// TEMPLATE A: CUSTOMER AGENT IDENTITY BLUEPRINT (20 min, 4 phases)
// ============================================================================

export const customerAgentIdentityBlueprintTemplate: InterviewTemplate = {
  templateName: "Customer Agent Identity Blueprint",
  description:
    "A trust-first adaptive onboarding flow that defines who your customer-facing agent is, what it must never do, when it must hand off, and how to detect drift in progressive micro-sessions.",
  version: 1,
  status: "active",
  estimatedMinutes: 20,
  mode: "quick",
  language: "en",

  phases: [
    {
      phaseId: "identity_anchors",
      phaseName: "Identity Anchors",
      order: 1,
      isRequired: true,
      estimatedMinutes: 5,
      introPrompt:
        "Let's define the core identity your agent should hold under pressure.",
      completionPrompt:
        "Great. We now have the agent's identity anchors. Next we'll define trust guardrails.",
      questions: [
        {
          questionId: "q1_identity_north_star",
          promptText:
            "What is this agent's identity north star? Describe the one promise it should never break.",
          expectedDataType: "freeform",
          extractionField: "identityNorthStar",
          followUpPrompts: [
            "When this agent performs perfectly, what do users consistently feel?",
          ],
        },
        {
          questionId: "q1_customer_promise",
          promptText:
            "What customer promise should this agent reinforce in every important interaction?",
          expectedDataType: "freeform",
          extractionField: "customerPromise",
        },
        {
          questionId: "q1_voice_signature",
          promptText:
            "How should the agent sound when things get tense? Include tone words and phrases it should use.",
          expectedDataType: "freeform",
          extractionField: "voiceSignature",
        },
      ],
    },
    {
      phaseId: "guardrail_contract",
      phaseName: "Guardrail Contract",
      order: 2,
      isRequired: true,
      estimatedMinutes: 5,
      introPrompt: "Now define boundaries the agent must respect at all times.",
      completionPrompt:
        "Perfect. We have the guardrails. Next let's define handoff boundaries.",
      questions: [
        {
          questionId: "q2_non_negotiable_guardrails",
          promptText:
            "List the non-negotiable guardrails. What must the agent never generate, claim, or execute?",
          expectedDataType: "list",
          extractionField: "nonNegotiableGuardrails",
        },
        {
          questionId: "q2_approval_required_actions",
          promptText:
            "Which actions require explicit human approval before execution?",
          expectedDataType: "list",
          extractionField: "approvalRequiredActions",
        },
        {
          questionId: "q2_sensitive_topics",
          promptText:
            "Which sensitive topics require extra caution or refusal patterns?",
          expectedDataType: "list",
          extractionField: "sensitiveTopics",
        },
      ],
    },
    {
      phaseId: "handoff_boundaries",
      phaseName: "Handoff Boundaries",
      order: 3,
      isRequired: true,
      estimatedMinutes: 5,
      introPrompt:
        "Let's define exactly when this agent should hand work to a human or specialist.",
      completionPrompt:
        "Excellent. We now have explicit handoff boundaries. Last: drift detection.",
      questions: [
        {
          questionId: "q3_handoff_signals",
          promptText:
            "What concrete signals trigger a handoff? (examples: high-risk request, confidence drop, policy ambiguity)",
          expectedDataType: "list",
          extractionField: "handoffSignals",
        },
        {
          questionId: "q3_handoff_context_packet",
          promptText:
            "When a handoff happens, what context packet must be passed so the next owner can act safely?",
          expectedDataType: "freeform",
          extractionField: "handoffContextPacket",
        },
        {
          questionId: "q3_human_owner_role",
          promptText:
            "Who is the default human owner for escalations, and what is their decision authority?",
          expectedDataType: "text",
          extractionField: "humanOwnerRole",
        },
      ],
    },
    {
      phaseId: "drift_watch",
      phaseName: "Drift Cues",
      order: 4,
      isRequired: true,
      estimatedMinutes: 5,
      introPrompt:
        "Finally, define how you'll detect trust drift before it becomes user-visible damage.",
      completionPrompt:
        "Great. Your trust blueprint is complete and ready to power Soul Card and guardrail artifacts.",
      questions: [
        {
          questionId: "q4_drift_cues",
          promptText:
            "List the top drift cues that indicate the agent is moving away from intended identity or policy.",
          expectedDataType: "list",
          extractionField: "driftCues",
        },
        {
          questionId: "q4_drift_review_cadence",
          promptText:
            "How often should drift be reviewed, and by whom?",
          expectedDataType: "text",
          extractionField: "driftReviewCadence",
        },
        {
          questionId: "q4_drift_recovery_playbook",
          promptText:
            "What should happen immediately when drift is detected? Define first-response steps.",
          expectedDataType: "freeform",
          extractionField: "driftRecoveryPlaybook",
        },
      ],
    },
  ],

  outputSchema: {
    fields: [
      { fieldId: "identityNorthStar", fieldName: "Identity North Star", dataType: "string", category: "brand", required: true },
      { fieldId: "customerPromise", fieldName: "Customer Promise", dataType: "string", category: "audience", required: true },
      { fieldId: "voiceSignature", fieldName: "Voice Signature", dataType: "string", category: "voice", required: true },
      { fieldId: "nonNegotiableGuardrails", fieldName: "Non-Negotiable Guardrails", dataType: "string[]", category: "goals", required: true },
      { fieldId: "approvalRequiredActions", fieldName: "Approval Required Actions", dataType: "string[]", category: "goals", required: true },
      { fieldId: "sensitiveTopics", fieldName: "Sensitive Topics", dataType: "string[]", category: "voice", required: false },
      { fieldId: "handoffSignals", fieldName: "Handoff Signals", dataType: "string[]", category: "goals", required: true },
      { fieldId: "handoffContextPacket", fieldName: "Handoff Context Packet", dataType: "string", category: "content_prefs", required: true },
      { fieldId: "humanOwnerRole", fieldName: "Escalation Owner Role", dataType: "string", category: "brand", required: true },
      { fieldId: "driftCues", fieldName: "Drift Cues", dataType: "string[]", category: "goals", required: true },
      { fieldId: "driftReviewCadence", fieldName: "Drift Review Cadence", dataType: "string", category: "goals", required: true },
      { fieldId: "driftRecoveryPlaybook", fieldName: "Drift Recovery Playbook", dataType: "string", category: "goals", required: true },
    ],
  },

  completionCriteria: {
    minPhasesCompleted: 4,
    requiredPhaseIds: ["identity_anchors", "guardrail_contract", "handoff_boundaries", "drift_watch"],
  },

  interviewerPersonality:
    "Clear, calm, and trust-oriented. You help the user articulate identity, safety boundaries, and escalation decisions without ambiguity.",
  followUpDepth: 2,
  silenceHandling:
    "Take your time. We'll move in short micro-sessions, and I can offer examples for identity anchors, guardrails, handoff boundaries, or drift cues.",
};

// ============================================================================
// TEMPLATE B: AGENT TEAM SHAPE CHARTER (30 min, 5 phases)
// ============================================================================

export const agentTeamShapeCharterTemplate: InterviewTemplate = {
  templateName: "Agent Team Shape Charter",
  description:
    "A structured adaptive flow for multi-agent teams that defines specialist identity anchors, cross-agent guardrails, handoff boundaries, and drift operating cues through progressive checkpoints.",
  version: 1,
  status: "active",
  estimatedMinutes: 30,
  mode: "standard",
  language: "en",

  phases: [
    {
      phaseId: "team_identity_anchors",
      phaseName: "Team Identity Anchors",
      order: 1,
      isRequired: true,
      estimatedMinutes: 6,
      introPrompt: "Start by defining the team mission and identity anchors.",
      completionPrompt:
        "Great. The team identity is clear. Next we'll define specialist guardrails.",
      questions: [
        {
          questionId: "q1_team_north_star",
          promptText:
            "What is the team's north star outcome, and what trust promise should hold across every specialist?",
          expectedDataType: "freeform",
          extractionField: "teamNorthStar",
        },
        {
          questionId: "q1_team_identity_anchors",
          promptText:
            "List the identity anchors every specialist agent must preserve.",
          expectedDataType: "list",
          extractionField: "teamIdentityAnchors",
        },
        {
          questionId: "q1_specialist_personas",
          promptText:
            "List the core specialist personas in this team (for example: researcher, closer, support analyst).",
          expectedDataType: "list",
          extractionField: "specialistPersonas",
        },
      ],
    },
    {
      phaseId: "specialist_guardrails",
      phaseName: "Specialist Guardrails",
      order: 2,
      isRequired: true,
      estimatedMinutes: 6,
      introPrompt:
        "Now define what each specialist is allowed or forbidden to do.",
      completionPrompt:
        "Guardrails are defined. Let's design handoff boundaries next.",
      questions: [
        {
          questionId: "q2_role_guardrails",
          promptText:
            "What role-specific guardrails apply to each specialist?",
          expectedDataType: "list",
          extractionField: "roleGuardrails",
        },
        {
          questionId: "q2_shared_safety_policies",
          promptText:
            "What shared safety policies apply to the full team regardless of role?",
          expectedDataType: "list",
          extractionField: "sharedSafetyPolicies",
        },
        {
          questionId: "q2_approval_escalation_matrix",
          promptText:
            "Describe the approval and escalation matrix when a specialist reaches a risky decision boundary.",
          expectedDataType: "freeform",
          extractionField: "approvalEscalationMatrix",
        },
      ],
    },
    {
      phaseId: "handoff_design",
      phaseName: "Handoff Boundaries",
      order: 3,
      isRequired: true,
      estimatedMinutes: 6,
      introPrompt:
        "Define exactly how specialists hand work to each other and to humans.",
      completionPrompt:
        "Great. Handoff boundaries are explicit. Next: drift governance.",
      questions: [
        {
          questionId: "q3_handoff_boundaries",
          promptText:
            "What boundaries decide when one specialist must hand off to another?",
          expectedDataType: "list",
          extractionField: "handoffBoundaries",
        },
        {
          questionId: "q3_handoff_context_envelope",
          promptText:
            "What minimum context envelope must travel with every handoff?",
          expectedDataType: "freeform",
          extractionField: "handoffContextEnvelope",
        },
        {
          questionId: "q3_quality_gate_checks",
          promptText:
            "What quality gates should be checked before a handoff is considered complete?",
          expectedDataType: "list",
          extractionField: "qualityGateChecks",
        },
      ],
    },
    {
      phaseId: "drift_governance",
      phaseName: "Drift Governance",
      order: 4,
      isRequired: true,
      estimatedMinutes: 6,
      introPrompt:
        "Now define how the team detects and corrects drift.",
      completionPrompt:
        "Excellent. Drift governance is clear. Last: admin visibility.",
      questions: [
        {
          questionId: "q4_team_drift_cues",
          promptText:
            "List the team-level drift cues that indicate identity, guardrail, or handoff degradation.",
          expectedDataType: "list",
          extractionField: "teamDriftCues",
        },
        {
          questionId: "q4_drift_owner_role",
          promptText:
            "Who owns drift review and correction decisions?",
          expectedDataType: "text",
          extractionField: "driftOwnerRole",
        },
        {
          questionId: "q4_correction_protocol",
          promptText:
            "What is the correction protocol when drift is confirmed?",
          expectedDataType: "freeform",
          extractionField: "correctionProtocol",
        },
      ],
    },
    {
      phaseId: "admin_visibility",
      phaseName: "Admin Visibility",
      order: 5,
      isRequired: true,
      estimatedMinutes: 6,
      introPrompt:
        "Finish by defining what Admin needs to safely monitor team trust.",
      completionPrompt:
        "Perfect. The team charter is complete and ready for downstream trust surfaces.",
      questions: [
        {
          questionId: "q5_admin_reporting_cadence",
          promptText:
            "How often should Admin receive trust health summaries for this team?",
          expectedDataType: "text",
          extractionField: "adminReportingCadence",
        },
        {
          questionId: "q5_admin_intervention_triggers",
          promptText:
            "Which trust events should trigger direct Admin intervention?",
          expectedDataType: "list",
          extractionField: "adminInterventionTriggers",
        },
        {
          questionId: "q5_audit_trail_expectations",
          promptText:
            "What evidence should always be present in the audit trail after major decisions or escalations?",
          expectedDataType: "freeform",
          extractionField: "auditTrailExpectations",
        },
      ],
    },
  ],

  outputSchema: {
    fields: [
      { fieldId: "teamNorthStar", fieldName: "Team North Star", dataType: "string", category: "goals", required: true },
      { fieldId: "teamIdentityAnchors", fieldName: "Team Identity Anchors", dataType: "string[]", category: "brand", required: true },
      { fieldId: "specialistPersonas", fieldName: "Specialist Personas", dataType: "string[]", category: "brand", required: true },
      { fieldId: "roleGuardrails", fieldName: "Role Guardrails", dataType: "string[]", category: "goals", required: true },
      { fieldId: "sharedSafetyPolicies", fieldName: "Shared Safety Policies", dataType: "string[]", category: "goals", required: true },
      { fieldId: "approvalEscalationMatrix", fieldName: "Approval Escalation Matrix", dataType: "string", category: "goals", required: true },
      { fieldId: "handoffBoundaries", fieldName: "Handoff Boundaries", dataType: "string[]", category: "goals", required: true },
      { fieldId: "handoffContextEnvelope", fieldName: "Handoff Context Envelope", dataType: "string", category: "content_prefs", required: true },
      { fieldId: "qualityGateChecks", fieldName: "Handoff Quality Gates", dataType: "string[]", category: "goals", required: true },
      { fieldId: "teamDriftCues", fieldName: "Team Drift Cues", dataType: "string[]", category: "goals", required: true },
      { fieldId: "driftOwnerRole", fieldName: "Drift Owner Role", dataType: "string", category: "brand", required: true },
      { fieldId: "correctionProtocol", fieldName: "Drift Correction Protocol", dataType: "string", category: "goals", required: true },
      { fieldId: "adminReportingCadence", fieldName: "Admin Reporting Cadence", dataType: "string", category: "goals", required: true },
      { fieldId: "adminInterventionTriggers", fieldName: "Admin Intervention Triggers", dataType: "string[]", category: "goals", required: true },
      { fieldId: "auditTrailExpectations", fieldName: "Audit Trail Expectations", dataType: "string", category: "goals", required: true },
    ],
  },

  completionCriteria: {
    minPhasesCompleted: 5,
    requiredPhaseIds: [
      "team_identity_anchors",
      "specialist_guardrails",
      "handoff_design",
      "drift_governance",
      "admin_visibility",
    ],
  },

  interviewerPersonality:
    "Precise and systems-minded while remaining collaborative. You help teams codify trust operations in language operators can act on.",
  followUpDepth: 3,
  silenceHandling:
    "If helpful, I can provide examples of role guardrails, handoff boundaries, and drift cues as we progress checkpoint by checkpoint.",
};

// ============================================================================
// TEMPLATE C: PLATFORM AGENT TRUST TRAINING (40 min, 5 phases)
// ============================================================================

export const platformAgentTrustTrainingTemplate: InterviewTemplate = {
  templateName: "Platform Agent Trust Training",
  description:
    "A deep-discovery adaptive trust flow for super-admin platform agents, focused on policy guardrails, operator handoffs, and drift response with customer parity checkpoints.",
  version: 1,
  status: "active",
  estimatedMinutes: 40,
  mode: "deep_discovery",
  language: "en",

  phases: [
    {
      phaseId: "platform_identity_anchors",
      phaseName: "Platform Identity Anchors",
      order: 1,
      isRequired: true,
      estimatedMinutes: 8,
      introPrompt:
        "Let's define the platform agent's role, mandate, and trust boundary.",
      completionPrompt:
        "Great. Platform identity is clear. Next we'll lock policy guardrails.",
      questions: [
        {
          questionId: "q1_platform_mandate",
          promptText:
            "What is the platform agent's mandate, and where does its authority stop?",
          expectedDataType: "freeform",
          extractionField: "platformMandate",
        },
        {
          questionId: "q1_operator_persona",
          promptText:
            "How should this platform agent present itself to operators when stakes are high?",
          expectedDataType: "freeform",
          extractionField: "operatorPersona",
        },
        {
          questionId: "q1_customer_promise_boundary",
          promptText:
            "What customer trust promise must this platform agent always protect?",
          expectedDataType: "freeform",
          extractionField: "customerPromiseBoundary",
        },
      ],
    },
    {
      phaseId: "policy_guardrails",
      phaseName: "Policy Guardrails",
      order: 2,
      isRequired: true,
      estimatedMinutes: 8,
      introPrompt:
        "Now define immutable and conditional policy boundaries for platform behavior.",
      completionPrompt:
        "Excellent. Policy guardrails are set. Next we'll map handoffs and escalations.",
      questions: [
        {
          questionId: "q2_immutable_policies",
          promptText:
            "List immutable policies the platform agent can never override.",
          expectedDataType: "list",
          extractionField: "immutablePolicies",
        },
        {
          questionId: "q2_override_requirements",
          promptText:
            "If policy override is ever allowed, what explicit approvals and evidence are required?",
          expectedDataType: "list",
          extractionField: "overrideRequirements",
        },
        {
          questionId: "q2_prohibited_actions",
          promptText:
            "List prohibited actions that must always be blocked and escalated.",
          expectedDataType: "list",
          extractionField: "prohibitedActions",
        },
      ],
    },
    {
      phaseId: "handoff_and_escalation",
      phaseName: "Handoff and Escalation Boundaries",
      order: 3,
      isRequired: true,
      estimatedMinutes: 8,
      introPrompt:
        "Define how this platform agent hands work to human operators or specialist services.",
      completionPrompt:
        "Great. Escalation boundaries are explicit. Next: drift monitoring.",
      questions: [
        {
          questionId: "q3_platform_handoff_boundaries",
          promptText:
            "Which conditions require immediate handoff from platform agent to human operator?",
          expectedDataType: "list",
          extractionField: "platformHandoffBoundaries",
        },
        {
          questionId: "q3_escalation_ownership_map",
          promptText:
            "Describe escalation ownership by issue type, including who is accountable for final decisions.",
          expectedDataType: "freeform",
          extractionField: "escalationOwnershipMap",
        },
        {
          questionId: "q3_incident_sla",
          promptText:
            "What incident response SLA should this platform agent enforce for escalations?",
          expectedDataType: "text",
          extractionField: "incidentSla",
        },
      ],
    },
    {
      phaseId: "drift_monitoring",
      phaseName: "Drift Monitoring",
      order: 4,
      isRequired: true,
      estimatedMinutes: 8,
      introPrompt:
        "Define how platform drift is detected, triaged, and rolled back.",
      completionPrompt:
        "Drift safeguards are set. Final phase: parity and operator readiness.",
      questions: [
        {
          questionId: "q4_platform_drift_cues",
          promptText:
            "List platform drift cues that suggest policy, identity, or escalation behavior is degrading.",
          expectedDataType: "list",
          extractionField: "platformDriftCues",
        },
        {
          questionId: "q4_rollback_triggers",
          promptText:
            "Which trigger conditions require rollback of recent model/prompt/soul changes?",
          expectedDataType: "list",
          extractionField: "rollbackTriggers",
        },
        {
          questionId: "q4_retraining_cadence",
          promptText:
            "What retraining or calibration cadence should keep platform behavior aligned?",
          expectedDataType: "text",
          extractionField: "retrainingCadence",
        },
      ],
    },
    {
      phaseId: "parity_readiness",
      phaseName: "Parity and Readiness",
      order: 5,
      isRequired: true,
      estimatedMinutes: 8,
      introPrompt:
        "Finish by defining how platform workflows stay aligned with customer-facing trust workflows.",
      completionPrompt:
        "Excellent. Platform trust training is complete and parity-ready.",
      questions: [
        {
          questionId: "q5_customer_parity_checklist",
          promptText:
            "List the checks that ensure platform-agent behavior stays in parity with customer agent trust standards.",
          expectedDataType: "list",
          extractionField: "customerParityChecklist",
        },
        {
          questionId: "q5_training_handoff_checklist",
          promptText:
            "What handoff checklist should operators run before promoting new platform training changes?",
          expectedDataType: "list",
          extractionField: "trainingHandoffChecklist",
        },
        {
          questionId: "q5_admin_drift_signal_routing",
          promptText:
            "How should drift signals be routed to Admin, and what context is required for action?",
          expectedDataType: "freeform",
          extractionField: "adminDriftSignalRouting",
        },
      ],
    },
  ],

  outputSchema: {
    fields: [
      { fieldId: "platformMandate", fieldName: "Platform Mandate", dataType: "string", category: "brand", required: true },
      { fieldId: "operatorPersona", fieldName: "Operator-Facing Persona", dataType: "string", category: "voice", required: true },
      { fieldId: "customerPromiseBoundary", fieldName: "Customer Promise Boundary", dataType: "string", category: "audience", required: true },
      { fieldId: "immutablePolicies", fieldName: "Immutable Policies", dataType: "string[]", category: "goals", required: true },
      { fieldId: "overrideRequirements", fieldName: "Override Requirements", dataType: "string[]", category: "goals", required: true },
      { fieldId: "prohibitedActions", fieldName: "Prohibited Actions", dataType: "string[]", category: "goals", required: true },
      { fieldId: "platformHandoffBoundaries", fieldName: "Platform Handoff Boundaries", dataType: "string[]", category: "goals", required: true },
      { fieldId: "escalationOwnershipMap", fieldName: "Escalation Ownership Map", dataType: "string", category: "goals", required: true },
      { fieldId: "incidentSla", fieldName: "Incident Response SLA", dataType: "string", category: "goals", required: true },
      { fieldId: "platformDriftCues", fieldName: "Platform Drift Cues", dataType: "string[]", category: "goals", required: true },
      { fieldId: "rollbackTriggers", fieldName: "Rollback Triggers", dataType: "string[]", category: "goals", required: true },
      { fieldId: "retrainingCadence", fieldName: "Retraining Cadence", dataType: "string", category: "goals", required: true },
      { fieldId: "customerParityChecklist", fieldName: "Customer Parity Checklist", dataType: "string[]", category: "goals", required: true },
      { fieldId: "trainingHandoffChecklist", fieldName: "Training Handoff Checklist", dataType: "string[]", category: "goals", required: true },
      { fieldId: "adminDriftSignalRouting", fieldName: "Admin Drift Signal Routing", dataType: "string", category: "goals", required: true },
    ],
  },

  completionCriteria: {
    minPhasesCompleted: 5,
    requiredPhaseIds: [
      "platform_identity_anchors",
      "policy_guardrails",
      "handoff_and_escalation",
      "drift_monitoring",
      "parity_readiness",
    ],
  },

  interviewerPersonality:
    "Operationally rigorous and trust-forward. You help super-admins define clear platform safety boundaries and escalation operating conditions.",
  followUpDepth: 3,
  silenceHandling:
    "Take your time. We'll use progressive micro-sessions, and I can provide examples for policy guardrails, handoff boundaries, and drift response playbooks.",
};

// ============================================================================
// ALL SEED TEMPLATES
// ============================================================================

export const SEED_TEMPLATES: InterviewTemplate[] = [
  customerAgentIdentityBlueprintTemplate,
  agentTeamShapeCharterTemplate,
  platformAgentTrustTrainingTemplate,
];

/**
 * Get a seed template by mode
 */
export function getSeedTemplateByMode(
  mode: "quick" | "standard" | "deep_discovery",
): InterviewTemplate | undefined {
  return SEED_TEMPLATES.find((template) => template.mode === mode);
}
