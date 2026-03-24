import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createAgentSpy,
  createTextKnowledgeBaseDocumentSpy,
  deleteKnowledgeBaseDocumentSpy,
  evaluateTemplateCertificationForTemplateVersionMock,
  evaluateTemplateOrgPreflightMock,
  getAgentSpy,
  getKnowledgeBaseDocumentContentSpy,
  getUserContextMock,
  requireAuthenticatedUserMock,
  updateAgentSpy,
} = vi.hoisted(() => ({
  createAgentSpy: vi.fn(),
  createTextKnowledgeBaseDocumentSpy: vi.fn(),
  deleteKnowledgeBaseDocumentSpy: vi.fn(),
  evaluateTemplateCertificationForTemplateVersionMock: vi.fn(),
  evaluateTemplateOrgPreflightMock: vi.fn(),
  getAgentSpy: vi.fn(),
  getKnowledgeBaseDocumentContentSpy: vi.fn(),
  getUserContextMock: vi.fn(),
  requireAuthenticatedUserMock: vi.fn(),
  updateAgentSpy: vi.fn(),
}));

vi.mock("../../../apps/one-of-one-landing/scripts/elevenlabs/lib/elevenlabs-api", () => ({
  resolveElevenLabsConvaiBaseUrl: (value?: string | null) =>
    value ? `${value.replace(/\/+$/, "")}/convai` : "https://api.elevenlabs.io/v1/convai",
  ElevenLabsClient: class {
    createAgent = createAgentSpy;
    getAgent = getAgentSpy;
    getKnowledgeBaseDocumentContent = getKnowledgeBaseDocumentContentSpy;
    createTextKnowledgeBaseDocument = createTextKnowledgeBaseDocumentSpy;
    updateAgent = updateAgentSpy;
    deleteKnowledgeBaseDocument = deleteKnowledgeBaseDocumentSpy;
  },
}));

vi.mock("../../../convex/rbacHelpers", () => ({
  requireAuthenticatedUser: requireAuthenticatedUserMock,
  getUserContext: getUserContextMock,
}));

vi.mock("../../../convex/ai/agentCatalogAdmin", () => ({
  evaluateTemplateCertificationForTemplateVersion:
    evaluateTemplateCertificationForTemplateVersionMock,
}));

vi.mock("../../../convex/agentOntology", () => ({
  evaluateTemplateOrgPreflight: evaluateTemplateOrgPreflightMock,
}));

vi.mock("../../../convex/_generated/api", () => ({
  internal: {
    rbacHelpers: {
      requireAuthenticatedUserQuery: "__require_auth__",
    },
    ai: {
      escalation: {
        getOrgOwnerEmail: "__get_org_owner_email__",
      },
      workerPool: {
        spawnUseCaseAgent: "__spawn_use_case_agent__",
      },
    },
    agentOntology: {
      getAgentInternal: "__get_agent_internal__",
    },
    calendarSyncOntology: {
      getResourceCalendarConnections: "__get_resource_calendar_connections__",
    },
    integrations: {
      elevenlabs: {
        getOrganizationElevenLabsRuntimeBinding: "__get_eleven_runtime__",
      },
      telephony: {
        recordAgentTelephonySyncStateInternal: "__record_sync_state__",
      },
    },
  },
  api: {
    integrations: {
      elevenlabs: {
        getElevenLabsSettings: "__get_eleven_settings__",
      },
      telephony: {
        getAgentTelephonyPanelState: "__get_agent_telephony_panel_state__",
      },
      twilio: {
        validateOrganizationTwilioPhoneNumber: "__validate_twilio_phone_number__",
        validateOrganizationTwilioVoiceNumberBinding:
          "__validate_twilio_voice_number_binding__",
      },
    },
  },
}));

import {
  getKanzleiMvpLiveSetupAudit,
  saveAgentTelephonyConfig,
  saveOrganizationTelephonySettings,
  saveOrganizationTelephonySettingsAdmin,
  syncAgentTelephonyProvider,
} from "../../../convex/integrations/telephony";
import {
  buildElevenLabsAgentCreatePayload,
} from "../../../src/lib/telephony/elevenlabs-agent-sync";
import {
  KANZLEI_MVP_TEMPLATE_ROLE,
  normalizeAgentTelephonyConfig,
} from "../../../src/lib/telephony/agent-telephony";

