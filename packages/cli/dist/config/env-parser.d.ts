export type EnvLine = {
    kind: "blank" | "comment" | "unknown";
    raw: string;
} | {
    kind: "entry";
    raw: string;
    key: string;
    value: string;
    hasExport: boolean;
};
export interface ParsedEnvFile {
    lines: EnvLine[];
    hadTrailingNewline: boolean;
}
export declare function parseEnvText(content: string): ParsedEnvFile;
export declare function renderEnvValue(value: string): string;
export declare function renderEnvAssignment(key: string, value: string, hasExport?: boolean): string;
export declare function normalizeEnvValue(value: string): string;
export declare function serializeEnv(parsed: ParsedEnvFile): string;
//# sourceMappingURL=env-parser.d.ts.map