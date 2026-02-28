interface CoverageSpecialistHint {
  roleName: string;
  subtype: string;
  focus: string;
}

const COVERAGE_SPECIALIST_HINTS: Record<string, CoverageSpecialistHint> = {
  appointment_booking_specialist: {
    roleName: "Appointment Booking Specialist",
    subtype: "booking_agent",
    focus: "Coordinate calendar-aware booking intents and deterministic scheduling follow-through.",
  },
  provider_outreach_specialist: {
    roleName: "Provider Outreach Specialist",
    subtype: "customer_support",
    focus: "Handle asynchronous provider outreach via messaging/email channels before escalation.",
  },
  personal_schedule_coordinator: {
    roleName: "Personal Schedule Coordinator",
    subtype: "general",
    focus: "Orchestrate end-to-end personal operator plans and manage handoff readiness.",
  },
};

function resolveCoverageSpecialistHint(openContext?: string): CoverageSpecialistHint | null {
  if (!openContext) {
    return null;
  }

  const contextTokens = openContext
    .split(":")
    .map((token) => token.trim().toLowerCase());

  if (contextTokens[0] !== "agent_coverage") {
    return null;
  }

  const roleId = contextTokens[1];
  if (!roleId) {
    return null;
  }
  const explicitSubtype = contextTokens[2] || undefined;

  const knownHint = COVERAGE_SPECIALIST_HINTS[roleId];
  if (knownHint) {
    return {
      ...knownHint,
      subtype: explicitSubtype || knownHint.subtype,
    };
  }

  return {
    roleName: roleId.replace(/_/g, " "),
    subtype: explicitSubtype || "general",
    focus: "Fill uncovered specialist role from the agent coverage screen with constrained first-run setup.",
  };
}

export function buildPlatformAgentCreationKickoff(args: {
  openContext?: string;
  sourceSessionId?: string;
  sourceOrganizationId?: string;
}): string {
  const contextLine = args.openContext ? `entry_context=${args.openContext}` : "entry_context=catalog_clone_activation";
  const sourceSessionLine = args.sourceSessionId
    ? `source_session_id=${args.sourceSessionId}`
    : "source_session_id=unknown";
  const sourceOrgLine = args.sourceOrganizationId
    ? `source_organization_id=${args.sourceOrganizationId}`
    : "source_organization_id=unknown";
  const coverageSpecialistHint = resolveCoverageSpecialistHint(args.openContext);
  const coverageHintLines = coverageSpecialistHint
    ? [
      "entry_source=agent_coverage",
      `recommended_specialist_role=${coverageSpecialistHint.roleName}`,
      `recommended_specialist_subtype=${coverageSpecialistHint.subtype}`,
      `recommended_specialist_focus=${coverageSpecialistHint.focus}`,
    ]
    : [];

  return [
    "Route this conversation through one-visible-operator activation.",
    "intent=activate_catalog_clone",
    contextLine,
    sourceSessionLine,
    sourceOrgLine,
    ...coverageHintLines,
    "creation_mode=catalog_clone_only",
    "direct_free_form_create=blocked_by_default",
    "activation_sequence=catalog_match -> capability_snapshot -> clone_activation",
    "setup_promise=target_first_runnable_setup_in_15_minutes_when_required_inputs_are_provided",
    "voice_first_entry=talk_mode_with_type_fallback_available_at_every_step",
    "deploy_handoff_options=webchat|telegram|both",
    "required_sequence=catalog_match.v1 -> capability_snapshot.v1 -> deployment_packet.v1",
    "one_visible_operator_voice=required",
    "internal_routing_visibility=hidden",
    "forbidden_operator_terms=clone|template|catalog|specialist|orchestration_layer|blocked",
    "response_contract:",
    "1) Workflow Steps: concrete numbered actions only; keep language operator-first and outcome-first.",
    "2) Readiness Snapshot: always show two sections - ready now and needs setup next.",
    "3) Tool Mappings: exact tool/integration checks mapped to each needs-setup item.",
    "4) Primary Rule: first successful clone sets isPrimary=true when no primary exists in orgId+userId.",
    "5) No-Fit Route: purchase-only custom concierge with exact terms - €5,000 minimum, €2,500 deposit, includes 90-minute onboarding with engineer.",
    "6) Voice Contract: keep one companion voice; do not mention internal agent routing.",
    "If required inputs are missing, ask targeted questions first and list missing fields explicitly.",
  ].join("\n");
}