function createDb() {
  const tables = {
    objects: [] as Array<Record<string, unknown>>,
    objectActions: [] as Array<Record<string, unknown>>,
    oauthConnections: [] as Array<Record<string, unknown>>,
  };
  let counter = 0;

  return {
    tables,
    api: {
      query(table: "objects" | "oauthConnections") {
        return {
          withIndex(_indexName: string, cb: (q: { eq: (field: string, value: unknown) => unknown }) => unknown) {
            const clauses: Record<string, unknown> = {};
            const q = {
              eq(field: string, value: unknown) {
                clauses[field] = value;
                return q;
              },
            };
            cb(q);
            const rows = tables[table].filter((row) =>
              Object.entries(clauses).every(([field, value]) => row[field] === value),
            );
            return {
              collect: async () => rows,
              first: async () => rows[0] ?? null,
            };
          },
        };
      },
      async insert(
        table: "objects" | "objectActions" | "oauthConnections",
        value: Record<string, unknown>,
      ) {
        counter += 1;
        const row = {
          _id: `${table}_${counter}`,
          ...value,
        };
        tables[table].push(row);
        return row._id;
      },
      async patch(id: string, value: Record<string, unknown>) {
        const row = tables.objects.find((entry) => entry._id === id);
        if (!row) {
          throw new Error(`Row not found: ${id}`);
        }
        Object.assign(row, value);
      },
      async get(id: string) {
        return (
          tables.objects.find((entry) => entry._id === id)
          ?? tables.oauthConnections.find((entry) => entry._id === id)
          ?? null
        );
      },
    },
  };
}

