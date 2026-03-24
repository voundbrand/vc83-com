import { describe, expect, it } from "vitest";
import {
  normalizeTelephonyWebhookPayload,
  resolveElevenInboundTelephonyRuntimeDecision,
} from "../../../convex/http";
import {
  ensureTelephonyCallRecord,
  recordTelephonyWebhookOutcome,
} from "../../../convex/channels/router";

describe("telephony webhook compatibility bridge", () => {
  it("normalizes Eleven post-call envelopes into the legacy direct outcome shape", () => {
    const normalized = normalizeTelephonyWebhookPayload({
      type: "post_call_transcription",
      event_id: "evt_123",
      event_timestamp: "2026-03-13T10:15:30.000Z",
      data: {
        conversation_id: "conv_123",
        metadata: {
          call_duration_secs: 84,
        },
        analysis: {
          call_successful: true,
        },
        transcript: [
          {
            role: "agent",
            message: "Hello, this is sevenlayers.",
          },
          {
            role: "user",
            message: "I'd like to book an appointment.",
          },
        ],
        conversation_initiation_client_data: {
          dynamic_variables: {
            organizationId: "org_1",
            providerConnectionId: "conn_1",
            providerInstallationId: "inst_1",
            providerProfileType: "organization",
            routeKey: "eleven:phone:conn_1:inst_1",
          },
        },
      },
    });

    expect(normalized).toMatchObject({
      eventId: "evt_123",
      eventType: "post_call_transcription",
      telephonyProviderIdentity: "eleven_telephony",
      providerCallId: "conv_123",
      providerConversationId: "conv_123",
      organizationId: "org_1",
      providerConnectionId: "conn_1",
      providerInstallationId: "inst_1",
      providerProfileType: "organization",
      routeKey: "eleven:phone:conn_1:inst_1",
      bindingRouteKey: "eleven:phone:conn_1:inst_1",
      outcome: "completed",
      status: "completed",
      durationSeconds: 84,
      transcriptText:
        "agent: Hello, this is sevenlayers.\nuser: I'd like to book an appointment.",
    });
    expect(normalized.endedAt).toBe(Date.parse("2026-03-13T10:15:30.000Z"));
    expect(normalized.transcriptSegments).toEqual([
      {
        role: "agent",
        message: "Hello, this is sevenlayers.",
      },
      {
        role: "user",
        message: "I'd like to book an appointment.",
      },
    ]);
  });

  it("maps Eleven initiation failures into deterministic failure fields", () => {
    const normalized = normalizeTelephonyWebhookPayload({
      type: "call_initiation_failure",
      event_id: "evt_fail_1",
      data: {
        conversation_id: "conv_fail_1",
        reason: "busy",
      },
    });

    expect(normalized).toMatchObject({
      eventId: "evt_fail_1",
      eventType: "call_initiation_failure",
      telephonyProviderIdentity: "eleven_telephony",
      providerCallId: "conv_fail_1",
      providerConversationId: "conv_fail_1",
      outcome: "failed",
      status: "failed",
      disposition: "busy",
      errorMessage: "busy",
      error: "busy",
    });
  });

  it("derives trusted inbound runtime dispatch metadata from an Eleven transcript webhook", () => {
    const normalized = normalizeTelephonyWebhookPayload({
      type: "post_call_transcription",
      event_id: "evt_inbound_1",
      event_timestamp: "2026-03-23T14:30:00.000Z",
      data: {
        conversation_id: "conv_inbound_1",
        metadata: {
          body: {
            From: "+491701112233",
            To: "+4930123456",
            Direction: "inbound",
          },
        },
        transcript: [
          {
            role: "agent",
            message: "Ich kann Dienstag um 13 Uhr oder Mittwoch um 10 Uhr anbieten.",
          },
          {
            role: "user",
            message: "Dienstag um 13 Uhr passt fuer mich.",
          },
        ],
        conversation_initiation_client_data: {
          dynamic_variables: {
            organizationId: "org_1",
            providerConnectionId: "conn_1",
            providerInstallationId: "inst_1",
            providerProfileType: "organization",
            routeKey: "eleven:phone:conn_1:inst_1",
          },
        },
      },
    });

    expect(normalized).toMatchObject({
      callerIdentifier: "+491701112233",
      recipientIdentifier: "+4930123456",
      direction: "inbound",
      providerTimestamp: Date.parse("2026-03-23T14:30:00.000Z"),
    });

    const decision = resolveElevenInboundTelephonyRuntimeDecision({
      payload: normalized,
      organizationId: "org_1",
      providerConnectionId: "conn_1",
      providerInstallationId: "inst_1",
      providerProfileType: "organization",
      routeKey: "eleven:phone:conn_1:inst_1",
      lineIdentifier: "+4930123456",
    });

    expect(decision).toMatchObject({
      shouldEnsureCallRecord: true,
      shouldDispatch: true,
      direction: "inbound",
      callerIdentifier: "+491701112233",
      recipientIdentifier: "+4930123456",
      externalContactIdentifier: "+491701112233",
    });
    if (!decision.shouldDispatch) {
      throw new Error("expected inbound decision to dispatch");
    }
    expect(decision.message).toContain("Inbound phone call transcript for post-call processing");
    expect(decision.message).toContain("Dienstag um 13 Uhr passt fuer mich.");
    expect(decision.metadata).toMatchObject({
      providerId: "direct",
      skipOutbound: true,
      direction: "inbound",
      source: "eleven_telephony_webhook",
      telephonyProviderIdentity: "eleven_telephony",
      providerCallId: "conv_inbound_1",
      providerMessageId: "conv_inbound_1",
      providerConversationId: "conv_inbound_1",
      providerEventId: "evt_inbound_1",
      callerIdentifier: "+491701112233",
      recipientIdentifier: "+4930123456",
      routeKey: "eleven:phone:conn_1:inst_1",
      bindingRouteKey: "eleven:phone:conn_1:inst_1",
      providerRouteKey: "eleven:phone:conn_1:inst_1",
      callerTranscriptText: "Dienstag um 13 Uhr passt fuer mich.",
      idempotencyKey: "telephony_inbound:org_1:conv_inbound_1",
      voiceRuntime: {
        transcript:
          "agent: Ich kann Dienstag um 13 Uhr oder Mittwoch um 10 Uhr anbieten.\nuser: Dienstag um 13 Uhr passt fuer mich.",
      },
    });
  });

  it("fails closed for outbound Eleven transcript automation", () => {
    const decision = resolveElevenInboundTelephonyRuntimeDecision({
      payload: {
        providerCallId: "call_outbound_1",
        providerConversationId: "conv_outbound_1",
        callerIdentifier: "+4930123456",
        recipientIdentifier: "+491701112233",
        direction: "outbound",
        transcriptText:
          "agent: Wir rufen wegen Ihrer Anfrage an.\nuser: Danke fuer den Rueckruf.",
      },
      organizationId: "org_1",
      routeKey: "eleven:phone:conn_1:inst_1",
      lineIdentifier: "+4930123456",
    });

    expect(decision).toMatchObject({
      shouldEnsureCallRecord: false,
      shouldDispatch: false,
      reasonCode: "non_inbound_call",
      direction: "outbound",
    });
  });

  it("reconciles webhook updates by providerConversationId when providerCallId changed", async () => {
    const callRecord = {
      _id: "call_record_1",
      organizationId: "org_1",
      type: "telephony_call_record",
      status: "active",
      customProperties: {
        providerCallId: "legacy_call_id",
        providerConversationId: "conv_bridge_1",
        transcriptText: "",
      },
    };
    const patchedRecords: Array<{ id: string; value: Record<string, unknown> }> = [];

    const result = await (recordTelephonyWebhookOutcome as any)._handler(
      {
        db: {
          query: (table: string) => {
            expect(table).toBe("objects");
            return {
              withIndex: (indexName: string, applyIndex: (query: { eq: (field: string, value: unknown) => { eq: (field: string, value: unknown) => unknown } }) => unknown) => {
                expect(indexName).toBe("by_org_type");
                const queryBuilder = {
                  eq: (_field: string, _value: unknown) => queryBuilder,
                };
                applyIndex(queryBuilder);
                return {
                  collect: async () => [callRecord],
                };
              },
            };
          },
          get: async () => null,
          insert: async () => "artifact_1",
          patch: async (id: string, value: Record<string, unknown>) => {
            patchedRecords.push({ id, value });
          },
        },
      },
      {
        organizationId: "org_1",
        providerCallId: "eleven_conversation_id",
        providerConversationId: "conv_bridge_1",
        outcome: "completed",
        transcriptText: "Captured by envelope transcript",
      }
    );

    expect(result).toMatchObject({
      success: true,
      callRecordId: "call_record_1",
    });
    expect(patchedRecords).toHaveLength(1);
    expect(patchedRecords[0]).toMatchObject({
      id: "call_record_1",
      value: {
        customProperties: expect.objectContaining({
          providerConversationId: "conv_bridge_1",
          outcome: "completed",
          transcriptText: "Captured by envelope transcript",
        }),
      },
    });
  });

  it("reuses an existing call record by providerConversationId before outcome mutation", async () => {
    const callRecord = {
      _id: "call_record_existing",
      organizationId: "org_1",
      type: "telephony_call_record",
      status: "active",
      customProperties: {
        providerCallId: "legacy_call_id",
        providerConversationId: "conv_bridge_ensure_1",
        routeKey: "eleven:phone:conn_1:inst_1",
      },
    };
    const patchedRecords: Array<{ id: string; value: Record<string, unknown> }> = [];
    const insertedRecords: Array<Record<string, unknown>> = [];

    const result = await (ensureTelephonyCallRecord as any)._handler(
      {
        db: {
          query: (table: string) => {
            expect(table).toBe("objects");
            return {
              withIndex: (
                indexName: string,
                applyIndex: (query: {
                  eq: (field: string, value: unknown) => unknown;
                }) => unknown
              ) => {
                expect(indexName).toBe("by_org_type");
                const queryBuilder = {
                  eq: (_field: string, _value: unknown) => queryBuilder,
                };
                applyIndex(queryBuilder);
                return {
                  collect: async () => [callRecord],
                };
              },
            };
          },
          patch: async (id: string, value: Record<string, unknown>) => {
            patchedRecords.push({ id, value });
          },
          insert: async (_table: string, value: Record<string, unknown>) => {
            insertedRecords.push(value);
            return "call_record_inserted";
          },
        },
      },
      {
        organizationId: "org_1",
        providerId: "direct",
        providerCallId: "eleven_conversation_id",
        providerConversationId: "conv_bridge_ensure_1",
        recipientIdentifier: "+4930123456",
        callerIdentifier: "+491701112233",
        routeKey: "eleven:phone:conn_1:inst_1",
        telephonyProviderIdentity: "eleven_telephony",
        direction: "inbound",
        source: "eleven_telephony_webhook_inbound",
      }
    );

    expect(result).toMatchObject({
      success: true,
      callRecordId: "call_record_existing",
      created: false,
    });
    expect(insertedRecords).toHaveLength(0);
    expect(patchedRecords).toHaveLength(1);
    expect(patchedRecords[0]).toMatchObject({
      id: "call_record_existing",
      value: {
        customProperties: expect.objectContaining({
          providerConversationId: "conv_bridge_ensure_1",
          recipientIdentifier: "+4930123456",
          callerIdentifier: "+491701112233",
          telephonyProviderIdentity: "eleven_telephony",
          direction: "inbound",
          source: "eleven_telephony_webhook_inbound",
        }),
      },
    });
  });
});
