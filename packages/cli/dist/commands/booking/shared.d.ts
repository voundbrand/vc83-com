import { type ParsedArgs } from "../../core/args";
import { resolveRemoteCommand } from "../app/remote";
export interface BookingCommandContext {
    profile: string;
    organizationId: string;
    applicationId: string;
    backendUrl: string;
    json: boolean;
    api: Awaited<ReturnType<typeof resolveRemoteCommand>>["api"];
}
export interface BookingIdentifiers {
    eventId?: string;
    productId?: string;
    source: string;
}
export declare function resolveBookingIdentifiers(parsed: ParsedArgs, envFilePath: string): Promise<BookingIdentifiers>;
export declare function resolveBookingCommandContext(parsed: ParsedArgs, options: {
    mutating: boolean;
}): Promise<BookingCommandContext>;
export declare function resolveEnvFilePath(parsed: ParsedArgs): string;
export declare function runBookingReachabilityChecks(api: BookingCommandContext["api"]): Promise<{
    issues: string[];
}>;
export declare function runBookingEntityChecks(args: {
    api: BookingCommandContext["api"];
    eventId?: string;
    productId?: string;
}): Promise<{
    issues: string[];
}>;
//# sourceMappingURL=shared.d.ts.map