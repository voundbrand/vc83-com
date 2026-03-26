import { type EnvChange } from "./env-diff";
export type EnvWriteMode = "upsert" | "replace-key" | "full-rewrite";
export interface ManagedEnvUpdate {
    key: string;
    value: string;
}
export interface EnvWriteOptions {
    mode?: EnvWriteMode;
    dryRun?: boolean;
    backupPath?: string;
    allowFullRewrite?: boolean;
}
export interface EnvWriteResult {
    filePath: string;
    mode: EnvWriteMode;
    changes: EnvChange[];
    applied: boolean;
    backupPath?: string;
    nextContent: string;
}
export declare function writeEnvFile(filePath: string, updatesInput: ManagedEnvUpdate[], options?: EnvWriteOptions): Promise<EnvWriteResult>;
//# sourceMappingURL=env-writer.d.ts.map