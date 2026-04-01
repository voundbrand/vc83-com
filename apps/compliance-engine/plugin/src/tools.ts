import type { SidecarClient } from "./sidecar-client.js";

/**
 * Tool definitions for the OpenClaw agent runtime.
 *
 * These tools are registered with the agent via the plugin manifest
 * and allow agents to interact with the compliance sidecar.
 */

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  handler: (params: Record<string, unknown>) => Promise<unknown>;
}

export function createTools(client: SidecarClient): ToolDefinition[] {
  return [
    {
      name: "consent_check",
      description:
        "Check if a data subject has given consent for a specific processing type. " +
        "Must be called before processing personal data (GDPR Art 6/7).",
      parameters: {
        subject_id: {
          type: "string",
          description: "ID of the data subject",
          required: true,
        },
        consent_type: {
          type: "string",
          description:
            "Type of consent to check (e.g., 'data_processing', 'marketing', 'analytics')",
          required: true,
        },
      },
      handler: async (params) => {
        return client.checkConsent(
          params.subject_id as string,
          params.consent_type as string,
        );
      },
    },
    {
      name: "audit_log",
      description:
        "Record an action in the compliance audit trail. " +
        "Should be called for any action that processes or accesses personal data.",
      parameters: {
        event_type: {
          type: "string",
          description: "Type of event (e.g., 'agent.tool_call', 'data.access')",
          required: true,
        },
        action: {
          type: "string",
          description: "Action performed (e.g., 'search_calendar', 'send_email')",
          required: true,
        },
        subject_id: {
          type: "string",
          description: "ID of the data subject affected",
        },
        resource: {
          type: "string",
          description: "Resource accessed (e.g., 'calendar:123', 'email:456')",
        },
      },
      handler: async (params) => {
        return client.recordAudit({
          event_type: params.event_type as string,
          actor: (params.actor as string) ?? "agent",
          subject_id: params.subject_id as string | undefined,
          action: params.action as string,
          resource: params.resource as string | undefined,
          outcome: "recorded",
        });
      },
    },
    {
      name: "data_export",
      description:
        "Export all data held about a data subject (GDPR Art 20 right to data portability). " +
        "Returns all consent records, audit events, and associated data.",
      parameters: {
        subject_id: {
          type: "string",
          description: "ID of the data subject requesting export",
          required: true,
        },
      },
      handler: async (params) => {
        return client.exportSubject(params.subject_id as string);
      },
    },
    {
      name: "data_delete",
      description:
        "Process a right-to-erasure request for a data subject (GDPR Art 17). " +
        "This will soft-delete the subject record and remove associated consent records.",
      parameters: {
        subject_id: {
          type: "string",
          description: "ID of the data subject requesting erasure",
          required: true,
        },
      },
      handler: async (params) => {
        return client.eraseSubject(params.subject_id as string);
      },
    },
    {
      name: "pii_scan",
      description:
        "Scan text for personally identifiable information (PII). " +
        "Detects email addresses, phone numbers, IBANs, health data, and more. " +
        "Use before storing or transmitting text that may contain PII.",
      parameters: {
        text: {
          type: "string",
          description: "Text to scan for PII",
          required: true,
        },
      },
      handler: async (params) => {
        return client.scanPii(params.text as string);
      },
    },

    // -- Governance Tools (deployment compliance from zero) --

    {
      name: "compliance_assess",
      description:
        "Assess deployment compliance posture. Given a profession (lawyer, tax_advisor, doctor) " +
        "or explicit framework list, returns: required frameworks, deployment requirements, " +
        "current provider gaps, and blockers. Call this first when setting up compliance.",
      parameters: {
        profession: {
          type: "string",
          description:
            "Client profession (lawyer, tax_advisor, doctor, pharmacist, notary, general). " +
            "Auto-selects appropriate frameworks (e.g., lawyer → GDPR + §203 StGB).",
        },
        frameworks: {
          type: "string",
          description:
            "Comma-separated framework IDs to assess (e.g., 'gdpr,stgb_203'). " +
            "Overrides profession-based selection if provided.",
        },
        jurisdiction: {
          type: "string",
          description: "Jurisdiction code (e.g., 'DE', 'EU')",
        },
      },
      handler: async (params) => {
        const frameworks = params.frameworks
          ? (params.frameworks as string).split(",").map((f) => f.trim())
          : undefined;
        return client.governanceAssess({
          profession: params.profession as string | undefined,
          frameworks,
          jurisdiction: params.jurisdiction as string | undefined,
        });
      },
    },
    {
      name: "compliance_onboard_provider",
      description:
        "Register a provider with auto-populated knowledge from the built-in knowledge base. " +
        "When you add 'hetzner' or 'openrouter', the engine knows their data location, " +
        "DPA availability, certifications, and transfer mechanism. Returns the registered " +
        "provider with evidence gaps showing what's still needed.",
      parameters: {
        name: {
          type: "string",
          description:
            "Provider name or ID (e.g., 'hetzner', 'openrouter', 'elevenlabs', 'anthropic')",
          required: true,
        },
        provider_type: {
          type: "string",
          description:
            "Provider type if not auto-detected (hosting, ai_inference, voice_ai, telephony, database, cloud_platform)",
        },
      },
      handler: async (params) => {
        return client.governanceOnboardProvider({
          name: params.name as string,
          provider_type: params.provider_type as string | undefined,
        });
      },
    },
    {
      name: "compliance_evidence_gap",
      description:
        "Show per-provider evidence status. For each registered provider, returns " +
        "which evidence is present (DPA signed, TOMs documented, subprocessor list) " +
        "and which is missing with specific action items (URLs, next steps).",
      parameters: {},
      handler: async () => {
        return client.governanceEvidenceGaps();
      },
    },
    {
      name: "compliance_knowledge_lookup",
      description:
        "Fetch provider dossier facts from the governance knowledge base. " +
        "Use this before legal/provider decisions to retrieve deterministic posture " +
        "for providers such as Hetzner, OpenRouter, or ElevenLabs.",
      parameters: {
        query: {
          type: "string",
          description: "Provider ID or provider name to look up",
          required: true,
        },
      },
      handler: async (params) => {
        return client.governanceKnowledgeLookup(params.query as string);
      },
    },
    {
      name: "compliance_readiness_report",
      description:
        "Produce a GO/NO-GO release readiness assessment. Returns overall decision, " +
        "posture score (0-100), list of blockers with action items, warnings, and " +
        "per-provider status. Use this to determine if deployment is ready.",
      parameters: {},
      handler: async () => {
        return client.governanceReadiness();
      },
    },
    {
      name: "compliance_generate_checklist",
      description:
        "Generate a framework-specific deployment go-live checklist. Returns structured " +
        "checklist items with evidence IDs (E-LGL-xxx, E-TECH-xxx, E-OPS-xxx) and " +
        "completion status. Covers legal, technical, operational, and data protection.",
      parameters: {},
      handler: async () => {
        return client.governanceChecklist();
      },
    },
    {
      name: "compliance_generate_doc",
      description:
        "Generate a governance document from templates. Available templates: " +
        "subprocessor_inventory (Art 28 subprocessor list), go_live_checklist " +
        "(deployment readiness checklist), incident_matrix (incident contacts and severity levels). " +
        "Returns formatted Markdown document ready for review.",
      parameters: {
        template: {
          type: "string",
          description:
            "Template name: 'subprocessor_inventory', 'go_live_checklist', or 'incident_matrix'",
          required: true,
        },
        company_name: {
          type: "string",
          description: "Company name for the document header",
        },
        company_address: {
          type: "string",
          description: "Company address",
        },
        governance_owner: {
          type: "string",
          description: "Name of the governance/compliance owner",
        },
      },
      handler: async (params) => {
        return client.governanceGenerateDoc({
          template: params.template as string,
          company_name: params.company_name as string | undefined,
          company_address: params.company_address as string | undefined,
          governance_owner: params.governance_owner as string | undefined,
        });
      },
    },
  ];
}
