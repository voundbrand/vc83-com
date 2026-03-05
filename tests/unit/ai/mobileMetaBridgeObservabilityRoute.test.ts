import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mutationMock = vi.fn();
const setAdminAuthMock = vi.fn();

vi.mock("convex/browser", () => {
  class MockConvexHttpClient {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_url: string) {}

    setAdminAuth(token: string) {
      setAdminAuthMock(token);
    }

    mutation = mutationMock;
  }

  return {
    ConvexHttpClient: MockConvexHttpClient,
  };
});

function buildValidPayload() {
  return {
    contractVersion: "meta_bridge_observability_upload_v1",
    schemaVersion: 1,
    generatedAtMs: 1_700_000_000_000,
    source: {
      source: "operator_mobile",
      platform: "ios",
      runtime: "expo",
    },
    events: [
      {
        id: "evt_1",
        kind: "debug_event",
        atMs: 1_700_000_000_001,
        stage: "status",
        severity: "info",
        code: "bridge_status",
        message: "Bridge healthy.",
        connectionState: "connected",
        diagnostics: {
          platform: "ios",
          permissions: {
            bluetooth: "granted",
          },
          discoveredDevices: [],
          pairedDevices: [],
        },
      },
    ],
  };
}

async function invokePost(args: {
  body: unknown;
  headers?: Record<string, string>;
}) {
  const { POST } = await import(
    "../../../src/app/api/v1/mobile/meta-bridge-observability/route"
  );
  const request = new NextRequest(
    "http://localhost/api/v1/mobile/meta-bridge-observability",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(args.headers || {}),
      },
      body: JSON.stringify(args.body),
    }
  );
  return POST(request);
}

describe("meta bridge observability ingest route", () => {
  beforeEach(() => {
    vi.resetModules();
    mutationMock.mockReset();
    setAdminAuthMock.mockReset();

    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.convex.site";
    process.env.CONVEX_DEPLOY_KEY = "convex-admin-token";
    process.env.PLATFORM_ORG_ID = "org_123";
    process.env.META_BRIDGE_LOG_UPLOAD_API_KEY = "upload-secret";
  });

  it("persists validated payloads and returns acceptance metadata", async () => {
    mutationMock.mockResolvedValueOnce({
      batchObjectId: "object_123",
      persistedEventCount: 1,
      receivedAtMs: 1_700_000_000_500,
    });

    const response = await invokePost({
      body: buildValidPayload(),
      headers: {
        "x-api-key": "upload-secret",
      },
    });

    expect(response.status).toBe(202);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.batchObjectId).toBe("object_123");
    expect(json.persistedEventCount).toBe(1);
    expect(setAdminAuthMock).toHaveBeenCalledWith("convex-admin-token");
    expect(mutationMock).toHaveBeenCalledTimes(1);
    const [_fnRef, args] = mutationMock.mock.calls[0];
    expect(args.organizationId).toBe("org_123");
    expect(args.payload.contractVersion).toBe("meta_bridge_observability_upload_v1");
    expect(args.requestMetadata.endpoint).toBe("/api/v1/mobile/meta-bridge-observability");
  });

  it("returns 503 when persistence fails so mobile retries transiently", async () => {
    mutationMock.mockRejectedValueOnce(new Error("write failed"));

    const response = await invokePost({
      body: buildValidPayload(),
      headers: {
        "x-api-key": "upload-secret",
      },
    });

    expect(response.status).toBe(503);
    const json = await response.json();
    expect(json.code).toBe("meta_bridge_upload_persist_failed");
    expect(mutationMock).toHaveBeenCalledTimes(1);
  });

  it("returns 503 when ingest organization is not configured", async () => {
    delete process.env.PLATFORM_ORG_ID;
    delete process.env.TEST_ORG_ID;
    delete process.env.NEXT_PUBLIC_PLATFORM_ORG_ID;
    delete process.env.META_BRIDGE_LOG_UPLOAD_ORGANIZATION_ID;

    const response = await invokePost({
      body: buildValidPayload(),
      headers: {
        "x-api-key": "upload-secret",
      },
    });

    expect(response.status).toBe(503);
    const json = await response.json();
    expect(json.code).toBe("meta_bridge_upload_missing_organization");
    expect(mutationMock).not.toHaveBeenCalled();
  });

  it("returns 400 on contract mismatch without attempting persistence", async () => {
    const response = await invokePost({
      body: {
        schemaVersion: 1,
        generatedAtMs: 1_700_000_000_000,
        events: [],
      },
      headers: {
        "x-api-key": "upload-secret",
      },
    });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.code).toBe("meta_bridge_upload_contract_error");
    expect(mutationMock).not.toHaveBeenCalled();
  });
});
