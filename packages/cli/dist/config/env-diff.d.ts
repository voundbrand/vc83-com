export type EnvChangeType = "add" | "update" | "skip-existing" | "noop";
export interface EnvChange {
    type: EnvChangeType;
    key: string;
    before?: string;
    after?: string;
    reason?: string;
}
export declare function formatEnvChanges(changes: EnvChange[]): string;
//# sourceMappingURL=env-diff.d.ts.map