describe("telephony organization persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PLATFORM_ORG_ID = "organizations_platform";
    process.env.TEST_ORG_ID = "organizations_platform";
    requireAuthenticatedUserMock.mockResolvedValue({
      userId: "users_1",
      organizationId: "organizations_1",
    });
    getUserContextMock.mockResolvedValue({
      isGlobal: false,
      roleName: "member",
    });
    evaluateTemplateCertificationForTemplateVersionMock.mockResolvedValue({
      allowed: true,
      autoCertificationEligible: false,
      reasonCode: null,
      message: null,
      riskAssessment: {
        tier: "low",
        requiredVerification: [],
      },
      dependencyManifest: {
        dependencyDigest: "digest_1",
      },
      certification: {
        recordedAt: 1,
        evidenceSources: [],
      },
    });
    evaluateTemplateOrgPreflightMock.mockResolvedValue({
      status: "pass",
      blockers: [],
      blockerCodes: [],
      checks: [],
      telephony: {
        required: true,
        providerKey: "elevenlabs",
        bindingEnabled: true,
        credentialReady: true,
        fromNumberReady: true,
        webhookSecretReady: true,
        missingTransferRoles: [],
      },
    });
  });

  it("upserts direct_settings and phone_call channel binding for elevenlabs", async () => {
    const db = createDb();

    const result = await (saveOrganizationTelephonySettings as any)._handler(
      { db: db.api },
      {
        sessionId: "sessions_1",
        organizationId: "organizations_1",
        providerKey: "elevenlabs",
        enabled: true,
        baseUrl: "https://telephony.example.com",
        fromNumber: "+4930123456",
        webhookSecret: "secret_123",
      },
    );

    expect(result.success).toBe(true);
    expect(result.binding.providerIdentity).toBe("eleven_telephony");
    expect(result.binding.routeKey).toContain("eleven:phone:");

    const directSettings = db.tables.objects.find((row) => row.type === "direct_settings");
    const phoneBinding = db.tables.objects.find(
      (row) =>
        row.type === "channel_provider_binding"
        && (row.customProperties as Record<string, unknown>)?.channel === "phone_call",
    );

    expect(directSettings).toBeDefined();
    expect((directSettings?.customProperties as Record<string, unknown>)?.telephonyProviderIdentity).toBe(
      "eleven_telephony",
    );
    expect((directSettings?.customProperties as Record<string, unknown>)?.elevenTelephonyBaseUrl).toBe(
      "https://telephony.example.com",
    );
    expect((phoneBinding?.customProperties as Record<string, unknown>)?.providerId).toBe("direct");
    expect((phoneBinding?.customProperties as Record<string, unknown>)?.enabled).toBe(true);
  });

  it("upserts direct_settings and phone_call channel binding for twilio_voice", async () => {
    const db = createDb();

    const result = await (saveOrganizationTelephonySettings as any)._handler(
      { db: db.api },
      {
        sessionId: "sessions_1",
        organizationId: "organizations_1",
        providerKey: "twilio_voice",
        enabled: true,
        fromNumber: "+15551230000",
        webhookSecret: "twilio_secret_123",
      },
    );

    expect(result.success).toBe(true);
    expect(result.binding.providerIdentity).toBe("twilio_voice");
    expect(result.binding.routeKey).toContain("twilio:phone:");

    const directSettings = db.tables.objects.find((row) => row.type === "direct_settings");
    const phoneBinding = db.tables.objects.find(
      (row) =>
        row.type === "channel_provider_binding" &&
        (row.customProperties as Record<string, unknown>)?.channel === "phone_call",
    );

    expect((directSettings?.customProperties as Record<string, unknown>)?.telephonyProviderIdentity).toBe(
      "twilio_voice",
    );
    expect((directSettings?.customProperties as Record<string, unknown>)?.telephonyRouteKeyPolicy).toBe(
      "twilio_voice_v1",
    );
    expect((directSettings?.customProperties as Record<string, unknown>)?.twilioVoiceFromNumber).toBe(
      "+15551230000",
    );
    expect((directSettings?.customProperties as Record<string, unknown>)?.twilioVoiceWebhookSecret).toBe(
      "twilio_secret_123",
    );
    expect((phoneBinding?.customProperties as Record<string, unknown>)?.telephonyProviderIdentity).toBe(
      "twilio_voice",
    );
    expect((phoneBinding?.customProperties as Record<string, unknown>)?.telephonyRouteKeyPolicy).toBe(
      "twilio_voice_v1",
    );
  });

  it("allows super admin org binding saves without clearing the stored webhook secret", async () => {
    const db = createDb();
    requireAuthenticatedUserMock.mockResolvedValue({
      userId: "users_1",
      organizationId: "organizations_platform",
    });
    getUserContextMock.mockResolvedValue({
      isGlobal: true,
      roleName: "super_admin",
    });

    await db.api.insert("objects", {
      _id: "objects_direct_telephony",
      organizationId: "organizations_target",
      type: "direct_settings",
      status: "active",
      customProperties: {
        providerId: "direct",
        providerKey: "elevenlabs",
        telephonyProviderIdentity: "eleven_telephony",
        providerConnectionId: "org_organizations_target_elevenlabs",
        providerInstallationId: "phone_call_default",
        providerProfileId: "customer_telephony",
        elevenTelephonyBaseUrl: "https://telephony.example.com",
        elevenTelephonyFromNumber: "+4930000000",
        elevenTelephonyWebhookSecret: "secret_saved",
        encryptedFields: ["elevenTelephonyWebhookSecret"],
      },
    });

    const result = await (saveOrganizationTelephonySettingsAdmin as any)._handler(
      { db: db.api },
      {
        sessionId: "sessions_1",
        organizationId: "organizations_target",
        providerKey: "elevenlabs",
        enabled: true,
        baseUrl: "https://telephony.example.com",
        fromNumber: "+4930123456",
      },
    );

    expect(result.success).toBe(true);
    const directSettings = db.tables.objects.find(
      (row) =>
        row.type === "direct_settings" &&
        row.organizationId === "organizations_target",
    );
    expect(
      (directSettings?.customProperties as Record<string, unknown>)
        ?.elevenTelephonyWebhookSecret,
    ).toBe("secret_saved");
    expect(
      (directSettings?.customProperties as Record<string, unknown>)
        ?.elevenTelephonyFromNumber,
    ).toBe("+4930123456");
  });
});

