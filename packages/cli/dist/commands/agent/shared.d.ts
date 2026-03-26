import { type ParsedArgs } from "../../core/args";
export interface AgentCommandContext {
    profile: string;
    organizationId: string;
    applicationId: string;
    backendUrl: string;
    json: boolean;
}
export declare function resolveAgentCommandContext(parsed: ParsedArgs, options: {
    mutating: boolean;
}): Promise<AgentCommandContext>;
export declare function resolveSessionId(parsed: ParsedArgs): string | undefined;
//# sourceMappingURL=shared.d.ts.map