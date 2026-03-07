import { describe, expect, it } from "vitest";

import { evaluateMobileRealtimeRelayHealth } from "../../../apps/operator-mobile/src/lib/voice/realtimeHealth";

describe("mobile realtime relay health", () => {
  it("marks relay unhealthy when socket is disconnected", () => {
    const health = evaluateMobileRealtimeRelayHealth({
      nowMs: 10_000,
      isSocketConnected: false,
      consecutiveIngestFailures: 0,
    });

    expect(health.healthy).toBe(false);
    expect(health.reasonCode).toBe("socket_disconnected");
  });

  it("allows websocket relay during ack grace window after ingest attempt", () => {
    const health = evaluateMobileRealtimeRelayHealth({
      nowMs: 10_500,
      isSocketConnected: true,
      lastIngestAttemptAtMs: 10_000,
      lastIngestAckAtMs: undefined,
      consecutiveIngestFailures: 0,
      ingestAckGraceMs: 1_000,
      ackStaleMs: 500,
    });

    expect(health.healthy).toBe(true);
    expect(health.reasonCode).toBe("relay_ack_pending");
  });

  it("marks relay unhealthy when ack goes stale after grace window", () => {
    const health = evaluateMobileRealtimeRelayHealth({
      nowMs: 20_000,
      isSocketConnected: true,
      lastIngestAttemptAtMs: 10_000,
      lastIngestAckAtMs: 12_000,
      consecutiveIngestFailures: 0,
      ingestAckGraceMs: 2_000,
      ackStaleMs: 5_000,
    });

    expect(health.healthy).toBe(false);
    expect(health.reasonCode).toBe("relay_ack_stale");
  });

  it("fails closed when consecutive ingest failures breach threshold", () => {
    const health = evaluateMobileRealtimeRelayHealth({
      nowMs: 30_000,
      isSocketConnected: true,
      lastIngestAttemptAtMs: 29_000,
      lastIngestAckAtMs: 28_900,
      consecutiveIngestFailures: 3,
      maxConsecutiveFailures: 2,
    });

    expect(health.healthy).toBe(false);
    expect(health.reasonCode).toBe("relay_ingest_failures");
  });

  it("fails closed when realtime ingest has no server qos contract after grace window", () => {
    const health = evaluateMobileRealtimeRelayHealth({
      nowMs: 40_000,
      isSocketConnected: true,
      lastIngestAttemptAtMs: 35_000,
      lastIngestAckAtMs: 39_000,
      consecutiveIngestFailures: 0,
      ingestAckGraceMs: 1_000,
      ackStaleMs: 6_000,
      serverQosGraceMs: 2_000,
    });

    expect(health.healthy).toBe(false);
    expect(health.reasonCode).toBe("relay_server_qos_missing");
  });

  it("fails closed when server heartbeat snapshot is stale", () => {
    const health = evaluateMobileRealtimeRelayHealth({
      nowMs: 50_500,
      isSocketConnected: true,
      lastIngestAttemptAtMs: 47_000,
      lastIngestAckAtMs: 49_500,
      consecutiveIngestFailures: 0,
      ingestAckGraceMs: 1_000,
      serverHeartbeatStaleMs: 1_200,
      serverRelayQos: {
        contractVersion: "voice_relay_qos_v1",
        observedAtMs: 47_000,
        healthy: true,
        reasonCode: "relay_healthy",
        heartbeat: {
          contractVersion: "voice_relay_heartbeat_v1",
          status: "acknowledged",
          expectedSequence: 9,
          ackSequence: 9,
          acknowledgedAtMs: 47_000,
        },
      },
    });

    expect(health.healthy).toBe(false);
    expect(health.reasonCode).toBe("relay_server_heartbeat_stale");
  });

  it("projects deterministic unhealthy reason when server reports relay qos failure", () => {
    const health = evaluateMobileRealtimeRelayHealth({
      nowMs: 60_000,
      isSocketConnected: true,
      lastIngestAttemptAtMs: 59_000,
      lastIngestAckAtMs: 59_400,
      consecutiveIngestFailures: 0,
      ingestAckGraceMs: 400,
      serverRelayQos: {
        contractVersion: "voice_relay_qos_v1",
        observedAtMs: 59_500,
        healthy: false,
        reasonCode: "relay_gap_detected",
        heartbeat: {
          contractVersion: "voice_relay_heartbeat_v1",
          status: "acknowledged",
          expectedSequence: 12,
          ackSequence: 11,
          acknowledgedAtMs: 59_500,
        },
      },
    });

    expect(health.healthy).toBe(false);
    expect(health.reasonCode).toBe("relay_server_qos_unhealthy");
    expect(health.serverRelayReasonCode).toBe("relay_gap_detected");
  });

  it("fails closed when server relay qos contract version mismatches expected version", () => {
    const health = evaluateMobileRealtimeRelayHealth({
      nowMs: 70_000,
      isSocketConnected: true,
      lastIngestAttemptAtMs: 69_000,
      lastIngestAckAtMs: 69_500,
      consecutiveIngestFailures: 0,
      ingestAckGraceMs: 400,
      serverRelayQos: {
        contractVersion: "voice_relay_qos_v2",
        observedAtMs: 69_700,
        healthy: true,
        reasonCode: "relay_healthy",
        heartbeat: {
          contractVersion: "voice_relay_heartbeat_v1",
          status: "acknowledged",
          expectedSequence: 20,
          ackSequence: 20,
          acknowledgedAtMs: 69_700,
        },
      },
    });

    expect(health.healthy).toBe(false);
    expect(health.reasonCode).toBe("relay_server_qos_contract_mismatch");
    expect(health.serverRelayContractVersionStatus).toBe("mismatch");
    expect(health.serverRelayHeartbeatContractVersionStatus).toBe("ok");
  });

  it("fails closed when server heartbeat contract version mismatches expected version", () => {
    const health = evaluateMobileRealtimeRelayHealth({
      nowMs: 80_000,
      isSocketConnected: true,
      lastIngestAttemptAtMs: 79_000,
      lastIngestAckAtMs: 79_500,
      consecutiveIngestFailures: 0,
      ingestAckGraceMs: 400,
      serverRelayQos: {
        contractVersion: "voice_relay_qos_v1",
        observedAtMs: 79_700,
        healthy: true,
        reasonCode: "relay_healthy",
        heartbeat: {
          contractVersion: "voice_relay_heartbeat_v2",
          status: "acknowledged",
          expectedSequence: 21,
          ackSequence: 21,
          acknowledgedAtMs: 79_700,
        },
      },
    });

    expect(health.healthy).toBe(false);
    expect(health.reasonCode).toBe("relay_server_heartbeat_contract_mismatch");
    expect(health.serverRelayContractVersionStatus).toBe("ok");
    expect(health.serverRelayHeartbeatContractVersionStatus).toBe("mismatch");
  });
});