describe("agent telephony config persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedUserMock.mockResolvedValue({
      userId: "users_1",
      organizationId: "organizations_1",
    });
    getUserContextMock.mockResolvedValue({
      isGlobal: false,
      roleName: "member",
    });
  });

  it("persists first-class transfer destinations and materializes ElevenLabs transfer rules", async () => {
    const db = createDb();
    await db.api.insert("objects", {
      _id: "objects_agent_1",
      organizationId: "organizations_1",
      type: "org_agent",
      status: "active",
      customProperties: {},
    });

    const result = await (saveAgentTelephonyConfig as any)._handler(
      { db: db.api },
      {
        sessionId: "sessions_1",
        organizationId: "organizations_1",
        agentId: "objects_agent_1",
        telephonyConfig: {
          selectedProvider: "elevenlabs",
          elevenlabs: {
            systemPrompt: "Prompt",
            firstMessage: "Hallo",
            knowledgeBaseName: "Anne KB",
            knowledgeBase: "KB body",
            transferDestinations: [
              {
                label: "Marcus",
                phoneNumber: "+4930123456",
                condition: "When the caller explicitly asks for Marcus.",
                enabled: true,
                transferType: "conference",
              },
            ],
            managedTools: {
              transfer_to_number: {
                type: "system",
                name: "transfer_to_number",
                params: {
                  system_tool_type: "transfer_to_number",
                  transfers: [],
                  enable_client_message: true,
                },
              },
            },
            syncState: {
              status: "idle",
            },
          },
        },
      },
    );

    expect(result.success).toBe(true);
    expect(result.telephonyConfig.elevenlabs.transferDestinations).toEqual([
      {
        label: "Marcus",
        phoneNumber: "+4930123456",
        condition: "When the caller explicitly asks for Marcus.",
        enabled: true,
        transferType: "conference",
      },
    ]);
    expect(
      result.telephonyConfig.elevenlabs.managedTools.transfer_to_number,
    ).toMatchObject({
      params: {
        system_tool_type: "transfer_to_number",
        transfers: [
          {
            transfer_destination: {
              type: "phone",
              phone_number: "+4930123456",
            },
            condition: "When the caller explicitly asks for Marcus.",
            transfer_type: "conference",
          },
        ],
      },
    });
  });
});

