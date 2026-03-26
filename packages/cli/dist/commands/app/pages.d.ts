import { type ParsedArgs } from "../../core/args";
export interface PageSyncInput {
    path: string;
    name: string;
    pageType?: string;
    detectionMethod?: string;
}
interface PagesOptions {
    legacySource?: string;
    defaultSubcommand?: "sync" | "list";
}
export declare function parsePageSpec(spec: string): PageSyncInput;
export declare function handleAppPages(parsed: ParsedArgs, options?: PagesOptions): Promise<number>;
export {};
//# sourceMappingURL=pages.d.ts.map