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
export declare function runBookingSmoke(options: BookingSmokeOptions): Promise<BookingSmokeResult>;
//# sourceMappingURL=booking-smoke.d.ts.map