describe("Kanzlei MVP live setup audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PLATFORM_ORG_ID = "organizations_platform";
    process.env.TEST_ORG_ID = "organizations_platform";
    requireAuthenticatedUserMock.mockResolvedValue({
      userId: "users_1",
      organizationId: "organizations_1",
    });
    evaluateTemplateCertificationForTemplateVersionMock.mockResolvedValue({
      allowed: true,
      autoCertificationEligible: false,
      reasonCode: null,
      message: null,
      riskAssessment: {
        tier: "low",
        requiredVerification: [],
      },
      dependencyManifest: {
        dependencyDigest: "digest_1",
      },
      certification: {
        recordedAt: 1,
        evidenceSources: [],
      },
    });
    evaluateTemplateOrgPreflightMock.mockResolvedValue({
      status: "pass",
      blockers: [],
      blockerCodes: [],
      checks: [],
      telephony: {
        required: true,
        providerKey: "elevenlabs",
        bindingEnabled: true,
        credentialReady: true,
        fromNumberReady: true,
        webhookSecretReady: true,
        missingTransferRoles: [],
      },
    });
  });

  it("reports the live Kanzlei deploy/bind/sync path as ready when all required org state exists", async () => {
    const db = createDb();
    await db.api.insert("objects", {
      _id: "objects_platform_kanzlei_template",
      organizationId: "organizations_platform",
      type: "org_agent",
      status: "template",
      name: "Kanzlei MVP Customer Telephony",
      updatedAt: 100,
      customProperties: {
        protected: true,
        templateRole: KANZLEI_MVP_TEMPLATE_ROLE,
        templatePublishedVersionId: "objects_platform_kanzlei_template_version",
        templatePublishedVersion: "kanzlei_mvp_v1",
      },
    });
    await db.api.insert("objects", {
      _id: "objects_kanzlei_clone",
      organizationId: "organizations_1",
      type: "org_agent",
      status: "active",
      name: "Kanzlei Assistenz",
      updatedAt: 200,
      customProperties: {
        templateRole: KANZLEI_MVP_TEMPLATE_ROLE,
        channelBindings: [{ channel: "phone_call", enabled: true }],
        telephonyConfig: {
          selectedProvider: "elevenlabs",
          elevenlabs: {
            remoteAgentId: "agent_remote_1",
            systemPrompt: "Prompt",
            firstMessage: "Hallo",
            knowledgeBaseName: "KB",
            knowledgeBase: "Body",
            managedTools: {},
            syncState: {
              status: "success",
              lastSyncedAt: 123,
              lastSyncedProviderAgentId: "agent_remote_1",
            },
          },
        },
      },
    });
    await db.api.insert("objects", {
      _id: "objects_booking_concierge",
      organizationId: "organizations_1",
      type: "organization_settings",
      subtype: "booking_concierge",
      status: "active",
      customProperties: {
        contractVersion: "kanzlei_booking_concierge_config_v1",
        primaryResourceId: "objects_erstberatung_resource",
        primaryResourceLabel: "Arbeitsrecht Erstberatung",
        operatorCalendarConnectionId: "oauth_kanzlei_calendar",
        timezone: "Europe/Berlin",
        defaultMeetingTitle: "Arbeitsrecht Erstberatung",
        intakeLabel: "Erstberatung",
        requireConfiguredResource: true,
      },
    });
    await db.api.insert("objects", {
      _id: "objects_org_contact",
      organizationId: "organizations_1",
      type: "organization_contact",
      status: "active",
      customProperties: {
        supportEmail: "kanzlei@example.com",
      },
    });
    await db.api.insert("oauthConnections", {
      _id: "oauth_kanzlei_calendar",
      organizationId: "organizations_1",
      provider: "google",
      status: "active",
      providerEmail: "calendar@kanzlei.example.com",
      syncSettings: {
        calendar: true,
      },
      scopes: ["https://www.googleapis.com/auth/calendar.events"],
      lastSyncAt: 456,
    });

    const runQuery = vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
      if ("agentId" in payload && "sessionId" in payload && "organizationId" in payload) {
        expect(payload).toMatchObject({
          sessionId: "sessions_1",
          organizationId: "organizations_1",
          agentId: "objects_kanzlei_clone",
        });
        return {
          organizationBinding: {
            providerKey: "elevenlabs",
            providerIdentity: "eleven_telephony",
            enabled: true,
            fromNumber: "+49301234567",
            routeKey: "eleven:phone:org_1:phone_call_default",
            hasWebhookSecret: true,
            providerConnectionId: "org_1_elevenlabs",
            providerInstallationId: "phone_call_default",
          },
          providerReadiness: {
            elevenlabs: {
              hasEffectiveApiKey: true,
            },
          },
          templateDeployment: {
            deploymentReadiness: {
              status: "ready",
              blockers: [],
            },
          },
        };
      }
      if ("resourceId" in payload && "organizationId" in payload) {
        expect(payload).toEqual({
          resourceId: "objects_erstberatung_resource",
          organizationId: "organizations_1",
        });
        return [
          {
            connectionId: "oauth_kanzlei_calendar",
            provider: "google",
            pushCalendarId: "primary",
          },
        ];
      }
      throw new Error(`Unexpected runQuery payload: ${JSON.stringify(payload)}`);
    });

    const result = await (getKanzleiMvpLiveSetupAudit as any)._handler(
      { db: db.api, runQuery },
      {
        sessionId: "sessions_1",
        organizationId: "organizations_1",
      },
    );

    expect(result.templateSeed).toMatchObject({
      status: "ready",
      templateAgentId: "objects_platform_kanzlei_template",
      templateVersionId: "objects_platform_kanzlei_template_version",
      templateVersionTag: "kanzlei_mvp_v1",
      certificationStatus: "certified",
    });
    expect(result.cloneDeploy).toMatchObject({
      status: "ready",
      selectedAgentId: "objects_kanzlei_clone",
    });
    expect(result.remoteAgentSync).toMatchObject({
      status: "ready",
      remoteAgentId: "agent_remote_1",
      syncStatus: "success",
    });
    expect(result.phoneBinding).toMatchObject({
      status: "ready",
      fromNumber: "+49301234567",
      routeKey: "eleven:phone:org_1:phone_call_default",
    });
    expect(result.bookingConcierge).toMatchObject({
      status: "ready",
      missingFields: [],
    });
    expect(result.lawyerCalendar).toMatchObject({
      status: "ready",
      operatorConnectionId: "oauth_kanzlei_calendar",
    });
    expect(result.lawyerCalendar.operatorConnection).toMatchObject({
      calendarWriteReady: true,
      provider: "google",
    });
    expect(result.firmNotificationRecipients).toMatchObject({
      status: "ready",
      explicitRecipients: ["kanzlei@example.com"],
      effectiveRecipients: ["kanzlei@example.com"],
    });
    expect(result.ingressPreflight).toMatchObject({
      status: "ready",
      blockers: [],
      requiresAcceptedInboundCallEvidence: true,
    });
  });

  it("narrows the live blocker to the missing deploy/sync/setup evidence", async () => {
    const db = createDb();
    const runQuery = vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
      if ("organizationId" in payload) {
        return null;
      }
      throw new Error(`Unexpected runQuery payload: ${JSON.stringify(payload)}`);
    });

    const result = await (getKanzleiMvpLiveSetupAudit as any)._handler(
      { db: db.api, runQuery },
      {
        sessionId: "sessions_1",
        organizationId: "organizations_1",
      },
    );

    expect(result.templateSeed.status).toBe("blocked");
    expect(result.cloneDeploy.status).toBe("blocked");
    expect(result.remoteAgentSync.status).toBe("blocked");
    expect(result.bookingConcierge.status).toBe("blocked");
    expect(result.firmNotificationRecipients.status).toBe("blocked");
    expect(result.ingressPreflight.status).toBe("blocked");
    expect(result.ingressPreflight.blockers).toEqual(
      expect.arrayContaining([
        "Platform Kanzlei MVP template is not seeded on the platform org.",
        "Target organization has no deployed Kanzlei MVP clone.",
        "No deployed Kanzlei MVP clone is available to sync.",
        "Organization booking concierge config is missing primaryResourceId.",
        "No firm notification recipient is configured on organization contact settings.",
      ]),
    );
  });
});

