"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBookingSmoke = runBookingSmoke;
function buildSmokePayload(args) {
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
async function runBookingSmoke(options) {
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
//# sourceMappingURL=booking-smoke.js.map