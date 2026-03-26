export interface CmsContentEntry {
    locale: string;
    lookupKey: string;
    value: string;
}
export interface CmsContentDocument {
    schemaVersion: "sevenlayers.cms.content.v1";
    generatedAt: string;
    source: string;
    entries: CmsContentEntry[];
}
export interface CmsParityIssue {
    type: "missing_field" | "missing_locale" | "missing_required_field" | "empty_value";
    locale?: string;
    lookupKey?: string;
    message: string;
}
export interface CmsParityReport {
    locales: string[];
    lookupKeys: string[];
    issues: CmsParityIssue[];
    complete: boolean;
}
export declare function normalizeCmsEntry(input: {
    locale: string;
    lookupKey: string;
    value?: string;
}): CmsContentEntry;
export declare function readJsonFile(filePath: string): Promise<unknown>;
export declare function writeJsonFile(filePath: string, payload: unknown): Promise<void>;
export declare function parseLegacyCmsInput(input: unknown): CmsContentEntry[];
export declare function buildContentDocument(entries: CmsContentEntry[], source: string): CmsContentDocument;
export declare function parseContentDocument(input: unknown): CmsContentDocument;
export declare function buildParityReport(args: {
    entries: CmsContentEntry[];
    requiredLocales?: string[];
    requiredLookupKeys?: string[];
    allowEmptyValues?: boolean;
}): CmsParityReport;
//# sourceMappingURL=content.d.ts.map