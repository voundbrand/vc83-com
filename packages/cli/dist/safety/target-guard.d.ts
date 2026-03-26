import { type ParsedArgs } from "../core/args";
import { type CliProfile } from "../config/profile-store";
export interface TargetContext {
    profile: CliProfile;
    profileName: string;
    backendUrl: string;
    orgId?: string;
    appId?: string;
}
export interface ResolveTargetContextOptions {
    requireOrgApp: boolean;
    mutatingCommand: boolean;
    profileStorePath?: string;
}
export declare function resolveTargetContext(parsed: ParsedArgs, options: ResolveTargetContextOptions): Promise<TargetContext>;
//# sourceMappingURL=target-guard.d.ts.map