import { type ParsedArgs } from "../../core/args";
import { createPlatformApiClient } from "../../api/platform";
import { type TargetContext } from "../../safety/target-guard";
export interface ResolvedRemoteCommand {
    target: TargetContext;
    json: boolean;
    api: ReturnType<typeof createPlatformApiClient>;
}
export interface ResolveRemoteCommandOptions {
    requireOrgApp: boolean;
    mutatingCommand: boolean;
}
export declare function resolveRemoteCommand(parsed: ParsedArgs, options: ResolveRemoteCommandOptions): Promise<ResolvedRemoteCommand>;
//# sourceMappingURL=remote.d.ts.map