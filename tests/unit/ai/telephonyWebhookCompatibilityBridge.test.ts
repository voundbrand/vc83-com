import { describe, expect, it } from "vitest";
import { normalizeTelephonyWebhookPayload } from "../../../convex/http";
import { recordTelephonyWebhookOutcome } from "../../../convex/channels/router";

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
});
