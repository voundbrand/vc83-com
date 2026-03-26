export interface ConvexRunInput {
    functionName: string;
    args: Record<string, unknown>;
    execute: boolean;
}
export interface ConvexRunResult {
    executed: boolean;
    command: string;
    stdout: string;
    stderr: string;
    parsedJson: unknown | null;
}
export declare function runConvexFunction(input: ConvexRunInput): Promise<ConvexRunResult>;
//# sourceMappingURL=runner.d.ts.map