import { type CreateBookingPayload, type PlatformApiClient } from "../api/platform";

export interface BookingSmokeOptions {
  api: PlatformApiClient;
  eventId: string;
  productId: string;
  source: string;
  dryRun: boolean;
  runId?: string;
}

export interface BookingSmokeResult {
  dryRun: boolean;
  runId: string;
  payload: CreateBookingPayload;
  response?: Record<string, unknown>;
}

function buildSmokePayload(args: {
  eventId: string;
  productId: string;
  source: string;
  runId: string;
}): CreateBookingPayload {
  const email = `booking-smoke+${args.runId}@sevenlayers.test`;
  return {
    eventId: args.eventId,
    productId: args.productId,
    source: args.source,
    frontendRsvpId: `smoke-${args.runId}`,
    primaryAttendee: {
      firstName: "Smoke",
      lastName: "Test",
      email,
      phone: "+491234567890"
    },
    guests: []
  };
}

export async function runBookingSmoke(options: BookingSmokeOptions): Promise<BookingSmokeResult> {
  const runId = options.runId ?? `${Date.now()}`;
  const payload = buildSmokePayload({
    eventId: options.eventId,
    productId: options.productId,
    source: options.source,
    runId
  });

  if (options.dryRun) {
    return {
      dryRun: true,
      runId,
      payload
    };
  }

  const response = await options.api.createBooking(payload);
  return {
    dryRun: false,
    runId,
    payload,
    response
  };
}