describe("telephony provider sync action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createAgentSpy.mockResolvedValue({
      agent_id: "agent_created_1",
    });
    getAgentSpy.mockResolvedValue({
      agent_id: "agent_remote_1",
      name: "Anne Remote",
      conversation_config: {
        agent: {
          first_message: "Old first message",
          prompt: {
            prompt: "Old prompt",
            built_in_tools: {},
            knowledge_base: [{ id: "kb_old", name: "Old KB" }],
          },
        },
      },
    });
    getKnowledgeBaseDocumentContentSpy.mockResolvedValue("Old KB body");
    createTextKnowledgeBaseDocumentSpy.mockResolvedValue({
      id: "kb_new",
      name: "Anne Becker Knowledge Base",
    });
    updateAgentSpy.mockResolvedValue({});
    deleteKnowledgeBaseDocumentSpy.mockResolvedValue(undefined);
  });

  it("builds the create-agent payload used for auto-provisioning when no remote id exists", () => {
    const telephonyConfig = normalizeAgentTelephonyConfig({
      selectedProvider: "elevenlabs",
      elevenlabs: {
        systemPrompt: "New prompt",
        firstMessage: "New first message",
        knowledgeBaseName: "Anne Becker Knowledge Base",
        knowledgeBase: "New KB body",
        transferDestinations: [
          {
            label: "Marcus",
            phoneNumber: "+4930123456",
            condition: "When the caller explicitly asks for Marcus.",
            enabled: true,
            transferType: "conference",
          },
        ],
        managedTools: {
          transfer_to_number: {
            type: "system",
            name: "transfer_to_number",
            params: {
              system_tool_type: "transfer_to_number",
              transfers: [],
              enable_client_message: true,
            },
          },
        },
        syncState: {
          status: "idle",
        },
      },
    });

    const payload = buildElevenLabsAgentCreatePayload({
      name: "Anne Becker",
      desired: {
        prompt: telephonyConfig.elevenlabs.systemPrompt,
        firstMessage: telephonyConfig.elevenlabs.firstMessage,
        knowledgeBase: {
          name: telephonyConfig.elevenlabs.knowledgeBaseName,
          content: telephonyConfig.elevenlabs.knowledgeBase,
        },
        managedBuiltInTools: telephonyConfig.elevenlabs.managedTools,
      },
      knowledgeBase: [
        {
          id: "kb_new",
          name: "Anne Becker Knowledge Base",
          type: "text",
          usage_mode: "auto",
        },
      ],
    });

    expect(payload).toEqual({
      name: "Anne Becker",
      conversation_config: {
        agent: {
          first_message: "New first message",
          prompt: {
            prompt: "New prompt",
            built_in_tools: {
              transfer_to_number: {
                type: "system",
                name: "transfer_to_number",
                params: {
                  system_tool_type: "transfer_to_number",
                  transfers: [
                    {
                      transfer_destination: {
                        type: "phone",
                        phone_number: "+4930123456",
                      },
                      condition: "When the caller explicitly asks for Marcus.",
                      transfer_type: "conference",
                    },
                  ],
                  enable_client_message: true,
                },
              },
            },
            knowledge_base: [
              {
                id: "kb_new",
                name: "Anne Becker Knowledge Base",
                type: "text",
                usage_mode: "auto",
              },
            ],
          },
        },
      },
    });
  });

  it("provisions a remote ElevenLabs agent when no remote id exists yet", async () => {
    const telephonyConfig = normalizeAgentTelephonyConfig({
      selectedProvider: "elevenlabs",
      elevenlabs: {
        systemPrompt: "New prompt",
        firstMessage: "New first message",
        knowledgeBaseName: "Anne Becker Knowledge Base",
        knowledgeBase: "New KB body",
        transferDestinations: [
          {
            label: "Marcus",
            phoneNumber: "+4930123456",
            condition: "When the caller explicitly asks for Marcus.",
            enabled: true,
            transferType: "conference",
          },
        ],
        managedTools: {
          transfer_to_number: {
            type: "system",
            name: "transfer_to_number",
            params: {
              system_tool_type: "transfer_to_number",
              transfers: [],
              enable_client_message: true,
            },
          },
        },
        syncState: {
          status: "idle",
        },
      },
    });

    const runQuery = vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
      if ("sessionId" in payload) {
        return {
          userId: "users_1",
          organizationId: "organizations_1",
        };
      }
      if ("agentId" in payload) {
        return {
          _id: "objects_agent_1",
          organizationId: "organizations_1",
          type: "org_agent",
          status: "active",
          name: "Anne Becker",
          customProperties: {
            telephonyConfig,
          },
        };
      }
      if ("organizationId" in payload) {
        return {
          apiKey: "eleven_api_key",
          enabled: true,
          baseUrl: "https://api.elevenlabs.io/v1",
        };
      }
      throw new Error("Unexpected runQuery payload");
    });

    const runMutation = vi.fn(async () => undefined);

    const result = await (syncAgentTelephonyProvider as any)._handler(
      { runQuery, runMutation },
      {
        sessionId: "sessions_1",
        organizationId: "organizations_1",
        agentId: "objects_agent_1",
      },
    );

    expect(result).toMatchObject({
      success: true,
      status: "provisioned",
      remoteAgentId: "agent_created_1",
    });
    expect(createTextKnowledgeBaseDocumentSpy).toHaveBeenCalledWith(
      "Anne Becker Knowledge Base",
      "New KB body",
    );
    expect(createAgentSpy).toHaveBeenCalledTimes(1);
    expect(createAgentSpy).toHaveBeenCalledWith(
      buildElevenLabsAgentCreatePayload({
        name: "Anne Becker",
        desired: {
          prompt: "New prompt",
          firstMessage: "New first message",
          knowledgeBase: {
            name: "Anne Becker Knowledge Base",
            content: "New KB body",
          },
          managedBuiltInTools: telephonyConfig.elevenlabs.managedTools,
          workflow: undefined,
        },
        knowledgeBase: [
          {
            id: "kb_new",
            name: "Anne Becker Knowledge Base",
            type: "text",
            usage_mode: "auto",
          },
        ],
      }),
    );
    expect(getAgentSpy).not.toHaveBeenCalled();
    expect(updateAgentSpy).not.toHaveBeenCalled();
    expect(runMutation).toHaveBeenCalledTimes(1);
    const [, syncPayload] = runMutation.mock.calls[0] ?? [];
    expect(syncPayload).toMatchObject({
      agentId: "objects_agent_1",
      organizationId: "organizations_1",
      remoteAgentId: "agent_created_1",
      syncState: expect.objectContaining({
        status: "success",
        lastSyncedProviderAgentId: "agent_created_1",
        drift: [],
      }),
    });
  });

  it("syncs saved agent content to ElevenLabs and records sync state", async () => {
    const runQuery = vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
      if ("sessionId" in payload) {
        return {
          userId: "users_1",
          organizationId: "organizations_1",
        };
      }
      if ("agentId" in payload) {
        return {
          _id: "objects_agent_1",
          organizationId: "organizations_1",
          type: "org_agent",
          status: "active",
          customProperties: {
            telephonyConfig: {
              selectedProvider: "elevenlabs",
              elevenlabs: {
                remoteAgentId: "agent_remote_1",
                systemPrompt: "New prompt",
                firstMessage: "New first message",
                knowledgeBaseName: "Anne Becker Knowledge Base",
                knowledgeBase: "New KB body",
                managedTools: {
                  end_call: {
                    type: "system",
                    name: "end_call",
                    params: {
                      system_tool_type: "end_call",
                      transfers: [],
                    },
                  },
                },
                syncState: {
                  status: "idle",
                },
              },
            },
          },
        };
      }
      if ("organizationId" in payload) {
        return {
          apiKey: "eleven_api_key",
          enabled: true,
        };
      }
      throw new Error(`Unexpected runQuery payload: ${JSON.stringify(payload)}`);
    });

    const runMutation = vi.fn(async () => undefined);

    const result = await (syncAgentTelephonyProvider as any)._handler(
      { runQuery, runMutation },
      {
        sessionId: "sessions_1",
        organizationId: "organizations_1",
        agentId: "objects_agent_1",
      },
    );

    expect(result).toMatchObject({
      success: true,
      status: "synced",
      remoteAgentId: "agent_remote_1",
    });
    expect(updateAgentSpy).toHaveBeenCalledTimes(1);
    expect(createTextKnowledgeBaseDocumentSpy).toHaveBeenCalledWith(
      "Anne Becker Knowledge Base",
      "New KB body",
    );
    expect(runMutation).toHaveBeenCalledTimes(1);
    const [, syncPayload] = runMutation.mock.calls[0] ?? [];
    expect(syncPayload).toMatchObject({
      agentId: "objects_agent_1",
      organizationId: "organizations_1",
      remoteAgentId: "agent_remote_1",
      syncState: expect.objectContaining({
        status: "success",
        lastSyncedProviderAgentId: "agent_remote_1",
      }),
    });
  });

  it("validates the twilio_voice binding instead of attempting remote provider provisioning", async () => {
    const runQuery = vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
      if ("sessionId" in payload && !("organizationId" in payload) && !("agentId" in payload)) {
        return {
          userId: "users_1",
          organizationId: "organizations_1",
        };
      }
      if ("agentId" in payload && !("sessionId" in payload)) {
        return {
          _id: "objects_agent_1",
          organizationId: "organizations_1",
          type: "org_agent",
          status: "active",
          customProperties: {
            telephonyConfig: {
              selectedProvider: "twilio_voice",
              elevenlabs: {
                firstMessage: "Hello, this is Anne Becker.",
                systemPrompt: "Prompt",
                knowledgeBaseName: "Anne KB",
                knowledgeBase: "KB",
                managedTools: {},
                syncState: {
                  status: "idle",
                },
              },
            },
          },
        };
      }
      if ("sessionId" in payload && "organizationId" in payload && "agentId" in payload) {
        return {
          organizationBinding: {
            providerKey: "twilio_voice",
            enabled: true,
            fromNumber: "+15551230000",
          },
        };
      }
      throw new Error(`Unexpected runQuery payload: ${JSON.stringify(payload)}`);
    });

    const actionPayloads: Array<Record<string, unknown>> = [];
    const runAction = vi.fn(async (ref: unknown, payload: Record<string, unknown>) => {
      void ref;
      actionPayloads.push(payload);
      if (actionPayloads.length <= 2) {
        return {
          success: true,
          valid: true,
        };
      }
      throw new Error(
        `Unexpected runAction payload: ${JSON.stringify(payload)}`,
      );
    });

    const result = await (syncAgentTelephonyProvider as any)._handler(
      { runQuery, runAction },
      {
        sessionId: "sessions_1",
        organizationId: "organizations_1",
        agentId: "objects_agent_1",
      },
    );

    expect(result).toMatchObject({
      success: true,
      status: "validated",
      message: "Twilio Voice binding and webhook bridge validated.",
    });
    expect(actionPayloads).toEqual([
      {
        sessionId: "sessions_1",
        organizationId: "organizations_1",
        phoneNumber: "+15551230000",
      },
      {
        sessionId: "sessions_1",
        organizationId: "organizations_1",
        phoneNumber: "+15551230000",
      },
    ]);
    expect(createAgentSpy).not.toHaveBeenCalled();
    expect(updateAgentSpy).not.toHaveBeenCalled();
  });
});
