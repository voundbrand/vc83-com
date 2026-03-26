import { type ParsedArgs } from "../../core/args";
import { type GetApplicationResponse, type PageObjectBinding } from "../../api/platform";
import { resolveRemoteCommand } from "../app/remote";
export declare const CMS_REGISTRY_FEATURE_PREFIX = "cms_registry:";
export interface CmsCommandContext {
    profile: string;
    organizationId: string;
    applicationId: string;
    json: boolean;
    api: Awaited<ReturnType<typeof resolveRemoteCommand>>["api"];
}
export interface CmsRegistrySelection {
    registryId: string;
    source: "override" | "feature" | "inferred";
}
export declare function resolveCmsCommandContext(parsed: ParsedArgs, options: {
    mutating: boolean;
}): Promise<CmsCommandContext>;
export declare function resolveCmsRegistrySelection(parsed: ParsedArgs, application: GetApplicationResponse["application"]): CmsRegistrySelection;
export declare function mergeCmsRegistryFeature(existingFeatures: unknown, registryId: string): string[];
export declare function toComparableBindings(bindings: PageObjectBinding[]): string;
//# sourceMappingURL=shared.d.ts.map